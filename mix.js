// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(() => {
  if (window.__vbMix) {
    window.__vbMix.refresh();
    return;
  }

  const state = { rate: 1, pitchOff: true };

  function setPitch(el, off) {
    try { el.preservesPitch = !off; } catch (e) {}
    try { el.mozPreservesPitch = !off; } catch (e) {}
    try { el.webkitPreservesPitch = !off; } catch (e) {}
  }

  function applyTo(el) {
    setPitch(el, state.pitchOff);
    try { el.defaultPlaybackRate = state.rate; } catch (e) {}
    if (Math.abs((el.playbackRate || 1) - state.rate) > 0.001) {
      try { el.playbackRate = state.rate; } catch (e) {}
    }
  }

  const track = new WeakMap();

  function drift(el) {
    if (el.paused || el.seeking || el.readyState < 3 || !isFinite(el.duration)) {
      track.delete(el);
      return;
    }
    const now = performance.now();
    const ct = el.currentTime;
    const rec = track.get(el);
    if (!rec) {
      track.set(el, { t: ct, w: now, bad: 0, kicks: 0 });
      return;
    }
    const dw = (now - rec.w) / 1000;
    if (dw < 0.4) return;
    const measured = (ct - rec.t) / dw;
    rec.t = ct;
    rec.w = now;
    const exp = state.rate;
    if (measured > 0.05 && Math.abs(measured - exp) / exp > 0.04 && Math.abs(measured - exp) > 0.02) {
      rec.bad++;
    } else {
      rec.bad = 0;
    }
    if (rec.bad >= 4 && rec.kicks < 2) {
      rec.bad = 0;
      rec.kicks++;
      try {
        el.playbackRate = state.rate;
        if (el.duration - ct > 1) el.currentTime = ct + 0.01;
      } catch (e) {}
    }
  }

  function applyAll() {
    document.querySelectorAll("video, audio").forEach((el) => {
      applyTo(el);
      drift(el);
    });
  }

  let burstTimers = [];
  function clearBurst() {
    burstTimers.forEach(clearTimeout);
    burstTimers = [];
  }
  function burst() {
    clearBurst();
    burstTimers = [0, 60, 150, 320, 600, 1000, 1600].map((d) => setTimeout(applyAll, d));
  }

  function computeStatus() {
    const media = document.querySelectorAll("video, audio");
    if (!media.length) return "none";
    let anyPlaying = false;
    media.forEach((el) => {
      if (!el.paused && el.readyState >= 2) anyPlaying = true;
    });
    return anyPlaying ? "ok" : "idle";
  }

  const SRC_EVENTS = { loadstart: 1, emptied: 1, loadedmetadata: 1, canplay: 1, durationchange: 1 };
  function onMedia(e) {
    const el = e.target;
    if (!el || (el.tagName !== "VIDEO" && el.tagName !== "AUDIO")) return;
    applyTo(el);
    if (SRC_EVENTS[e.type]) {
      track.delete(el);
      burst();
    }
  }
  const MEDIA_EVENTS = ["ratechange", "play", "playing", "loadstart", "loadeddata", "loadedmetadata", "canplay", "seeked", "emptied", "durationchange"];

  const mo = new MutationObserver((records) => {
    applyAll();
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n && (n.tagName === "VIDEO" || n.tagName === "AUDIO" || (n.querySelector && n.querySelector("video, audio")))) {
          burst();
          return;
        }
      }
    }
  });

  let armed = false;
  let iv = null;
  let rc = null;
  let rcStrikes = 0;

  function recheckTick() {
    try {
      chrome.runtime.sendMessage({ type: "vb-mix-get" }, (resp) => {
        if (chrome.runtime.lastError) {
          rcStrikes++;
          if (rcStrikes >= 3) teardown();
          return;
        }
        rcStrikes = 0;
        if (!resp || resp.off || !resp.rate || resp.rate === 1) {
          teardown();
          return;
        }
        state.rate = resp.rate;
        state.pitchOff = resp.pitchOff !== false;
      });
    } catch (e) {
      teardown();
    }
  }

  function arm() {
    if (armed) return;
    armed = true;
    MEDIA_EVENTS.forEach((ev) => document.addEventListener(ev, onMedia, true));
    try {
      mo.observe(document.documentElement || document, { childList: true, subtree: true });
    } catch (e) {}
    iv = setInterval(applyAll, 500);
    rcStrikes = 0;
    rc = setInterval(recheckTick, 4000);
  }

  function disarm() {
    if (!armed) return;
    armed = false;
    clearInterval(iv);
    clearInterval(rc);
    clearBurst();
    try { mo.disconnect(); } catch (e) {}
    MEDIA_EVENTS.forEach((ev) => document.removeEventListener(ev, onMedia, true));
  }

  function teardown() {
    disarm();
    document.querySelectorAll("video, audio").forEach((el) => {
      setPitch(el, false);
      try { el.defaultPlaybackRate = 1; } catch (e) {}
      try { el.playbackRate = 1; } catch (e) {}
    });
  }

  function engage(rate, pitchOff) {
    state.rate = rate;
    state.pitchOff = pitchOff;
    arm();
    applyAll();
    burst();
  }

  function refresh() {
    chrome.runtime.sendMessage({ type: "vb-mix-get" }, (resp) => {
      if (chrome.runtime.lastError || !resp) return;
      if (resp.off || !resp.rate || resp.rate === 1) {
        teardown();
        return;
      }
      engage(resp.rate, resp.pitchOff !== false);
    });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "vb-mix-probe") {
      sendResponse({ status: computeStatus() });
      return;
    }
    if (msg.type === "vb-mix-apply") {
      if (msg.off || !msg.rate || msg.rate === 1) {
        teardown();
        sendResponse({ ok: true });
        return;
      }
      engage(msg.rate, msg.pitchOff !== false);
      sendResponse({ ok: true });
    }
  });

  window.__vbMix = { refresh, state };
  refresh();
})();
