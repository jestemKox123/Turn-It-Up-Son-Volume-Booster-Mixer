// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

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

const wipeBtn = document.getElementById("wipeBtn");
if (wipeBtn && HAS_STORAGE) {
  let wipeArmed = false;
  let wipeTimer = null;
  wipeBtn.addEventListener("click", () => {
    if (!wipeArmed) {
      wipeArmed = true;
      wipeBtn.textContent = VBI18N.t("wipe_confirm");
      if (wipeTimer) clearTimeout(wipeTimer);
      wipeTimer = setTimeout(() => {
        wipeArmed = false;
        wipeBtn.textContent = VBI18N.t("wipe_btn");
      }, 4000);
      return;
    }
    if (wipeTimer) clearTimeout(wipeTimer);
    wipeBtn.disabled = true;
    chrome.runtime.sendMessage({ type: "vb-wipe" }, () => {
      void chrome.runtime.lastError;
      window.location.reload();
    });
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

const SKIP_ACCESS = {
  permissions: ["scripting"],
  origins: ["*://*.youtube.com/*", "*://open.spotify.com/*", "*://*.soundcloud.com/*"],
};
const skipToggle = document.getElementById("skipToggle");
const skipInput = document.getElementById("skipInput");
const skipAddBtn = document.getElementById("skipAdd");
const skipListEl = document.getElementById("skipList");
const skipSaved = document.getElementById("skipSaved");

const skipNorm = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const skipClean = (s) => s.replace(/\s*-\s*topic$/, "").replace(/\s*vevo$/, "").trim();

let skipMsgTimer = null;
function flashSkipMsg(key) {
  if (!skipSaved) return;
  skipSaved.textContent = VBI18N.t(key);
  if (skipMsgTimer) clearTimeout(skipMsgTimer);
  skipMsgTimer = setTimeout(() => (skipSaved.textContent = ""), 1800);
}

function flashSkipSaved() {
  flashSkipMsg("saved");
}

function getSkipState(cb) {
  chrome.storage.local.get(["skipEnabled", "skipArtists", "skipSongs"], (d) => {
    cb(
      !!(d && d.skipEnabled),
      d && Array.isArray(d.skipArtists) ? d.skipArtists : [],
      d && Array.isArray(d.skipSongs) ? d.skipSongs : []
    );
  });
}

function makeChip(label, prefix, onRemove) {
  const chip = document.createElement("span");
  chip.className = "skip-chip";
  const lab = document.createElement("span");
  lab.textContent = prefix + label;
  const x = document.createElement("button");
  x.type = "button";
  x.textContent = "×";
  x.setAttribute("aria-label", VBI18N.t("skip_remove") + " " + label);
  x.addEventListener("click", onRemove);
  chip.appendChild(lab);
  chip.appendChild(x);
  return chip;
}

function renderSkipList(arr, songArr) {
  if (!skipListEl) return;
  skipListEl.innerHTML = "";
  if (!arr.length && !songArr.length) {
    const p = document.createElement("div");
    p.className = "skip-empty";
    p.textContent = VBI18N.t("skip_empty");
    skipListEl.appendChild(p);
    return;
  }
  arr.forEach((name) => {
    skipListEl.appendChild(
      makeChip(name, "", () => {
        getSkipState((en, cur, songs) => {
          const next = cur.filter((a) => skipNorm(a) !== skipNorm(name));
          chrome.storage.local.set({ skipArtists: next }, () => {
            renderSkipList(next, songs);
            flashSkipSaved();
          });
        });
      })
    );
  });
  songArr.forEach((s) => {
    const label = s && s.t ? s.t : (s && s.id) || "?";
    skipListEl.appendChild(
      makeChip(label, "♪ ", () => {
        getSkipState((en, cur, songs) => {
          const next = songs.filter((x) => !x || x.id !== s.id);
          chrome.storage.local.set({ skipSongs: next }, () => {
            renderSkipList(cur, next);
            flashSkipSaved();
          });
        });
      })
    );
  });
}

function parseSongLink(raw) {
  if (!/^(https?:\/\/|www\.)/i.test(raw) && !/(youtube\.com|youtu\.be|spotify\.com|soundcloud\.com)\//i.test(raw)) return null;
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
  } catch (e) {
    return null;
  }
  const h = u.hostname.replace(/^(www|m|music)\./, "");
  if (h === "youtube.com" || h === "youtu.be") {
    let id = "";
    if (h === "youtu.be") id = u.pathname.split("/")[1] || "";
    else if (u.pathname.indexOf("/shorts/") === 0) id = u.pathname.split("/")[2] || "";
    else id = u.searchParams.get("v") || "";
    if (!/^[\w-]{8,}$/.test(id)) return null;
    return { u: u.href, id, kind: "yt" };
  }
  if (h === "open.spotify.com" || h === "spotify.com") {
    const m = u.pathname.match(/\/track\/([A-Za-z0-9]+)/);
    if (!m) return null;
    return { u: u.href, id: m[1], kind: "sp" };
  }
  if (h === "soundcloud.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || parts[1] === "sets") return null;
    return { u: u.href, id: parts[0] + "/" + parts[1], kind: "sc" };
  }
  return null;
}

async function resolveSong(link) {
  const enc = encodeURIComponent(link.u);
  const ep =
    link.kind === "yt"
      ? "https://www.youtube.com/oembed?format=json&url=" + enc
      : link.kind === "sp"
        ? "https://open.spotify.com/oembed?url=" + enc
        : "https://soundcloud.com/oembed?format=json&url=" + enc;
  try {
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(ep, { signal: ctl.signal });
    clearTimeout(tm);
    if (!r.ok) return {};
    const j = await r.json();
    return { t: String(j.title || "").slice(0, 120), a: String(j.author_name || "").slice(0, 80) };
  } catch (e) {
    return {};
  }
}

function addSongLink(link) {
  getSkipState(async (en, cur, songs) => {
    if (songs.some((s) => s && s.id === link.id)) {
      skipInput.value = "";
      flashSkipMsg("skip_dup");
      return;
    }
    if (cur.length + songs.length >= 100) return;
    const meta = await resolveSong(link);
    const next = songs.concat({ u: link.u, id: link.id, t: meta.t || "", a: meta.a || "" });
    chrome.storage.local.set({ skipSongs: next }, () => {
      skipInput.value = "";
      renderSkipList(cur, next);
      flashSkipSaved();
    });
  });
}

function addSkipArtist() {
  if (!skipInput) return;
  const raw = skipInput.value.trim();
  const link = parseSongLink(raw);
  if (link) {
    addSongLink(link);
    return;
  }
  if (/^(https?:\/\/|www\.)/i.test(raw)) {
    flashSkipMsg("skip_link_bad");
    return;
  }
  const v = raw.replace(/\s+/g, " ").slice(0, 60);
  const key = skipClean(skipNorm(v));
  if (!v || !key) {
    if (skipInput.value) flashSkipMsg("skip_bad");
    skipInput.value = "";
    return;
  }
  getSkipState((en, cur, songs) => {
    if (cur.length + songs.length >= 100) return;
    if (cur.some((a) => skipClean(skipNorm(a)) === key)) {
      skipInput.value = "";
      flashSkipMsg("skip_dup");
      return;
    }
    const next = cur.concat(v);
    chrome.storage.local.set({ skipArtists: next }, () => {
      skipInput.value = "";
      renderSkipList(next, songs);
      flashSkipSaved();
    });
  });
}

if (skipToggle && HAS_STORAGE) {
  VBI18N.ready(() => {
    getSkipState((en, arr, songs) => {
      skipToggle.checked = en;
      renderSkipList(arr, songs);
    });
  });

  skipToggle.addEventListener("change", async () => {
    if (skipToggle.checked) {
      let granted = false;
      try {
        granted = await chrome.permissions.request(SKIP_ACCESS);
      } catch (e) {}
      if (!granted) {
        skipToggle.checked = false;
        return;
      }
      chrome.runtime.sendMessage({ type: "vb-set-skip", enabled: true }, () => {
        void chrome.runtime.lastError;
        flashSkipSaved();
      });
    } else {
      chrome.runtime.sendMessage({ type: "vb-set-skip", enabled: false }, () => {
        void chrome.runtime.lastError;
        flashSkipSaved();
        chrome.runtime.sendMessage({ type: "vb-yt-release" }, () => void chrome.runtime.lastError);
      });
    }
  });

  const skipAllEl = document.getElementById("skipEverywhere");
  if (skipAllEl) {
    chrome.storage.local.get("skipEverywhere", (d) => {
      skipAllEl.checked = !!(d && d.skipEverywhere);
    });
    skipAllEl.addEventListener("change", () => {
      chrome.storage.local.set({ skipEverywhere: skipAllEl.checked }, flashSkipSaved);
    });
  }

  if (skipAddBtn) skipAddBtn.addEventListener("click", addSkipArtist);
  if (skipInput) {
    skipInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        addSkipArtist();
      }
    });
  }

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.skipEnabled) skipToggle.checked = !!ch.skipEnabled.newValue;
    if (ch.skipArtists || ch.skipSongs) {
      getSkipState((en, arr, songs) => renderSkipList(arr, songs));
    }
  });

  if (window.location.hash === "#autoskip") {
    VBI18N.ready(() => {
      showPane("general");
      const card = document.getElementById("skipCard");
      if (card) {
        card.classList.add("hl");
        card.scrollIntoView({ block: "center" });
      }
      if (skipInput) skipInput.focus();
    });
  }
}
