// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(async function () {
  const real = window.chrome;
  const TAB = { id: 1, url: "https://www.youtube.com/watch?v=preview", title: "Late night mix - YouTube", audible: true, active: true };
  const listeners = [];
  const st = {
    active: true,
    settings: { volume: 2.5, monoFix: false, bassBoost: true, bassMode: "classic", userBass: 0, reverb: 0, treble: 0, muffle: 0, vocal: 0, power: 0, spin: false, spinSpeed: 0.5 },
    yt: false,
    skip: false,
    rate: 1,
  };

  let bag = {};
  try { bag = (await real.storage.local.get(null)) || {}; } catch (e) {}

  const copy = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const done = (cb, val) => {
    const p = Promise.resolve(val);
    if (typeof cb === "function") p.then((v) => cb(v));
    return p;
  };
  const fire = (ch, name) => listeners.slice().forEach((fn) => { try { fn(ch, name); } catch (e) {} });
  const pick = (keys, from) => {
    if (keys == null) return copy(from);
    const out = {};
    if (typeof keys === "string") keys = [keys];
    if (Array.isArray(keys)) keys.forEach((k) => { if (k in from) out[k] = copy(from[k]); });
    else Object.keys(keys).forEach((k) => { out[k] = k in from ? copy(from[k]) : keys[k]; });
    return out;
  };
  const area = (name, data) => ({
    get(keys, cb) {
      if (typeof keys === "function") { cb = keys; keys = null; }
      return done(cb, pick(keys, data));
    },
    set(obj, cb) {
      const ch = {};
      Object.keys(obj || {}).forEach((k) => { ch[k] = { oldValue: data[k], newValue: obj[k] }; data[k] = copy(obj[k]); });
      setTimeout(() => fire(ch, name), 0);
      return done(cb);
    },
    remove(keys, cb) {
      const ch = {};
      [].concat(keys).forEach((k) => { ch[k] = { oldValue: data[k] }; delete data[k]; });
      setTimeout(() => fire(ch, name), 0);
      return done(cb);
    },
    clear(cb) {
      Object.keys(data).forEach((k) => delete data[k]);
      return done(cb);
    },
  });

  try {
    real.storage.onChanged.addListener((ch, name) => {
      if (name !== "local") return;
      Object.keys(ch).forEach((k) => {
        if ("newValue" in ch[k]) bag[k] = copy(ch[k].newValue);
        else delete bag[k];
      });
      fire(ch, "local");
    });
  } catch (e) {}

  function handle(msg) {
    const t = msg && msg.type;
    if (t === "vb-get") return { active: st.active, settings: copy(st.settings), ytAutoContinue: st.yt, skipEnabled: st.skip, backup: null, mix: st.rate };
    if (t === "vb-start") { st.active = true; st.settings = Object.assign({}, st.settings, msg.settings); return { active: true }; }
    if (t === "vb-update") { st.settings = Object.assign({}, st.settings, msg.settings); return { active: st.active }; }
    if (t === "vb-stop") { st.active = false; return { active: false }; }
    if (t === "vb-mix-set") { st.rate = Number(msg.rate) || 1; return { rate: st.rate }; }
    if (t === "vb-set-yt") { st.yt = !!msg.enabled; return { ok: true }; }
    if (t === "vb-set-skip") { st.skip = !!msg.enabled; return { ok: true }; }
    if (t === "vb-audible") return { tabs: [{ tabId: TAB.id, title: TAB.title, url: TAB.url, boosted: st.active, backup: null }] };
    if (t === "vb-meter-any") {
      if (!st.active) return null;
      const over = Math.max(0, (Number(st.settings.volume) || 1) - 2.2);
      const wob = 0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 380));
      return { main: over * 2.4 * wob, bass: st.settings.bassBoost ? over * 3 * wob : over * 1.2 * wob, hq: true, playing: true, tabs: 1 };
    }
    return { ok: true };
  }

  const external = (url) => {
    if (/^https?:/i.test(url || "")) {
      try { return real.tabs.create({ url }); } catch (e) {}
    }
    return Promise.resolve({});
  };

  window.chrome = {
    runtime: {
      id: real.runtime.id,
      lastError: undefined,
      getURL: (p) => real.runtime.getURL(p),
      getManifest: () => real.runtime.getManifest(),
      openOptionsPage: () => Promise.resolve(),
      sendMessage(msg, cb) {
        return done(cb, handle(msg));
      },
      onMessage: { addListener() {}, removeListener() {} },
    },
    storage: {
      local: area("local", bag),
      session: area("session", {}),
      onChanged: {
        addListener: (fn) => listeners.push(fn),
        removeListener: (fn) => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
      },
    },
    tabs: {
      query: (q, cb) => done(cb, [copy(TAB)]),
      get: (id, cb) => done(cb, copy(TAB)),
      create: (o) => external(o && o.url),
      update: () => Promise.resolve({}),
      sendMessage(tabId, msg, a, b) {
        const cb = typeof a === "function" ? a : b;
        return done(cb, msg && msg.type === "vb-mix-probe" ? { status: "ok" } : { ok: false });
      },
    },
    permissions: {
      contains: (p, cb) => done(cb, true),
      request: (p, cb) => done(cb, true),
      remove: (p, cb) => done(cb, true),
      getAll: (cb) => done(cb, { origins: [], permissions: [] }),
    },
    tabCapture: {
      getMediaStreamId: (o, cb) => done(cb, "preview"),
    },
  };

  const html = await (await fetch("popup.html")).text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const scripts = [...doc.querySelectorAll("script[src]")].map((s) => s.getAttribute("src"));
  doc.querySelectorAll("script").forEach((s) => s.remove());
  [...doc.body.childNodes].forEach((n) => document.body.appendChild(document.adoptNode(n)));
  for (const src of scripts) {
    await new Promise((res) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = s.onerror = res;
      document.body.appendChild(s);
    });
  }
  document.documentElement.dataset.ready = "1";
})();
