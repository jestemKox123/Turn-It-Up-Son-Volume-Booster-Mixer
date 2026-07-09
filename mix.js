// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

// Tryb Mix: ustawia playbackRate i preservesPitch=false na elementach
// <video>/<audio> strony (wysokosc idzie w gore razem z tempem - efekt
// nightcore/sped up). Wstrzykiwany tylko na stronach, na ktore uzytkownik
// dal zgode; nie czyta ani nie zmienia niczego poza predkoscia odtwarzacza.

(() => {
  // Jeden kontroler na dokument; ponowne wstrzykniecie tylko odswieza stan.
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
    // Roznica > 0.001 chroni przed petla (playbackRate sam wywoluje ratechange).
    if (Math.abs((el.playbackRate || 1) - state.rate) > 0.001) {
      try { el.playbackRate = state.rate; } catch (e) {}
    }
  }

  function applyAll() {
    document.querySelectorAll("video, audio").forEach(applyTo);
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

  // Playery (YouTube itp.) resetuja playbackRate przy zmianie utworu -
  // te zdarzenia pozwalaja od razu ja przywrocic.
  function onMedia(e) {
    const el = e.target;
    if (!el || (el.tagName !== "VIDEO" && el.tagName !== "AUDIO")) return;
    applyTo(el);
  }
  const MEDIA_EVENTS = ["ratechange", "play", "playing", "loadeddata", "loadedmetadata", "canplay", "seeked"];
  MEDIA_EVENTS.forEach((ev) => document.addEventListener(ev, onMedia, true));

  const mo = new MutationObserver(() => applyAll());
  try {
    mo.observe(document.documentElement || document, { childList: true, subtree: true });
  } catch (e) {}

  const iv = setInterval(applyAll, 500);

  function teardown() {
    clearInterval(iv);
    try { mo.disconnect(); } catch (e) {}
    MEDIA_EVENTS.forEach((ev) => document.removeEventListener(ev, onMedia, true));
    document.querySelectorAll("video, audio").forEach((el) => {
      setPitch(el, false);
      try { el.playbackRate = 1; } catch (e) {}
    });
    delete window.__vbMix;
  }

  function refresh() {
    chrome.runtime.sendMessage({ type: "vb-mix-get" }, (resp) => {
      if (chrome.runtime.lastError || !resp) return;
      if (resp.off || !resp.rate || resp.rate === 1) {
        teardown();
        return;
      }
      state.rate = resp.rate;
      state.pitchOff = resp.pitchOff !== false;
      applyAll();
    });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    // Sonda z popupu: ok = cos gra, idle = odtwarzacz stoi, none = brak medium.
    if (msg.type === "vb-mix-probe") {
      sendResponse({ status: computeStatus() });
      return;
    }
    if (msg.type === "vb-mix-apply") {
      if (msg.off || !msg.rate || msg.rate === 1) {
        teardown();
        return;
      }
      state.rate = msg.rate;
      state.pitchOff = msg.pitchOff !== false;
      applyAll();
    }
  });

  window.__vbMix = { refresh, state };
  refresh();
})();
