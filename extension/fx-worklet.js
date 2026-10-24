// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

const MODES = ["classic", "sub", "punch", "rumble", "808", "warm"];

const EQ = {
  classic: [[38.5, 0.537, 9.88], [79, 0.863, 5.52], [277, 1.101, -1.94], [22.3, 0.659, -5.72]],
  sub: [[53.1, 1.298, 5.17], [36.6, 1.127, 8.13], [234.3, 1.027, -0.62], [15.5, 1.315, -1.53]],
  punch: [[74.6, 1.332, 4.36], [97.5, 1.277, 7.62], [290.6, 1.282, -4.14], [18.6, 1.669, -0.37]],
  rumble: [[40.9, 1.055, 9.63], [26.1, 0.968, 7.63], [160, 0.604, -1.62], [17.8, 0.702, -3.67]],
  "808": [[40.8, 0.85, 7.01], [61.5, 1.274, 6.42], [316.9, 1.673, -1.81], [16.4, 1.125, -1.71]],
  warm: [[110.1, 0.634, 8.25], [49.6, 0.893, 2.23], [343.2, 0.821, -1.51], [16, 1.155, -0.64]],
};

const HARM = {
  classic: { lvl: 1, lo: 35, hi: 110, out: 120, w: [1, 0.55, 0.22, 0.08], punch: 0 },
  sub: { lvl: 0.9, lo: 30, hi: 80, out: 100, w: [1, 0.5, 0.2, 0.08], punch: 0 },
  punch: { lvl: 0.9, lo: 45, hi: 140, out: 140, w: [0.9, 0.7, 0.25, 0.1], punch: 0.7 },
  rumble: { lvl: 1.3, lo: 25, hi: 70, out: 90, w: [1, 0.6, 0.3, 0.12], punch: 0 },
  "808": { lvl: 1.4, lo: 35, hi: 100, out: 110, w: [0.9, 0.8, 0.3, 0.12], punch: 0.25 },
  warm: { lvl: 0.3, lo: 40, hi: 160, out: 150, w: [1, 0.3, 0.1, 0.05], punch: 0 },
};

const DEPTH = 1.5;
const BAL_LOW = -10;
const BAL_HIGH = -2;
const BAL_MIN = 0.9;
const BAL_TC = 1.5;
const AMT_TC = 0.08;
const MORPH_TC = 0.06;
const H_ATK = 0.001;
const H_REL = 0.04;
const GATE_LO = 0.001;
const GATE_HI = 0.0032;
const H_LP = 450;

function peaking(f, q, g) {
  const A = Math.pow(10, g / 40);
  const w0 = (2 * Math.PI * f) / sampleRate;
  const al = Math.sin(w0) / (2 * q);
  const cw = Math.cos(w0);
  const a0 = 1 + al / A;
  return [(1 + al * A) / a0, (-2 * cw) / a0, (1 - al * A) / a0, (-2 * cw) / a0, (1 - al / A) / a0];
}

function pass(type, f, q) {
  const w0 = (2 * Math.PI * f) / sampleRate;
  const al = Math.sin(w0) / (2 * q);
  const cw = Math.cos(w0);
  const a0 = 1 + al;
  if (type === "lp") return [((1 - cw) / 2) / a0, (1 - cw) / a0, ((1 - cw) / 2) / a0, (-2 * cw) / a0, (1 - al) / a0];
  if (type === "hp") return [((1 + cw) / 2) / a0, -(1 + cw) / a0, ((1 + cw) / 2) / a0, (-2 * cw) / a0, (1 - al) / a0];
  return [al / a0, 0, -al / a0, (-2 * cw) / a0, (1 - al) / a0];
}

function run(c, s, x) {
  const y = c[0] * x + c[1] * s[0] + c[2] * s[1] - c[3] * s[2] - c[4] * s[3];
  s[1] = s[0]; s[0] = x; s[3] = s[2]; s[2] = y;
  return y;
}

const st = () => [0, 0, 0, 0];

class VBBass extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "amount", defaultValue: 0, minValue: 0, maxValue: 1.5, automationRate: "k-rate" },
      { name: "mode", defaultValue: 0, minValue: 0, maxValue: 5, automationRate: "k-rate" },
    ];
  }

  constructor() {
    super();
    this.mode = -1;
    this.cur = EQ.classic.map((b) => b.slice());
    this.amt = 0;
    this.bal = 1;
    this.eqS = [[st(), st(), st(), st()], [st(), st(), st(), st()]];
    this.eqC = [peaking(100, 1, 0), peaking(100, 1, 0), peaking(100, 1, 0), peaking(100, 1, 0)];
    this.balS = [st(), st()];
    this.balC = pass("lp", 120, 0.7071);
    this.eLo = 0;
    this.eAll = 0;
    this.hSrc = [st(), st(), st()];
    this.hOut = [st(), st(), st()];
    this.hEnv = 0;
    this.tF = 0;
    this.tS = 0;
    this.tr = 0;
    this.pkS = [st(), st()];
    this.pkC = pass("bp", 90, 1);
    this.lpC = pass("lp", H_LP, 0.7071);
    this.setMode(0);
  }

  setMode(i) {
    const name = MODES[Math.max(0, Math.min(MODES.length - 1, Math.round(i)))];
    if (name === this.modeName) return;
    this.modeName = name;
    this.tgt = EQ[name];
    const h = HARM[name];
    this.h = h;
    this.hSrcC = [pass("hp", h.lo, 0.7071), pass("lp", h.hi, 0.5412), pass("lp", h.hi, 1.3066)];
    this.hOutC = [pass("hp", h.out, 0.5412), pass("hp", h.out, 1.3066)];
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return false;
    }
    const L = inp[0];
    const R = inp.length > 1 ? inp[1] : inp[0];

    this.setMode(params.mode[0]);
    const target = Math.max(0, params.amount[0]);
    const ka = 1 - Math.exp(-n / (AMT_TC * sampleRate));
    this.amt += (target - this.amt) * ka;
    if (target === 0 && this.amt < 1e-4) this.amt = 0;
    const amt = this.amt;

    const km = 1 - Math.exp(-n / (MORPH_TC * sampleRate));
    const balK = Math.exp(-1 / (BAL_TC * sampleRate));
    for (let i = 0; i < n; i++) {
      const m = (L[i] + R[i]) * 0.5;
      const lo = run(this.balC, this.balS[1], run(this.balC, this.balS[0], m));
      this.eLo = lo * lo + (this.eLo - lo * lo) * balK;
      this.eAll = m * m + (this.eAll - m * m) * balK;
    }
    if (this.eAll > 1e-7) {
      const r = 10 * Math.log10((this.eLo + 1e-12) / this.eAll);
      let t = (r - BAL_LOW) / (BAL_HIGH - BAL_LOW);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const want = 1 - (1 - BAL_MIN) * t;
      this.bal += (want - this.bal) * km;
    }

    if (amt === 0) {
      for (let c = 0; c < out.length; c++) out[c].set(c === 0 ? L : R);
      const l1 = L[n - 1], l2 = n > 1 ? L[n - 2] : l1, r1 = R[n - 1], r2 = n > 1 ? R[n - 2] : r1;
      for (let b = 0; b < 4; b++) {
        const sl = this.eqS[0][b], sr = this.eqS[1][b];
        sl[0] = l1; sl[1] = l2; sl[2] = l1; sl[3] = l2;
        sr[0] = r1; sr[1] = r2; sr[2] = r1; sr[3] = r2;
      }
      for (const s of this.hSrc) s.fill(0);
      for (const s of this.hOut) s.fill(0);
      for (const s of this.pkS) s.fill(0);
      this.hEnv = 0;
      this.tF = 0;
      this.tS = 0;
      this.tr = 0;
      return true;
    }

    const k = amt * this.bal;
    for (let b = 0; b < 4; b++) {
      const cb = this.cur[b], tb = this.tgt[b];
      cb[0] += (tb[0] - cb[0]) * km;
      cb[1] += (tb[1] - cb[1]) * km;
      cb[2] += (tb[2] - cb[2]) * km;
      this.eqC[b] = peaking(cb[0], cb[1], cb[2] * k * DEPTH);
    }

    const h = this.h;
    const hGain = h.lvl * k;
    const w2 = h.w[0], w3 = h.w[1], w4 = h.w[2], w5 = h.w[3];
    const aA = Math.exp(-1 / (H_ATK * sampleRate));
    const aR = Math.exp(-1 / (H_REL * sampleRate));
    const fA = Math.exp(-1 / (0.0005 * sampleRate));
    const fR = Math.exp(-1 / (0.02 * sampleRate));
    const sA = Math.exp(-1 / (0.025 * sampleRate));
    const sR = Math.exp(-1 / (0.15 * sampleRate));
    const pAmt = h.punch * k;
    const oL = out[0];
    const oR = out.length > 1 ? out[1] : null;

    for (let i = 0; i < n; i++) {
      const xl = L[i], xr = R[i];
      let yl = xl, yr = xr;
      for (let b = 0; b < 4; b++) {
        yl = run(this.eqC[b], this.eqS[0][b], yl);
        yr = run(this.eqC[b], this.eqS[1][b], yr);
      }

      const m = (xl + xr) * 0.5;
      let s = run(this.hSrcC[0], this.hSrc[0], m);
      s = run(this.hSrcC[1], this.hSrc[1], s);
      s = run(this.hSrcC[2], this.hSrc[2], s);
      const a = s < 0 ? -s : s;
      this.hEnv = a > this.hEnv ? a + (this.hEnv - a) * aA : a + (this.hEnv - a) * aR;
      const e = this.hEnv;
      let hv = 0;
      if (e > GATE_LO) {
        let u = s / e;
        u = u > 1 ? 1 : u < -1 ? -1 : u;
        const u2 = u * u;
        const t2 = 2 * u2 - 1;
        const t3 = u * (4 * u2 - 3);
        const t4 = 8 * u2 * u2 - 8 * u2 + 1;
        const t5 = u * (16 * u2 * u2 - 20 * u2 + 5);
        let g = (e - GATE_LO) / (GATE_HI - GATE_LO);
        g = g > 1 ? 1 : g;
        hv = (w2 * t2 + w3 * t3 + w4 * t4 + w5 * t5) * e * g;
      }
      hv = run(this.hOutC[0], this.hOut[0], hv);
      hv = run(this.hOutC[1], this.hOut[1], hv);
      hv = run(this.lpC, this.hOut[2], hv) * hGain;

      if (pAmt > 0) {
        const af = a;
        this.tF = af > this.tF ? af + (this.tF - af) * fA : af + (this.tF - af) * fR;
        this.tS = af > this.tS ? af + (this.tS - af) * sA : af + (this.tS - af) * sR;
        let tr = this.tS > 1e-5 ? this.tF / this.tS - 1 : 0;
        tr = tr < 0 ? 0 : tr > 1.5 ? 1.5 : tr;
        this.tr = tr > this.tr ? tr : tr + (this.tr - tr) * fR;
        const pk = this.tr * pAmt;
        yl += run(this.pkC, this.pkS[0], xl) * pk;
        yr += run(this.pkC, this.pkS[1], xr) * pk;
      }

      oL[i] = yl + hv;
      if (oR) oR[i] = yr + hv;
    }
    return true;
  }
}

registerProcessor("vb-bass", VBBass);

const DUCK_MAX = 4;
const DUCK_K = 0.6;
const DUCK_FAST = 0.05;
const DUCK_SLOW = 2.5;
const DUCK_ATK = 0.03;
const DUCK_REL = 0.3;

class VBVerb extends AudioWorkletProcessor {
  constructor() {
    super();
    this.alive = true;
    this.port.onmessage = (e) => {
      if (e.data === "stop") this.alive = false;
    };
    this.pF = 0;
    this.pS = 0;
    this.g = 1;
  }

  process(inputs, outputs, params) {
    const out = outputs[0];
    if (!out || !out.length) return this.alive;
    const n = out[0].length;
    const wet = inputs[0];
    if (!wet || !wet.length || !wet[0] || !wet[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return this.alive;
    }
    const key = inputs[1];
    const wl = wet[0];
    const wr = wet.length > 1 ? wet[1] : wet[0];
    let target = 1;
    if (key && key.length && key[0] && key[0].length) {
      const kl = key[0];
      const kr = key.length > 1 ? key[1] : key[0];
      const cF = Math.exp(-1 / (DUCK_FAST * sampleRate));
      const cS = Math.exp(-1 / (DUCK_SLOW * sampleRate));
      for (let i = 0; i < n; i++) {
        const p = (kl[i] * kl[i] + kr[i] * kr[i]) * 0.5;
        this.pF = p + (this.pF - p) * cF;
        this.pS = p + (this.pS - p) * cS;
      }
      if (this.pS > 1e-9) {
        const over = 10 * Math.log10((this.pF + 1e-12) / this.pS);
        let d = over > 0 ? over * DUCK_K : 0;
        if (d > DUCK_MAX) d = DUCK_MAX;
        target = Math.pow(10, -d / 20);
      }
    }

    const a = Math.exp(-1 / ((target < this.g ? DUCK_ATK : DUCK_REL) * sampleRate));
    const oL = out[0];
    const oR = out.length > 1 ? out[1] : null;
    for (let i = 0; i < n; i++) {
      this.g = target + (this.g - target) * a;
      oL[i] = wl[i] * this.g;
      if (oR) oR[i] = wr[i] * this.g;
    }
    return this.alive;
  }
}

registerProcessor("vb-verb", VBVerb);

const SAFE_CEIL = Math.pow(10, -0.3 / 20);
const SAFE_LA = 0.0015;
const SAFE_REL = 0.08;

class VBSafety extends AudioWorkletProcessor {
  constructor() {
    super();
    this.len = Math.max(4, Math.round(SAFE_LA * sampleRate));
    this.ring = [new Float32Array(this.len), new Float32Array(this.len)];
    this.req = new Float32Array(this.len).fill(1);
    this.hist = [[0, 0, 0], [0, 0, 0]];
    this.idx = 0;
    this.g = 1;
    this.need = 1;
    this.needAt = 0;
  }

  tp(h, x) {
    const p0 = h[0], p1 = h[1], p2 = h[2], p3 = x;
    let m = p2 < 0 ? -p2 : p2;
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      const v = p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
      const a = v < 0 ? -v : v;
      if (a > m) m = a;
    }
    h[0] = p1; h[1] = p2; h[2] = p3;
    return m;
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || !out.length) return true;
    const inp = inputs[0];
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return true;
    }
    const ch = Math.min(2, inp.length);
    const aAtk = Math.exp(-4 / this.len);
    const aRel = Math.exp(-1 / (SAFE_REL * sampleRate));
    for (let i = 0; i < n; i++) {
      let pk = 0;
      for (let c = 0; c < ch; c++) {
        const x = inp[c][i];
        this.ring[c][this.idx] = x;
        const p = this.tp(this.hist[c], x);
        if (p > pk) pk = p;
      }
      this.req[this.idx] = pk > SAFE_CEIL ? SAFE_CEIL / pk : 1;
      const rq = this.req[this.idx];
      if (rq <= this.need) {
        this.need = rq;
        this.needAt = this.idx;
      } else if (this.idx === this.needAt) {
        let m = 1, at = this.idx;
        for (let k = 0; k < this.len; k++) if (this.req[k] < m) { m = this.req[k]; at = k; }
        this.need = m;
        this.needAt = at;
      }
      const need = this.need;
      this.g = need < this.g ? need + (this.g - need) * aAtk : need + (this.g - need) * aRel;
      const rd = this.idx + 1 >= this.len ? 0 : this.idx + 1;
      for (let c = 0; c < out.length; c++) {
        let y = this.ring[c < ch ? c : 0][rd] * this.g;
        if (y > 0.999) y = 0.999;
        else if (y < -0.999) y = -0.999;
        out[c][i] = y;
      }
      this.idx = rd;
    }
    return true;
  }
}

registerProcessor("vb-safety", VBSafety);

const VOX_G = 6;
const VOX_SIDE = -3;
const VOX_TRIM = -1.5;
const VOX_Q = 3;
const VOX_TC = 0.04;
const VOX_EDGE = [250, 700, 4000, 7000];

function voxBell(f) {
  const [lo0, lo1, hi1, hi0] = VOX_EDGE;
  if (f <= lo0 || f >= hi0) return 0;
  if (f >= lo1 && f <= hi1) return 1;
  const t = f < lo1 ? Math.log(f / lo0) / Math.log(lo1 / lo0) : Math.log(hi0 / f) / Math.log(hi0 / hi1);
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function bpGain(c, f) {
  const w = (2 * Math.PI * f) / sampleRate;
  const z1r = Math.cos(w), z1i = -Math.sin(w), z2r = Math.cos(2 * w), z2i = -Math.sin(2 * w);
  const nr = c[0] + c[1] * z1r + c[2] * z2r, ni = c[1] * z1i + c[2] * z2i;
  const dr = 1 + c[3] * z1r + c[4] * z2r, di = c[3] * z1i + c[4] * z2i;
  const dd = dr * dr + di * di;
  return [(nr * dr + ni * di) / dd, (ni * dr - nr * di) / dd];
}

class VBVocal extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: "amount", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" }];
  }

  constructor() {
    super();
    const all = [];
    for (let f = VOX_EDGE[0]; f <= 6300; f *= Math.pow(2, 1 / 3)) all.push(pass("bp", f, VOX_Q));
    let sum = 0, cnt = 0;
    for (let f = 1000; f <= 4000; f *= 1.05) {
      let re = 0, im = 0;
      for (const c of all) { const h = bpGain(c, f); re += h[0]; im += h[1]; }
      sum += Math.hypot(re, im);
      cnt++;
    }
    const norm = cnt / sum;
    this.c = [];
    this.w = [];
    let f = VOX_EDGE[0];
    for (const c of all) {
      const b = voxBell(f);
      if (b > 0) { this.c.push(c); this.w.push(b * norm); }
      f *= Math.pow(2, 1 / 3);
    }
    this.nb = this.c.length;
    this.amt = 0;
    this.reset();
  }

  reset() {
    this.sM = this.c.map(st); this.sS = this.c.map(st);
    this.kM = this.c.map(st); this.kS = this.c.map(st);
    this.num = new Float64Array(this.nb);
    this.den = new Float64Array(this.nb);
    this.clean = true;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return false;
    }
    const L = inp[0];
    const R = inp.length > 1 ? inp[1] : inp[0];
    const key = inputs.length > 1 && inputs[1] && inputs[1].length && inputs[1][0] && inputs[1][0].length ? inputs[1] : null;
    const KL = key ? key[0] : null;
    const KR = key ? (key.length > 1 ? key[1] : key[0]) : null;

    const target = Math.max(0, Math.min(1, params.amount[0]));
    this.amt += (target - this.amt) * (1 - Math.exp(-n / (AMT_TC * sampleRate)));
    if (target === 0 && this.amt < 1e-4) this.amt = 0;
    const amt = this.amt;
    const oL = out[0];
    const oR = out.length > 1 ? out[1] : null;

    if (amt === 0) {
      oL.set(L);
      if (oR) oR.set(R);
      if (!this.clean) this.reset();
      return true;
    }
    this.clean = false;

    const A = Math.pow(10, (VOX_G * amt) / 20) - 1;
    const AS = Math.pow(10, (VOX_SIDE * amt) / 20) - 1;
    const trim = Math.pow(10, (VOX_TRIM * amt) / 20);
    const al = Math.exp(-1 / (VOX_TC * sampleRate));
    const nb = this.nb, C = this.c, Wt = this.w, num = this.num, den = this.den;

    for (let i = 0; i < n; i++) {
      const m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5;
      const km = key ? (KL[i] + KR[i]) * 0.5 : m, ks = key ? (KL[i] - KR[i]) * 0.5 : s;
      let am = 0, as = 0;
      for (let b = 0; b < nb; b++) {
        const bm = run(C[b], this.sM[b], m), bs = run(C[b], this.sS[b], s);
        let dm = bm, ds = bs;
        if (key) { dm = run(C[b], this.kM[b], km); ds = run(C[b], this.kS[b], ks); }
        const p = dm * dm, q = ds * ds;
        num[b] = p - q + (num[b] - p + q) * al;
        den[b] = p + q + (den[b] - p - q) * al;
        let c = den[b] > 1e-15 ? num[b] / den[b] : 0;
        c = c < 0 ? 0 : c > 1 ? 1 : c;
        am += A * Wt[b] * ((2 * c) / (1 + c)) * bm;
        as += AS * Wt[b] * bs;
      }
      const mo = m + am, so = s + as;
      oL[i] = (mo + so) * trim;
      if (oR) oR[i] = (mo - so) * trim;
    }
    return true;
  }
}

registerProcessor("vb-vocal", VBVocal);

const PW_FC = 120;
const PW_DET_LO = 120;
const PW_DET_HI = 300;
const PW_T = -8;
const PW_R = 6;
const PW_KNEE = 8;
const PW_MIX = 0.8;
const PW_GAIN = 3.6;
const PW_GATE = 24;
const PW_REF_UP = 3;
const PW_REF_DN = 6;
const PW_BAND = [
  { det: 0.05, atk: 0.04, rel: 0.3 },
  { det: 0.04, atk: 0.03, rel: 0.3 },
];

function pwCurve(over) {
  const k = PW_KNEE / 2, s = 1 - 1 / PW_R;
  if (over <= -k) return 0;
  if (over >= k) return over * s;
  const t = over + k;
  return (s * t * t) / (2 * PW_KNEE);
}

class VBPower extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: "amount", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" }];
  }

  constructor() {
    super();
    this.cLo = [pass("lp", PW_DET_LO, 0.7071), pass("lp", PW_DET_LO, 0.7071)];
    this.cHi = [pass("hp", PW_DET_HI, 0.5412), pass("hp", PW_DET_HI, 1.3066)];
    this.sLo = [st(), st()];
    this.sHi = [st(), st()];
    this.p = [0, 0];
    this.ref = [null, null];
    this.w = [0, 0];
    this.lp = [0, 0];
    this.a1 = 1 - Math.exp((-2 * Math.PI * PW_FC) / sampleRate);
    this.mk = pwCurve(-PW_T);
    this.age = [0, 0];
    this.amt = 0;
    this.kd = PW_BAND.map((b) => Math.exp(-1 / (b.det * sampleRate)));
    this.ka = PW_BAND.map((b) => Math.exp(-1 / (b.atk * sampleRate)));
    this.kr = PW_BAND.map((b) => Math.exp(-1 / (b.rel * sampleRate)));
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return false;
    }
    const L = inp[0];
    const R = inp.length > 1 ? inp[1] : inp[0];
    const oL = out[0];
    const oR = out.length > 1 ? out[1] : null;

    const target = Math.max(0, Math.min(1, params.amount[0]));
    this.amt += (target - this.amt) * (1 - Math.exp(-n / (AMT_TC * sampleRate)));
    if (target === 0 && this.amt < 1e-4) this.amt = 0;
    const amt = this.amt;
    const on = amt > 0;

    const kd = this.kd, ka = this.ka, kr = this.kr;
    const mix = PW_MIX * amt;
    const gain = Math.pow(10, (PW_GAIN * Math.sqrt(amt)) / 20);
    const a1 = this.a1, mk = this.mk;
    let blk0 = 0, blk1 = 0;

    for (let i = 0; i < n; i++) {
      const xl = L[i], xr = R[i];
      const m = (xl + xr) * 0.5;
      const lo = run(this.cLo[1], this.sLo[1], run(this.cLo[0], this.sLo[0], m));
      const hi = run(this.cHi[1], this.sHi[1], run(this.cHi[0], this.sHi[0], m));
      this.p[0] = lo * lo + (this.p[0] - lo * lo) * kd[0];
      this.p[1] = hi * hi + (this.p[1] - hi * hi) * kd[1];
      blk0 += this.p[0];
      blk1 += this.p[1];

      this.lp[0] += a1 * (xl - this.lp[0]);
      this.lp[1] += a1 * (xr - this.lp[1]);
      if (!on) {
        oL[i] = xl;
        if (oR) oR[i] = xr;
        continue;
      }

      let g0 = 1, g1 = 1;
      for (let b = 0; b < 2; b++) {
        const ref = this.ref[b];
        let want = 0;
        if (ref !== null) {
          const lv = 10 * Math.log10(this.p[b] + 1e-12);
          want = mk - pwCurve(lv - ref - PW_T);
          if (lv < ref - PW_GATE) {
            const f = (lv - (ref - PW_GATE - 6)) / 6;
            want *= f < 0 ? 0 : f;
          }
        }
        this.w[b] = want + (this.w[b] - want) * (want < this.w[b] ? ka[b] : kr[b]);
        const gb = 1 - mix + mix * Math.pow(10, this.w[b] / 20);
        if (b === 0) g0 = gb;
        else g1 = gb;
      }
      const ll = this.lp[0], lr = this.lp[1];
      oL[i] = (g1 * xl + (g0 - g1) * ll) * gain;
      if (oR) oR[i] = (g1 * xr + (g0 - g1) * lr) * gain;
    }

    const bt = n / sampleRate;
    for (let b = 0; b < 2; b++) {
      const lv = 10 * Math.log10((b === 0 ? blk0 : blk1) / n + 1e-12);
      if (lv < -70) continue;
      if (this.ref[b] === null) { this.ref[b] = lv; continue; }
      if (lv < this.ref[b] - 30) continue;
      this.age[b] += bt;
      const tc = Math.min(lv > this.ref[b] ? PW_REF_UP : PW_REF_DN, 0.2 + 0.5 * this.age[b]);
      this.ref[b] += (lv - this.ref[b]) * (1 - Math.exp(-bt / tc));
    }
    return true;
  }
}

registerProcessor("vb-power", VBPower);

const BR_AIR_F = 9000;
const BR_AIR_G = 12;
const BR_PRES_F = 5000;
const BR_PRES_Q = 0.9;
const BR_PRES_G = 4;
const BR_DET_F = 4500;
const BR_RMS = 0.005;
const BR_SLOW = 0.3;
const BR_TH = 4;
const BR_RANGE = 8;
const BR_MIN = 0;
const BR_W = [0.001, 0.06];
const BR_CURVE = 0.8;

class VBBright extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: "amount", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" }];
  }

  constructor() {
    super();
    this.cA = [pass("hp", BR_AIR_F, 0.7071)];
    this.cP = pass("bp", BR_PRES_F, BR_PRES_Q);
    this.cD = [pass("hp", BR_DET_F, 0.5412), pass("hp", BR_DET_F, 1.3066)];
    this.amt = 0;
    this.reset();
  }

  reset() {
    this.sA = [st(), st()];
    this.sP = [st(), st()];
    this.sD = [st(), st()];
    this.eF = 0;
    this.eS = 0;
    this.w = 1;
    this.clean = true;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return false;
    }
    const L = inp[0];
    const R = inp.length > 1 ? inp[1] : inp[0];
    const oL = out[0];
    const oR = out.length > 1 ? out[1] : null;

    const target = Math.max(0, Math.min(1, params.amount[0]));
    this.amt += (target - this.amt) * (1 - Math.exp(-n / (AMT_TC * sampleRate)));
    if (target === 0 && this.amt < 1e-4) this.amt = 0;
    const amt = this.amt;
    if (amt === 0) {
      oL.set(L);
      if (oR) oR.set(R);
      if (!this.clean) this.reset();
      return true;
    }
    this.clean = false;

    const ac = Math.pow(amt, BR_CURVE);
    const kA = Math.pow(10, (BR_AIR_G * ac) / 20) - 1;
    const kP = Math.pow(10, (BR_PRES_G * ac) / 20) - 1;
    const fK = Math.exp(-1 / (BR_RMS * sampleRate));
    const sK = Math.exp(-1 / (BR_SLOW * sampleRate));
    const wA = Math.exp(-1 / (BR_W[0] * sampleRate)), wR = Math.exp(-1 / (BR_W[1] * sampleRate));

    for (let i = 0; i < n; i++) {
      const xl = L[i], xr = R[i];
      const d = run(this.cD[1], this.sD[1], run(this.cD[0], this.sD[0], (xl + xr) * 0.5));
      const p = d * d;
      this.eF = p + (this.eF - p) * fK;
      this.eS = p + (this.eS - p) * sK;
      let want = 1;
      if (this.eS > 1e-12) {
        const over = 10 * Math.log10((this.eF + 1e-15) / this.eS) - BR_TH;
        if (over > 0) want = over >= BR_RANGE ? BR_MIN : 1 - ((1 - BR_MIN) * over) / BR_RANGE;
      }
      this.w = want + (this.w - want) * (want < this.w ? wA : wR);
      const ga = kA * this.w, gp = kP * this.w;
      oL[i] = xl + ga * run(this.cA[0], this.sA[0], xl) + gp * run(this.cP, this.sP[0], xl);
      if (oR) oR[i] = xr + ga * run(this.cA[0], this.sA[1], xr) + gp * run(this.cP, this.sP[1], xr);
    }
    return true;
  }
}

registerProcessor("vb-bright", VBBright);

const MONO_PW = 1;
const MONO_G = 0.3;
const MONO_X = 0.03;
const MONO_FLIP = -0.5;
const MONO_BACK = -0.2;
const MONO_C = 0.15;

class VBMono extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: "on", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" }];
  }

  constructor() {
    super();
    this.pL = 0;
    this.pR = 0;
    this.pX = 0;
    this.g = 0.5;
    this.w = 0;
    this.sgn = 1;
    this.c = 1;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return false;
    }
    const L = inp[0];
    const R = inp.length > 1 ? inp[1] : inp[0];
    const oL = out[0];
    const oR = out.length > 1 ? out[1] : null;
    const target = params.on[0] >= 0.5 ? 1 : 0;
    const kp = Math.exp(-1 / (MONO_PW * sampleRate));

    if (target === 0 && this.w === 0) {
      for (let i = 0; i < n; i++) {
        const l = L[i], r = R[i];
        this.pL = l * l + (this.pL - l * l) * kp;
        this.pR = r * r + (this.pR - r * r) * kp;
        this.pX = l * r + (this.pX - l * r) * kp;
      }
      oL.set(L);
      if (oR) oR.set(R);
      return true;
    }

    const kg = Math.exp(-1 / (MONO_G * sampleRate));
    const kx = Math.exp(-1 / (MONO_X * sampleRate));
    const kc = Math.exp(-1 / (MONO_C * sampleRate));
    for (let i = 0; i < n; i++) {
      const l = L[i], r = R[i];
      this.pL = l * l + (this.pL - l * l) * kp;
      this.pR = r * r + (this.pR - r * r) * kp;
      this.pX = l * r + (this.pX - l * r) * kp;
      const den = Math.sqrt(this.pL * this.pR);
      if (den > 1e-12) {
        const corr = this.pX / den;
        if (this.sgn > 0 && corr < MONO_FLIP) this.sgn = -1;
        else if (this.sgn < 0 && corr > MONO_BACK) this.sgn = 1;
      }
      this.c = this.sgn + (this.c - this.sgn) * kc;
      const pS = this.pL + this.pR + 2 * this.c * this.pX;
      let want = pS > 1e-12 ? Math.sqrt((this.pL + this.pR) / (2 * pS)) : 0.5;
      want = want < 0.5 ? 0.5 : want > 1 ? 1 : want;
      this.g = want + (this.g - want) * kg;
      this.w = target + (this.w - target) * kx;
      const m = (l + this.c * r) * this.g;
      oL[i] = l + this.w * (m - l);
      if (oR) oR[i] = r + this.w * (m - r);
    }
    if (target === 0 && this.w < 1e-5) this.w = 0;
    return true;
  }
}

registerProcessor("vb-mono", VBMono);

const MU_TOP = 22500;
const MU_K = 0.022;
const MU_WALL = [0.5, 1];
const MU_STEEP = 1.3;
const MU_BOOM_F = 90;
const MU_BOOM_Q = 0.9;
const MU_BOOM_G = 4;
const MU_WIDTH = 0.3;
const MU_TRIM = 0;

class VBMuffle extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: "amount", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" }];
  }

  constructor() {
    super();
    this.amt = 0;
    this.reset();
  }

  reset() {
    this.s1 = [st(), st()];
    this.s2 = [st(), st()];
    this.sb = [st(), st()];
    this.clean = true;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out.length) return true;
    const n = out[0].length;
    if (!inp || !inp.length || !inp[0] || !inp[0].length) {
      for (let c = 0; c < out.length; c++) out[c].fill(0);
      return false;
    }
    const L = inp[0];
    const R = inp.length > 1 ? inp[1] : inp[0];
    const oL = out[0];
    const oR = out.length > 1 ? out[1] : null;

    const target = Math.max(0, Math.min(1, params.amount[0]));
    this.amt += (target - this.amt) * (1 - Math.exp(-n / (AMT_TC * sampleRate)));
    if (target === 0 && this.amt < 1e-4) this.amt = 0;
    const a = this.amt;
    if (a === 0) {
      oL.set(L);
      if (oR) oR.set(R);
      if (!this.clean) this.reset();
      return true;
    }
    this.clean = false;

    const top = 0.45 * sampleRate;
    const fc = MU_TOP * Math.pow(MU_K, a);
    let b = (a - MU_WALL[0]) / (MU_WALL[1] - MU_WALL[0]);
    b = b < 0 ? 0 : b > 1 ? 1 : b;
    const c1 = pass("lp", Math.min(fc, top), 0.7071);
    const c2 = pass("lp", Math.min(fc * MU_STEEP, top), 0.7071);
    const cb = peaking(MU_BOOM_F, MU_BOOM_Q, MU_BOOM_G * b);
    const width = 1 - (1 - MU_WIDTH) * b;
    const trim = Math.pow(10, (MU_TRIM * b) / 20);

    for (let i = 0; i < n; i++) {
      let yl = run(c1, this.s1[0], L[i]);
      let yr = run(c1, this.s1[1], R[i]);
      yl += b * (run(c2, this.s2[0], yl) - yl);
      yr += b * (run(c2, this.s2[1], yr) - yr);
      yl = run(cb, this.sb[0], yl);
      yr = run(cb, this.sb[1], yr);
      const m = (yl + yr) * 0.5, s = (yl - yr) * 0.5 * width;
      oL[i] = (m + s) * trim;
      if (oR) oR[i] = (m - s) * trim;
    }
    return true;
  }
}

registerProcessor("vb-muffle", VBMuffle);
