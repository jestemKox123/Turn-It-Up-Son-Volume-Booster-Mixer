// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

const CTX = new AudioContext({ latencyHint: "playback" });
const MASTER = VBAudio.createMaster(CTX);
const engines = new Map();

const WORKLET = MASTER.loadWorklet(chrome.runtime.getURL("limiter-worklet.js"));

const IDLE_MS = 300000;
let idleTimer = null;

function cancelIdle() {
  clearTimeout(idleTimer);
  idleTimer = null;
}

function armIdle() {
  cancelIdle();
  idleTimer = setTimeout(() => {
    if (engines.size > 0 || starting.size > 0) return;
    try { CTX.close(); } catch (e) {}
    window.close();
  }, IDLE_MS);
}

function teardown(tabId) {
  const engine = engines.get(tabId);
  if (!engine) return;
  engines.delete(tabId);
  engine.stop(() => {
    try { engine.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
  });
  if (engines.size === 0) armIdle();
}

const starting = new Map();

async function start(tabId, streamId, settings) {
  cancelIdle();
  const existing = engines.get(tabId);
  if (existing) {
    existing.apply(settings);
    return true;
  }
  if (starting.has(tabId)) {
    try {
      await starting.get(tabId);
    } catch (e) {}
    const after = engines.get(tabId);
    if (after) {
      after.apply(settings);
      return true;
    }
    return false;
  }
  const p = (async () => {
    await WORKLET;
    const grab = () =>
      navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
        video: false,
      });
    let stream;
    try {
      stream = await grab();
    } catch (e) {
      await new Promise((r) => setTimeout(r, 320));
      try {
        stream = await grab();
      } catch (e2) {
        chrome.runtime.sendMessage({ type: "vb-ended", tabId });
        return false;
      }
    }
    if (CTX.state === "suspended") { try { await CTX.resume(); } catch (e) {} }
    const source = CTX.createMediaStreamSource(stream);
    const engine = VBAudio.createVoice(MASTER, source, settings);
    engine.stream = stream;
    engines.set(tabId, engine);
    stream.getAudioTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        teardown(tabId);
        chrome.runtime.sendMessage({ type: "vb-ended", tabId });
      });
    });
    return true;
  })();
  starting.set(tabId, p);
  try {
    return await p;
  } finally {
    starting.delete(tabId);
  }
}

function activeTabIds() {
  return Array.from(engines.keys());
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
    if (engine) engine.apply(msg.settings);
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
  if (msg.type === "vb-limiter") {
    MASTER.applyRotator(msg.rot === true);
    MASTER.applyLimiter(msg.on !== false, msg.ceiling, msg.bass, msg.maxred);
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === "vb-meter") {
    const m = MASTER.meter();
    sendResponse({
      bass: m.bass,
      main: m.main,
      hq: m.hq,
      playing: engines.size > 0,
      tabs: engines.size,
    });
    return false;
  }
  return false;
});
