// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(() => {
  if (window.__vbSkipMain) return;
  window.__vbSkipMain = true;

  let last = "";

  function check() {
    let artist = "";
    let title = "";
    let state = "";
    try {
      const ms = navigator.mediaSession;
      if (ms) {
        state = String(ms.playbackState || "");
        const m = ms.metadata;
        if (m) {
          artist = String(m.artist || "");
          title = String(m.title || "");
        }
      }
    } catch (e) {}
    const key = artist + "|#|" + title + "|#|" + state;
    if (key === last) return;
    last = key;
    try {
      window.postMessage({ source: "vb-skip-meta", artist, title, state }, "*");
    } catch (e) {}
  }

  setInterval(check, 700);
  check();
})();
