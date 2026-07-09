// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

const optToggle = document.getElementById("optToggle");
const optTab = document.getElementById("optTab");
const savedEl = document.getElementById("saved");
const radios = document.querySelectorAll('input[name="mode"]');

// engine.html laduje ten skrypt takze jako dokument offscreen, gdzie nie ma
// chrome.storage ani chrome.permissions - te czesci wtedy pomijamy.
const HAS_STORAGE = typeof chrome !== "undefined" && !!(chrome.storage && chrome.storage.local);
const HAS_PERMISSIONS = typeof chrome !== "undefined" && !!chrome.permissions;

function paint(mode) {
  if (!optToggle || !optTab) return;
  optToggle.classList.toggle("sel", mode === "toggle");
  optTab.classList.toggle("sel", mode === "closeTab");
  radios.forEach((r) => {
    r.checked = r.value === mode;
  });
}

function flashSaved() {
  savedEl.textContent = VBI18N.t("saved");
  setTimeout(() => (savedEl.textContent = ""), 1400);
}

const langSelect = document.getElementById("langSelect");
if (langSelect && HAS_STORAGE) {
  chrome.storage.local.get("lang", (d) => {
    langSelect.value = d.lang || "auto";
  });
  langSelect.addEventListener("change", () => {
    VBI18N.setLang(langSelect.value);
  });
}

if (HAS_STORAGE) {
  chrome.storage.local.get("disableMode", (data) => {
    paint(data.disableMode === "closeTab" ? "closeTab" : "toggle");
  });
}

// Limit maksymalnej glosnosci i domyslny charakter basu (czyta je popup).
const maxVolSelect = document.getElementById("maxVolSelect");
if (maxVolSelect && HAS_STORAGE) {
  chrome.storage.local.get("vbMaxVol", (d) => {
    maxVolSelect.value = String(Number(d.vbMaxVol) || 700);
  });
  maxVolSelect.addEventListener("change", () => {
    chrome.storage.local.set({ vbMaxVol: Number(maxVolSelect.value) || 700 }, flashSaved);
  });
}

const defBassSelect = document.getElementById("defBassSelect");
if (defBassSelect && HAS_STORAGE) {
  chrome.storage.local.get("vbBassMode", (d) => {
    defBassSelect.value = d.vbBassMode || "classic";
  });
  defBassSelect.addEventListener("change", () => {
    chrome.storage.local.set({ vbBassMode: defBassSelect.value }, flashSaved);
  });
}

radios.forEach((r) => {
  r.addEventListener("change", () => {
    if (!r.checked) return;
    const mode = r.value;
    paint(mode);
    chrome.runtime.sendMessage({ type: "vb-set-mode", mode }, () => {
      void chrome.runtime.lastError;
      flashSaved();
    });
  });
});

// --- Skroty klawiszowe ---
const bindsToggle = document.getElementById("bindsToggle");
const bindsSaved = document.getElementById("bindsSaved");
const openShortcuts = document.getElementById("openShortcuts");

if (bindsToggle) {
  chrome.storage.local.get("bindsEnabled", (data) => {
    bindsToggle.checked = !!data.bindsEnabled;
  });
  bindsToggle.addEventListener("change", () => {
    chrome.runtime.sendMessage({ type: "vb-set-binds", enabled: bindsToggle.checked }, () => {
      void chrome.runtime.lastError;
      bindsSaved.textContent = VBI18N.t(bindsToggle.checked ? "binds_on" : "binds_off");
      setTimeout(() => (bindsSaved.textContent = ""), 1400);
    });
  });
  openShortcuts.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, () => {
      if (chrome.runtime.lastError) {
        bindsSaved.textContent = VBI18N.t("shortcuts_manual");
      }
    });
  });
}

// --- Dostep do stron (on-demand: dostep tylko gdy funkcja go potrzebuje) ---
const YT_ACCESS = { permissions: ["scripting"], origins: ["*://*.youtube.com/*"] };
const accessList = document.getElementById("accessList");
const grantYt = document.getElementById("grantYt");
const revokeAll = document.getElementById("revokeAll");
const accessSaved = document.getElementById("accessSaved");

function fmtOrigin(o) {
  if (o === "*://*/*" || o === "<all_urls>") return VBI18N.t("access_all_sites");
  return o
    .replace(/^(\*|https?):\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/\*$/, "");
}

function flashAccess(key) {
  if (!accessSaved) return;
  accessSaved.textContent = VBI18N.t(key);
  setTimeout(() => (accessSaved.textContent = ""), 1600);
}

function renderAccessList() {
  if (!accessList) return;
  chrome.permissions.getAll((p) => {
    const origins = (p && p.origins) || [];
    accessList.innerHTML = "";
    if (!origins.length) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = VBI18N.t("access_none");
      accessList.appendChild(li);
      return;
    }
    origins.forEach((o) => {
      const li = document.createElement("li");
      li.textContent = fmtOrigin(o);
      accessList.appendChild(li);
    });
  });
}

if (grantYt) {
  grantYt.addEventListener("click", async () => {
    let granted = false;
    try {
      granted = await chrome.permissions.request(YT_ACCESS);
    } catch (e) {}
    if (granted) flashAccess("access_granted");
    renderAccessList();
  });
}

if (revokeAll) {
  revokeAll.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "vb-access-revoke-all" }, () => {
      void chrome.runtime.lastError;
      flashAccess("access_revoked");
      renderAccessList();
    });
  });
}

if (HAS_PERMISSIONS && chrome.permissions.onAdded) chrome.permissions.onAdded.addListener(renderAccessList);
if (HAS_PERMISSIONS && chrome.permissions.onRemoved) chrome.permissions.onRemoved.addListener(renderAccessList);

if (HAS_PERMISSIONS) VBI18N.ready(renderAccessList);

// engine.html laduje ten skrypt razem z engine.js, ktory ma wlasne "verEl".
const verHeroEl = document.getElementById("ver");
if (verHeroEl && chrome.runtime && typeof chrome.runtime.getManifest === "function") {
  verHeroEl.textContent = "v" + chrome.runtime.getManifest().version;
}

// --- Wsparcie (strona silnika i ustawienia) ---
const DONATE_URL = "https://buymeacoffee.com/romanzbudowy";
const donateBtn = document.getElementById("donateBtn");
const engineStars = document.getElementById("engineStars");

function openUrl(url) {
  if (chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url }, () => void chrome.runtime.lastError);
  } else {
    try { window.open(url, "_blank"); } catch (e) {}
  }
}

if (engineStars) {
  const stars = Array.from(engineStars.querySelectorAll(".star"));
  const paintStars = (n) => stars.forEach((s, i) => s.classList.toggle("hl", i < n));
  stars.forEach((s) => {
    s.addEventListener("mouseenter", () => paintStars(Number(s.dataset.v)));
    s.addEventListener("click", () => {
      openUrl("https://chrome.google.com/webstore/detail/" + chrome.runtime.id + "/reviews");
    });
  });
  engineStars.addEventListener("mouseleave", () => paintStars(0));
}
if (donateBtn) {
  donateBtn.addEventListener("click", () => openUrl(DONATE_URL));
}

// Staly przycisk wsparcia w naglowku strony ustawien.
const supportTop = document.getElementById("supportTop");
if (supportTop) {
  supportTop.addEventListener("click", () => openUrl(DONATE_URL));
}
