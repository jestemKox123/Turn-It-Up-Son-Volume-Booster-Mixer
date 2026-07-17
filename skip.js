// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

if (!window.__vbSkip) {
  window.__vbSkip = true;

  let vbEnabled = false;
  let everywhere = false;
  let lastAskAt = 0;
  let list = [];
  let listRx = [];
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
      .replace(/ł/g, "l")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const clean = (s) => s.replace(/\s*-\s*topic$/, "").replace(/\s*vevo$/, "").trim();

  const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordRx = (s) => new RegExp("(^|[^a-z0-9])" + escRx(s) + "($|[^a-z0-9])");

  function rebuild(arr) {
    list = (Array.isArray(arr) ? arr : []).map((x) => clean(norm(x))).filter(Boolean);
    listRx = list.map((e) => wordRx(e));
  }

  function rebuildSongs(arr) {
    songs = (Array.isArray(arr) ? arr : [])
      .map((s) => ({
        id: s && typeof s.id === "string" ? s.id : "",
        t: norm(s && s.t),
        a: clean(norm(s && s.a)),
      }))
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

  function songMatch(artist, title) {
    if (!songs.length) return false;
    const href = String(window.location.href || "");
    const t = norm(title);
    const a = clean(norm(artist));
    for (const s of songs) {
      if (s.id && href.indexOf(s.id) !== -1) return true;
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
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (full && (full === e || listRx[i].test(full))) return true;
      for (const s of segs) {
        if (s === e) return true;
      }
      if (t && listRx[i].test(t)) return true;
    }
    return false;
  }

  const visible = (el) => {
    if (!el) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
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
      if (visible(el)) {
        const inner = el.tagName === "BUTTON" ? el : el.querySelector("button");
        (inner || el).click();
        return true;
      }
    }
    const m = findMedia();
    if (m) {
      try {
        m.currentTime = Math.max(0, m.duration - 0.1);
        return true;
      } catch (e) {}
    }
    return false;
  }

  const keyOf = () => norm(curArtist) + "|#|" + norm(curTitle);

  const resetStreak = () => {
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
