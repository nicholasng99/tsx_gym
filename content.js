// Drives the Google Form one page at a time for the job that is currently
// "running" in the queue. Every "Next" in Google Forms is a real navigation,
// so this script runs fresh on each page and picks the job up from storage.
//
// Google binds its click handlers some time after the page is parsed, so a
// click that lands too early is silently dropped. Every field write here is
// therefore verified against the DOM and retried until it sticks.

(async function main() {
  const { queue = [], profile, settings } = await chrome.storage.local.get([
    "queue",
    "profile",
    "settings",
  ]);
  const job = queue.find((j) => j.status === "running");
  if (!job) return;

  const ids = (settings && settings.ids) || TSX_DEFAULTS.ids;

  if (Date.now() - job.startedAt > JOB_TIMEOUT_MS) {
    return fail("Timed out before reaching the confirmation page");
  }
  if (job.pageLoads >= MAX_PAGE_LOADS) {
    return fail("Too many page loads without finishing (form layout changed?)");
  }
  await update({ pageLoads: job.pageLoads + 1 });

  await waitFor(() => document.querySelector("form") || isConfirmationPage(), 8000);

  if (isConfirmationPage()) {
    return finish();
  }

  try {
    // Detect which page we are on by which questions are rendered.
    if (question(ids.date)) {
      await update({ step: "booking details" });
      await fillBookingPage();
      return advance("Next");
    }
    if (question(ids.acks[0])) {
      await update({ step: "declarations" });
      for (const id of ids.acks) await selectRadio(id, "Yes");
      return advance("Submit");
    }
    const emailInput = document.querySelector('input[type="email"]');
    if (emailInput) {
      await update({ step: "email" });
      await setText(emailInput, profile.email);
      return advance("Next");
    }
  } catch (err) {
    return fail(err.message || String(err));
  }
  return fail("Could not recognise this form page");

  // ---- page fillers -------------------------------------------------------

  async function fillBookingPage() {
    await setText(textInput(ids.name), profile.name);
    await setText(textInput(ids.email), profile.email);
    await setText(textInput(ids.company), profile.company);
    await setText(textInput(ids.phone), profile.phone);
    await setText(question(ids.date).querySelector('input[type="date"]'), job.date);
    await selectRadio(ids.time, job.timeSlot);
  }

  // ---- DOM helpers --------------------------------------------------------

  // Each question lives in a div[role=listitem]; a child element carries a
  // data-params attribute that embeds the entry id as "[[<id>," — that is the
  // most stable hook Google Forms exposes.
  function question(entryId) {
    const marker = "[[" + entryId + ",";
    for (const el of document.querySelectorAll("[data-params]")) {
      if (el.getAttribute("data-params").includes(marker)) {
        return el.closest('[role="listitem"]') || el;
      }
    }
    return null;
  }

  function textInput(entryId) {
    const q = question(entryId);
    if (!q) throw new Error("Question entry." + entryId + " not found on this page");
    const input = q.querySelector('input[type="text"], input[type="email"], textarea');
    if (!input) throw new Error("No text input for entry." + entryId);
    return input;
  }

  // Set a value through the prototype setter and fire the events Google
  // listens for, then confirm the value stuck.
  async function setText(input, value) {
    if (!input) throw new Error("Missing input");
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value").set;
    const ok = await retry(async () => {
      input.focus();
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
      await sleep(100);
      return input.value === value;
    });
    if (!ok) throw new Error("Could not set value '" + value + "'");
  }

  // Click a radio option and wait until Google marks it checked. Falls back
  // to a full pointer/mouse sequence for handlers that ignore a bare click.
  async function selectRadio(entryId, value) {
    const q = question(entryId);
    if (!q) throw new Error("Question entry." + entryId + " not found on this page");
    const radio = q.querySelector('[role="radio"][data-value="' + CSS.escape(value) + '"]');
    if (!radio) throw new Error("Option '" + value + "' not found for entry." + entryId);

    const checked = () => radio.getAttribute("aria-checked") === "true";
    let attempt = 0;
    const ok = await retry(async () => {
      if (attempt++ % 2 === 0) {
        radio.click();
      } else {
        for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
          radio.dispatchEvent(
            new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, view: window })
          );
        }
      }
      await sleep(150);
      return checked();
    });
    if (!ok) throw new Error("Could not select '" + value + "' for entry." + entryId);
  }

  function button(label) {
    for (const el of document.querySelectorAll('div[role="button"]')) {
      if (el.textContent.trim() === label) return el;
    }
    return null;
  }

  // Every page after the first is served at /formResponse, so the URL alone
  // is not enough: the confirmation page is the one with no questions and no
  // Next/Submit button.
  function isConfirmationPage() {
    if (!location.pathname.endsWith("/formResponse")) return false;
    return !document.querySelector("[data-params]") && !button("Next") && !button("Submit");
  }

  function visibleAlerts() {
    return [...document.querySelectorAll('[role="alert"]')]
      .map((el) => el.textContent.trim())
      .filter((t) => t && !t.startsWith("Sign in"));
  }

  // ---- flow control -------------------------------------------------------

  async function advance(label) {
    const btn = button(label);
    if (!btn) return fail("'" + label + "' button not found");
    if (label === "Submit") await update({ step: "submitting" });
    btn.click();

    // If the page does not navigate, Google has flagged a field. Surface it.
    setTimeout(async () => {
      const { queue = [] } = await chrome.storage.local.get("queue");
      const current = queue.find((j) => j.id === job.id);
      if (!current || current.status !== "running") return;
      const alerts = visibleAlerts();
      if (alerts.length) fail("Form validation: " + alerts.join(" | "));
    }, 4000);
  }

  async function finish() {
    await update({ status: "done", step: "booked", finishedAt: Date.now() });
    const { history = [] } = await chrome.storage.local.get("history");
    history.unshift({ date: job.date, timeSlot: job.timeSlot, bookedAt: Date.now() });
    await chrome.storage.local.set({ history: history.slice(0, 50) });
  }

  async function fail(error) {
    await update({ status: "failed", error, finishedAt: Date.now() });
  }

  // Re-read the queue on every write so we never clobber changes made by the
  // popup or service worker in the meantime.
  async function update(patch) {
    Object.assign(job, patch);
    const { queue = [] } = await chrome.storage.local.get("queue");
    const idx = queue.findIndex((j) => j.id === job.id);
    if (idx === -1) return;
    queue[idx] = { ...queue[idx], ...patch };
    await chrome.storage.local.set({ queue });
  }

  async function retry(fn) {
    const deadline = Date.now() + FIELD_RETRY_MS;
    while (Date.now() < deadline) {
      if (await fn()) return true;
      await sleep(250);
    }
    return false;
  }

  function waitFor(pred, timeoutMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function poll() {
        if (pred() || Date.now() - start > timeoutMs) return resolve();
        setTimeout(poll, 100);
      })();
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
})();
