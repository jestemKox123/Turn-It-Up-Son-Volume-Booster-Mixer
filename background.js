// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

const PER_TAB_DEFAULTS = { volume: 1, monoFix: false, bassBoost: false, bassMode: "classic", reverb: 0, treble: 0, muffle: 0, vocal: 0, power: 0, spin: false, spinSpeed: 0.5 };
const YT_SCRIPT_ID = "yt-continue";

let engineTabId = null;
let cachedActiveIds = [];
const endedRestartAt = new Map();

let opChain = Promise.resolve();
function serialize(fn) {
  const run = opChain.then(fn, fn);
  opChain = run.catch(() => {});
  return run;
}

function keyFor(tabId) {
  return "vb_tab_" + tabId;
}

async function getBackup() {
  const { vbBackup } = await chrome.storage.local.get("vbBackup");
  return vbBackup || {};
}

async function backupTab(tabId, settings) {
  if (!settings) return;
  const b = await getBackup();
  b[tabId] = settings;
  await chrome.storage.local.set({ vbBackup: b });
}

async function clearBackupTab(tabId) {
  const b = await getBackup();
  if (b[tabId] != null) {
    delete b[tabId];
    await chrome.storage.local.set({ vbBackup: b });
  }
}

async function snapshotTab(tabId) {
  const d = await chrome.storage.session.get(keyFor(tabId));
  const s = d[keyFor(tabId)];
  const mix = await getMixState(tabId);
  const rate = mix && mix.rate && mix.rate !== 1 ? mix.rate : null;
  const nonDefault = s && (s.volume !== 1 || s.monoFix || s.bassBoost || s.reverb || s.treble || s.muffle || s.vocal || s.power || s.spin);
  if (!nonDefault && !rate) return;
  const out = { ...(s || PER_TAB_DEFAULTS) };
  if (rate) out.mixRate = rate;
  else delete out.mixRate;
  await backupTab(tabId, out);
}

async function boostedTabIds() {
  const all = await chrome.storage.session.get(null);
  const out = [];
  for (const k in all) {
    if (k.indexOf("vb_tab_") === 0) out.push(Number(k.slice(7)));
  }
  return out;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setBadge(tabId, on) {
  const swallow = () => void chrome.runtime.lastError;
  if (on) {
    chrome.action.setBadgeText({ tabId, text: "ON" }).catch(swallow);
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#16a34a" }).catch(swallow);
  } else {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(swallow);
  }
}

function clearAllBadges() {
  cachedActiveIds.forEach((id) => setBadge(id, false));
  cachedActiveIds = [];
}

async function getMode() {
  const { disableMode } = await chrome.storage.local.get("disableMode");
  return disableMode === "closeTab" ? "closeTab" : "toggle";
}

async function hasOffscreen() {
  const c = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  return c.length > 0;
}

async function getEngineTabId() {
  if (engineTabId != null) return engineTabId;
  const { vb_engine_tab } = await chrome.storage.session.get("vb_engine_tab");
  if (vb_engine_tab != null) {
    try {
      await chrome.tabs.get(vb_engine_tab);
      engineTabId = vb_engine_tab;
      return engineTabId;
    } catch (e) {
      await chrome.storage.session.remove("vb_engine_tab");
    }
  }
  return null;
}

async function setEngineTabId(id) {
  engineTabId = id;
  if (id == null) await chrome.storage.session.remove("vb_engine_tab");
  else await chrome.storage.session.set({ vb_engine_tab: id });
}

async function engineTabExists() {
  const id = await getEngineTabId();
  if (id == null) return false;
  try {
    await chrome.tabs.get(id);
    return true;
  } catch (e) {
    await setEngineTabId(null);
    return false;
  }
}

async function engineReady() {
  for (let i = 0; i < 20; i++) {
    const resp = await sendToEngine({ type: "vb-list" });
    if (resp) return true;
    await wait(100);
  }
  return false;
}

async function ensureEngine() {
  const mode = await getMode();
  if (mode === "closeTab") {
    if (!(await engineTabExists())) {
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL("engine.html"),
        active: false,
        pinned: true,
      });
      await setEngineTabId(tab.id);
    }
  } else {
    if (!(await hasOffscreen())) {
      try {
        await chrome.offscreen.createDocument({
          url: "engine.html",
          reasons: ["USER_MEDIA"],
          justification: "Obrobka i wzmacnianie dzwieku przechwyconej karty.",
        });
      } catch (e) {}
    }
  }
  await engineReady();
}

function sendToEngine(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ target: "engine", ...message }, (resp) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(resp);
    });
  });
}

async function enginePresent() {
  return (await hasOffscreen()) || (await engineTabExists());
}

async function getActiveTabIds() {
  if (!(await enginePresent())) return [];
  const resp = await sendToEngine({ type: "vb-list" });
  const ids = (resp && resp.tabIds) || [];
  cachedActiveIds = ids;
  return ids;
}

async function closeEngineIfEmpty() {
  if (!(await enginePresent())) return;
  const resp = await sendToEngine({ type: "vb-list" });
  if (!resp) return;
  const ids = resp.tabIds || [];
  cachedActiveIds = ids;
  if (ids.length > 0) return;
  if (await hasOffscreen()) {
    try {
      await chrome.offscreen.closeDocument();
    } catch (e) {}
  }
  const id = await getEngineTabId();
  if (id != null) {
    try {
      await chrome.tabs.remove(id);
    } catch (e) {}
    await setEngineTabId(null);
  }
}

async function stopEverything() {
  if (await hasOffscreen()) {
    try {
      await chrome.offscreen.closeDocument();
    } catch (e) {}
  }
  const id = await getEngineTabId();
  if (id != null) {
    try {
      await chrome.tabs.remove(id);
    } catch (e) {}
    await setEngineTabId(null);
  }
  clearAllBadges();
}

async function startCapture(tabId, streamId, settings) {
  chrome.storage.session.set({ [keyFor(tabId)]: settings });
  await ensureEngine();
  let resp = await sendToEngine({ type: "vb-start", tabId, streamId, settings });
  if (!resp) {
    await wait(200);
    resp = await sendToEngine({ type: "vb-start", tabId, streamId, settings });
  }
  if (!resp || !resp.ok) {
    await closeEngineIfEmpty();
    return { active: false, error: (resp && resp.error) || "start-failed" };
  }
  cachedActiveIds = resp.tabIds || cachedActiveIds;
  setBadge(tabId, true);
  return { active: true };
}

async function updateCapture(tabId, settings) {
  chrome.storage.session.set({ [keyFor(tabId)]: settings });
  const resp = await sendToEngine({ type: "vb-update", tabId, settings });
  return { active: !!(resp && resp.ok) };
}

async function stopCapture(tabId) {
  setBadge(tabId, false);
  await snapshotTab(tabId);
  chrome.storage.session.remove(keyFor(tabId));
  if (!(await enginePresent())) return { active: false };
  await sendToEngine({ type: "vb-stop", tabId });
  await closeEngineIfEmpty();
  return { active: false };
}

async function registerYt() {
  if (!chrome.scripting) return;
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [YT_SCRIPT_ID] });
  } catch (e) {}
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: YT_SCRIPT_ID,
        matches: ["*://*.youtube.com/*"],
        js: ["content.js"],
        runAt: "document_idle",
        allFrames: true,
      },
    ]);
  } catch (e) {}
  try {
    const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
    for (const t of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: t.id, allFrames: true },
          files: ["content.js"],
        });
      } catch (e) {}
    }
  } catch (e) {}
}

async function unregisterYt() {
  if (!chrome.scripting) return;
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [YT_SCRIPT_ID] });
  } catch (e) {}
}

async function syncYt() {
  const { ytAutoContinue } = await chrome.storage.local.get("ytAutoContinue");
  const has = await chrome.permissions.contains({
    permissions: ["scripting"],
    origins: ["*://*.youtube.com/*"],
  });
  if (ytAutoContinue && has) await registerYt();
  else await unregisterYt();
}

const SKIP_MAIN_ID = "vb-skip-main";
const SKIP_ID = "vb-skip";
const SKIP_ORIGINS = ["*://*.youtube.com/*", "*://open.spotify.com/*", "*://*.soundcloud.com/*"];
const SKIP_HOST_RX = /youtube\.com|open\.spotify\.com|soundcloud\.com/;

async function unregisterSkip() {
  if (!chrome.scripting) return;
  for (const id of [SKIP_MAIN_ID, SKIP_ID]) {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
    } catch (e) {}
  }
}

async function registerSkip(matches) {
  if (!chrome.scripting) return;
  await unregisterSkip();
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: SKIP_ID,
        matches,
        js: ["skip.js"],
        runAt: "document_idle",
        allFrames: true,
      },
    ]);
  } catch (e) {}
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: SKIP_MAIN_ID,
        matches,
        js: ["skip-main.js"],
        runAt: "document_idle",
        allFrames: true,
        world: "MAIN",
      },
    ]);
  } catch (e) {}
  try {
    const tabs = await chrome.tabs.query({ url: matches });
    for (const t of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: t.id, allFrames: true },
          files: ["skip.js"],
        });
      } catch (e) {}
      try {
        await chrome.scripting.executeScript({
          target: { tabId: t.id, allFrames: true },
          files: ["skip-main.js"],
          world: "MAIN",
        });
      } catch (e) {}
    }
  } catch (e) {}
}

async function syncSkip() {
  const { skipEnabled } = await chrome.storage.local.get("skipEnabled");
  if (!skipEnabled || !chrome.scripting) {
    await unregisterSkip();
    return;
  }
  const hasScripting = await chrome.permissions.contains({ permissions: ["scripting"] });
  if (!hasScripting) {
    await unregisterSkip();
    return;
  }
  const granted = [];
  for (const o of SKIP_ORIGINS) {
    try {
      if (await chrome.permissions.contains({ origins: [o] })) granted.push(o);
    } catch (e) {}
  }
  if (granted.length) await registerSkip(granted);
  else await unregisterSkip();
}

async function releaseUnusedAccess() {
  const { ytAutoContinue, skipEnabled } = await chrome.storage.local.get(["ytAutoContinue", "skipEnabled"]);
  const mixTabs = await activeMixTabs();
  const mixOrigins = new Set(mixTabs.map((t) => t.origin).filter(Boolean));
  const drop = [];
  for (const o of SKIP_ORIGINS) {
    if (skipEnabled) continue;
    if (mixOrigins.has(o)) continue;
    if (ytAutoContinue && /youtube\.com/.test(o)) continue;
    drop.push(o);
  }
  if (drop.length) {
    try {
      await chrome.permissions.remove({ origins: drop });
    } catch (e) {}
  }
  if (!ytAutoContinue && !skipEnabled && !mixTabs.length) {
    try {
      await chrome.permissions.remove({ permissions: ["scripting"] });
    } catch (e) {}
  }
}

const MIX_SCRIPT_ID = "vb-mix";

function mixKey(tabId) {
  return "vb_mix_" + tabId;
}

async function getMixState(tabId) {
  const d = await chrome.storage.session.get(mixKey(tabId));
  return d[mixKey(tabId)] || null;
}

async function activeMixTabs() {
  const all = await chrome.storage.session.get(null);
  const out = [];
  for (const k in all) {
    if (k.indexOf("vb_mix_") === 0) {
      const v = all[k];
      if (v && v.rate && v.rate !== 1) out.push({ tabId: Number(k.slice(7)), ...v });
    }
  }
  return out;
}

async function syncMixScript() {
  if (!chrome.scripting) return;
  const tabs = await activeMixTabs();
  const origins = [...new Set(tabs.map((t) => t.origin).filter(Boolean))];
  const allowed = [];
  for (const o of origins) {
    try {
      if (await chrome.permissions.contains({ origins: [o] })) allowed.push(o);
    } catch (e) {}
  }
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [MIX_SCRIPT_ID] });
  } catch (e) {}
  if (!allowed.length) return;
  try {
    await chrome.scripting.registerContentScripts([
      { id: MIX_SCRIPT_ID, matches: allowed, js: ["mix.js"], runAt: "document_start", allFrames: true },
    ]);
  } catch (e) {}
}

async function injectMix(tabId) {
  if (!chrome.scripting) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["mix.js"] });
  } catch (e) {}
}

async function maybeRevokeOrigin(origin) {
  if (!origin) return;
  const tabs = await activeMixTabs();
  if (tabs.some((t) => t.origin === origin)) return;
  const { ytAutoContinue, skipEnabled } = await chrome.storage.local.get(["ytAutoContinue", "skipEnabled"]);
  if (ytAutoContinue && /youtube\.com/.test(origin)) return;
  if (skipEnabled && SKIP_HOST_RX.test(origin)) return;
  try {
    await chrome.permissions.remove({ origins: [origin] });
  } catch (e) {}
}

async function setMix(tabId, rate, origin) {
  if (!rate || rate === 1) {
    const prev = await getMixState(tabId);
    await chrome.storage.session.remove(mixKey(tabId));
    await new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, { type: "vb-mix-apply", off: true }, () => {
          void chrome.runtime.lastError;
          resolve();
        });
      } catch (e) {
        resolve();
      }
    });
    await syncMixScript();
    if (prev && prev.origin) await maybeRevokeOrigin(prev.origin);
    return { rate: 1 };
  }
  const prev = await getMixState(tabId);
  const o = origin || (prev && prev.origin) || null;
  await chrome.storage.session.set({ [mixKey(tabId)]: { rate, pitchOff: true, origin: o } });
  if (!prev || prev.origin !== o) await syncMixScript();
  const delivered = await new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { type: "vb-mix-apply", rate, pitchOff: true }, (r) => {
        if (chrome.runtime.lastError) resolve(false);
        else resolve(!!(r && r.ok));
      });
    } catch (e) {
      resolve(false);
    }
  });
  if (!delivered) {
    await syncMixScript();
    await injectMix(tabId);
    try {
      chrome.tabs.sendMessage(tabId, { type: "vb-mix-apply", rate, pitchOff: true }, () => void chrome.runtime.lastError);
    } catch (e) {}
  }
  return { rate };
}

async function clearAllMix() {
  const sess = await chrome.storage.session.get(null);
  const tabs = [];
  for (const k in sess) {
    if (k.indexOf("vb_mix_") === 0) tabs.push({ tabId: Number(k.slice(7)), ...sess[k] });
  }
  if (!tabs.length) return;
  await chrome.storage.session.remove(tabs.map((t) => mixKey(t.tabId)));
  await Promise.all(
    tabs.map(
      (t) =>
        new Promise((resolve) => {
          try {
            chrome.tabs.sendMessage(t.tabId, { type: "vb-mix-apply", off: true }, () => {
              void chrome.runtime.lastError;
              resolve();
            });
          } catch (e) {
            resolve();
          }
        })
    )
  );
  await syncMixScript();
  const origins = [...new Set(tabs.map((t) => t.origin).filter(Boolean))];
  for (const o of origins) await maybeRevokeOrigin(o);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.target === "engine") return false;

  if (msg.type === "vb-get") {
    (async () => {
      const [data, activeIds, local, mix] = await Promise.all([
        chrome.storage.session.get(keyFor(msg.tabId)),
        getActiveTabIds(),
        chrome.storage.local.get(["ytAutoContinue", "disableMode", "skipEnabled"]),
        getMixState(msg.tabId),
      ]);
      const backup = await getBackup();
      sendResponse({
        active: activeIds.includes(msg.tabId),
        settings: data[keyFor(msg.tabId)] || PER_TAB_DEFAULTS,
        ytAutoContinue: !!local.ytAutoContinue,
        skipEnabled: !!local.skipEnabled,
        disableMode: local.disableMode === "closeTab" ? "closeTab" : "toggle",
        backup: backup[msg.tabId] || null,
        mix: mix && mix.rate ? mix.rate : 1,
      });
    })();
    return true;
  }

  if (msg.type === "vb-start") {
    serialize(() => startCapture(msg.tabId, msg.streamId, msg.settings)).then(sendResponse);
    return true;
  }
  if (msg.type === "vb-update") {
    serialize(() => updateCapture(msg.tabId, msg.settings)).then(sendResponse);
    return true;
  }
  if (msg.type === "vb-stop") {
    serialize(() => stopCapture(msg.tabId)).then(sendResponse);
    return true;
  }

  if (msg.type === "vb-audible") {
    (async () => {
      const [tabs, activeIds, engId] = await Promise.all([
        chrome.tabs.query({ audible: true }),
        getActiveTabIds(),
        getEngineTabId(),
      ]);
      const backup = await getBackup();
      const list = tabs
        .filter((t) => t.id !== engId)
        .map((t) => ({
          tabId: t.id,
          title: t.title || t.url || "Karta " + t.id,
          url: t.url || "",
          boosted: activeIds.includes(t.id),
          backup: backup[t.id] || null,
        }));
      const listed = new Set(list.map((t) => t.tabId));
      for (const id of activeIds) {
        if (listed.has(id) || id === engId) continue;
        try {
          const t = await chrome.tabs.get(id);
          list.push({
            tabId: id,
            title: t.title || t.url || "Karta " + id,
            url: t.url || "",
            boosted: true,
            backup: backup[id] || null,
          });
        } catch (e) {}
      }
      sendResponse({ tabs: list });
    })();
    return true;
  }

  if (msg.type === "vb-mix-set") {
    setMix(msg.tabId, msg.rate, msg.origin).then(sendResponse);
    return true;
  }

  if (msg.type === "vb-mix-get") {
    (async () => {
      const tabId = sender && sender.tab && sender.tab.id;
      const st = tabId != null ? await getMixState(tabId) : null;
      if (st && st.rate && st.rate !== 1) sendResponse({ rate: st.rate, pitchOff: st.pitchOff !== false });
      else sendResponse({ off: true });
    })();
    return true;
  }

  if (msg.type === "vb-access-revoke-all") {
    (async () => {
      await clearAllMix();
      const all = await chrome.permissions.getAll();
      const origins = (all && all.origins) || [];
      if (origins.length) {
        try {
          await chrome.permissions.remove({ origins });
        } catch (e) {}
      }
      await chrome.storage.local.set({ ytAutoContinue: false, skipEnabled: false });
      await syncMixScript();
      await syncYt();
      await syncSkip();
      sendResponse({ ok: true, removed: origins.length });
    })();
    return true;
  }

  if (msg.type === "vb-set-yt") {
    (async () => {
      await chrome.storage.local.set({ ytAutoContinue: !!msg.enabled });
      await syncYt();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "vb-set-skip") {
    (async () => {
      await chrome.storage.local.set({ skipEnabled: !!msg.enabled });
      await syncSkip();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "vb-yt-release") {
    releaseUnusedAccess().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "vb-skip-allowed") {
    (async () => {
      const tabId = sender && sender.tab && sender.tab.id;
      const ids = await getActiveTabIds();
      sendResponse({ ok: tabId != null && ids.includes(tabId) });
    })();
    return true;
  }

  if (msg.type === "vb-wipe") {
    (async () => {
      await serialize(stopEverything);
      try {
        await chrome.storage.local.clear();
      } catch (e) {}
      try {
        await chrome.storage.session.clear();
      } catch (e) {}
      await unregisterYt();
      await unregisterSkip();
      if (chrome.scripting) {
        try {
          await chrome.scripting.unregisterContentScripts({ ids: [MIX_SCRIPT_ID] });
        } catch (e) {}
      }
      try {
        const all = await chrome.permissions.getAll();
        const origins = (all && all.origins) || [];
        const perms = ((all && all.permissions) || []).filter((p) => p === "scripting");
        if (origins.length || perms.length) {
          await chrome.permissions.remove({ origins, permissions: perms });
        }
      } catch (e) {}
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "vb-clear-backup") {
    clearBackupTab(msg.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "vb-snapshot") {
    snapshotTab(msg.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "vb-set-mode") {
    (async () => {
      const next = msg.mode === "closeTab" ? "closeTab" : "toggle";
      const prev = await getMode();
      await chrome.storage.local.set({ disableMode: next });
      if (next !== prev) await serialize(stopEverything);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "vb-ended") {
    setBadge(msg.tabId, false);
    (async () => {
      const tabId = msg.tabId;
      const d = await chrome.storage.session.get(keyFor(tabId));
      const s = d[keyFor(tabId)];
      if (s) {
        let alive = true;
        let asleep = false;
        try {
          const t = await chrome.tabs.get(tabId);
          asleep = !!(t && (t.discarded || t.frozen));
        } catch (e) {
          alive = false;
        }
        if (asleep) {
          closeEngineIfEmpty();
          return;
        }
        const last = endedRestartAt.get(tabId) || 0;
        if (alive && Date.now() - last > 10000) {
          endedRestartAt.set(tabId, Date.now());
          const r = await serialize(async () => {
            try {
              const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
              return await startCapture(tabId, streamId, s);
            } catch (e) {
              return { active: false };
            }
          });
          if (r && r.active) return;
        }
        chrome.storage.session.remove(keyFor(tabId));
      }
      closeEngineIfEmpty();
    })();
    return false;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(keyFor(tabId));
  (async () => {
    const mix = await getMixState(tabId);
    if (mix) {
      await chrome.storage.session.remove(mixKey(tabId));
      await syncMixScript();
      if (mix.origin) await maybeRevokeOrigin(mix.origin);
    }
    const engId = await getEngineTabId();
    if (tabId === engId) {
      await setEngineTabId(null);
      const ids = await boostedTabIds();
      for (const id of ids) {
        await snapshotTab(id);
        chrome.storage.session.remove(keyFor(id));
        setBadge(id, false);
      }
      const done = new Set(ids);
      for (const t of await activeMixTabs()) {
        if (!done.has(t.tabId)) await snapshotTab(t.tabId);
      }
      clearAllBadges();
      await clearAllMix();
      return;
    }
    if (cachedActiveIds.includes(tabId)) stopCapture(tabId);
  })();
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "complete") return;
  (async () => {
    const d = await chrome.storage.session.get(keyFor(tabId));
    const s = d[keyFor(tabId)];
    if (!s) return;
    const active = await getActiveTabIds();
    if (active.includes(tabId)) return;
    await serialize(async () => {
      try {
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
        await startCapture(tabId, streamId, s);
      } catch (e) {}
    });
  })();
});

if (chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener(() => {
    syncMixScript();
    syncYt();
    syncSkip();
  });
}
if (chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(() => {
    (async () => {
      await finishPendingGrants();
      syncMixScript();
      syncYt();
      syncSkip();
      finishPendingMix();
    })();
  });
}

async function finishPendingGrants() {
  const d = await chrome.storage.session.get(["vb_pending_skip", "vb_pending_yt"]);
  const fresh = (p) => p && Date.now() - (p.ts || 0) < 60000;
  if (d.vb_pending_skip) {
    await chrome.storage.session.remove("vb_pending_skip");
    if (fresh(d.vb_pending_skip)) {
      const ok = await chrome.permissions.contains({ permissions: ["scripting"], origins: SKIP_ORIGINS });
      if (ok) await chrome.storage.local.set({ skipEnabled: true });
    }
  }
  if (d.vb_pending_yt) {
    await chrome.storage.session.remove("vb_pending_yt");
    if (fresh(d.vb_pending_yt)) {
      const ok = await chrome.permissions.contains({
        permissions: ["scripting"],
        origins: ["*://*.youtube.com/*"],
      });
      if (ok) await chrome.storage.local.set({ ytAutoContinue: true });
    }
  }
}

async function finishPendingMix() {
  const { vb_pending_mix } = await chrome.storage.session.get("vb_pending_mix");
  if (!vb_pending_mix) return;
  await chrome.storage.session.remove("vb_pending_mix");
  const p = vb_pending_mix;
  if (!p.tabId || !p.rate || Date.now() - (p.ts || 0) > 60000) return;
  const has = await chrome.permissions.contains({ origins: [p.origin] });
  if (!has) return;
  try {
    await chrome.tabs.get(p.tabId);
  } catch (e) {
    return;
  }
  await setMix(p.tabId, p.rate, p.origin);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
  syncYt();
  syncSkip();
});

chrome.runtime.setUninstallURL("https://jestemkox123.github.io/Turn-It-Up-Son-Volume-Booster-Mixer/uninstall.html");

syncYt();
syncSkip();
(async () => {
  const ids = await getActiveTabIds();
  ids.forEach((id) => setBadge(id, true));
})();
