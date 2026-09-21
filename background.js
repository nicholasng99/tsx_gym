// Runs the booking queue: one job at a time, in a single tab. The popup only
// appends "queued" jobs; everything else happens here or in content.js.

importScripts("config.js");

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.queue) return;
  const before = changes.queue.oldValue || [];
  const after = changes.queue.newValue || [];

  // Notify for each job that just finished.
  for (const job of after) {
    const prev = before.find((j) => j.id === job.id);
    if (prev && prev.status === "running" && job.status !== "running") notify(job);
  }

  startNext();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { runTabId, queue = [] } = await chrome.storage.local.get(["runTabId", "queue"]);
  if (tabId !== runTabId) return;
  const running = queue.find((j) => j.status === "running");
  if (running) {
    Object.assign(running, { status: "failed", error: "Form tab was closed", finishedAt: Date.now() });
  }
  await chrome.storage.local.set({ runTabId: null, queue });
});

chrome.runtime.onStartup.addListener(startNext);
chrome.runtime.onInstalled.addListener(startNext);

let starting = false;

async function startNext() {
  if (starting) return;
  starting = true;
  try {
    const { queue = [], settings, runTabId } = await chrome.storage.local.get([
      "queue",
      "settings",
      "runTabId",
    ]);
    if (queue.some((j) => j.status === "running")) return;
    const next = queue.find((j) => j.status === "queued");
    if (!next) {
      if (runTabId) await chrome.storage.local.set({ runTabId: null });
      return;
    }

    // Mark it running before navigating: the content script only runs on a
    // page load, so it must find the job already in storage when it does.
    Object.assign(next, { status: "running", step: "opening form", pageLoads: 0, startedAt: Date.now() });
    await chrome.storage.local.set({ queue });

    const formUrl = (settings && settings.formUrl) || TSX_DEFAULTS.formUrl;
    let tabId = runTabId;
    if (tabId && (await tabExists(tabId))) {
      await chrome.tabs.update(tabId, { url: formUrl, active: true });
    } else {
      const tab = await chrome.tabs.create({ url: formUrl, active: true });
      tabId = tab.id;
    }
    await chrome.storage.local.set({ runTabId: tabId });
  } finally {
    starting = false;
  }
}

async function tabExists(tabId) {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

function notify(job) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: job.status === "done" ? "Gym slot booked" : "Gym booking failed",
    message:
      job.status === "done"
        ? `${job.date}, ${job.timeSlot}`
        : `${job.date}, ${job.timeSlot}: ${job.error}`,
  });
}
