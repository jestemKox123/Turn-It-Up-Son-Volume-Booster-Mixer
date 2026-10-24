// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(function (root) {
  const FADE_IN = 0.15;
  const GLIDE = 0.06;
  const TREBLE_MAX_DB = 8;
  const BW_Q_DB = 20 * Math.log10(Math.SQRT1_2);
  const SPIN_SPREAD = 30;
  const SPIN_XO = 150;
  const SPIN_LF_DELAY = 0.0064;
  const SPIN_HF_GAIN = 0.793;
  const SPIN_EQ = [["lowshelf", 982, 1, -5.54], ["peaking", 1500, 0.4, 3.33], ["peaking", 8465, 2.69, 7.56], ["highshelf", 12340, 1, 4.92]];
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

  const BASS_INDEX = { classic: 0, sub: 1, punch: 2, rumble: 3, "808": 4, warm: 5 };

  const VERB_PRE = 0.045;
  const VERB_LEN = 3.8;
  const VERB_ONSET = 0.012;
  const VERB_RAMP = 0.04;
  const VERB_HP = 220;
  const VERB_LP = 9000;
  const VERB_TRIM = 0.68;
  const VERB_BANDS = [[0, 250, 1.3, 0.5], [250, 1000, 2.9, 0.85], [1000, 3500, 2.6, 1], [3500, 8000, 1.9, 0.85], [8000, 0, 0.9, 0.55]];
  const VERB_ER = [3, 7, 11, 16, 21, 27, 33, 40, 48, 57, 66, 76, 87, 99];
  const VERB_ER_LEVEL = 0.7;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function coef(type, f, q, rate) {
    const w0 = (2 * Math.PI * f) / rate;
    const al = Math.sin(w0) / (2 * q);
    const cw = Math.cos(w0);
    const a0 = 1 + al;
    const b0 = type === "hp" ? (1 + cw) / 2 : (1 - cw) / 2;
    const b1 = type === "hp" ? -(1 + cw) : 1 - cw;
    return [b0 / a0, b1 / a0, b0 / a0, (-2 * cw) / a0, (1 - al) / a0];
  }

  function filterInPlace(x, c) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const y = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
      x[i] = y;
    }
  }

  function makeImpulse(ctx) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * VERB_LEN);
    const pre = Math.floor(rate * VERB_PRE);
    const t0 = pre + Math.floor(rate * VERB_ONSET);
    const ramp = Math.floor(rate * VERB_RAMP);
    const fade = Math.floor(rate * 0.15);
    const win = Math.floor(rate * 0.03);
    const buf = ctx.createBuffer(2, len, rate);
    const K = 8;
    let ks = 0;
    for (let j = 0; j < K; j++) ks += Math.pow(Math.sin((Math.PI * (j + 0.5)) / K), 2);
    for (let ch = 0; ch < 2; ch++) {
      const r = rng(0x5eed + ch * 7919);
      const noise = new Float32Array(len);
      for (let i = t0; i < len; i++) noise[i] = r() * 2 - 1;
      const d = buf.getChannelData(ch);
      for (const [lo, hi, rt, g] of VERB_BANDS) {
        const b = noise.slice();
        if (lo > 0) {
          filterInPlace(b, coef("hp", lo, 0.5412, rate));
          filterInPlace(b, coef("hp", lo, 1.3066, rate));
        }
        if (hi > 0) {
          filterInPlace(b, coef("lp", hi, 0.5412, rate));
          filterInPlace(b, coef("lp", hi, 1.3066, rate));
        }
        const k = -6.907755 / (rt * rate);
        for (let i = t0; i < len; i++) d[i] += g * b[i] * Math.exp(k * (i - t0));
      }
      for (let i = 0; i < ramp; i++) d[t0 + i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / ramp);
      for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
      let p = 0;
      for (let i = t0 + ramp; i < t0 + ramp + win; i++) p += d[i] * d[i];
      const tap = VERB_ER_LEVEL * Math.sqrt(p / win) * Math.sqrt(rate * 0.004);
      VERB_ER.forEach((ms, n) => {
        const at = pre + Math.floor((rate * (ms + (r() - 0.5) * 2)) / 1000);
        const amp = (tap * Math.exp(-n * 0.12) * (r() < 0.5 ? -1 : 1)) / Math.sqrt(ks);
        for (let j = 0; j < K; j++) d[at + j] += amp * Math.sin((Math.PI * (j + 0.5)) / K);
      });
    }
    return buf;
  }

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

    m.applyLimiter = function (on, ceilMain, ceilBass, maxRed, guard) {
      m.limOn = on !== false;
      m.guardOn = guard === true;
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
        m.limWL.parameters.get("guard").value = m.guardOn ? 1 : 0;
        return;
      }
      mainComp.threshold.setTargetAtTime(m.limOn ? m.limMain : 0, t, 0.05);
      mainComp.ratio.setTargetAtTime(m.limOn ? 20 : 1, t, 0.05);
      mainComp.knee.setTargetAtTime(m.limOn ? 3 : 0, t, 0.05);
      bassComp.threshold.setTargetAtTime(m.limOn ? m.limBass : 0, t, 0.05);
      bassComp.ratio.setTargetAtTime(m.limOn ? 20 : 1, t, 0.05);
      bassComp.knee.setTargetAtTime(m.limOn ? 3 : 0, t, 0.05);
    };

    m.shiftDb = 0;
    m.noteVolume = function (from, to) {
      if (!(from > 0) || !(to > 0) || from === to) return;
      m.shiftDb += 20 * Math.log10(to / from);
      if (m.limWL) m.limWL.parameters.get("shift").setValueAtTime(m.shiftDb, ctx.currentTime);
    };

    m.loadWorklet = async function (url) {
      try {
        await ctx.audioWorklet.addModule(url.replace(/limiter-worklet\.js$/, "fx-worklet.js"));
        m.bassWL = true;
        m.verbWL = true;
        m.vocalWL = true;
        m.powerWL = true;
        m.brightWL = true;
        m.monoWL = true;
        m.muffleWL = true;
        try {
          const safe = new AudioWorkletNode(ctx, "vb-safety", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
          SAT_POST.disconnect();
          SAT_POST.connect(safe);
          safe.connect(ctx.destination);
          m.safe = safe;
        } catch (e) {
          m.safe = null;
        }
      } catch (e) {
        m.bassWL = false;
        m.verbWL = false;
        m.vocalWL = false;
        m.powerWL = false;
        m.brightWL = false;
        m.monoWL = false;
        m.muffleWL = false;
      }
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
      if (!m.impulse) m.impulse = makeImpulse(ctx);
      return m.impulse;
    };

    return m;
  }

  function applyMono(engine, monoOn) {
    const ctx = engine.ctx;
    const t = ctx.currentTime;
    if (engine.monoNode) {
      engine.monoNode.parameters.get("on").setValueAtTime(monoOn ? 1 : 0, t);
      return;
    }
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

  function applyBass(engine, on, mode, scale) {
    const m = BASS_MODES[mode] || BASS_MODES.classic;
    const t = engine.ctx.currentTime;
    const s = typeof scale === "number" && scale > 0 ? Math.min(1.3, scale) : 1;
    const v = (on === true ? 0.75 : clamp01(on)) * s;
    if (engine.bassNode) {
      engine.bassNode.parameters.get("mode").setValueAtTime(BASS_INDEX[mode] || 0, t);
      engine.bassNode.parameters.get("amount").setValueAtTime(v, t);
      return;
    }
    setSlot(engine.slot1, m.f1, v, t);
    setSlot(engine.slot2, m.f2, v, t);
    engine.harmGain.gain.setTargetAtTime(m.harm * v, t, 0.05);
    engine.bassTrim.gain.setTargetAtTime(1 + ((m.mk || 1) - 1) * v, t, 0.05);
  }

  function applyTreble(engine, v) {
    if (engine.brightNode) {
      engine.brightNode.parameters.get("amount").setValueAtTime(clamp01(v), engine.ctx.currentTime);
      return;
    }
    engine.treble.gain.setTargetAtTime(TREBLE_MAX_DB * clamp01(v), engine.ctx.currentTime, 0.05);
  }

  function applyMuffle(engine, v) {
    const a = clamp01(v);
    if (engine.muffleNode) {
      engine.muffleNode.parameters.get("amount").setValueAtTime(a, engine.ctx.currentTime);
      return;
    }
    const f = a === 0 ? engine.ctx.sampleRate / 2 : 18000 * Math.pow(0.022, a);
    engine.muffle.frequency.setTargetAtTime(f, engine.ctx.currentTime, 0.06);
  }

  function applyVocal(engine, v) {
    const a = clamp01(v);
    const t = engine.ctx.currentTime;
    if (engine.vocalNode) {
      engine.vocalNode.parameters.get("amount").setValueAtTime(a, t);
      return;
    }
    engine.vocal.gain.setTargetAtTime(5 * a, t, 0.05);
    engine.vocal2.gain.setTargetAtTime(-3 * a, t, 0.05);
  }

  function applyPower(engine, v) {
    const a = clamp01(v);
    const t = engine.ctx.currentTime;
    if (engine.powerNode) {
      engine.powerNode.parameters.get("amount").setValueAtTime(a, t);
      return;
    }
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
        if (engine.master.verbWL && !engine.verbNode) {
          try {
            engine.verbNode = new AudioWorkletNode(engine.ctx, "vb-verb", {
              numberOfInputs: 2,
              numberOfOutputs: 1,
              outputChannelCount: [2],
              channelCount: 2,
              channelCountMode: "explicit",
              channelInterpretation: "speakers",
            });
          } catch (e) {
            engine.verbNode = null;
          }
        }
        engine.boost.connect(engine.sendHP1);
        engine.sendHP1.connect(engine.sendHP2);
        engine.sendHP2.connect(engine.sendLP);
        engine.sendLP.connect(engine.conv);
        if (engine.verbNode) {
          engine.conv.connect(engine.verbNode, 0, 0);
          engine.boost.connect(engine.verbNode, 0, 1);
          engine.verbNode.connect(engine.wet);
        } else {
          engine.conv.connect(engine.wet);
        }
        engine.wet.connect(engine.master.MASTER);
        engine.convOn = true;
      }
    }
    engine.wet.gain.setTargetAtTime(amount * VERB_TRIM, t, 0.08);
    engine.dry.gain.setTargetAtTime(1 - 0.3 * amount, t, 0.08);
    if (amount === 0 && engine.convOn) {
      clearTimeout(engine.convOffTimer);
      engine.convOffTimer = setTimeout(() => {
        if (!engine.convOn) return;
        if (reverbAmount(engine.settings.reverb) > 0) return;
        try {
          engine.boost.disconnect(engine.sendHP1);
          engine.sendHP1.disconnect();
          engine.sendHP2.disconnect();
          engine.sendLP.disconnect();
          engine.conv.disconnect();
          if (engine.verbNode) {
            engine.boost.disconnect(engine.verbNode);
            engine.verbNode.disconnect();
          }
          engine.wet.disconnect();
        } catch (e) {}
        engine.convOn = false;
      }, 4200);
    }
  }

  function buildSpin(engine, freq) {
    const ctx = engine.ctx;
    const mk = (type, f, q, g) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = f;
      n.Q.value = q;
      if (g != null) n.gain.value = g;
      return n;
    };
    const sp = {
      hp: [mk("highpass", SPIN_XO, BW_Q_DB), mk("highpass", SPIN_XO, BW_Q_DB)],
      lp: [mk("lowpass", SPIN_XO, BW_Q_DB), mk("lowpass", SPIN_XO, BW_Q_DB)],
      lfDelay: ctx.createDelay(0.05),
      split: ctx.createChannelSplitter(2),
      pans: [0, 1].map(() => new PannerNode(ctx, {
        panningModel: "HRTF",
        distanceModel: "inverse",
        refDistance: 1,
        rolloffFactor: 0,
        channelCount: 1,
        channelCountMode: "explicit",
      })),
      hfGain: ctx.createGain(),
      eq: SPIN_EQ.map(([type, f, q, g]) => mk(type, f, q, g)),
      wet: ctx.createGain(),
      oscS: ctx.createOscillator(),
      oscC: ctx.createOscillator(),
      mods: [],
      on: false,
    };
    sp.oscS.frequency.value = freq;
    sp.oscC.frequency.value = freq;
    sp.lfDelay.delayTime.value = SPIN_LF_DELAY;
    sp.hfGain.gain.value = SPIN_HF_GAIN;
    sp.wet.gain.value = 0;
    sp.oscC.setPeriodicWave(ctx.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true }));
    const a = (SPIN_SPREAD * Math.PI) / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    const [pL, pR] = sp.pans;
    const mod = (osc, g, params) => {
      const n = ctx.createGain();
      n.gain.value = g;
      osc.connect(n);
      for (const p of params) n.connect(p);
      sp.mods.push(n);
    };
    for (const p of sp.pans) {
      p.positionX.value = 0;
      p.positionY.value = 0;
      p.positionZ.value = 0;
    }
    mod(sp.oscS, ca, [pL.positionX, pR.positionX]);
    mod(sp.oscC, -sa, [pL.positionX]);
    mod(sp.oscC, sa, [pR.positionX]);
    mod(sp.oscC, -ca, [pL.positionZ, pR.positionZ]);
    mod(sp.oscS, -sa, [pL.positionZ]);
    mod(sp.oscS, sa, [pR.positionZ]);
    sp.hp[0].connect(sp.hp[1]);
    sp.hp[1].connect(sp.split);
    sp.split.connect(pL, 0);
    sp.split.connect(pR, 1);
    pL.connect(sp.hfGain);
    pR.connect(sp.hfGain);
    let prev = sp.hfGain;
    for (const f of sp.eq) {
      prev.connect(f);
      prev = f;
    }
    prev.connect(sp.wet);
    sp.lp[0].connect(sp.lp[1]);
    sp.lp[1].connect(sp.lfDelay);
    sp.lfDelay.connect(sp.wet);
    sp.wet.connect(engine.boost);
    const t = ctx.currentTime;
    sp.oscS.start(t);
    sp.oscC.start(t);
    engine.spin = sp;
    return sp;
  }

  function applySpin(engine, on, speed) {
    const t = engine.ctx.currentTime;
    const v = speed == null ? 0.5 : clamp01(speed);
    const freq = 0.05 + 0.4 * v;
    let sp = engine.spin;
    if (on) {
      clearTimeout(engine.spinOffTimer);
      if (!sp) sp = buildSpin(engine, freq);
      sp.oscS.frequency.setTargetAtTime(freq, t, 0.2);
      sp.oscC.frequency.setTargetAtTime(freq, t, 0.2);
      if (!sp.on) {
        engine.spIn.connect(sp.hp[0]);
        engine.spIn.connect(sp.lp[0]);
        sp.on = true;
      }
      sp.wet.gain.setTargetAtTime(1, t, 0.12);
      engine.dry8.gain.setTargetAtTime(0, t, 0.12);
      return;
    }
    if (!sp || !sp.on) return;
    sp.wet.gain.setTargetAtTime(0, t, 0.12);
    engine.dry8.gain.setTargetAtTime(1, t, 0.12);
    clearTimeout(engine.spinOffTimer);
    engine.spinOffTimer = setTimeout(() => {
      if (!sp.on || engine.settings.spin) return;
      try {
        engine.spIn.disconnect(sp.hp[0]);
        engine.spIn.disconnect(sp.lp[0]);
      } catch (e) {}
      const now = engine.ctx.currentTime;
      engine.dry8.gain.cancelScheduledValues(now);
      engine.dry8.gain.setValueAtTime(1, now);
      sp.wet.gain.cancelScheduledValues(now);
      sp.wet.gain.setValueAtTime(0, now);
      sp.on = false;
    }, 1500);
  }

  function applyAll(engine, settings) {
    applyMono(engine, settings.monoFix);
    applyBass(engine, settings.bassBoost, settings.bassMode, settings.bassScale);
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

    const mkHarmFilter = (type, freq) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = 0.7;
      return f;
    };
    const subLP = mkHarmFilter("lowpass", 75);
    const subLP2 = mkHarmFilter("lowpass", 75);
    const shaper = ctx.createWaveShaper();
    shaper.curve = getHarmCurve();
    shaper.oversample = "4x";
    const harmHP = mkHarmFilter("highpass", 140);
    const harmHP2 = mkHarmFilter("highpass", 140);
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
    vocal.frequency.value = 2450;
    vocal.Q.value = 0.8;
    vocal.gain.value = 0;

    const vocal2 = ctx.createBiquadFilter();
    vocal2.type = "peaking";
    vocal2.frequency.value = 300;
    vocal2.Q.value = 1;
    vocal2.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = 0;
    comp.knee.value = 10;
    comp.ratio.value = 1;
    comp.attack.value = 0.006;
    comp.release.value = 0.18;
    const makeup = ctx.createGain();
    makeup.gain.value = 1;

    const spIn = ctx.createGain();
    const dry8 = ctx.createGain();
    dry8.gain.value = 1;

    const boost = ctx.createGain();
    boost.gain.value = 1;

    const dry = ctx.createGain();
    dry.gain.value = 1;
    const wet = ctx.createGain();
    wet.gain.value = 0;
    const conv = ctx.createConvolver();
    const mkSend = (type, f, q) => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = f;
      n.Q.value = q;
      return n;
    };
    const sendHP1 = mkSend("highpass", VERB_HP, 20 * Math.log10(0.5412));
    const sendHP2 = mkSend("highpass", VERB_HP, 20 * Math.log10(1.3066));
    const sendLP = mkSend("lowpass", VERB_LP, BW_Q_DB);

    source.connect(inGain);
    let monoNode = null;
    if (master.monoWL) {
      try {
        monoNode = new AudioWorkletNode(ctx, "vb-mono", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
        });
      } catch (e) {
        monoNode = null;
      }
    }
    const pre = monoNode || merger;
    if (monoNode) {
      inGain.connect(monoNode);
    } else {
      inGain.connect(splitter);
      splitter.connect(gLL, 0);
      splitter.connect(gLR, 0);
      splitter.connect(gRL, 1);
      splitter.connect(gRR, 1);
      gLL.connect(merger, 0, 0);
      gRL.connect(merger, 0, 0);
      gLR.connect(merger, 0, 1);
      gRR.connect(merger, 0, 1);
    }
    let brightNode = null;
    if (master.brightWL) {
      try {
        brightNode = new AudioWorkletNode(ctx, "vb-bright", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
        });
      } catch (e) {
        brightNode = null;
      }
    }
    const trebleIn = brightNode || treble;
    let bassNode = null;
    if (master.bassWL) {
      try {
        bassNode = new AudioWorkletNode(ctx, "vb-bass", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
        });
      } catch (e) {
        bassNode = null;
      }
    }
    if (bassNode) {
      pre.connect(bassNode);
      bassNode.connect(trebleIn);
    } else {
      pre.connect(b1ls);
      b1ls.connect(b1pk);
      b1pk.connect(b2ls);
      b2ls.connect(b2pk);
      b2pk.connect(bassTrim);
      bassTrim.connect(trebleIn);
      pre.connect(subLP);
      subLP.connect(subLP2);
      subLP2.connect(shaper);
      shaper.connect(harmHP);
      harmHP.connect(harmHP2);
      harmHP2.connect(harmGain);
      harmGain.connect(trebleIn);
    }
    let muffleNode = null;
    if (master.muffleWL) {
      try {
        muffleNode = new AudioWorkletNode(ctx, "vb-muffle", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
        });
      } catch (e) {
        muffleNode = null;
      }
    }
    const muffleOut = muffleNode || muffle;
    trebleIn.connect(muffleOut);
    let vocalNode = null;
    if (master.vocalWL) {
      try {
        vocalNode = new AudioWorkletNode(ctx, "vb-vocal", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
        });
      } catch (e) {
        vocalNode = null;
      }
    }
    let powerNode = null;
    if (master.powerWL) {
      try {
        powerNode = new AudioWorkletNode(ctx, "vb-power", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
        });
      } catch (e) {
        powerNode = null;
      }
    }
    const powerIn = powerNode || comp;
    if (vocalNode) {
      muffleOut.connect(vocalNode);
      vocalNode.connect(powerIn);
    } else {
      muffleOut.connect(vocal);
      vocal.connect(vocal2);
      vocal2.connect(powerIn);
    }
    if (powerNode) {
      powerNode.connect(spIn);
    } else {
      comp.connect(makeup);
      makeup.connect(spIn);
    }
    spIn.connect(dry8);
    dry8.connect(boost);
    boost.connect(dry);
    dry.connect(master.MASTER);

    const engine = {
      ctx, master, source, inGain, gLL, gLR, gRL, gRR, monoNode,
      slot1, slot2, bassTrim, subLP, shaper, harmGain, bassNode, treble, brightNode, muffle, muffleNode, vocal, vocal2, vocalNode, powerNode, comp, makeup, spIn, dry8,
      spin: null,
      spinOffTimer: null,
      boost, dry, wet, conv, sendHP1, sendHP2, sendLP,
      verbNode: null,
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
      master.noteVolume(engine.settings.volume, next.volume);
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
      clearTimeout(engine.spinOffTimer);
      setTimeout(() => {
        const sp = engine.spin;
        if (sp) {
          try {
            sp.oscS.stop();
            sp.oscC.stop();
          } catch (e) {}
        }
        try {
          engine.source.disconnect();
          engine.inGain.disconnect();
          if (engine.monoNode) engine.monoNode.disconnect();
          if (engine.bassNode) engine.bassNode.disconnect();
          if (engine.brightNode) engine.brightNode.disconnect();
          if (engine.muffleNode) engine.muffleNode.disconnect();
          if (engine.vocalNode) engine.vocalNode.disconnect();
          if (engine.powerNode) engine.powerNode.disconnect();
          engine.spIn.disconnect();
          engine.dry8.disconnect();
          if (sp) {
            sp.oscS.disconnect();
            sp.oscC.disconnect();
            for (const n of sp.mods) n.disconnect();
            sp.wet.disconnect();
          }
          engine.boost.disconnect();
          engine.dry.disconnect();
          engine.sendHP1.disconnect();
          engine.sendHP2.disconnect();
          engine.sendLP.disconnect();
          engine.conv.disconnect();
          engine.wet.disconnect();
          if (engine.verbNode) {
            engine.verbNode.port.postMessage("stop");
            engine.verbNode.disconnect();
          }
        } catch (e) {}
        if (done) done();
      }, 140);
    };

    return engine;
  }

  root.VBAudio = { createMaster, createVoice };
})(typeof window !== "undefined" ? window : self);
