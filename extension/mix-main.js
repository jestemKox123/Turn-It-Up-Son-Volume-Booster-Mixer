// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(() => {
  if (window.__vbMixMain) {
    window.postMessage({ __vb: "mix-hello" }, "*");
    return;
  }
  window.__vbMixMain = true;

  const P = HTMLMediaElement.prototype;
  const desc = (k) => Object.getOwnPropertyDescriptor(P, k);
  const dRate = desc("playbackRate");
  const dDef = desc("defaultPlaybackRate");
  const dPitch = desc("preservesPitch");
  const dTime = desc("currentTime");
  const nativePlay = P.play;

  const S = { on: false, rate: 1, pitchOff: true };
  const seen = new WeakSet();
  const held = new WeakMap();
  const drift = new WeakMap();
  let refs = [];
  let lastStatus = "";
  let tick = null;

  const rateOf = (el) => dRate.get.call(el);
  const isLive = (el) => el.duration === Infinity;

  function track(el) {
    if (!el || seen.has(el) || el.nodeType !== 1) return;
    seen.add(el);
    refs.push(new WeakRef(el));
    EVENTS.forEach((ev) => el.addEventListener(ev, onEvent, true));
    if (S.on) hold(el);
  }

  function hold(el) {
    if (isLive(el)) {
      release(el);
      return;
    }
    let st = held.get(el);
    if (!st) {
      st = { rate: rateOf(el), def: dDef.get.call(el), pitch: dPitch ? dPitch.get.call(el) : true };
      held.set(el, st);
      try {
        Object.defineProperty(el, "playbackRate", { configurable: true, get: () => st.rate, set: (v) => { st.rate = Number(v) || 1; } });
        Object.defineProperty(el, "defaultPlaybackRate", { configurable: true, get: () => st.def, set: (v) => { st.def = Number(v) || 1; } });
        if (dPitch) Object.defineProperty(el, "preservesPitch", { configurable: true, get: () => st.pitch, set: (v) => { st.pitch = !!v; } });
      } catch (e) {}
    }
    enforce(el);
  }

  function enforce(el) {
    try {
      if (dPitch && dPitch.get.call(el) === S.pitchOff) dPitch.set.call(el, !S.pitchOff);
      if (dDef.get.call(el) !== S.rate) dDef.set.call(el, S.rate);
      if (Math.abs(rateOf(el) - S.rate) > 0.001) dRate.set.call(el, S.rate);
    } catch (e) {}
  }

  function release(el) {
    const st = held.get(el);
    if (!st) return;
    held.delete(el);
    drift.delete(el);
    try {
      delete el.playbackRate;
      delete el.defaultPlaybackRate;
      delete el.preservesPitch;
    } catch (e) {}
    try {
      if (dPitch) dPitch.set.call(el, st.pitch !== false);
      dDef.set.call(el, st.def > 0 ? st.def : 1);
      dRate.set.call(el, st.rate > 0 ? st.rate : 1);
    } catch (e) {}
  }

  function checkDrift(el) {
    if (el.paused || el.seeking || el.readyState < 3 || !isFinite(el.duration)) {
      drift.delete(el);
      return;
    }
    const now = performance.now();
    const ct = dTime.get.call(el);
    const rec = drift.get(el);
    if (!rec) {
      drift.set(el, { t: ct, w: now, bad: 0, kicks: 0 });
      return;
    }
    const dw = (now - rec.w) / 1000;
    if (dw < 0.4) return;
    const measured = (ct - rec.t) / dw;
    rec.t = ct;
    rec.w = now;
    const exp = S.rate;
    if (measured > 0.05 && Math.abs(measured - exp) / exp > 0.04 && Math.abs(measured - exp) > 0.02) rec.bad++;
    else rec.bad = 0;
    if (rec.bad >= 4 && rec.kicks < 2) {
      rec.bad = 0;
      rec.kicks++;
      try {
        dRate.set.call(el, S.rate);
        if (el.duration - ct > 1) dTime.set.call(el, ct + 0.01);
      } catch (e) {}
    }
  }

  function alive() {
    const out = [];
    refs = refs.filter((r) => {
      const el = r.deref();
      if (el) out.push(el);
      return !!el;
    });
    return out;
  }

  function scan() {
    try {
      document.querySelectorAll("video, audio").forEach(track);
    } catch (e) {}
  }

  function status() {
    const els = alive();
    if (!els.length) return "none";
    const playing = els.filter((el) => !el.paused && el.readyState >= 2 && !el.muted && el.volume > 0);
    if (playing.some((el) => !isLive(el))) return "ok";
    return playing.length ? "live" : "idle";
  }

  function report() {
    const s = status();
    if (s === lastStatus) return;
    lastStatus = s;
    window.postMessage({ __vb: "mix-status", status: s }, "*");
  }

  function loop() {
    scan();
    if (S.on) {
      for (const el of alive()) {
        hold(el);
        checkDrift(el);
      }
    }
    report();
  }

  const EVENTS = ["loadstart", "loadedmetadata", "durationchange", "ratechange", "play", "playing", "seeked", "emptied", "canplay"];
  function onEvent(e) {
    const el = e.target;
    if (!(el instanceof HTMLMediaElement)) return;
    track(el);
    if (S.on) {
      hold(el);
      if (e.type === "loadstart" || e.type === "emptied" || e.type === "seeked") drift.delete(el);
    }
    if (e.type === "play" || e.type === "playing" || e.type === "emptied") report();
  }

  P.play = function () {
    track(this);
    return nativePlay.apply(this, arguments);
  };
  Object.defineProperty(P, "currentTime", {
    configurable: dTime.configurable,
    enumerable: dTime.enumerable,
    get() {
      track(this);
      return dTime.get.call(this);
    },
    set(v) {
      track(this);
      dTime.set.call(this, v);
    },
  });

  EVENTS.forEach((ev) => document.addEventListener(ev, onEvent, true));

  function apply(on, rate, pitchOff) {
    const r = Number(rate);
    const next = !!on && r >= 0.25 && r <= 4 && Math.abs(r - 1) > 0.001;
    if (next) {
      S.on = true;
      S.rate = r;
      S.pitchOff = pitchOff !== false;
      scan();
      alive().forEach(hold);
      clearInterval(tick);
      tick = setInterval(loop, 500);
      [60, 200, 600, 1500].forEach((d) => setTimeout(loop, d));
    } else {
      S.on = false;
      alive().forEach(release);
      clearInterval(tick);
      tick = setInterval(report, 1500);
    }
    report();
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.__vb !== "mix-set") return;
    apply(e.data.on, e.data.rate, e.data.pitchOff);
    lastStatus = "";
    report();
  });

  tick = setInterval(report, 1500);
  window.postMessage({ __vb: "mix-hello" }, "*");
})();
