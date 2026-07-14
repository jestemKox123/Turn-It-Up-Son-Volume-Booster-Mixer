// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

const ver = document.getElementById("ver");
if (ver) ver.textContent = "v" + chrome.runtime.getManifest().version;

const rate = document.getElementById("rateLink");
if (rate) rate.href = "https://chrome.google.com/webstore/detail/" + chrome.runtime.id + "/reviews";

const langSelect = document.getElementById("langSelect");
if (langSelect) {
  chrome.storage.local.get("lang", (d) => {
    langSelect.value = d.lang === "pl" ? "pl" : "en";
  });
  langSelect.addEventListener("change", () => {
    VBI18N.setLang(langSelect.value);
  });
}
