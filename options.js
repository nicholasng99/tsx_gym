const fields = ["name", "email", "company", "phone"];
const $ = (id) => document.getElementById(id);

(async function load() {
  const { profile = {}, settings = {} } = await chrome.storage.local.get(["profile", "settings"]);
  for (const f of fields) $(f).value = profile[f] || "";
  $("formUrl").value = settings.formUrl || TSX_DEFAULTS.formUrl;
  $("ids").value = JSON.stringify(settings.ids || TSX_DEFAULTS.ids, null, 2);
})();

$("save").addEventListener("click", async () => {
  const profile = {};
  for (const f of fields) profile[f] = $(f).value.trim();

  let ids;
  try {
    ids = JSON.parse($("ids").value);
    for (const k of ["name", "email", "company", "phone", "date", "time", "acks"]) {
      if (!(k in ids)) throw new Error(`missing "${k}"`);
    }
    if (!Array.isArray(ids.acks)) throw new Error('"acks" must be an array');
  } catch (e) {
    $("saved").textContent = "Entry IDs JSON is invalid: " + e.message;
    return;
  }

  const formUrl = $("formUrl").value.trim();
  if (!/^https:\/\/docs\.google\.com\/forms\/.+\/viewform/.test(formUrl)) {
    $("saved").textContent = "Form URL must be a docs.google.com …/viewform link.";
    return;
  }

  await chrome.storage.local.set({ profile, settings: { formUrl, ids } });
  $("saved").textContent = "Saved.";
  setTimeout(() => ($("saved").textContent = ""), 2000);
});
