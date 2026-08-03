// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(function (root) {
  const FADE_IN = 0.15;
  const GLIDE = 0.06;
  const TREBLE_MAX_DB = 8;
  const SPIN_DEPTH = 0.85;
  const ITD_BASE = 0.0003;
  const ITD_MOD = 0.0003;
  const SHADOW_DB = 3;
  const XOVER_HZ = 150;
  const LOOKAHEAD = 0.005;
  const SAT_K = 0.93;
  const ROT_Q = 0.7071067811865476;

  const BASS_MODES = {
    classic: {
      f1: { type: "lowshelf", freq: 190, q: 0.85, max: 10 },
      f2: { type: "peaking", freq: 60, q: 1.0, max: 3.5 },
      harm: 0.5,
      mk: 1,
    },
    sub: {
      f1: { type: "lowshelf", freq: 70, q: 0.8, max: 12 },
      f2: { type: "peaking", freq: 45, q: 1.0, max: 4 },
      harm: 0.18,
      mk: 1,
    },
    punch: {
      f1: { type: "peaking", freq: 95, q: 1.6, max: 11 },
      f2: { type: "peaking", freq: 280, q: 1.2, max: -6 },
      harm: 0.7,
      mk: 1.06,
    },
    rumble: {
      f1: { type: "lowshelf", freq: 42, q: 0.9, max: 15 },
      f2: { type: "peaking", freq: 180, q: 1.0, max: -7 },
      harm: 0.5,
      mk: 1.05,
    },
    "808": {
      f1: { type: "peaking", freq: 55, q: 1.1, max: 11.5 },
      f2: { type: "lowshelf", freq: 130, q: 0.8, max: 3.5 },
      harm: 0.8,
      mk: 1,
    },
    warm: {
      f1: { type: "lowshelf", freq: 280, q: 0.55, max: 8 },
      f2: { type: "peaking", freq: 100, q: 0.9, max: 4 },
      harm: 0.08,
      mk: 1,
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

  let WALL_CURVE = null;
  function makeWallCurve() {
    if (WALL_CURVE) return WALL_CURVE;
    const n = 16384;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      const a = x < 0 ? -x : x;
      const r = a * 2;
      const yr = r <= SAT_K ? r : SAT_K + (1 - SAT_K) * Math.tanh((r - SAT_K) / (1 - SAT_K));
      const y = yr * 0.5;
      c[i] = x < 0 ? -y : y;
    }
    WALL_CURVE = c;
    return c;
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

  function reverbAmount(v) {
    return v === true ? 0.5 : clamp01(v);
  }

  function limCeil(v) {
    return typeof v === "number" ? Math.max(-6, Math.min(0, v)) : 0;
  }

  function createMaster(ctx) {
    const MASTER = ctx.createGain();
    MASTER.gain.value = 1;

    const HEAD = ctx.createGain();
    const rotDry = ctx.createGain();
    const rotWet = ctx.createGain();
    rotDry.gain.value = 1;
    rotWet.gain.value = 0;
    const rot = ctx.createBiquadFilter();
    rot.type = "allpass";
    rot.frequency.value = XOVER_HZ;
    rot.Q.value = ROT_Q;
    MASTER.connect(rotDry);
    rotDry.connect(HEAD);
    MASTER.connect(rot);
    rot.connect(rotWet);
    rotWet.connect(HEAD);

    const lowSplit = ctx.createBiquadFilter();
    lowSplit.type = "lowpass";
    lowSplit.frequency.value = XOVER_HZ;
    lowSplit.Q.value = 0.707;

    const lowInvert = ctx.createGain();
    lowInvert.gain.value = -1;

    const highBand = ctx.createGain();
    highBand.gain.value = 1;

    const MASTER_OUT = ctx.createGain();
    MASTER_OUT.gain.value = 1;

    const SAT_PRE = ctx.createGain();
    const SAT_POST = ctx.createGain();
    SAT_PRE.gain.value = 0.5;
    SAT_POST.gain.value = 2;

    const WALL = ctx.createWaveShaper();
    WALL.curve = makeWallCurve();
    WALL.oversample = "4x";

    HEAD.connect(lowSplit);
    HEAD.connect(highBand);
    lowSplit.connect(lowInvert);
    lowInvert.connect(highBand);
    MASTER_OUT.connect(SAT_PRE);
    SAT_PRE.connect(WALL);
    WALL.connect(SAT_POST);
    SAT_POST.connect(ctx.destination);

    const bassComp = ctx.createDynamicsCompressor();
    bassComp.threshold.value = -1;
    bassComp.knee.value = 3;
    bassComp.ratio.value = 20;
    bassComp.attack.value = 0.006;
    bassComp.release.value = 0.25;

    const mainComp = ctx.createDynamicsCompressor();
    mainComp.threshold.value = -1;
    mainComp.knee.value = 3;
    mainComp.ratio.value = 20;
    mainComp.attack.value = 0.002;
    mainComp.release.value = 0.2;

    lowSplit.connect(bassComp);
    bassComp.connect(MASTER_OUT);
    highBand.connect(mainComp);
    mainComp.connect(MASTER_OUT);

    const m = {
      ctx,
      MASTER,
      impulse: null,
      limWL: null,
      useWL: false,
      redBass: 0,
      redMain: 0,
      limOn: true,
      limMain: 0,
      limBass: 0,
      limMaxRed: 6,
      rotOn: false,
    };

    m.applyRotator = function (on) {
      m.rotOn = on === true;
      const t = ctx.currentTime;
      rotWet.gain.setTargetAtTime(m.rotOn ? 1 : 0, t, 0.02);
      rotDry.gain.setTargetAtTime(m.rotOn ? 0 : 1, t, 0.02);
    };

    m.applyLimiter = function (on, ceilMain, ceilBass, maxRed) {
      m.limOn = on !== false;
      m.limMain = limCeil(ceilMain);
      m.limBass = limCeil(ceilBass);
      m.limMaxRed = typeof maxRed === "number" ? Math.max(1, Math.min(8, maxRed)) : 6;
      const t = ctx.currentTime;
      const cm = m.limOn ? Math.pow(10, m.limMain / 20) : 1;
      SAT_PRE.gain.setTargetAtTime(0.5 / cm, t, 0.03);
      SAT_POST.gain.setTargetAtTime(2 * cm, t, 0.03);
      if (m.useWL) {
        m.limWL.parameters.get("enabled").value = m.limOn ? 1 : 0;
        m.limWL.parameters.get("ceiling").value = m.limMain;
        m.limWL.parameters.get("bass").value = m.limBass;
        m.limWL.parameters.get("maxred").value = m.limMaxRed;
        return;
      }
      mainComp.threshold.setTargetAtTime(m.limOn ? m.limMain : 0, t, 0.05);
      mainComp.ratio.setTargetAtTime(m.limOn ? 20 : 1, t, 0.05);
      mainComp.knee.setTargetAtTime(m.limOn ? 3 : 0, t, 0.05);
      bassComp.threshold.setTargetAtTime(m.limOn ? m.limBass : 0, t, 0.05);
      bassComp.ratio.setTargetAtTime(m.limOn ? 20 : 1, t, 0.05);
      bassComp.knee.setTargetAtTime(m.limOn ? 3 : 0, t, 0.05);
    };

    m.loadWorklet = async function (url) {
      try {
        await ctx.audioWorklet.addModule(url);
        const opts = {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          processorOptions: { lookahead: LOOKAHEAD },
        };
        m.limWL = new AudioWorkletNode(ctx, "vb-limiter", opts);
        m.limWL.port.onmessage = (e) => {
          m.redBass = e.data.b;
          m.redMain = e.data.m;
        };
        HEAD.connect(m.limWL);
        m.limWL.connect(MASTER_OUT);
        try { HEAD.disconnect(lowSplit); } catch (e) {}
        try { HEAD.disconnect(highBand); } catch (e) {}
        try { bassComp.disconnect(); } catch (e) {}
        try { mainComp.disconnect(); } catch (e) {}
        m.useWL = true;
        m.applyLimiter(m.limOn, m.limMain, m.limBass, m.limMaxRed);
        return true;
      } catch (e) {
        return false;
      }
    };

    m.meter = function () {
      return {
        bass: m.useWL ? m.redBass : bassComp.reduction,
        main: m.useWL ? m.redMain : mainComp.reduction,
        hq: m.useWL,
      };
    };

    m.getImpulse = function () {
      if (m.impulse) return m.impulse;
      const seconds = 2.8;
      const decay = 2.6;
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * seconds);
      const preDelay = Math.floor(rate * 0.02);
      m.impulse = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const d = m.impulse.getChannelData(ch);
        let lp = 0;
        for (let i = preDelay; i < len; i++) {
          const t = (i - preDelay) / (len - preDelay);
          const white = Math.random() * 2 - 1;
          const alpha = 0.85 - 0.7 * t;
          lp += alpha * (white - lp);
          d[i] = lp * Math.pow(1 - t, decay);
        }
      }
      return m.impulse;
    };

    return m;
  }

  function applyMono(engine, monoOn) {
    const ctx = engine.ctx;
    const t = ctx.currentTime;
    const set = (n, v) => n.gain.setTargetAtTime(v, t, 0.03);
    if (monoOn) {
      set(engine.gLL, 0.5); set(engine.gRR, 0.5); set(engine.gLR, 0.5); set(engine.gRL, 0.5);
    } else {
      set(engine.gLL, 1); set(engine.gRR, 1); set(engine.gLR, 0); set(engine.gRL, 0);
    }
  }

  function setSlot(slot, cfg, v, t) {
    const on = cfg.type === "lowshelf" ? slot.ls : slot.pk;
    const off = cfg.type === "lowshelf" ? slot.pk : slot.ls;
    if (slot.cur === cfg.type) {
      on.frequency.setTargetAtTime(cfg.freq, t, 0.03);
      on.Q.setTargetAtTime(cfg.q, t, 0.03);
    } else {
      on.frequency.value = cfg.freq;
      on.Q.value = cfg.q;
      off.gain.setTargetAtTime(0, t, 0.05);
      slot.cur = cfg.type;
    }
    on.gain.setTargetAtTime(cfg.max * v, t, 0.05);
  }

  function applyBass(engine, on, mode) {
    const m = BASS_MODES[mode] || BASS_MODES.classic;
    const t = engine.ctx.currentTime;
    const v = on === true ? 0.75 : clamp01(on);
    setSlot(engine.slot1, m.f1, v, t);
    setSlot(engine.slot2, m.f2, v, t);
    engine.harmGain.gain.setTargetAtTime(m.harm * v, t, 0.05);
    engine.bassTrim.gain.setTargetAtTime(1 + ((m.mk || 1) - 1) * v, t, 0.05);
  }

  function applyTreble(engine, v) {
    engine.treble.gain.setTargetAtTime(TREBLE_MAX_DB * clamp01(v), engine.ctx.currentTime, 0.05);
  }

  function applyMuffle(engine, v) {
    const a = clamp01(v);
    const f = a === 0 ? engine.ctx.sampleRate / 2 : 18000 * Math.pow(0.022, a);
    engine.muffle.frequency.setTargetAtTime(f, engine.ctx.currentTime, 0.06);
  }

  function applyVocal(engine, v) {
    const a = clamp01(v);
    const t = engine.ctx.currentTime;
    engine.vocal.gain.setTargetAtTime(9 * a, t, 0.05);
    engine.vocal2.gain.setTargetAtTime(-4.5 * a, t, 0.05);
  }

  function applyPower(engine, v) {
    const a = clamp01(v);
    const t = engine.ctx.currentTime;
    engine.comp.threshold.setTargetAtTime(a > 0 ? -14 - 14 * a : 0, t, 0.05);
    engine.comp.ratio.setTargetAtTime(1 + 7 * a, t, 0.05);
    engine.makeup.gain.setTargetAtTime(1 + 1.1 * a, t, 0.06);
  }

  function applyReverb(engine, v) {
    const amount = reverbAmount(v);
    const t = engine.ctx.currentTime;
    if (amount > 0) {
      clearTimeout(engine.convOffTimer);
      if (!engine.convOn) {
        if (!engine.conv.buffer) engine.conv.buffer = engine.master.getImpulse();
        engine.boost.connect(engine.conv);
        engine.conv.connect(engine.wet);
        engine.wet.connect(engine.master.MASTER);
        engine.convOn = true;
      }
    }
    engine.wet.gain.setTargetAtTime(amount, t, 0.08);
    engine.dry.gain.setTargetAtTime(1 - 0.3 * amount, t, 0.08);
    if (amount === 0 && engine.convOn) {
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
    const t = engine.ctx.currentTime;
    engine.lfoDepth.gain.setTargetAtTime(on ? SPIN_DEPTH : 0, t, 0.4);
    const v = speed == null ? 0.5 : clamp01(speed);
    engine.lfo.frequency.setTargetAtTime(0.05 + 0.4 * v, t, 0.2);
    engine.dL.delayTime.setTargetAtTime(on ? ITD_BASE : 0, t, 0.4);
    engine.dR.delayTime.setTargetAtTime(on ? ITD_BASE : 0, t, 0.4);
    engine.itdL.gain.setTargetAtTime(on ? ITD_MOD : 0, t, 0.4);
    engine.itdR.gain.setTargetAtTime(on ? -ITD_MOD : 0, t, 0.4);
    engine.shadL.gain.setTargetAtTime(on ? -SHADOW_DB : 0, t, 0.4);
    engine.shadR.gain.setTargetAtTime(on ? SHADOW_DB : 0, t, 0.4);
  }

  function applyAll(engine, settings) {
    applyMono(engine, settings.monoFix);
    applyBass(engine, settings.bassBoost, settings.bassMode);
    applyTreble(engine, settings.treble);
    applyMuffle(engine, settings.muffle);
    applyVocal(engine, settings.vocal);
    applyPower(engine, settings.power);
    applyReverb(engine, settings.reverb);
    applySpin(engine, settings.spin, settings.spinSpeed);
  }

  function createVoice(master, source, settings) {
    const ctx = master.ctx;
    const inGain = ctx.createGain();
    inGain.channelCount = 2;
    inGain.channelCountMode = "explicit";
    inGain.channelInterpretation = "speakers";
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    const gLL = ctx.createGain();
    const gLR = ctx.createGain();
    const gRL = ctx.createGain();
    const gRR = ctx.createGain();

    const mkBand = (type, freq) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.gain.value = 0;
      return f;
    };
    const b1ls = mkBand("lowshelf", 200);
    const b1pk = mkBand("peaking", 200);
    const b2ls = mkBand("lowshelf", 250);
    const b2pk = mkBand("peaking", 250);
    const slot1 = { ls: b1ls, pk: b1pk, cur: null };
    const slot2 = { ls: b2ls, pk: b2pk, cur: null };

    const bassTrim = ctx.createGain();
    bassTrim.gain.value = 1;

    const subLP = ctx.createBiquadFilter();
    subLP.type = "lowpass";
    subLP.frequency.value = 130;
    subLP.Q.value = 0.7;
    const shaper = ctx.createWaveShaper();
    shaper.curve = getHarmCurve();
    shaper.oversample = "4x";
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0;

    const treble = ctx.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 3200;
    treble.gain.value = 0;

    const muffle = ctx.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = ctx.sampleRate / 2;
    muffle.Q.value = 0.5;

    const vocal = ctx.createBiquadFilter();
    vocal.type = "peaking";
    vocal.frequency.value = 2400;
    vocal.Q.value = 1.1;
    vocal.gain.value = 0;

    const vocal2 = ctx.createBiquadFilter();
    vocal2.type = "peaking";
    vocal2.frequency.value = 280;
    vocal2.Q.value = 0.9;
    vocal2.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = 0;
    comp.knee.value = 10;
    comp.ratio.value = 1;
    comp.attack.value = 0.006;
    comp.release.value = 0.18;
    const makeup = ctx.createGain();
    makeup.gain.value = 1;

    const pan = ctx.createStereoPanner();
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.13;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0;
    lfo.connect(lfoDepth);
    lfoDepth.connect(pan.pan);
    lfo.start();

    const spSplit = ctx.createChannelSplitter(2);
    const spMerge = ctx.createChannelMerger(2);
    const dL = ctx.createDelay(0.01);
    const dR = ctx.createDelay(0.01);
    dL.delayTime.value = 0;
    dR.delayTime.value = 0;
    const shL = ctx.createBiquadFilter();
    shL.type = "highshelf";
    shL.frequency.value = 3500;
    shL.gain.value = 0;
    const shR = ctx.createBiquadFilter();
    shR.type = "highshelf";
    shR.frequency.value = 3500;
    shR.gain.value = 0;
    const itdL = ctx.createGain();
    const itdR = ctx.createGain();
    const shadL = ctx.createGain();
    const shadR = ctx.createGain();
    itdL.gain.value = 0;
    itdR.gain.value = 0;
    shadL.gain.value = 0;
    shadR.gain.value = 0;
    lfo.connect(itdL);
    itdL.connect(dL.delayTime);
    lfo.connect(itdR);
    itdR.connect(dR.delayTime);
    lfo.connect(shadL);
    shadL.connect(shL.gain);
    lfo.connect(shadR);
    shadR.connect(shR.gain);

    const boost = ctx.createGain();
    boost.gain.value = 1;

    const dry = ctx.createGain();
    dry.gain.value = 1;
    const wet = ctx.createGain();
    wet.gain.value = 0;
    const conv = ctx.createConvolver();

    source.connect(inGain);
    inGain.connect(splitter);
    splitter.connect(gLL, 0);
    splitter.connect(gLR, 0);
    splitter.connect(gRL, 1);
    splitter.connect(gRR, 1);
    gLL.connect(merger, 0, 0);
    gRL.connect(merger, 0, 0);
    gLR.connect(merger, 0, 1);
    gRR.connect(merger, 0, 1);
    merger.connect(b1ls);
    b1ls.connect(b1pk);
    b1pk.connect(b2ls);
    b2ls.connect(b2pk);
    b2pk.connect(bassTrim);
    bassTrim.connect(treble);
    merger.connect(subLP);
    subLP.connect(shaper);
    shaper.connect(harmGain);
    harmGain.connect(treble);
    treble.connect(muffle);
    muffle.connect(vocal);
    vocal.connect(vocal2);
    vocal2.connect(comp);
    comp.connect(makeup);
    makeup.connect(pan);
    pan.connect(spSplit);
    spSplit.connect(dL, 0);
    spSplit.connect(dR, 1);
    dL.connect(shL);
    dR.connect(shR);
    shL.connect(spMerge, 0, 0);
    shR.connect(spMerge, 0, 1);
    spMerge.connect(boost);
    boost.connect(dry);
    dry.connect(master.MASTER);

    const engine = {
      ctx, master, source, inGain, gLL, gLR, gRL, gRR,
      slot1, slot2, bassTrim, subLP, shaper, harmGain, treble, muffle, vocal, vocal2, comp, makeup, pan, lfo, lfoDepth,
      spSplit, spMerge, dL, dR, shL, shR, itdL, itdR, shadL, shadR,
      boost, dry, wet, conv,
      convOn: false,
      convOffTimer: null,
      settings,
    };

    applyAll(engine, settings);

    const now = ctx.currentTime;
    boost.gain.cancelScheduledValues(now);
    boost.gain.setValueAtTime(0.0001, now);
    boost.gain.linearRampToValueAtTime(Math.max(0.0001, settings.volume), now + FADE_IN);

    engine.apply = function (next) {
      engine.settings = next;
      const t = ctx.currentTime;
      const g = engine.boost.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(Math.max(0.0001, next.volume), t, GLIDE);
      applyAll(engine, next);
    };

    engine.stop = function (done) {
      const t = ctx.currentTime;
      try {
        engine.boost.gain.cancelScheduledValues(t);
        engine.boost.gain.setValueAtTime(engine.boost.gain.value, t);
        engine.boost.gain.linearRampToValueAtTime(0.0001, t + 0.08);
      } catch (e) {}
      clearTimeout(engine.convOffTimer);
      setTimeout(() => {
        try { engine.lfo.stop(); } catch (e) {}
        try {
          engine.source.disconnect();
          engine.inGain.disconnect();
          engine.lfo.disconnect();
          engine.lfoDepth.disconnect();
          engine.itdL.disconnect();
          engine.itdR.disconnect();
          engine.shadL.disconnect();
          engine.shadR.disconnect();
          engine.spMerge.disconnect();
          engine.boost.disconnect();
          engine.dry.disconnect();
          engine.conv.disconnect();
          engine.wet.disconnect();
        } catch (e) {}
        if (done) done();
      }, 140);
    };

    return engine;
  }

  root.VBAudio = { createMaster, createVoice, LOOKAHEAD };
})(typeof window !== "undefined" ? window : self);
