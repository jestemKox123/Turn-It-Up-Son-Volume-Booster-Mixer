// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

if (!window.__vbSkip) {
  window.__vbSkip = true;

  let vbEnabled = false;
  let everywhere = false;
  let lastAskAt = 0;
  let list = [];
  let listRx = [];
  let startRx = [];
  let songs = [];
  let curArtist = "";
  let curTitle = "";
  let curState = "";
  let skippedKey = "";
  let lastSkipAt = 0;
  let streak = 0;

  const norm = (s) =>
    (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[łŁ]/g, "l")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const clean = (s) => s.replace(/\s*-\s*topic$/, "").replace(/\s*vevo$/, "").trim();

  const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordRx = (s) => new RegExp("(^|[^a-z0-9])" + escRx(s) + "($|[^a-z0-9])");

  function rebuild(arr) {
    list = (Array.isArray(arr) ? arr : []).map((x) => clean(norm(x))).filter(Boolean);
    listRx = list.map((e) => wordRx(e));
    startRx = list.map((e) => new RegExp("^" + escRx(e) + "($|[^a-z0-9])"));
  }

  function rebuildSongs(arr) {
    songs = (Array.isArray(arr) ? arr : [])
      .map((s) => {
        const a = clean(norm(s && s.a));
        let t = norm(s && s.t);
        if (a && t.endsWith(" by " + a)) t = t.slice(0, -(" by " + a).length).trim();
        return { id: s && typeof s.id === "string" ? s.id : "", t, a };
      })
      .filter((s) => s.id || s.t);
  }

  try {
    chrome.storage.local.get(["skipEnabled", "skipEverywhere", "skipArtists", "skipSongs"], (d) => {
      if (chrome.runtime.lastError || !d) return;
      vbEnabled = !!d.skipEnabled;
      everywhere = !!d.skipEverywhere;
      rebuild(d.skipArtists);
      rebuildSongs(d.skipSongs);
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== "local") return;
      if (ch.skipEnabled) vbEnabled = !!ch.skipEnabled.newValue;
      if (ch.skipEverywhere) everywhere = !!ch.skipEverywhere.newValue;
      if (ch.skipArtists) rebuild(ch.skipArtists.newValue);
      if (ch.skipSongs) rebuildSongs(ch.skipSongs.newValue);
    });
  } catch (e) {}

  const SEP = /,|;|&|·|•|\bfeat\.?\b|\bft\.?\b/;

  function videoId() {
    const s = String(window.location.href || "");
    const m = s.match(/[?&]v=([\w-]{8,})/) || s.match(/youtu\.be\/([\w-]{8,})/) || s.match(/\/(?:shorts|live|embed)\/([\w-]{8,})/);
    return m ? m[1] : "";
  }

  function pageIds() {
    const ids = [];
    const v = videoId();
    if (v) ids.push(v);
    const host = String(window.location.hostname || "");
    const path = String(window.location.pathname || "");
    if (/(^|\.)spotify\.com$/.test(host)) {
      const m = path.match(/\/track\/([A-Za-z0-9]+)/);
      if (m) ids.push(m[1]);
    }
    if (/(^|\.)soundcloud\.com$/.test(host)) {
      const parts = path.split("/").filter(Boolean);
      if (parts.length >= 2 && parts[1] !== "sets") ids.push(parts[0] + "/" + parts[1]);
    }
    return ids;
  }

  function songMatch(artist, title) {
    if (!songs.length) return false;
    const ids = pageIds();
    const t = norm(title);
    const a = clean(norm(artist));
    for (const s of songs) {
      if (s.id && ids.includes(s.id)) return true;
      if (s.t && t && s.t === t) {
        if (!s.a || !a || s.a === a) return true;
        if (wordRx(s.a).test(a) || wordRx(a).test(s.a)) return true;
      }
    }
    return false;
  }

  function matches(artist, title) {
    if (songMatch(artist, title)) return true;
    if (!list.length) return false;
    const full = clean(norm(artist));
    const segs = norm(artist)
      .split(SEP)
      .map((s) => clean(s.trim()))
      .filter(Boolean);
    const t = norm(title);
    const parts = t.split(/\s[-–—|]\s|:\s/).map((x) => x.trim()).filter(Boolean);
    const multi = parts.length > 1;
    const feats = (t.match(/\b(?:feat\.?|ft\.?|featuring|prod\.?(?:\s+by)?)\s+[^()[\]]+/g) || []).join(" ");
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (full && (full === e || listRx[i].test(full))) return true;
      for (const s of segs) {
        if (s === e) return true;
      }
      if (t && startRx[i].test(t)) return true;
      if (multi && listRx[i].test(parts[0])) return true;
      if (parts.some((x) => x === e)) return true;
      if (feats && listRx[i].test(feats)) return true;
    }
    return false;
  }

  const clickable = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.disabled) return false;
    if (el.getAttribute && el.getAttribute("aria-disabled") === "true") return false;
    return true;
  };

  function findMedia() {
    const els = document.querySelectorAll("video, audio");
    let best = null;
    for (const el of els) {
      if (!(el.duration > 0) || !isFinite(el.duration)) continue;
      if (!el.paused) return el;
      if (!best) best = el;
    }
    return best;
  }

  const NEXT_SELECTORS = [
    ".ytp-next-button",
    "ytmusic-player-bar .next-button",
    "[data-testid='control-button-skip-forward']",
    ".playControls__next",
    ".skipControl__next",
  ];

  function doSkip() {
    for (const sel of NEXT_SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const btn = el.tagName === "BUTTON" ? el : el.querySelector("button") || el;
      if (!clickable(btn)) continue;
      try {
        btn.click();
        return true;
      } catch (e) {}
    }
    const m = findMedia();
    if (m && isFinite(m.duration) && m.duration > 0) {
      try {
        m.currentTime = Math.max(0, m.duration - 0.05);
        return true;
      } catch (e) {}
    }
    return false;
  }

  const keyOf = () => norm(curArtist) + "|#|" + norm(curTitle);

  const resetStreak = (e) => {
    if (e && e.isTrusted === false) return;
    streak = 0;
  };
  window.addEventListener("pointerdown", resetStreak, true);
  window.addEventListener("keydown", resetStreak, true);

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.source !== "vb-skip-meta") return;
    curArtist = String(d.artist || "");
    curTitle = String(d.title || "");
    curState = String(d.state || "");
    if ((curArtist || curTitle) && !matches(curArtist, curTitle)) streak = 0;
  });

  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === "vb-skip-now" && (curArtist || curTitle)) {
        sendResponse({ artist: curArtist, title: curTitle });
      }
      return false;
    });
  } catch (e) {}

  function fireSkip(key) {
    if (!vbEnabled || keyOf() !== key || key === skippedKey) return;
    const now = Date.now();
    if (now - lastSkipAt < 1500) return;
    if (streak >= 10) return;
    skippedKey = key;
    lastSkipAt = now;
    streak++;
    if (!doSkip()) {
      setTimeout(() => {
        if (vbEnabled && keyOf() === key) doSkip();
      }, 1000);
    }
  }

  function tick() {
    if (!vbEnabled) return;
    if (!curArtist && !curTitle) return;
    if (curState === "paused") return;
    const key = keyOf();
    if (key === skippedKey) return;
    if (!matches(curArtist, curTitle)) return;
    if (!everywhere) {
      const now = Date.now();
      if (now - lastAskAt < 2000) return;
      lastAskAt = now;
      try {
        chrome.runtime.sendMessage({ type: "vb-skip-allowed" }, (r) => {
          if (chrome.runtime.lastError) return;
          if (r && r.ok) fireSkip(key);
        });
      } catch (e) {}
      return;
    }
    fireSkip(key);
  }

  setInterval(tick, 500);
}
