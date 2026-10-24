// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

const XOVER = 150;
const KNEE = 3;
const HK = KNEE / 2;
const ATK_B = 0.004;
const REL_B = 0.25;
const ATK_M = 0.0015;
const REL_M = 0.15;
const REL_QUICK = 0.02;
const TH_TC = 0.01;
const SOFT_KB = 0.55;
const SOFT_KM = 0.55;
const G_PAUSE_TC = 0.03;
const G_FAST = 0.4;
const G_SLOW = 1.5;
const G_ENV_UP = 0.3;
const G_ENV_DN = 1.2;
const G_SILENT = -50;
const G_PAUSE_DB = 20;
const G_GAP = 0.2;
const G_GAP_WIN = 2;
const G_GRACE = 1.5;
const G_REF_UP = 10;
const G_REF_DN = 45;
const G_TRIG = 7;
const G_ALLOW = 2;
const G_ACCEPT = 45;
const G_TRIG_CONT = 10;
const G_ALLOW_CONT = 8;
const G_ACCEPT_CONT = 4;
const G_ACCEPT_TC = 20;
const G_ACCEPT_TC_CONT = 4;
const G_EXIT = 2;
const G_MAX = 15;
const G_ATK = 0.15;
const G_REL = 0.8;
const G_JUDGE = 0.4;
const G_REL_FAST = 0.25;

function kwCoefs(fs) {
  let K = Math.tan((Math.PI * 1681.974450955533) / fs);
  const Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416), Q1 = 0.7071752369554196;
  let a0 = 1 + K / Q1 + K * K;
  const s1 = [(Vh + (Vb * K) / Q1 + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q1 + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q1 + K * K) / a0];
  K = Math.tan((Math.PI * 38.13547087602444) / fs);
  const Q2 = 0.5003270373238773;
  a0 = 1 + K / Q2 + K * K;
  const s2 = [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q2 + K * K) / a0];
  return [s1, s2];
}

function kwRun(c, z, x) {
  const y = c[0] * x + c[1] * z[0] + c[2] * z[1] - c[3] * z[2] - c[4] * z[3];
  z[1] = z[0]; z[0] = x; z[3] = z[2]; z[2] = y;
  return y;
}

class VBLimiter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "ceiling", defaultValue: -1, minValue: -24, maxValue: 0, automationRate: "k-rate" },
      { name: "bass", defaultValue: -1, minValue: -24, maxValue: 0, automationRate: "k-rate" },
      { name: "enabled", defaultValue: 1, minValue: 0, maxValue: 1, automationRate: "k-rate" },
      { name: "maxred", defaultValue: 6, minValue: 1, maxValue: 8, automationRate: "k-rate" },
      { name: "guard", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" },
      { name: "shift", defaultValue: 0, minValue: -200, maxValue: 200, automationRate: "k-rate" },
    ];
  }

  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    const la = typeof o.lookahead === "number" ? o.lookahead : 0.005;
    this.len = Math.max(1, Math.round(la * sampleRate));
    this.loRing = [];
    this.hiRing = [];
    this.sL1 = [];
    this.sL2 = [];
    this.idx = 0;
    this.gB = 1;
    this.gM = 1;
    this.gS = 1;
    this.hB = 0;
    this.hM = 0;
    this.tHB = 1;
    this.tHS = 1;
    this.gfSm = -1;
    this.minB = 1;
    this.minM = 1;
    this.count = 0;
    this.every = Math.max(128, Math.round(sampleRate / 15));
    this.holdC = Math.exp(-1 / (0.2 * sampleRate));
    this.kw = kwCoefs(sampleRate);
    this.kwS = [];
    this.msP = 0;
    this.msF = 0;
    this.msS = 0;
    this.eP = Math.exp(-1 / (G_PAUSE_TC * sampleRate));
    this.eF = Math.exp(-1 / (G_FAST * sampleRate));
    this.eSl = Math.exp(-1 / (G_SLOW * sampleRate));
    this.gReset();
    this.shiftLast = 0;
    this.gJ = 1;
    this.aJ = Math.exp(-1 / (G_ATK * sampleRate));
    this.rJ = Math.exp(-1 / (G_REL * sampleRate));
    this.rJf = Math.exp(-1 / (G_REL_FAST * sampleRate));

    const w0 = (2 * Math.PI * XOVER) / sampleRate;
    const cw = Math.cos(w0), sw = Math.sin(w0);
    const al = sw / (2 * 0.7071067811865476);
    const a0 = 1 + al;
    this.lb0 = ((1 - cw) / 2) / a0;
    this.lb1 = (1 - cw) / a0;
    this.lb2 = this.lb0;
    this.fa1 = (-2 * cw) / a0;
    this.fa2 = (1 - al) / a0;
  }

  gReset() {
    this.ref = null;
    this.env = -120;
    this.mode = 0;
    this.jt = 0;
    this.lowT = 0;
    this.pause = 0;
    this.gapWin = 0;
    this.learn = 0;
    this.judge = 0;
    this.lastT = 1;
    this.fast = 0;
  }

  guardTarget(dt) {
    const lf = 10 * Math.log10(this.msF + 1e-15) - 0.691;
    const ls = 10 * Math.log10(this.msS + 1e-15) - 0.691;
    const eu = Math.exp(-dt / G_ENV_UP), ed = Math.exp(-dt / G_ENV_DN);
    this.env = lf > this.env ? lf + (this.env - lf) * eu : lf + (this.env - lf) * ed;
    const lp = 10 * Math.log10(this.msP + 1e-15) - 0.691;
    const silent = lp < G_SILENT;
    const quiet = silent || (this.ref !== null && lp < Math.max(this.ref, this.env) - G_PAUSE_DB);
    if (quiet) {
      this.pause += dt;
    } else {
      if (this.pause >= G_GAP) {
        this.gapWin = G_GAP_WIN;
        if (this.mode !== 0) this.judge = G_JUDGE;
      }
      this.pause = 0;
    }
    if (this.gapWin > 0) this.gapWin -= dt;
    if (this.ref === null) {
      if (!silent) {
        this.learn += dt;
        if (this.learn >= G_GRACE) this.ref = ls;
      }
      return 1;
    }
    if (!silent) {
      if (this.mode === 0) {
        if (this.gapWin > 0 && this.env > this.ref + G_TRIG) {
          this.mode = 1;
          this.jt = 0;
          this.lowT = 0;
        } else if (this.env > this.ref + G_TRIG_CONT) {
          this.mode = 2;
          this.jt = 0;
          this.lowT = 0;
        } else if (!quiet) {
          this.ref += (ls - this.ref) * (1 - Math.exp(-dt / (ls > this.ref ? G_REF_UP : G_REF_DN)));
        }
      } else {
        this.jt += dt;
        const allow = this.mode === 1 ? G_ALLOW : G_ALLOW_CONT;
        if (this.jt > (this.mode === 1 ? G_ACCEPT : G_ACCEPT_CONT) && ls > this.ref) {
          this.ref += (ls - this.ref) * (1 - Math.exp(-dt / (this.mode === 1 ? G_ACCEPT_TC : G_ACCEPT_TC_CONT)));
        }
        if (this.env < this.ref + allow + 1) this.lowT += dt;
        else this.lowT = 0;
        if (this.lowT > G_EXIT) this.mode = 0;
      }
    }
    if (this.fast > 0) this.fast -= dt;
    if (this.judge > 0) {
      this.judge -= dt;
      if (this.judge > 0) return this.lastT;
      if (lf < this.ref + (this.mode === 1 ? G_ALLOW : G_ALLOW_CONT) + 3) {
        this.mode = 0;
        this.env = lf;
        this.fast = 1.5;
      }
    }
    if (this.mode === 0) return (this.lastT = 1);
    const duck = this.env - this.ref - (this.mode === 1 ? G_ALLOW : G_ALLOW_CONT);
    return (this.lastT = duck > 0 ? Math.pow(10, -Math.min(G_MAX, duck) / 20) : 1);
  }

  bq(st, x, b0, b1, b2) {
    const y = b0 * x + b1 * st[0] + b2 * st[1] - this.fa1 * st[2] - this.fa2 * st[3];
    st[1] = st[0]; st[0] = x; st[3] = st[2]; st[2] = y;
    return y;
  }

  target(peak, ceilDb, ceil, kStart, kEnd) {
    if (peak <= kStart) return 1;
    if (peak >= kEnd) return ceil / peak;
    const o = 20 * Math.log10(peak) - ceilDb + HK;
    return Math.pow(10, -((o * o) / (2 * KNEE)) / 20);
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return true;
    }
    const ch = Math.min(inp.length, out.length);
    while (this.loRing.length < ch) {
      this.loRing.push(new Float32Array(this.len));
      this.hiRing.push(new Float32Array(this.len));
      this.sL1.push([0, 0, 0, 0]);
      this.sL2.push([0, 0, 0, 0]);
    }

    const on = params.enabled[0] >= 0.5;
    const cmDb = params.ceiling[0];
    const cbDb = params.bass[0];
    const cm = Math.pow(10, cmDb / 20);
    const cb = Math.pow(10, cbDb / 20);
    const kmS = cm * Math.pow(10, -HK / 20), kmE = cm * Math.pow(10, HK / 20);
    const kbS = cb * Math.pow(10, -HK / 20), kbE = cb * Math.pow(10, HK / 20);

    const aB = Math.exp(-1 / (ATK_B * sampleRate));
    const aM = Math.exp(-1 / (ATK_M * sampleRate));
    const bBlend = this.hB * 4 > 1 ? 1 : this.hB * 4;
    const mBlend = this.hM * 4 > 1 ? 1 : this.hM * 4;
    const rB = Math.exp(-1 / ((REL_B * 0.25 + REL_B * 1.75 * bBlend) * sampleRate));
    const rM = Math.exp(-1 / ((REL_M * 0.25 + REL_M * 1.75 * mBlend) * sampleRate));
    const rQ = Math.exp(-1 / (REL_QUICK * sampleRate));
    const tC = Math.exp(-1 / (TH_TC * sampleRate));
    const hC = this.holdC;
    const gfTarget = Math.pow(10, -params.maxred[0] / 20);
    if (this.gfSm < 0) this.gfSm = gfTarget;
    this.gfSm += (gfTarget - this.gfSm) * 0.05;
    const gFloor = this.gfSm;

    const shift = params.shift[0];
    if (shift !== this.shiftLast) {
      const d = shift - this.shiftLast;
      if (this.ref !== null) this.ref += d;
      this.env += d;
      this.shiftLast = shift;
    }
    const guardOn = params.guard[0] >= 0.5;
    let jT = 1;
    if (guardOn) jT = this.guardTarget(n / sampleRate);
    else if (this.ref !== null || this.mode !== 0) this.gReset();
    const rJ = this.fast > 0 ? this.rJf : this.rJ;
    while (this.kwS.length < ch) this.kwS.push([[0, 0, 0, 0], [0, 0, 0, 0]]);
    const kw1 = this.kw[0], kw2 = this.kw[1];

    for (let i = 0; i < n; i++) {
      this.gJ = jT + (this.gJ - jT) * (jT < this.gJ ? this.aJ : rJ);
      const gj = this.gJ;

      let pLo = 0, pHi = 0, sq = 0;
      for (let c = 0; c < ch; c++) {
        const raw = inp[c][i];
        if (guardOn) {
          const k = kwRun(kw2, this.kwS[c][1], kwRun(kw1, this.kwS[c][0], raw));
          sq += k * k;
        }
        const x = raw * gj;
        const lo = this.bq(this.sL2[c], this.bq(this.sL1[c], x, this.lb0, this.lb1, this.lb2), this.lb0, this.lb1, this.lb2);
        const hi = x - lo;
        this.loRing[c][this.idx] = lo;
        this.hiRing[c][this.idx] = hi;
        const al = lo < 0 ? -lo : lo;
        const ah = hi < 0 ? -hi : hi;
        if (al > pLo) pLo = al;
        if (ah > pHi) pHi = ah;
      }
      if (guardOn) {
        if (ch === 1) sq *= 2;
        this.msP = sq + (this.msP - sq) * this.eP;
        this.msF = sq + (this.msF - sq) * this.eF;
        this.msS = sq + (this.msS - sq) * this.eSl;
      }

      let tB = on ? this.target(pLo, cbDb, cb, kbS, kbE) : 1;
      if (tB < gFloor) tB = gFloor * Math.pow(tB / gFloor, SOFT_KB);
      this.tHB = tB + (this.tHB - tB) * tC;
      if (tB < this.gB) {
        this.gB = tB + (this.gB - tB) * aB;
      } else {
        let w = this.tHB > 0.9 ? (this.tHB - 0.9) * 10 : 0;
        if (w > 1) w = 1;
        const slow = tB + (this.gB - tB) * rB;
        const quick = tB + (this.gB - tB) * rQ;
        this.gB = slow + (quick - slow) * w;
      }
      const rb = 1 - tB;
      this.hB = rb + (this.hB - rb) * hC;

      let pS = 0;
      for (let c = 0; c < ch; c++) {
        const v = this.loRing[c][this.idx] * this.gB + this.hiRing[c][this.idx];
        const a = v < 0 ? -v : v;
        if (a > pS) pS = a;
      }
      let tS = on ? this.target(pS, cmDb, cm, kmS, kmE) : 1;
      if (tS < gFloor) tS = gFloor * Math.pow(tS / gFloor, SOFT_KM);
      this.tHS = tS + (this.tHS - tS) * tC;
      if (tS < this.gS) {
        this.gS = tS + (this.gS - tS) * aM;
      } else {
        let w = this.tHS > 0.9 ? (this.tHS - 0.9) * 10 : 0;
        if (w > 1) w = 1;
        const slow = tS + (this.gS - tS) * rM;
        const quick = tS + (this.gS - tS) * rQ;
        this.gS = slow + (quick - slow) * w;
      }
      const rs = 1 - tS;
      this.hM = rs + (this.hM - rs) * hC;

      const totB = this.gB * this.gS;
      if (totB < this.minB) this.minB = totB;
      if (this.gS < this.minM) this.minM = this.gS;

      const rd = this.idx + 1 >= this.len ? 0 : this.idx + 1;
      for (let c = 0; c < ch; c++) {
        out[c][i] = (this.loRing[c][rd] * this.gB + this.hiRing[c][rd]) * this.gS;
      }
      this.idx = rd;
    }
    for (let c = ch; c < out.length; c++) out[c].set(out[c % ch]);

    this.count += n;
    if (this.count >= this.every) {
      this.port.postMessage({
        b: 20 * Math.log10(this.minB > 1e-6 ? this.minB : 1e-6),
        m: 20 * Math.log10(this.minM > 1e-6 ? this.minM : 1e-6),
      });
      this.minB = 1;
      this.minM = 1;
      this.count = 0;
    }
    return true;
  }
}

registerProcessor("vb-limiter", VBLimiter);
