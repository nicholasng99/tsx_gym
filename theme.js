// Applies the dark mode setting. Loaded in <head> by the popup and options
// page. The setting lives in localStorage rather than chrome.storage because
// it can be read synchronously, so the page never flashes light first.

function applyTheme(dark) {
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}

function isDarkMode() {
  try {
    return localStorage.getItem("theme") === "dark";
  } catch {
    return false;
  }
}

applyTheme(isDarkMode());
// Keeps an open popup and settings page in step when the other one changes it.
window.addEventListener("storage", (e) => {
  if (e.key === "theme") applyTheme(isDarkMode());
});
