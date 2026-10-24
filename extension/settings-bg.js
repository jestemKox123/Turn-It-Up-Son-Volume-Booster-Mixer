// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(function () {
  const canvas = document.getElementById("bgGrille");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GAP = 18;
  const BUCKETS = 10;
  let w = 0, h = 0, dpr = 1, raf = 0, visible = !document.hidden;
  let dots = new Float32Array(0);
  let mx = -1e4, my = -1e4, last = -4, frameNo = 0;
  let accent = [61, 139, 255];
  const waves = [];
  const QUIET = ".brand, .tabs .tab, .side-links > *, .pane-h, .sec-h, .feat-intro, .feat-grp-h, .cl-foot, .foot";
  let quiet = [];
  let quietDirty = true;
  let quietAt = 0;
  let movedAt = 0;
  let drawnAt = 0;
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  function readAccent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(v);
    if (m) accent = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  }

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.ceil(w / GAP) + 1, rows = Math.ceil(h / GAP) + 1;
    const ox = (w - (cols - 1) * GAP) / 2;
    dots = new Float32Array(cols * rows * 2);
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots[i++] = ox + x * GAP;
        dots[i++] = GAP / 2 + y * GAP;
      }
    }
  }

  function source() {
    const main = document.querySelector(".main");
    const r = main ? main.getBoundingClientRect() : { left: 0, width: w };
    return { x: r.left + r.width * 0.3, y: -80 };
  }

  function frame(ts) {
    raf = 0;
    if (!visible) return;
    if (!REDUCED && ts - drawnAt < 30 && performance.now() - movedAt > 1200) {
      raf = requestAnimationFrame(frame);
      return;
    }
    drawnAt = ts || 0;
    const t = now();
    if (frameNo++ % 30 === 0) readAccent();
    if (!REDUCED && t - last > 6.5) {
      const s = source();
      waves.push({ x: s.x, y: s.y, b: t, s: 0.7, v: 80, wd: 46, life: Math.hypot(w, h) + 200 });
      last = t;
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      if ((t - waves[i].b) * waves[i].v > waves[i].life) waves.splice(i, 1);
    }

    if (quietDirty || frameNo - quietAt > 20) {
      quiet = [...document.querySelectorAll(QUIET)].map((el) => el.getBoundingClientRect()).filter((q) => q.width && q.bottom > -20 && q.top < h + 20);
      quietDirty = false;
      quietAt = frameNo;
    }
    ctx.clearRect(0, 0, w, h);
    const base = Array.from({ length: BUCKETS }, () => new Path2D());
    const tint = Array.from({ length: BUCKETS }, () => new Path2D());
    const drift = REDUCED ? 0 : t * 10;
    const live = waves.map((wv) => {
      const R = (t - wv.b) * wv.v;
      return { x: wv.x, y: wv.y, R, wd: wv.wd, s: wv.s * Math.max(0, 1 - R / wv.life) };
    });
    for (let i = 0; i < dots.length; i += 2) {
      const x = dots[i], y = dots[i + 1];
      const fall = 0.3 + 0.7 * Math.max(0, 1 - y / (h * 1.1));
      let wave = 0;
      for (const wv of live) {
        const d = (Math.hypot(x - wv.x, y - wv.y) - wv.R) / wv.wd;
        if (d > -3 && d < 3) wave += wv.s * Math.exp(-d * d);
      }
      const rip = 0.5 + 0.5 * Math.sin((x * 0.6 + y - drift) / 40);
      let I = (0.1 + 0.08 * rip * rip) * fall;
      const near = Math.hypot(x - mx, y - my);
      if (near < 160) I += (1 - near / 160) * 0.18;
      let W = Math.min(1, wave) * (0.5 + 0.5 * fall);
      for (const q of quiet) {
        if (x > q.left - 14 && x < q.right + 14 && y > q.top - 10 && y < q.bottom + 10) { I *= 0.25; W *= 0.15; break; }
      }
      if (I + W < 0.035) continue;
      const rad = 0.7 + Math.min(1, I + W) * 2;
      const into = W > I ? tint : base;
      const k = Math.min(BUCKETS - 1, Math.floor(Math.min(1, into === tint ? W : I) * BUCKETS * 1.6));
      into[k].moveTo(x + rad, y);
      into[k].arc(x, y, rad, 0, Math.PI * 2);
    }
    const [r, g, b] = accent;
    for (let k = 0; k < BUCKETS; k++) {
      const a = Math.min(0.9, 0.12 + ((k + 0.5) / BUCKETS) * 0.8);
      ctx.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
      ctx.fill(base[k]);
      const m = Math.min(1, (k + 1) / BUCKETS + 0.25);
      ctx.fillStyle = "rgba(" + Math.round(255 + (r - 255) * m) + "," + Math.round(255 + (g - 255) * m) + "," + Math.round(255 + (b - 255) * m) + "," + a.toFixed(3) + ")";
      ctx.fill(tint[k]);
    }
    if (!REDUCED) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => { size(); quietDirty = true; kick(); });
  window.addEventListener("scroll", () => { quietDirty = true; }, { passive: true });
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; kick(); });
  window.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; movedAt = performance.now(); }, { passive: true });
  document.addEventListener("pointerleave", () => { mx = my = -1e4; });
  document.addEventListener("click", (e) => {
    quietDirty = true;
    if (REDUCED || !e.target.closest(".switch, .btn, .tab, .th-btn, .pick, .sl, .support-pill")) return;
    waves.push({ x: e.clientX, y: e.clientY, b: now(), s: 1.1, v: 320, wd: 30, life: 760 });
    kick();
  });
  document.addEventListener("change", (e) => {
    if (REDUCED || !e.target.matches(".range")) return;
    const q = e.target.getBoundingClientRect();
    waves.push({ x: q.left + q.width / 2, y: q.top + q.height / 2, b: now(), s: 0.9, v: 320, wd: 30, life: 620 });
    kick();
  });

  readAccent();
  size();
  kick();
})();
