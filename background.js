// Runs the booking queue: one job at a time, in a single tab. The popup only
// appends "queued" jobs; everything else happens here or in content.js.

importScripts("config.js");

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.history) updateIcon();
  if (!changes.queue) return;
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

chrome.runtime.onStartup.addListener(() => { startNext(); updateIcon(); });
chrome.runtime.onInstalled.addListener(() => {
  startNext();
  updateIcon();
  // Re-check hourly so the icon rolls over at the Friday cutoff and on Monday
  // even when nothing else happens.
  chrome.alarms.create("icon-refresh", { periodInMinutes: 60 });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "icon-refresh") updateIcon();
});

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
    iconUrl: "icons/max-128.png",
    title: job.status === "done" ? "Gym slot booked" : "Gym booking failed",
    message:
      job.status === "done"
        ? `${job.date}, ${job.timeSlot}`
        : `${job.date}, ${job.timeSlot}: ${job.error}`,
  });
}

// ---- toolbar icon ---------------------------------------------------------
// The arm grows with the number of days booked in the week being planned:
// the current Mon–Fri week, or next week once Friday's cutoff has passed.

function targetWeekRange(now) {
  const day = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const pastFridayCutoff = day === 0 || day === 6 || (day === 5 && now.getHours() >= CUTOFF_HOUR);
  if (pastFridayCutoff) monday.setDate(monday.getDate() + 7);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return [toIsoDate(monday), toIsoDate(friday)];
}

function bookedDaysInTargetWeek(history, now = new Date()) {
  const [from, to] = targetWeekRange(now);
  return new Set(history.map((h) => h.date).filter((d) => d >= from && d <= to)).size;
}

async function updateIcon() {
  const { history = [] } = await chrome.storage.local.get("history");
  const count = bookedDaysInTargetWeek(history);
  const stage = count >= 3 ? "max" : count === 2 ? "medium" : "skinny";
  const path = {};
  for (const size of [16, 32, 48, 128]) path[size] = `icons/${stage}-${size}.png`;
  await chrome.action.setIcon({ path });
  await chrome.action.setTitle({ title: `TSX Gym Booker — ${count} day${count === 1 ? "" : "s"} booked this week` });
}

function toIsoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
