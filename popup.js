// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

const DEFAULTS = { volume: 1, monoFix: false, bassBoost: false, bassMode: "classic", reverb: 0, treble: 0, muffle: 0, vocal: 0, power: 0, spin: false, spinSpeed: 0.5 };
const YT_PERMS = { permissions: ["scripting"], origins: ["*://*.youtube.com/*"] };
const SKIP_PERMS = {
  permissions: ["scripting"],
  origins: ["*://*.youtube.com/*", "*://open.spotify.com/*", "*://*.soundcloud.com/*"],
};

let currentTabId = null;
let currentTabUrl = "";
let settings = { ...DEFAULTS };
let isActive = false;
let tabsTimer = null;
let mixRate = 1;
let mixSupported = true;
let mixHostUnsupported = false;

const powerEl = document.getElementById("power");
const powerLabelEl = document.getElementById("powerLabel");
const volumeEl = document.getElementById("volume");
const volumeLabelEl = document.getElementById("volumeLabel");
const monoFixEl = document.getElementById("monoFix");
const bassBoostEl = document.getElementById("bassBoost");
const ytAutoContinueEl = document.getElementById("ytAutoContinue");
const skipToggleEl = document.getElementById("skipToggle");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");
const statusTextEl = document.getElementById("statusText");
const tabsListEl = document.getElementById("tabsList");
const readoutEl = document.getElementById("volumeReadout");
const settingsLink = document.getElementById("settingsLink");
const restoreBtn = document.getElementById("restoreBtn");
const mixReadoutEl = document.getElementById("mixReadout");
const mixSpeedEl = document.getElementById("mixSpeed");
const mixHintEl = document.getElementById("mixHint");
const builtinPresetEls = document.querySelectorAll(".mixp:not(.mixp-add)");
let userMixes = [];
let userPresetEls = [];
function allPresetEls() {
  return [...builtinPresetEls, ...userPresetEls];
}
const mainViewEl = document.getElementById("mainView");
const mixViewEl = document.getElementById("mixView");
const mixOpenEl = document.getElementById("mixOpen");
const mixBackEl = document.getElementById("mixBack");
const mixOpenStateEl = document.getElementById("mixOpenState");
const mixWarnEl = document.getElementById("mixWarn");
const mixReverbEl = document.getElementById("mixReverb");
const mixReverbValEl = document.getElementById("mixReverbVal");
const mixTrebleEl = document.getElementById("mixTreble");
const mixTrebleValEl = document.getElementById("mixTrebleVal");
const mixBassEl = document.getElementById("mixBass");
const mixBassValEl = document.getElementById("mixBassVal");
const mixSpinEl = document.getElementById("mixSpin");
const mixSpinValEl = document.getElementById("mixSpinVal");
const mixMuffleEl = document.getElementById("mixMuffle");
const mixMuffleValEl = document.getElementById("mixMuffleVal");
const mixVocalEl = document.getElementById("mixVocal");
const mixVocalValEl = document.getElementById("mixVocalVal");
const mixPowerEl = document.getElementById("mixPower");
const mixPowerValEl = document.getElementById("mixPowerVal");
const mixAppliedEl = document.getElementById("mixApplied");
const fullMixEl = document.getElementById("fullMix");
const CTL_ROWS = {
  speed: document.getElementById("rowSpeed"),
  reverb: document.getElementById("rowReverb"),
  treble: document.getElementById("rowTreble"),
  muffle: document.getElementById("rowMuffle"),
  bass: document.getElementById("rowBass"),
  vocal: document.getElementById("rowVocal"),
  power: document.getElementById("rowPower"),
  spin: document.getElementById("rowSpin"),
};

let backupSettings = null;

function invalidateBackup() {
  if (!backupSettings) return;
  backupSettings = null;
  chrome.runtime.sendMessage({ type: "vb-clear-backup", tabId: currentTabId }, () => void chrome.runtime.lastError);
  renderRestore();
}

function renderRestore() {
  if (backupSettings) {
    const pct = Math.round((backupSettings.volume || 1) * 100);
    const rate = Number(backupSettings.mixRate) || 1;
    restoreBtn.textContent = "↺ " + pct + "%" + (rate !== 1 ? " · " + rate.toFixed(2) + "x" : "");
    restoreBtn.title = rate !== 1
      ? VBI18N.t("restore_mix", { n: pct, m: rate.toFixed(2) })
      : VBI18N.t("restore", { n: pct });
    restoreBtn.hidden = false;
  } else {
    restoreBtn.hidden = true;
  }
}

async function restoreBackup() {
  if (!backupSettings) return false;
  const b = { ...backupSettings };
  const rate = Number(b.mixRate) || 1;
  delete b.mixRate;
  settings = { ...DEFAULTS, ...b };
  renderUI();
  const engineOn = settings.volume !== 1 || settings.monoFix || fxBass() > 0 || mixFxOn();
  if (engineOn) {
    await ensureActiveAndApply();
    if (!isActive) return false;
  }
  if (rate !== 1) await setMixRate(rate);
  chrome.runtime.sendMessage({ type: "vb-clear-backup", tabId: currentTabId }, () => void chrome.runtime.lastError);
  backupSettings = null;
  renderRestore();
  renderMix();
  renderStatus();
  return true;
}

restoreBtn.addEventListener("click", restoreBackup);

settingsLink.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

const rateStars = document.getElementById("rateStars");
if (rateStars) {
  const stars = Array.from(rateStars.querySelectorAll(".star"));
  const paintStars = (n) => stars.forEach((s, i) => s.classList.toggle("hl", i < n));
  stars.forEach((s) => {
    s.addEventListener("mouseenter", () => paintStars(Number(s.dataset.v)));
    s.addEventListener("click", () => {
      chrome.tabs.create({
        url: "https://chrome.google.com/webstore/detail/" + chrome.runtime.id + "/reviews",
      });
    });
  });
  rateStars.addEventListener("mouseleave", () => paintStars(0));
}

const donateLink = document.getElementById("donateLink");
if (donateLink) {
  donateLink.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://buymeacoffee.com/romanzbudowy" });
  });
}

function paintReadout(pct) {
  readoutEl.classList.remove("warn", "danger");
  if (pct >= 500) readoutEl.classList.add("danger");
  else if (pct >= 250) readoutEl.classList.add("warn");
}

function renderUI() {
  const pct = Math.round(settings.volume * 100);
  volumeEl.value = pct;
  volumeLabelEl.textContent = pct;
  paintReadout(pct);
  monoFixEl.checked = settings.monoFix;
  bassBoostEl.checked = settings.bassBoost;
  renderPower();
}

function anyActive() {
  return isActive || mixRate !== 1;
}

function renderPower() {
  const on = anyActive();
  powerEl.setAttribute("aria-checked", on ? "true" : "false");
  powerLabelEl.textContent = VBI18N.t(on ? "power_on" : "power_off");
}

function setStatus(kind, text) {
  statusEl.className = "status status-" + kind;
  statusTextEl.textContent = text;
}

function renderStatus() {
  const n = Math.round(settings.volume * 100);
  if (isActive && mixRate !== 1) {
    setStatus("ok", VBI18N.t("status_both", { n, m: mixRate.toFixed(2) }));
  } else if (isActive && mixFxOn()) {
    setStatus("ok", VBI18N.t("status_on_fx", { n }));
  } else if (isActive) {
    setStatus("ok", VBI18N.t("status_on", { n }));
  } else if (mixRate !== 1) {
    setStatus("ok", VBI18N.t("status_mix", { n: mixRate.toFixed(2) }));
  } else {
    setStatus("idle", VBI18N.t("status_off"));
  }
}

function activate() {
  return chrome.tabCapture
    .getMediaStreamId({ targetTabId: currentTabId })
    .then(
      (streamId) =>
        new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: "vb-start", tabId: currentTabId, streamId, settings },
            (resp) => resolve(resp || { active: false })
          );
        })
    )
    .catch((e) => ({ active: false, error: String(e) }));
}

function update() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "vb-update", tabId: currentTabId, settings },
      (resp) => resolve(resp || { active: false })
    );
  });
}

async function ensureActiveAndApply() {
  const resp = isActive ? await update() : await activate();
  isActive = !!resp.active;
  if (!resp.active) {
    setStatus("unsupported", VBI18N.t("status_unsupported"));
  } else {
    renderStatus();
    invalidateBackup();
  }
  renderPower();
  refreshTabs();
}

let volTimer = null;
let activating = false;

function liveUpdate() {
  if (volTimer) return;
  volTimer = setTimeout(() => {
    volTimer = null;
    update();
    renderStatus();
  }, 40);
}

volumeEl.addEventListener("input", async () => {
  settings.volume = Number(volumeEl.value) / 100;
  volumeLabelEl.textContent = volumeEl.value;
  paintReadout(Number(volumeEl.value));
  if (isActive) {
    liveUpdate();
  } else if (!activating) {
    activating = true;
    await ensureActiveAndApply();
    activating = false;
  }
});
volumeEl.addEventListener("change", () => {
  if (isActive) {
    update();
    renderStatus();
  }
});

document.querySelectorAll(".tick").forEach((btn) => {
  btn.addEventListener("click", () => {
    settings.volume = Number(btn.dataset.v) / 100;
    volumeEl.value = btn.dataset.v;
    volumeLabelEl.textContent = btn.dataset.v;
    paintReadout(Number(btn.dataset.v));
    ensureActiveAndApply();
  });
});

monoFixEl.addEventListener("change", () => {
  settings.monoFix = monoFixEl.checked;
  ensureActiveAndApply();
});
bassBoostEl.addEventListener("change", () => {
  settings.bassBoost = bassBoostEl.checked;
  ensureActiveAndApply();
});

ytAutoContinueEl.addEventListener("change", async () => {
  if (ytAutoContinueEl.checked) {
    chrome.storage.session.set({ vb_pending_yt: { ts: Date.now() } });
    let granted = false;
    try {
      granted = await chrome.permissions.request(YT_PERMS);
    } catch (e) {}
    chrome.storage.session.remove("vb_pending_yt");
    if (!granted) {
      ytAutoContinueEl.checked = false;
      return;
    }
    chrome.runtime.sendMessage({ type: "vb-set-yt", enabled: true }, () => void chrome.runtime.lastError);
  } else {
    chrome.runtime.sendMessage({ type: "vb-set-yt", enabled: false }, () => {
      void chrome.runtime.lastError;
      chrome.runtime.sendMessage({ type: "vb-yt-release" }, () => void chrome.runtime.lastError);
    });
  }
});

let skipArtistCount = 0;
let skipSongCount = 0;
chrome.storage.local.get(["skipArtists", "skipSongs"], (d) => {
  if (chrome.runtime.lastError || !d) return;
  if (Array.isArray(d.skipArtists)) skipArtistCount = d.skipArtists.length;
  if (Array.isArray(d.skipSongs)) skipSongCount = d.skipSongs.length;
});
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local") return;
  if (ch.skipArtists) skipArtistCount = Array.isArray(ch.skipArtists.newValue) ? ch.skipArtists.newValue.length : 0;
  if (ch.skipSongs) skipSongCount = Array.isArray(ch.skipSongs.newValue) ? ch.skipSongs.newValue.length : 0;
  if (ch.skipEnabled) skipToggleEl.checked = !!ch.skipEnabled.newValue;
});

skipToggleEl.addEventListener("change", async () => {
  if (skipToggleEl.checked) {
    if (!skipArtistCount && !skipSongCount) {
      skipToggleEl.checked = false;
      chrome.tabs.create({ url: chrome.runtime.getURL("settings.html#autoskip") });
      return;
    }
    chrome.storage.session.set({ vb_pending_skip: { ts: Date.now() } });
    let granted = false;
    try {
      granted = await chrome.permissions.request(SKIP_PERMS);
    } catch (e) {}
    chrome.storage.session.remove("vb_pending_skip");
    if (!granted) {
      skipToggleEl.checked = false;
      return;
    }
    chrome.runtime.sendMessage({ type: "vb-set-skip", enabled: true }, () => {
      void chrome.runtime.lastError;
      refreshBanRow();
    });
  } else {
    chrome.runtime.sendMessage({ type: "vb-set-skip", enabled: false }, () => {
      void chrome.runtime.lastError;
      chrome.runtime.sendMessage({ type: "vb-yt-release" }, () => void chrome.runtime.lastError);
    });
    refreshBanRow();
  }
});

const banRowEl = document.getElementById("banRow");
const banArtistEl = document.getElementById("banArtist");
const banBtnEl = document.getElementById("banBtn");
const SKIP_SITE_RX = /youtube\.com|open\.spotify\.com|soundcloud\.com/;
let banCurrent = null;

const banNorm = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function tabVideoId(url) {
  const s = String(url || "");
  const m = s.match(/[?&]v=([\w-]{8,})/) || s.match(/youtu\.be\/([\w-]{8,})/) || s.match(/\/shorts\/([\w-]{8,})/);
  return m ? m[1] : "";
}

function hideBanRow() {
  banRowEl.hidden = true;
  document.body.classList.remove("hasban");
}

function sameSong(s, cur) {
  if (!s) return false;
  if (s.id && s.id === cur.id) return true;
  return !!(s.t && banNorm(s.t) === banNorm(cur.t) && banNorm(s.a || "") === banNorm(cur.a || ""));
}

function refreshBanRow() {
  if (!banRowEl || currentTabId == null) return;
  if (!skipToggleEl.checked || !SKIP_SITE_RX.test(currentTabUrl)) {
    hideBanRow();
    return;
  }
  chrome.tabs.sendMessage(currentTabId, { type: "vb-skip-now" }, (r) => {
    if (chrome.runtime.lastError || !r || (!r.title && !r.artist)) {
      hideBanRow();
      return;
    }
    const artist = String(r.artist || "").replace(/\s+/g, " ").replace(/\s*-\s*Topic$/i, "").trim().slice(0, 80);
    const title = String(r.title || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!title) {
      hideBanRow();
      return;
    }
    const id = tabVideoId(currentTabUrl) || ("t:" + banNorm(title) + "|" + banNorm(artist)).slice(0, 80);
    banCurrent = { u: currentTabUrl, id, t: title, a: artist };
    banArtistEl.textContent = "♪ " + title;
    chrome.storage.local.get("skipSongs", (d) => {
      const arr = Array.isArray(d && d.skipSongs) ? d.skipSongs : [];
      const on = arr.some((s) => sameSong(s, banCurrent));
      banBtnEl.disabled = on;
      banBtnEl.textContent = VBI18N.t(on ? "skip_ban_done" : "skip_ban");
      banRowEl.hidden = false;
      document.body.classList.add("hasban");
    });
  });
}

if (banBtnEl) {
  banBtnEl.addEventListener("click", () => {
    if (!banCurrent) return;
    const cur = banCurrent;
    chrome.storage.local.get("skipSongs", (d) => {
      const arr = Array.isArray(d && d.skipSongs) ? d.skipSongs : [];
      if (arr.length >= 100) return;
      if (!arr.some((s) => sameSong(s, cur))) arr.push({ u: cur.u, id: cur.id, t: cur.t, a: cur.a });
      chrome.storage.local.set({ skipSongs: arr }, () => {
        banBtnEl.disabled = true;
        banBtnEl.textContent = VBI18N.t("skip_ban_done");
      });
    });
  });
}

setInterval(refreshBanRow, 2000);

function originPattern(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.protocol + "//" + u.host + "/*";
  } catch (e) {
    return null;
  }
}

function fxReverb() {
  return settings.reverb === true ? 0.5 : Number(settings.reverb) || 0;
}
function fxTreble() {
  return Number(settings.treble) || 0;
}
function fxBass() {
  return settings.bassBoost === true ? 0.75 : Number(settings.bassBoost) || 0;
}
function fxSpinSpeed() {
  return settings.spinSpeed == null ? 0.5 : Number(settings.spinSpeed) || 0;
}
function fxMuffle() {
  return Number(settings.muffle) || 0;
}
function fxVocal() {
  return Number(settings.vocal) || 0;
}
function fxPower() {
  return Number(settings.power) || 0;
}
function mixFxOn() {
  return fxReverb() > 0 || fxTreble() > 0 || fxMuffle() > 0 || fxVocal() > 0 || fxPower() > 0 || !!settings.spin;
}

function presetOf(btn) {
  return {
    rate: Number(btn.dataset.mix) || 1,
    reverb: Number(btn.dataset.reverb) || 0,
    treble: Number(btn.dataset.treble) || 0,
    muffle: Number(btn.dataset.muffle) || 0,
    vocal: Number(btn.dataset.vocal) || 0,
    power: Number(btn.dataset.power) || 0,
    spin: btn.dataset.spin === "1",
    spinSpeed: btn.dataset.spinspeed != null ? Number(btn.dataset.spinspeed) : null,
    bass: Number(btn.dataset.bass) || 0,
    bassMode: btn.dataset.bassmode || "classic",
    ctl: (btn.dataset.ctl || "speed").split(","),
  };
}

function showCtls(list) {
  for (const k in CTL_ROWS) {
    if (CTL_ROWS[k]) CTL_ROWS[k].hidden = !list.includes(k);
  }
}

function renderMix() {
  const pct = Math.round(mixRate * 100);
  mixSpeedEl.value = pct;
  mixReadoutEl.textContent = mixRate.toFixed(2) + "x";
  mixReadoutEl.classList.toggle("active", mixRate !== 1 || mixFxOn());
  const rev = fxReverb();
  const tre = fxTreble();
  const bas = fxBass();
  const spd = fxSpinSpeed();
  if (mixReverbEl) {
    mixReverbEl.value = Math.round(rev * 100);
    mixReverbValEl.textContent = Math.round(rev * 100) + "%";
  }
  if (mixTrebleEl) {
    mixTrebleEl.value = Math.round(tre * 100);
    mixTrebleValEl.textContent = Math.round(tre * 100) + "%";
  }
  const muf = fxMuffle();
  if (mixMuffleEl) {
    mixMuffleEl.value = Math.round(muf * 100);
    mixMuffleValEl.textContent = Math.round(muf * 100) + "%";
  }
  const voc = fxVocal();
  if (mixVocalEl) {
    mixVocalEl.value = Math.round(voc * 100);
    mixVocalValEl.textContent = Math.round(voc * 100) + "%";
  }
  const pow = fxPower();
  if (mixPowerEl) {
    mixPowerEl.value = Math.round(pow * 100);
    mixPowerValEl.textContent = Math.round(pow * 100) + "%";
  }
  if (mixBassEl) {
    mixBassEl.value = Math.round(bas * 100);
    mixBassValEl.textContent = Math.round(bas * 100) + "%";
  }
  if (mixSpinEl) {
    const spinShown = settings.spin ? spd : 0;
    mixSpinEl.value = Math.round(spinShown * 100);
    mixSpinValEl.textContent = Math.round(spinShown * 100) + "%";
  }
  const bassMode = settings.bassMode || "classic";
  document.querySelectorAll("#bassModeSeg button").forEach((b) => {
    b.classList.toggle("on", b.dataset.bm === bassMode);
  });
  let matched = null;
  allPresetEls().forEach((b) => {
    const p = presetOf(b);
    const on =
      Math.abs(p.rate - mixRate) < 0.001 &&
      Math.abs(p.reverb - rev) < 0.011 &&
      Math.abs(p.treble - tre) < 0.011 &&
      Math.abs(p.muffle - muf) < 0.011 &&
      Math.abs(p.vocal - voc) < 0.011 &&
      Math.abs(p.power - pow) < 0.011 &&
      Math.abs(p.bass - bas) < 0.011 &&
      (p.bass === 0 || p.bassMode === bassMode) &&
      p.spin === !!settings.spin &&
      (!p.spin || p.spinSpeed == null || Math.abs(p.spinSpeed - spd) < 0.011);
    b.classList.toggle("on", on);
    if (on && !matched) matched = p;
  });
  if (fullMix) {
    showCtls(["speed", "reverb", "treble", "muffle", "bass", "vocal", "power", "spin"]);
  } else if (matched) {
    showCtls(matched.ctl);
  } else {
    const all = ["speed", "reverb", "treble", "muffle", "bass", "vocal", "power"];
    if (settings.spin) all.push("spin");
    showCtls(all);
  }
  if (mixAppliedEl) {
    const parts = [];
    if (mixRate !== 1) parts.push(VBI18N.t("mix_speed_l") + " " + mixRate.toFixed(2) + "x");
    if (bas > 0) parts.push(VBI18N.t("mix_bass_l") + " " + Math.round(bas * 100) + "% " + VBI18N.t("bm_" + bassMode));
    if (rev > 0) parts.push(VBI18N.t("mix_reverb_l") + " " + Math.round(rev * 100) + "%");
    if (tre > 0) parts.push(VBI18N.t("mix_treble_l") + " " + Math.round(tre * 100) + "%");
    if (muf > 0) parts.push(VBI18N.t("mix_muffle_l") + " " + Math.round(muf * 100) + "%");
    if (voc > 0) parts.push(VBI18N.t("mix_vocal_l") + " " + Math.round(voc * 100) + "%");
    if (pow > 0) parts.push(VBI18N.t("mix_power_l") + " " + Math.round(pow * 100) + "%");
    if (settings.spin) parts.push("8D " + Math.round(spd * 100) + "%");
    mixAppliedEl.textContent = parts.join(", ");
    mixAppliedEl.hidden = !parts.length;
  }
  let badge = "";
  if (mixRate !== 1) badge = mixRate.toFixed(2) + "x";
  if (settings.spin) badge = badge ? badge + " 8D" : "8D";
  else if (!badge && mixFxOn()) badge = "FX";
  mixOpenStateEl.textContent = badge;
  mixOpenStateEl.hidden = !badge;
  mixOpenEl.classList.toggle("active", !!badge);
  renderPower();
}

function openMix() {
  mainViewEl.hidden = true;
  mixViewEl.hidden = false;
  document.body.classList.add("mixing");
  startMixPoll();
}
function closeMix() {
  mixViewEl.hidden = true;
  mainViewEl.hidden = false;
  document.body.classList.remove("mixing");
  window.scrollTo(0, 0);
  stopMixPoll();
}

function knownUnsupportedHost(url) {
  try {
    return /(^|\.)spotify\.com$/i.test(new URL(url).host);
  } catch (e) {
    return false;
  }
}

function setMixStatus(kind) {
  mixWarnEl.className = "mix-status";
  let text = "";
  if (kind === "ok") {
    mixWarnEl.classList.add("ok");
    text = "✓ " + VBI18N.t("mix_ok");
  } else if (kind === "ready") {
    mixWarnEl.classList.add("ok");
    text = "✓ " + VBI18N.t("mix_ready");
  } else if (kind === "idle") {
    mixWarnEl.classList.add("info");
    text = VBI18N.t("mix_idle");
  } else if (kind === "unavailable") {
    mixWarnEl.classList.add("bad");
    text = "⚠ " + VBI18N.t("mix_unavailable");
  } else if (kind === "norate") {
    mixWarnEl.classList.add("bad");
    text = "⚠ " + VBI18N.t("mix_rate_unavailable");
  } else if (kind === "checking") {
    mixWarnEl.classList.add("info");
    text = VBI18N.t("mix_checking");
  } else {
    mixWarnEl.hidden = true;
    return;
  }
  mixWarnEl.textContent = text;
  mixWarnEl.hidden = false;
}

let mixNoneStreak = 0;
function refreshMixStatus() {
  if (!mixSupported) return setMixStatus("unavailable");
  if (mixHostUnsupported) return setMixStatus("norate");
  if (mixRate === 1) {
    chrome.tabs.get(currentTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) return setMixStatus("off");
      setMixStatus(tab.audible ? "ready" : "idle");
    });
    return;
  }
  chrome.tabs.sendMessage(currentTabId, { type: "vb-mix-probe" }, { frameId: 0 }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.status) {
      setMixStatus("checking");
      return;
    }
    if (resp.status === "none") {
      mixNoneStreak++;
      setMixStatus(mixNoneStreak >= 2 ? "norate" : "checking");
    } else {
      mixNoneStreak = 0;
      setMixStatus(resp.status);
    }
  });
}

let mixPollTimer = null;
function startMixPoll() {
  stopMixPoll();
  mixNoneStreak = 0;
  refreshMixStatus();
  mixPollTimer = setInterval(refreshMixStatus, 1000);
}
function stopMixPoll() {
  if (mixPollTimer) {
    clearInterval(mixPollTimer);
    mixPollTimer = null;
  }
}

function renderMixSupport() {
  const rateOk = mixSupported && !mixHostUnsupported;
  const fxOk = mixSupported;
  mixSpeedEl.disabled = !rateOk;
  allPresetEls().forEach((b) => {
    const needsRate = (Number(b.dataset.mix) || 1) !== 1;
    b.disabled = needsRate ? !rateOk : !fxOk;
  });
  if (mixReverbEl) mixReverbEl.disabled = !fxOk;
  if (mixTrebleEl) mixTrebleEl.disabled = !fxOk;
  if (mixMuffleEl) mixMuffleEl.disabled = !fxOk;
  if (mixVocalEl) mixVocalEl.disabled = !fxOk;
  if (mixPowerEl) mixPowerEl.disabled = !fxOk;
  mixHintEl.hidden = !fxOk;
}

let mixBusy = false;
async function setMixRate(rate) {
  if (mixBusy) return;
  if (!mixSupported && rate !== 1) return;
  mixBusy = true;
  try {
    if (rate !== 1) {
      const origin = originPattern(currentTabUrl);
      if (!origin) {
        mixSupported = false;
        renderMixSupport();
        renderMix();
        return;
      }
      const need = { permissions: ["scripting"], origins: [origin] };
      chrome.storage.session.set({
        vb_pending_mix: { tabId: currentTabId, rate, origin, ts: Date.now() },
      });
      let granted = false;
      try {
        granted = await chrome.permissions.request(need);
      } catch (e) {}
      if (!granted) {
        chrome.storage.session.remove("vb_pending_mix");
        renderMix();
        return;
      }
      chrome.storage.session.remove("vb_pending_mix");
      mixRate = rate;
      renderMix();
      await sendMsg({ type: "vb-mix-set", tabId: currentTabId, rate, origin });
      invalidateBackup();
    } else {
      mixRate = 1;
      renderMix();
      await sendMsg({ type: "vb-mix-set", tabId: currentTabId, rate: 1 });
    }
    renderStatus();
    mixNoneStreak = 0;
    refreshMixStatus();
  } finally {
    mixBusy = false;
  }
}

mixOpenEl.addEventListener("click", openMix);
mixBackEl.addEventListener("click", closeMix);
builtinPresetEls.forEach((b) => b.addEventListener("click", () => applyMixPreset(presetOf(b))));

const USER_MIX_LIMIT = 8;
const mixPresetsUserEl = document.getElementById("mixPresetsUser");
const mixTabPresetsEl = document.getElementById("mixTabPresets");
const mixTabMineEl = document.getElementById("mixTabMine");
const mixBuiltinWrapEl = document.getElementById("mixPresetsBuiltin");
const mixMineWrapEl = document.getElementById("mixMine");
const mixMineEmptyEl = document.getElementById("mixMineEmpty");
const mixAddTileEl = document.getElementById("mixAddTile");
const mixSaveBtn = document.getElementById("mixSaveBtn");
const mixSaveForm = document.getElementById("mixSaveForm");
const mixSaveNameEl = document.getElementById("mixSaveName");
const mixSaveOk = document.getElementById("mixSaveOk");
const mixSaveCancel = document.getElementById("mixSaveCancel");
const mixSaveNote = document.getElementById("mixSaveNote");

function persistUserMixes() {
  chrome.storage.local.set({ vbUserMixes: userMixes });
}

function userMixCtl(m) {
  const ctl = ["speed"];
  if (m.reverb > 0) ctl.push("reverb");
  if (m.treble > 0) ctl.push("treble");
  if (m.muffle > 0) ctl.push("muffle");
  if (m.bass > 0) ctl.push("bass");
  if (m.vocal > 0) ctl.push("vocal");
  if (m.power > 0) ctl.push("power");
  if (m.spin) ctl.push("spin");
  return ctl.join(",");
}

function renderUserMixes() {
  userPresetEls.forEach((b) => b.remove());
  userPresetEls = [];
  userMixes.forEach((m, idx) => {
    const b = document.createElement("button");
    b.className = "mixp userp";
    b.dataset.mix = String(m.rate || 1);
    b.dataset.reverb = String(m.reverb || 0);
    b.dataset.treble = String(m.treble || 0);
    b.dataset.muffle = String(m.muffle || 0);
    b.dataset.vocal = String(m.vocal || 0);
    b.dataset.power = String(m.power || 0);
    b.dataset.bass = String(m.bass || 0);
    b.dataset.bassmode = m.bassMode || "classic";
    if (m.spin) {
      b.dataset.spin = "1";
      b.dataset.spinspeed = String(m.spinSpeed == null ? DEFAULTS.spinSpeed : m.spinSpeed);
    }
    b.dataset.ctl = userMixCtl(m);
    const name = document.createElement("span");
    name.className = "userp-name";
    name.textContent = m.name;
    b.title = m.name;
    b.appendChild(name);
    const del = document.createElement("span");
    del.className = "userp-del";
    del.textContent = "×";
    del.title = VBI18N.t("mix_user_del");
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      userMixes.splice(idx, 1);
      persistUserMixes();
      renderUserMixes();
      updateMixSaveUI();
    });
    b.appendChild(del);
    b.addEventListener("click", () => applyMixPreset(presetOf(b)));
    mixPresetsUserEl.appendChild(b);
    userPresetEls.push(b);
  });
  mixMineEmptyEl.hidden = userMixes.length > 0;
  renderMixSupport();
  renderMix();
}

let mixTab = "presets";
function switchMixTab(tab, persist) {
  mixTab = tab === "mine" ? "mine" : "presets";
  mixTabPresetsEl.classList.toggle("on", mixTab === "presets");
  mixTabMineEl.classList.toggle("on", mixTab === "mine");
  mixBuiltinWrapEl.hidden = mixTab !== "presets";
  mixMineWrapEl.hidden = mixTab !== "mine";
  if (persist !== false) chrome.storage.local.set({ vbMixTab: mixTab });
}
mixTabPresetsEl.addEventListener("click", () => switchMixTab("presets"));
mixTabMineEl.addEventListener("click", () => switchMixTab("mine"));

function openMixSaveForm() {
  mixSaveBtn.hidden = true;
  mixSaveForm.hidden = false;
  mixSaveNameEl.value = "";
  mixSaveNameEl.focus();
}

mixAddTileEl.addEventListener("click", () => {
  switchMixTab("mine");
  if (userMixes.length < USER_MIX_LIMIT) openMixSaveForm();
});

function updateMixSaveUI() {
  const full = userMixes.length >= USER_MIX_LIMIT;
  mixSaveBtn.disabled = full;
  mixSaveNote.hidden = !full;
}

function closeMixSaveForm() {
  mixSaveForm.hidden = true;
  mixSaveBtn.hidden = false;
}

function saveCurrentMix() {
  const name = (mixSaveNameEl.value || "").trim().slice(0, 18);
  if (!name) {
    mixSaveNameEl.focus();
    return;
  }
  if (userMixes.length >= USER_MIX_LIMIT) {
    closeMixSaveForm();
    updateMixSaveUI();
    return;
  }
  userMixes.push({
    name,
    rate: mixRate,
    reverb: fxReverb(),
    treble: fxTreble(),
    muffle: fxMuffle(),
    vocal: fxVocal(),
    power: fxPower(),
    spin: !!settings.spin,
    spinSpeed: fxSpinSpeed(),
    bass: fxBass(),
    bassMode: settings.bassMode || "classic",
  });
  persistUserMixes();
  closeMixSaveForm();
  renderUserMixes();
  updateMixSaveUI();
}

mixSaveBtn.addEventListener("click", openMixSaveForm);
mixSaveCancel.addEventListener("click", closeMixSaveForm);
mixSaveOk.addEventListener("click", saveCurrentMix);
mixSaveNameEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveCurrentMix();
  else if (e.key === "Escape") closeMixSaveForm();
});

let mixPresetBusy = false;
let pendingMixPreset = null;
async function applyMixPreset(p) {
  if (mixPresetBusy) {
    pendingMixPreset = p;
    return;
  }
  mixPresetBusy = true;
  try {
    const needEngine = p.reverb > 0 || p.treble > 0 || p.muffle > 0 || p.vocal > 0 || p.power > 0 || p.spin || p.bass > 0;
    settings.reverb = p.reverb;
    settings.treble = p.treble;
    settings.muffle = p.muffle;
    settings.vocal = p.vocal;
    settings.power = p.power;
    settings.spin = p.spin;
    settings.bassBoost = p.bass;
    if (p.bass > 0) settings.bassMode = p.bassMode;
    settings.spinSpeed = p.spinSpeed != null ? p.spinSpeed : DEFAULTS.spinSpeed;
    if (needEngine) {
      await ensureActiveAndApply();
    } else if (isActive) {
      update();
      renderStatus();
    }
    renderUI();
    renderMix();
    await setMixRate(p.rate);
  } finally {
    mixPresetBusy = false;
    const next = pendingMixPreset;
    pendingMixPreset = null;
    if (next && next !== p) applyMixPreset(next);
  }
}

mixSpeedEl.addEventListener("input", () => {
  mixReadoutEl.textContent = (Number(mixSpeedEl.value) / 100).toFixed(2) + "x";
});
mixSpeedEl.addEventListener("change", () => setMixRate(Number(mixSpeedEl.value) / 100));

let fxTimer = null;
function fxLive() {
  if (!isActive || fxTimer) return;
  fxTimer = setTimeout(() => {
    fxTimer = null;
    update();
  }, 60);
}
function wireFxSlider(el, valEl, key) {
  if (!el) return;
  el.addEventListener("input", () => {
    valEl.textContent = el.value + "%";
    settings[key] = Number(el.value) / 100;
    fxLive();
  });
  el.addEventListener("change", async () => {
    settings[key] = Number(el.value) / 100;
    if (!isActive && settings.volume === 1 && !settings.monoFix && !fxBass() && !mixFxOn()) {
      renderUI();
      renderMix();
      return;
    }
    await ensureActiveAndApply();
    renderUI();
    renderMix();
  });
}
wireFxSlider(mixReverbEl, mixReverbValEl, "reverb");
wireFxSlider(mixTrebleEl, mixTrebleValEl, "treble");
wireFxSlider(mixMuffleEl, mixMuffleValEl, "muffle");
wireFxSlider(mixVocalEl, mixVocalValEl, "vocal");
wireFxSlider(mixPowerEl, mixPowerValEl, "power");
wireFxSlider(mixBassEl, mixBassValEl, "bassBoost");

if (mixSpinEl) {
  mixSpinEl.addEventListener("input", () => {
    mixSpinValEl.textContent = mixSpinEl.value + "%";
    const v = Number(mixSpinEl.value) / 100;
    settings.spin = v > 0;
    if (v > 0) settings.spinSpeed = v;
    fxLive();
  });
  mixSpinEl.addEventListener("change", async () => {
    const v = Number(mixSpinEl.value) / 100;
    settings.spin = v > 0;
    if (v > 0) settings.spinSpeed = v;
    if (!isActive && settings.volume === 1 && !settings.monoFix && !fxBass() && !mixFxOn()) {
      renderUI();
      renderMix();
      return;
    }
    await ensureActiveAndApply();
    renderUI();
    renderMix();
  });
}

document.querySelectorAll("#bassModeSeg button").forEach((b) => {
  b.addEventListener("click", async () => {
    settings.bassMode = b.dataset.bm || "classic";
    if (fxBass() === 0) settings.bassBoost = 0.6;
    await ensureActiveAndApply();
    renderUI();
    renderMix();
  });
});

let fullMix = false;
if (fullMixEl) {
  chrome.storage.local.get("vbFullMix", (d) => {
    fullMix = !!d.vbFullMix;
    fullMixEl.checked = fullMix;
    renderMix();
  });
  fullMixEl.addEventListener("change", () => {
    fullMix = fullMixEl.checked;
    chrome.storage.local.set({ vbFullMix: fullMix });
    renderMix();
  });
}

let powerBusy = false;
powerEl.addEventListener("click", async () => {
  if (powerBusy) return;
  powerBusy = true;
  powerEl.setAttribute("aria-busy", "true");
  try {
    if (!anyActive()) {
      if (!(await restoreBackup())) await ensureActiveAndApply();
    } else {
      const prevRate = mixRate;
      if (isActive) {
        const prev = { ...settings };
        await new Promise((resolve) =>
          chrome.runtime.sendMessage({ type: "vb-stop", tabId: currentTabId }, () => {
            void chrome.runtime.lastError;
            resolve();
          })
        );
        isActive = false;
        if (prevRate !== 1 || prev.volume !== 1 || prev.monoFix || prev.bassBoost || prev.reverb || prev.treble || prev.muffle || prev.vocal || prev.power || prev.spin) {
          backupSettings = { ...prev };
          if (prevRate !== 1) backupSettings.mixRate = prevRate;
        }
        settings = { ...DEFAULTS };
      } else if (prevRate !== 1) {
        await sendMsg({ type: "vb-snapshot", tabId: currentTabId });
        backupSettings = { ...DEFAULTS, mixRate: prevRate };
      }
      if (mixRate !== 1) await setMixRate(1);
      renderUI();
      renderMix();
      renderStatus();
      renderRestore();
      refreshTabs();
    }
  } finally {
    powerBusy = false;
    powerEl.removeAttribute("aria-busy");
  }
});

resetBtn.addEventListener("click", async () => {
  settings = { ...DEFAULTS };
  renderUI();
  renderMix();
  if (isActive) {
    update();
    renderStatus();
  }
  if (mixRate !== 1) setMixRate(1);
  if (ytAutoContinueEl.checked || skipToggleEl.checked) {
    ytAutoContinueEl.checked = false;
    skipToggleEl.checked = false;
    chrome.runtime.sendMessage({ type: "vb-set-yt", enabled: false }, () => {
      void chrome.runtime.lastError;
      chrome.runtime.sendMessage({ type: "vb-set-skip", enabled: false }, () => {
        void chrome.runtime.lastError;
        chrome.runtime.sendMessage({ type: "vb-yt-release" }, () => void chrome.runtime.lastError);
      });
    });
  }
});

function refreshTabs() {
  chrome.runtime.sendMessage({ type: "vb-audible" }, (resp) => {
    if (chrome.runtime.lastError || !resp) return;
    renderTabs(resp.tabs || []);
  });
}

function renderTabs(tabs) {
  tabsListEl.innerHTML = "";
  if (!tabs.length) {
    const li = document.createElement("li");
    li.className = "tabs-empty";
    li.textContent = VBI18N.t("tabs_empty");
    tabsListEl.appendChild(li);
    return;
  }
  tabs.forEach((t) => {
    const li = document.createElement("li");
    li.className = "tab-item" + (t.boosted ? " boosted" : "");
    li.title = t.title;
    const dot = document.createElement("span");
    dot.className = "t-dot";
    const title = document.createElement("span");
    title.className = "t-title";
    title.textContent = t.title;
    const toggle = document.createElement("button");
    toggle.className = "t-toggle" + (t.boosted ? " on" : "");
    toggle.textContent = t.boosted ? "ON" : "OFF";
    toggle.title = t.boosted ? "" : t.backup ? Math.round((t.backup.volume || 1) * 100) + "%" : "";
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTab(t, toggle);
    });
    li.appendChild(dot);
    li.appendChild(title);
    li.appendChild(toggle);
    li.addEventListener("click", () => {
      chrome.tabs.update(t.tabId, { active: true });
      window.close();
    });
    tabsListEl.appendChild(li);
  });
}

let tabToggleBusy = false;
async function toggleTab(t, btn) {
  if (tabToggleBusy) return;
  tabToggleBusy = true;
  btn.disabled = true;
  try {
    if (t.boosted) {
      await sendMsg({ type: "vb-stop", tabId: t.tabId });
    } else {
      let streamId = null;
      try {
        streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: t.tabId });
      } catch (e) {}
      if (streamId) {
        const s = t.backup ? { ...DEFAULTS, ...t.backup } : { ...DEFAULTS };
        await sendMsg({ type: "vb-start", tabId: t.tabId, streamId, settings: s });
        if (t.backup) await sendMsg({ type: "vb-clear-backup", tabId: t.tabId });
      }
    }
    if (t.tabId === currentTabId) await syncCurrent();
  } finally {
    tabToggleBusy = false;
    refreshTabs();
  }
}

function sendMsg(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (resp) => {
      void chrome.runtime.lastError;
      resolve(resp);
    });
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) {
    setStatus("unsupported", VBI18N.t("status_cant_read"));
    return;
  }
  currentTabId = tab.id;
  currentTabUrl = tab.url || "";
  mixSupported = !!originPattern(currentTabUrl);
  mixHostUnsupported = knownUnsupportedHost(currentTabUrl);
  renderMixSupport();

  chrome.storage.local.get(["vbUserMixes", "vbMixTab", "vbPresetNames"], (d) => {
    userMixes = Array.isArray(d.vbUserMixes) ? d.vbUserMixes : [];
    renderUserMixes();
    updateMixSaveUI();
    if (d.vbMixTab === "mine" && userMixes.length) switchMixTab("mine", false);
    const names = d.vbPresetNames || {};
    builtinPresetEls.forEach((b) => {
      const key = b.getAttribute("data-i18n");
      if (key && names[key]) b.textContent = names[key];
    });
  });

  chrome.storage.local.get(["vbMaxVol", "vbBassMode"], (d) => {
    const mv = Number(d.vbMaxVol) || 700;
    if (mv < 700) {
      volumeEl.max = mv;
      document.querySelectorAll(".tick").forEach((b) => {
        b.hidden = Number(b.dataset.v) > mv;
      });
    }
    if (["classic", "sub", "punch", "rumble", "808", "warm"].includes(d.vbBassMode)) {
      DEFAULTS.bassMode = d.vbBassMode;
      if (!fxBass()) {
        settings.bassMode = d.vbBassMode;
        renderMix();
      }
    }
  });

  chrome.runtime.sendMessage({ type: "vb-get", tabId: currentTabId }, (resp) => {
    ytAutoContinueEl.checked = !!(resp && resp.ytAutoContinue);
    skipToggleEl.checked = !!(resp && resp.skipEnabled);
    refreshBanRow();
    if (resp) applyCurrentState(resp);
    if (resp && !resp.active && resp.settings) {
      const s = resp.settings;
      if (s.volume !== 1 || s.monoFix || s.bassBoost || s.reverb || s.treble || s.muffle || s.vocal || s.power || s.spin) {
        ensureActiveAndApply();
      }
    }
  });

  refreshTabs();
  tabsTimer = setInterval(refreshTabs, 2500);
}

function applyCurrentState(resp) {
  if (resp.settings) settings = { ...DEFAULTS, ...resp.settings };
  if (!fxBass()) settings.bassMode = DEFAULTS.bassMode;
  isActive = !!resp.active;
  backupSettings = resp.backup || null;
  if (resp.mix != null) {
    mixRate = resp.mix || 1;
    renderMix();
  }
  renderUI();
  renderStatus();
  renderRestore();
}

function syncCurrent() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "vb-get", tabId: currentTabId }, (resp) => {
      if (!chrome.runtime.lastError && resp) applyCurrentState(resp);
      resolve();
    });
  });
}

window.addEventListener("unload", () => {
  if (tabsTimer) clearInterval(tabsTimer);
  stopMixPoll();
});

VBI18N.ready(init);
