// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

const optToggle = document.getElementById("optToggle");
const optTab = document.getElementById("optTab");
const savedEl = document.getElementById("saved");
const radios = document.querySelectorAll('input[name="mode"]');

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
    langSelect.value = d.lang === "pl" ? "pl" : "en";
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

const mark3d = document.getElementById("mark3d");
if (mark3d) {
  let markRaf = null;
  const updateMark = () => {
    markRaf = null;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, window.scrollY / max);
    const rx = 50 * (1 - p);
    const tz = 30 * p;
    mark3d.style.transform = "rotateX(" + rx + "deg) translateZ(" + tz + "px)";
  };
  window.addEventListener("scroll", () => {
    if (!markRaf) markRaf = requestAnimationFrame(updateMark);
  }, { passive: true });
  updateMark();
}

const themeRow = document.getElementById("themeRow");
const themeSaved = document.getElementById("themeSaved");

if (themeRow && HAS_STORAGE && window.VBTHEME) {
  VBI18N.ready(() => {
    chrome.storage.local.get("vbTheme", (d) => {
      const current = VBTHEME.THEMES[d.vbTheme] ? d.vbTheme : "neon";
      themeRow.innerHTML = "";
      Object.keys(VBTHEME.THEMES).forEach((name) => {
        const [c1, c2] = VBTHEME.THEMES[name];
        const b = document.createElement("button");
        b.className = "th-btn" + (name === current ? " sel" : "");
        const dot = document.createElement("span");
        dot.className = "th-dot";
        dot.style.background = "linear-gradient(135deg," + c1 + "," + c2 + ")";
        const lab = document.createElement("span");
        lab.textContent = VBI18N.t("theme_" + name);
        b.appendChild(dot);
        b.appendChild(lab);
        b.addEventListener("click", () => {
          chrome.storage.local.set({ vbTheme: name }, () => {
            VBTHEME.applyTheme(name);
            themeRow.querySelectorAll(".th-btn").forEach((x) => x.classList.remove("sel"));
            b.classList.add("sel");
            themeSaved.textContent = VBI18N.t("saved");
            setTimeout(() => (themeSaved.textContent = ""), 1400);
          });
        });
        themeRow.appendChild(b);
      });
    });
  });
}

const PRESET_NAME_KEYS = [
  "mix_normal", "mix_spedup", "mix_nightcore", "mix_spedup_reverb", "mix_slowed_reverb",
  "mix_8d", "mix_drill", "mix_phonk", "mix_nydrill", "mix_chilldrill",
];
const presetNamesWrap = document.getElementById("presetNames");
const presetNamesReset = document.getElementById("presetNamesReset");
const presetNamesSaved = document.getElementById("presetNamesSaved");

function flashPresetSaved() {
  presetNamesSaved.textContent = VBI18N.t("saved");
  setTimeout(() => (presetNamesSaved.textContent = ""), 1400);
}

if (presetNamesWrap && HAS_STORAGE) {
  VBI18N.ready(() => {
    chrome.storage.local.get("vbPresetNames", (d) => {
      const names = d.vbPresetNames || {};
      presetNamesWrap.innerHTML = "";
      PRESET_NAME_KEYS.forEach((key) => {
        const row = document.createElement("label");
        row.className = "pname-row";
        const lab = document.createElement("span");
        lab.className = "pl";
        lab.textContent = VBI18N.t(key);
        const inp = document.createElement("input");
        inp.type = "text";
        inp.maxLength = 18;
        inp.placeholder = VBI18N.t(key);
        inp.value = names[key] || "";
        inp.addEventListener("change", () => {
          chrome.storage.local.get("vbPresetNames", (dd) => {
            const cur = dd.vbPresetNames || {};
            const v = inp.value.trim().slice(0, 18);
            if (v) cur[key] = v;
            else delete cur[key];
            chrome.storage.local.set({ vbPresetNames: cur }, flashPresetSaved);
          });
        });
        row.appendChild(lab);
        row.appendChild(inp);
        presetNamesWrap.appendChild(row);
      });
    });
  });
  presetNamesReset.addEventListener("click", () => {
    chrome.storage.local.remove("vbPresetNames", () => {
      presetNamesWrap.querySelectorAll("input").forEach((i) => (i.value = ""));
      flashPresetSaved();
    });
  });
}

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

const verHeroEl = document.getElementById("ver");
if (verHeroEl && chrome.runtime && typeof chrome.runtime.getManifest === "function") {
  verHeroEl.textContent = "v" + chrome.runtime.getManifest().version;
}

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

const supportTop = document.getElementById("supportTop");
if (supportTop) {
  supportTop.addEventListener("click", () => openUrl(DONATE_URL));
}

const bmcFloat = document.getElementById("bmcFloat");
if (bmcFloat) {
  bmcFloat.addEventListener("click", () => openUrl(DONATE_URL));
}

const GITHUB_URL = "https://github.com/jestemKox123/Turn-It-Up-Son-Volume-Booster-Mixer";
const githubPill = document.getElementById("githubPill");
if (githubPill) {
  githubPill.addEventListener("click", () => openUrl(GITHUB_URL));
}

const ratePill = document.getElementById("ratePill");
if (ratePill) {
  ratePill.addEventListener("click", () => {
    openUrl("https://chrome.google.com/webstore/detail/" + chrome.runtime.id + "/reviews");
  });
}

const FEEDBACK_FORM = "https://docs.google.com/forms/d/e/1FAIpQLScyvm-FU6kLwyjPL0qpIXS-48m-jQ-F63kFdvA3Z7JjRaT0dg/formResponse";
const bugText = document.getElementById("bugText");
const bugSend = document.getElementById("bugSend");
const bugSent = document.getElementById("bugSent");
if (bugText && bugSend) {
  bugSend.addEventListener("click", async () => {
    const txt = bugText.value.trim();
    if (!txt) return;
    bugSend.disabled = true;
    bugText.disabled = true;
    let ver = "?";
    try { ver = chrome.runtime.getManifest().version; } catch (e) {}
    const body =
      "entry.225153063=" + encodeURIComponent("Other reason") +
      "&entry.688777186=" + encodeURIComponent("[BUG v" + ver + "] " + txt);
    try {
      await fetch(FEEDBACK_FORM, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (e) {}
    if (bugSent) bugSent.hidden = false;
  });
}

const tabButtons = document.querySelectorAll(".tab");
const tabPanes = document.querySelectorAll(".tabpane");
function showPane(name) {
  tabButtons.forEach((b) => b.classList.toggle("on", b.dataset.pane === name));
  tabPanes.forEach((p) => p.classList.toggle("on", p.dataset.pane === name));
  window.scrollTo(0, 0);
}
tabButtons.forEach((b) => b.addEventListener("click", () => showPane(b.dataset.pane)));

const bugPill = document.getElementById("bugPill");
const bugCard = document.getElementById("bugCard");
if (bugPill && bugCard) {
  bugPill.addEventListener("click", () => {
    bugCard.hidden = !bugCard.hidden;
    if (!bugCard.hidden) {
      window.scrollTo(0, 0);
      if (bugText) bugText.focus();
    }
  });
}
