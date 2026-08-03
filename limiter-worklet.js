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

class VBLimiter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "ceiling", defaultValue: -1, minValue: -24, maxValue: 0, automationRate: "k-rate" },
      { name: "bass", defaultValue: -1, minValue: -24, maxValue: 0, automationRate: "k-rate" },
      { name: "enabled", defaultValue: 1, minValue: 0, maxValue: 1, automationRate: "k-rate" },
      { name: "maxred", defaultValue: 6, minValue: 1, maxValue: 8, automationRate: "k-rate" },
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

    for (let i = 0; i < n; i++) {
      let pLo = 0, pHi = 0;
      for (let c = 0; c < ch; c++) {
        const x = inp[c][i];
        const lo = this.bq(this.sL2[c], this.bq(this.sL1[c], x, this.lb0, this.lb1, this.lb2), this.lb0, this.lb1, this.lb2);
        const hi = x - lo;
        this.loRing[c][this.idx] = lo;
        this.hiRing[c][this.idx] = hi;
        const al = lo < 0 ? -lo : lo;
        const ah = hi < 0 ? -hi : hi;
        if (al > pLo) pLo = al;
        if (ah > pHi) pHi = ah;
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
