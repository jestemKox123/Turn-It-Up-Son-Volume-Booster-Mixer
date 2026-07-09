// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

// Silnik audio: jeden wspolny AudioContext, osobny lancuch wezlow na kazda karte,
// suma przez wspolny limiter (MASTER) na wyjscie.

// Wiekszy bufor audio = mniej przebudzen CPU; opoznienie reakcji jest niezauwazalne.
const CTX = new AudioContext({ latencyHint: "playback" });
const engines = new Map(); // tabId -> engine

const FADE_IN = 0.35; // s
const GLIDE = 0.06; // s - plynne dochodzenie do nowej glosnosci
const TREBLE_MAX_DB = 8;
const SPIN_DEPTH = 0.85; // szerokosc krazenia 8D (0..1)

// Wspolny limiter: niesluszalny przy normalnym poziomie, dociska szczyty
// przy mocnym podbiciu zamiast pozwolic na trzeszczenie.
const MASTER = CTX.createDynamicsCompressor();
MASTER.threshold.value = -4;
MASTER.knee.value = 6;
MASTER.ratio.value = 16;
MASTER.attack.value = 0.003;
MASTER.release.value = 0.2;
MASTER.connect(CTX.destination);

// Odpowiedz impulsowa poglosu generowana raz, algorytmicznie: stereo szum
// z wykladniczym zanikiem, pre-delayem i ciemniejacym ogonem. Kanaly maja
// osobny szum, dzieki czemu poglos jest szeroki.
let IMPULSE = null;
function getImpulse() {
  if (IMPULSE) return IMPULSE;
  const seconds = 2.8;
  const decay = 2.6;
  const rate = CTX.sampleRate;
  const len = Math.floor(rate * seconds);
  const preDelay = Math.floor(rate * 0.02);
  IMPULSE = CTX.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = IMPULSE.getChannelData(ch);
    let lp = 0;
    for (let i = preDelay; i < len; i++) {
      const t = (i - preDelay) / (len - preDelay);
      const white = Math.random() * 2 - 1;
      const alpha = 0.85 - 0.7 * t;
      lp += alpha * (white - lp);
      d[i] = lp * Math.pow(1 - t, decay);
    }
  }
  return IMPULSE;
}

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

// reverb bywa zapisany jako true (stare dane) albo liczba 0..1 (suwak).
function reverbAmount(v) {
  return v === true ? 0.5 : clamp01(v);
}

function buildEngine(stream, settings) {
  const source = CTX.createMediaStreamSource(stream);
  const splitter = CTX.createChannelSplitter(2);
  const merger = CTX.createChannelMerger(2);
  const gLL = CTX.createGain();
  const gLR = CTX.createGain();
  const gRL = CTX.createGain();
  const gRR = CTX.createGain();

  const bass = CTX.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;
  bass.gain.value = 0;

  // Drugi filtr basu (charaktery Sub/Punch uzywaja dwoch pasm).
  const bass2 = CTX.createBiquadFilter();
  bass2.type = "peaking";
  bass2.frequency.value = 250;
  bass2.gain.value = 0;

  // Saturacja dolu pasma: rownolegla galaz lowpass -> waveshaper -> gain.
  // Generuje harmoniczne basu, przez ktore czuc go tez na malych glosnikach.
  const subLP = CTX.createBiquadFilter();
  subLP.type = "lowpass";
  subLP.frequency.value = 130;
  subLP.Q.value = 0.7;
  const shaper = CTX.createWaveShaper();
  shaper.curve = getHarmCurve();
  shaper.oversample = "2x";
  const harmGain = CTX.createGain();
  harmGain.gain.value = 0;

  const treble = CTX.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = 3200;
  treble.gain.value = 0;

  // Tlumik: lowpass "zza sciany". Przy 20 kHz calkowicie neutralny.
  const muffle = CTX.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.value = 20000;
  muffle.Q.value = 0.5;

  // Wokal: peaking w srodku pasma (~2.4 kHz), gdzie siedzi obecnosc glosu.
  const vocal = CTX.createBiquadFilter();
  vocal.type = "peaking";
  vocal.frequency.value = 2400;
  vocal.Q.value = 1.1;
  vocal.gain.value = 0;

  // Moc: kompresor per karta (radiowa glosnosc) + makeup gain. Przy ratio 1
  // i makeup 1 jest neutralny.
  const comp = CTX.createDynamicsCompressor();
  comp.threshold.value = 0;
  comp.knee.value = 10;
  comp.ratio.value = 1;
  comp.attack.value = 0.006;
  comp.release.value = 0.18;
  const makeup = CTX.createGain();
  makeup.gain.value = 1;

  // Efekt 8D: oscylator steruje panorama przez gain-glebokosc.
  const pan = CTX.createStereoPanner();
  const lfo = CTX.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.13;
  const lfoDepth = CTX.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth);
  lfoDepth.connect(pan.pan);
  lfo.start();

  const boost = CTX.createGain();
  boost.gain.value = 1;

  // Poglos: convolver NIE jest tu podpinany (najdrozszy wezel Web Audio,
  // liczy nawet dla ciszy) - wpina go applyReverb dopiero, gdy poglos gra.
  const dry = CTX.createGain();
  dry.gain.value = 1;
  const wet = CTX.createGain();
  wet.gain.value = 0;
  const conv = CTX.createConvolver();

  source.connect(splitter);
  splitter.connect(gLL, 0);
  splitter.connect(gLR, 0);
  splitter.connect(gRL, 1);
  splitter.connect(gRR, 1);
  gLL.connect(merger, 0, 0);
  gRL.connect(merger, 0, 0);
  gLR.connect(merger, 0, 1);
  gRR.connect(merger, 0, 1);
  merger.connect(bass);
  bass.connect(bass2);
  bass2.connect(treble);
  merger.connect(subLP);
  subLP.connect(shaper);
  shaper.connect(harmGain);
  harmGain.connect(treble);
  treble.connect(muffle);
  muffle.connect(vocal);
  vocal.connect(comp);
  comp.connect(makeup);
  makeup.connect(pan);
  pan.connect(boost);
  boost.connect(dry);
  dry.connect(MASTER);

  const engine = {
    stream, source, gLL, gLR, gRL, gRR,
    bass, bass2, subLP, shaper, harmGain, treble, muffle, vocal, comp, makeup, pan, lfo, lfoDepth,
    boost, dry, wet, conv,
    convOn: false,
    convOffTimer: null,
    settings,
  };
  applyMono(engine, settings.monoFix);
  applyBass(engine, settings.bassBoost, settings.bassMode);
  applyTreble(engine, settings.treble);
  applyMuffle(engine, settings.muffle);
  applyVocal(engine, settings.vocal);
  applyPower(engine, settings.power);
  applyReverb(engine, settings.reverb);
  applySpin(engine, settings.spin, settings.spinSpeed);

  // Plynne przejscie od 1.0 do docelowej glosnosci, bez dipu do ciszy.
  const now = CTX.currentTime;
  boost.gain.cancelScheduledValues(now);
  boost.gain.setValueAtTime(1, now);
  boost.gain.linearRampToValueAtTime(Math.max(0.0001, settings.volume), now + FADE_IN);
  return engine;
}

function applyMono(engine, monoOn) {
  const t = CTX.currentTime;
  const set = (n, v) => n.gain.setTargetAtTime(v, t, 0.03);
  if (monoOn) {
    set(engine.gLL, 0.5); set(engine.gRR, 0.5); set(engine.gLR, 0.5); set(engine.gRL, 0.5);
  } else {
    set(engine.gLL, 1); set(engine.gRR, 1); set(engine.gLR, 0); set(engine.gRL, 0);
  }
}

// Trzy charaktery basu: kazdy to dwa filtry + saturacja (harmoniczne).
//  - classic: szeroki, cieply lift calego dolu,
//  - sub: gleboki pomruk 45-70 Hz (sluchawki / subwoofer),
//  - punch: waskie kopniecie stopy + lekki dolek wyzej dla kontrastu.
const BASS_MODES = {
  classic: {
    f1: { type: "lowshelf", freq: 200, q: 0.9, max: 15 },
    f2: { type: "peaking", freq: 250, q: 1.0, max: 0 },
    harm: 0.35,
  },
  sub: {
    f1: { type: "lowshelf", freq: 70, q: 0.8, max: 18 },
    f2: { type: "peaking", freq: 45, q: 1.0, max: 7 },
    harm: 0.3,
  },
  punch: {
    f1: { type: "peaking", freq: 100, q: 1.4, max: 14 },
    f2: { type: "peaking", freq: 260, q: 1.4, max: -4 },
    harm: 0.55,
  },
};

let HARM_CURVE = null;
function getHarmCurve() {
  if (HARM_CURVE) return HARM_CURVE;
  const n = 1024;
  HARM_CURVE = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    HARM_CURVE[i] = Math.tanh(2.5 * x);
  }
  return HARM_CURVE;
}

function setFilter(f, cfg, v, t) {
  f.type = cfg.type;
  f.frequency.setTargetAtTime(cfg.freq, t, 0.03);
  f.Q.value = cfg.q;
  f.gain.setTargetAtTime(cfg.max * v, t, 0.05);
}

function applyBass(engine, on, mode) {
  const m = BASS_MODES[mode] || BASS_MODES.classic;
  const t = CTX.currentTime;
  // true (przelacznik w glownym widoku) = 3/4 mocy trybu; liczba 0..1 (suwak).
  const v = on === true ? 0.75 : clamp01(on);
  setFilter(engine.bass, m.f1, v, t);
  setFilter(engine.bass2, m.f2, v, t);
  engine.harmGain.gain.setTargetAtTime(m.harm * v, t, 0.05);
}

function applyTreble(engine, v) {
  engine.treble.gain.setTargetAtTime(TREBLE_MAX_DB * clamp01(v), CTX.currentTime, 0.05);
}

// Tlumik 0..1 -> czestotliwosc odciecia w skali wykladniczej: 0 = 18 kHz
// (neutralnie), 1 = ~400 Hz (mocno zza sciany).
function applyMuffle(engine, v) {
  const a = clamp01(v);
  const f = 18000 * Math.pow(0.022, a);
  engine.muffle.frequency.setTargetAtTime(f, CTX.currentTime, 0.06);
}

// Wokal 0..1 -> do +8 dB obecnosci glosu w srodku pasma.
function applyVocal(engine, v) {
  engine.vocal.gain.setTargetAtTime(8 * clamp01(v), CTX.currentTime, 0.05);
}

// Moc 0..1: im wyzej, tym nizszy prog i wyzsze ratio kompresora, a makeup
// oddaje sciśnieta glosnosc z nawiazka - efekt "radiowego" kopa. Sume i tak
// pilnuje limiter MASTER.
function applyPower(engine, v) {
  const a = clamp01(v);
  const t = CTX.currentTime;
  engine.comp.threshold.setTargetAtTime(a > 0 ? -14 - 14 * a : 0, t, 0.05);
  engine.comp.ratio.setTargetAtTime(1 + 7 * a, t, 0.05);
  engine.makeup.gain.setTargetAtTime(1 + 1.1 * a, t, 0.06);
}

function applyReverb(engine, v) {
  const amount = reverbAmount(v);
  const t = CTX.currentTime;
  if (amount > 0) {
    clearTimeout(engine.convOffTimer);
    if (!engine.convOn) {
      if (!engine.conv.buffer) engine.conv.buffer = getImpulse();
      engine.boost.connect(engine.conv);
      engine.conv.connect(engine.wet);
      engine.wet.connect(MASTER);
      engine.convOn = true;
    }
  }
  // Sucha sciezke lekko przyciszamy, gdy poglos gra, zeby suma nie przesterowywala.
  engine.wet.gain.setTargetAtTime(amount, t, 0.08);
  engine.dry.gain.setTargetAtTime(1 - 0.3 * amount, t, 0.08);
  if (amount === 0 && engine.convOn) {
    // Wypnij convolver po wybrzmieniu ogona (impuls ma 2.8 s) - przestaje kosztowac CPU.
    clearTimeout(engine.convOffTimer);
    engine.convOffTimer = setTimeout(() => {
      if (!engine.convOn) return;
      if (reverbAmount(engine.settings.reverb) > 0) return;
      try {
        engine.boost.disconnect(engine.conv);
        engine.conv.disconnect();
        engine.wet.disconnect();
      } catch (e) {}
      engine.convOn = false;
    }, 3200);
  }
}

function applySpin(engine, on, speed) {
  const t = CTX.currentTime;
  engine.lfoDepth.gain.setTargetAtTime(on ? SPIN_DEPTH : 0, t, 0.4);
  // Suwak "Krazenie" (0..1) -> 0.05-0.45 Hz obrotu.
  const v = speed == null ? 0.5 : clamp01(speed);
  engine.lfo.frequency.setTargetAtTime(0.05 + 0.4 * v, t, 0.2);
}

function applySettings(engine, settings) {
  engine.settings = settings;
  const now = CTX.currentTime;
  const g = engine.boost.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.setTargetAtTime(Math.max(0.0001, settings.volume), now, GLIDE);
  applyMono(engine, settings.monoFix);
  applyBass(engine, settings.bassBoost, settings.bassMode);
  applyTreble(engine, settings.treble);
  applyMuffle(engine, settings.muffle);
  applyVocal(engine, settings.vocal);
  applyPower(engine, settings.power);
  applyReverb(engine, settings.reverb);
  applySpin(engine, settings.spin, settings.spinSpeed);
}

function teardown(tabId) {
  const engine = engines.get(tabId);
  if (!engine) return;
  engines.delete(tabId);
  const now = CTX.currentTime;
  try {
    engine.boost.gain.cancelScheduledValues(now);
    engine.boost.gain.setValueAtTime(engine.boost.gain.value, now);
    engine.boost.gain.linearRampToValueAtTime(0.0001, now + 0.2);
  } catch (e) {}
  clearTimeout(engine.convOffTimer);
  setTimeout(() => {
    try { engine.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    try { engine.lfo.stop(); } catch (e) {}
    try {
      engine.source.disconnect();
      engine.lfo.disconnect();
      engine.lfoDepth.disconnect();
      engine.boost.disconnect();
      engine.dry.disconnect();
      engine.conv.disconnect();
      engine.wet.disconnect();
    } catch (e) {}
  }, 260);
}

async function start(tabId, streamId, settings) {
  // Karta juz przechwytywana: drugi getUserMedia by sie wywalil, wystarczy update.
  const existing = engines.get(tabId);
  if (existing) {
    applySettings(existing, settings);
    return true;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
      video: false,
    });
  } catch (e) {
    chrome.runtime.sendMessage({ type: "vb-ended", tabId });
    return false;
  }
  if (CTX.state === "suspended") { try { await CTX.resume(); } catch (e) {} }
  const engine = buildEngine(stream, settings);
  engines.set(tabId, engine);
  stream.getAudioTracks().forEach((track) => {
    track.addEventListener("ended", () => {
      teardown(tabId);
      chrome.runtime.sendMessage({ type: "vb-ended", tabId });
    });
  });
  return true;
}

function activeTabIds() {
  return Array.from(engines.keys());
}

// W dokumencie offscreen getManifest nie istnieje - stopka zostaje pusta.
const verEl = document.getElementById("ver");
if (verEl && chrome.runtime && typeof chrome.runtime.getManifest === "function") {
  verEl.textContent = "v" + chrome.runtime.getManifest().version;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== "engine") return;
  if (msg.type === "vb-start") {
    start(msg.tabId, msg.streamId, msg.settings).then((ok) =>
      sendResponse({ ok, tabIds: activeTabIds() })
    );
    return true;
  }
  if (msg.type === "vb-update") {
    const engine = engines.get(msg.tabId);
    if (engine) applySettings(engine, msg.settings);
    sendResponse({ ok: !!engine, tabIds: activeTabIds() });
    return false;
  }
  if (msg.type === "vb-stop") {
    teardown(msg.tabId);
    sendResponse({ ok: true, tabIds: activeTabIds() });
    return false;
  }
  if (msg.type === "vb-list") {
    sendResponse({ tabIds: activeTabIds() });
    return false;
  }
  return false;
});
