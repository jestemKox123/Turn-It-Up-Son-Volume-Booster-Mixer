/* Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
   All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt). */
(function () {
  var KEY = "tius-theme";
  var root = document.documentElement;

  function isDark() {
    var chosen = root.getAttribute("data-theme");
    if (chosen === "dark") return true;
    if (chosen === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function label(btn) {
    btn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".theme-btn");
    if (!btn) return;
    label(btn);
    btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      label(btn);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
    });
  });
})();
