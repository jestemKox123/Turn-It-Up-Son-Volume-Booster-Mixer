/* Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
   All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt). */
const langEn = document.getElementById("langEn");
const langPl = document.getElementById("langPl");
function applyLang(l) {
  document.querySelectorAll("[data-en]").forEach((el) => {
    const v = el.getAttribute(l === "pl" ? "data-pl" : "data-en");
    if (v) el.textContent = v;
  });
  document.documentElement.lang = l;
  langEn.classList.toggle("on", l === "en");
  langPl.classList.toggle("on", l === "pl");
}
langEn.addEventListener("click", () => applyLang("en"));
langPl.addEventListener("click", () => applyLang("pl"));
