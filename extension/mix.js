// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(() => {
  if (window.__vbMix) {
    window.__vbMix.refresh();
    return;
  }

  const state = { rate: 1, pitchOff: true };
  let engaged = false;
  let mainOk = false;
  let mainStatus = null;

  function toMain() {
    try {
      window.postMessage({ __vb: "mix-set", on: engaged, rate: state.rate, pitchOff: state.pitchOff }, "*");
    } catch (e) {}
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data) return;
    if (e.data.__vb === "mix-hello") {
      mainOk = true;
      stopFallback();
      if (engaged) toMain();
    } else if (e.data.__vb === "mix-status") {
      mainOk = true;
      stopFallback();
      mainStatus = e.data.status;
    }
  });

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
  const kicks = new WeakMap();

  function drift(el) {
    if (el.paused || el.seeking || el.readyState < 3 || !isFinite(el.duration)) {
      track.delete(el);
      return;
    }
    const now = performance.now();
    const ct = el.currentTime;
    const rec = track.get(el);
    if (!rec) {
      track.set(el, { t: ct, w: now, bad: 0 });
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
    if (rec.bad >= 4) {
      rec.bad = 0;
      const src = el.currentSrc || "";
      const k = kicks.get(el);
      const done = k && k.src === src ? k.n : 0;
      if (done >= 2) return;
      kicks.set(el, { src, n: done + 1 });
      try {
        el.playbackRate = state.rate;
        if (el.duration - ct > 1) el.currentTime = ct + 0.01;
      } catch (e) {}
    }
  }

  function applyAll() {
    if (mainOk || !fallback) return;
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
    if (mainOk) return mainStatus || "checking";
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
    if (mainOk || !fallback) return;
    const el = e.target;
    if (!el || (el.tagName !== "VIDEO" && el.tagName !== "AUDIO")) return;
    applyTo(el);
    if (SRC_EVENTS[e.type]) {
      track.delete(el);
      burst();
    }
  }
  const MEDIA_EVENTS = ["ratechange", "play", "playing", "loadstart", "loadeddata", "loadedmetadata", "canplay", "seeked", "emptied", "durationchange"];

  let moTimer = null;
  const mo = new MutationObserver(() => {
    if (moTimer) return;
    moTimer = setTimeout(() => {
      moTimer = null;
      applyAll();
    }, 250);
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
        const changed = state.rate !== resp.rate || state.pitchOff !== (resp.pitchOff !== false);
        state.rate = resp.rate;
        state.pitchOff = resp.pitchOff !== false;
        if (changed) toMain();
      });
    } catch (e) {
      teardown();
    }
  }

  let fallback = false;
  let fbTimer = null;
  function startFallback() {
    fbTimer = null;
    if (fallback || mainOk || !armed) return;
    fallback = true;
    MEDIA_EVENTS.forEach((ev) => document.addEventListener(ev, onMedia, true));
    try {
      mo.observe(document.documentElement || document, { childList: true, subtree: true });
    } catch (e) {}
    iv = setInterval(applyAll, 500);
    applyAll();
    burst();
  }

  function stopFallback() {
    clearTimeout(fbTimer);
    fbTimer = null;
    if (!fallback) return;
    fallback = false;
    clearInterval(iv);
    clearBurst();
    try { mo.disconnect(); } catch (e) {}
    MEDIA_EVENTS.forEach((ev) => document.removeEventListener(ev, onMedia, true));
  }

  function arm() {
    if (armed) return;
    armed = true;
    if (!mainOk && !fallback && !fbTimer) fbTimer = setTimeout(startFallback, 700);
    rcStrikes = 0;
    rc = setInterval(recheckTick, 4000);
  }

  function disarm() {
    if (!armed) return;
    armed = false;
    clearInterval(rc);
    stopFallback();
  }

  function teardown() {
    disarm();
    engaged = false;
    toMain();
    if (mainOk) return;
    document.querySelectorAll("video, audio").forEach((el) => {
      setPitch(el, false);
      try { el.defaultPlaybackRate = 1; } catch (e) {}
      try { el.playbackRate = 1; } catch (e) {}
    });
  }

  function engage(rate, pitchOff) {
    state.rate = rate;
    state.pitchOff = pitchOff;
    engaged = true;
    toMain();
    arm();
    applyAll();
    burst();
  }

  function refresh() {
    try {
      chrome.runtime.sendMessage({ type: "vb-mix-get" }, (resp) => {
        if (chrome.runtime.lastError || !resp) return;
        if (resp.off || !resp.rate || resp.rate === 1) {
          teardown();
          return;
        }
        engage(resp.rate, resp.pitchOff !== false);
      });
    } catch (e) {}
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

  window.__vbMix = { refresh };
  window.postMessage({ __vb: "mix-ping" }, "*");
  refresh();
})();
