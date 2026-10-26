// In-memory stand-in for the chrome.* APIs the popup uses, so popup.html can
// run on a plain local server. Seeded with a profile and one booking.

(function () {
  const today = new Date();
  const inDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return toIsoDate(d);
  };
  function toIsoDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const data = {
    profile: { name: "Preview", email: "preview@example.com", company: "Preview", phone: "0" },
    history: [{ date: inDays(-3), timeSlot: "11.00am to 1.00pm", bookedAt: Date.now() }],
    queue: [],
  };
  const listeners = [];

  window.chrome = {
    storage: {
      local: {
        async get(keys) {
          const list = typeof keys === "string" ? [keys] : keys || Object.keys(data);
          return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, structuredClone(data[k])]));
        },
        async set(items) {
          const changes = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: data[k], newValue: structuredClone(v) };
            data[k] = structuredClone(v);
          }
          for (const fn of listeners) fn(changes, "local");
        },
      },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    },
    runtime: { openOptionsPage() {} },
  };
})();
