const $ = (id) => document.getElementById(id);

// Selected days, as { "YYYY-MM-DD": timeSlot }.
const selected = new Map();
let viewYear, viewMonth;

(function init() {
  const today = new Date();
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();

  for (const slot of TIME_SLOTS) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = slot;
    if (slot === DEFAULT_TIME_SLOT) opt.selected = true;
    $("slot").appendChild(opt);
  }

  $("prev-month").addEventListener("click", () => shiftMonth(-1));
  $("next-month").addEventListener("click", () => shiftMonth(1));
  $("slot").addEventListener("change", () => {
    for (const d of selected.keys()) selected.set(d, $("slot").value);
    renderSelected();
  });
  $("clear").addEventListener("click", () => {
    selected.clear();
    renderCalendar();
    renderSelected();
  });
  $("book").addEventListener("click", book);
  for (const id of ["open-options", "open-options-2"]) {
    $(id).addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  chrome.storage.onChanged.addListener(renderState);
  renderCalendar();
  renderSelected();
  renderState();
})();

// ---- calendar -------------------------------------------------------------

function shiftMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
}

function renderCalendar() {
  const grid = $("calendar");
  grid.replaceChildren();
  $("month-label").textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  for (const d of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
    const el = document.createElement("div");
    el.className = "dow";
    el.textContent = d;
    grid.appendChild(el);
  }

  const first = new Date(viewYear, viewMonth, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  for (let i = 0; i < lead; i++) grid.appendChild(document.createElement("div"));

  const todayIso = toIsoDate(new Date());
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day);
    const iso = toIsoDate(date);
    const btn = document.createElement("button");
    btn.className = "day";
    btn.textContent = day;
    if (isWeekend(date)) {
      btn.disabled = true;
    } else if (!isBookable(date)) {
      btn.disabled = true;
      btn.title = iso < todayIso ? "Past" : "Booking closed — cutoff is 4 pm the working day before";
    }
    if (iso === todayIso) btn.classList.add("today");
    if (selected.has(iso)) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      if (selected.has(iso)) selected.delete(iso);
      else selected.set(iso, $("slot").value);
      renderCalendar();
      renderSelected();
    });
    grid.appendChild(btn);
  }
}

function renderSelected() {
  const list = $("selected");
  list.replaceChildren();
  const dates = [...selected.keys()].sort();
  for (const iso of dates) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = formatDate(iso);
    const sel = document.createElement("select");
    for (const slot of TIME_SLOTS) {
      const opt = document.createElement("option");
      opt.value = opt.textContent = slot;
      if (slot === selected.get(iso)) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener("change", () => selected.set(iso, sel.value));
    li.append(label, sel);
    list.appendChild(li);
  }
  $("book").textContent = dates.length ? `Book ${dates.length} day${dates.length > 1 ? "s" : ""}` : "Book";
  $("book").disabled = dates.length === 0;
}

// ---- booking --------------------------------------------------------------

async function book() {
  const { profile, queue = [] } = await chrome.storage.local.get(["profile", "queue"]);
  if (!isProfileComplete(profile)) {
    $("setup-warning").classList.remove("hidden");
    return;
  }
  const pending = new Set(queue.filter((j) => j.status === "queued" || j.status === "running").map((j) => j.date));
  const jobs = [...selected.entries()]
    .filter(([date]) => !pending.has(date) && isBookable(parseIsoDate(date)))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, timeSlot]) => ({ id: `${Date.now()}-${date}`, date, timeSlot, status: "queued" }));

  // Keep finished jobs from earlier runs so the popup can still show them.
  const kept = queue.filter((j) => j.status === "queued" || j.status === "running").concat(
    queue.filter((j) => j.status === "done" || j.status === "failed").slice(-5)
  );
  await chrome.storage.local.set({ queue: kept.concat(jobs) });
  selected.clear();
  renderCalendar();
  renderSelected();
}

// ---- state ----------------------------------------------------------------

async function renderState() {
  const { queue = [], profile, history = [] } = await chrome.storage.local.get([
    "queue",
    "profile",
    "history",
  ]);
  $("setup-warning").classList.toggle("hidden", isProfileComplete(profile));

  const active = queue.filter((j) => j.status !== "done" || Date.now() - j.finishedAt < 10 * 60 * 1000);
  $("queue").replaceChildren(
    ...active.map((j) => {
      const li = document.createElement("li");
      li.className = j.status;
      let text = `${formatDate(j.date)} — ${j.timeSlot}: `;
      if (j.status === "queued") text += "queued";
      else if (j.status === "running") text += `running (${j.step})`;
      else if (j.status === "done") text += "booked";
      else text += `failed — ${j.error}`;
      li.textContent = text;
      return li;
    })
  );
  if (!active.length) $("queue").appendChild(muted("Nothing queued"));

  $("history").replaceChildren(
    ...history.slice(0, 6).map((h) => {
      const li = document.createElement("li");
      li.textContent = `${formatDate(h.date)} — ${h.timeSlot}`;
      return li;
    })
  );
  if (!history.length) $("history").appendChild(muted("None yet"));
}

// ---- cutoff rule ----------------------------------------------------------

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

// The last moment a slot on `date` can still be booked: CUTOFF_HOUR on the
// previous working day.
function bookingCutoff(date) {
  const d = new Date(date);
  do d.setDate(d.getDate() - 1);
  while (isWeekend(d));
  d.setHours(CUTOFF_HOUR, 0, 0, 0);
  return d;
}

function isBookable(date, now = new Date()) {
  return !isWeekend(date) && now < bookingCutoff(date);
}

// ---- helpers --------------------------------------------------------------

function parseIsoDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function muted(text) {
  const li = document.createElement("li");
  li.className = "muted";
  li.textContent = text;
  return li;
}

function isProfileComplete(p) {
  return !!(p && p.name && p.email && p.company && p.phone);
}

function formatDate(iso) {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function toIsoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
