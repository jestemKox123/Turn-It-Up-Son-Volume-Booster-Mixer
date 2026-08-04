/* Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
   All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt). */
const DICT = {
  en: {
    h1: "Privacy Policy",
    sub: "Volume Booster & Mixer - Turn It Up, Son! browser extension · Last updated: 2026-07-18",
    back: "Back to the extension page"
  },
  pl: {
    h1: "Polityka prywatności",
    sub: "Wtyczka Volume Booster & Mixer - Turn It Up, Son! · Ostatnia aktualizacja: 2026-07-18",
    back: "Wróć na stronę wtyczki"
  }
};

const langEn = document.getElementById("langEn");
const langPl = document.getElementById("langPl");
const back = document.querySelector(".back-row .btn");

function applyLang(l) {
  const T = DICT[l] || DICT.en;
  document.getElementById("t-h1").textContent = T.h1;
  document.getElementById("t-sub").textContent = T.sub;
  document.getElementById("c-en").hidden = l !== "en";
  document.getElementById("c-pl").hidden = l !== "pl";
  document.documentElement.lang = l;
  back.textContent = T.back;
  langEn.classList.toggle("on", l === "en");
  langPl.classList.toggle("on", l === "pl");
}

langEn.addEventListener("click", () => applyLang("en"));
langPl.addEventListener("click", () => applyLang("pl"));
