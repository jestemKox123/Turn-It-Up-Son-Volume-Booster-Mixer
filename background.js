// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

// Service worker: pobiera dzwiek karty (tabCapture) i kieruje go do silnika
// audio (offscreen document albo widoczna karta engine.html, zaleznie od ustawien).

const PER_TAB_DEFAULTS = { volume: 1, monoFix: false, bassBoost: false, bassMode: "classic", reverb: 0, treble: 0, muffle: 0, vocal: 0, power: 0, spin: false, spinSpeed: 0.5 };
const YT_SCRIPT_ID = "yt-continue";

let engineTabId = null;
let cachedActiveIds = [];

// Kolejka operacji na silniku: bez niej szybkie on/off nakladalo start i stop
// na siebie i przechwytywanie sie psulo.
let opChain = Promise.resolve();
function serialize(fn) {
  const run = opChain.then(fn, fn);
  opChain = run.catch(() => {});
  return run;
}

function keyFor(tabId) {
  return "vb_tab_" + tabId;
}

// --- Kopia ustawien sprzed wylaczenia (do "Przywroc poprzednie") ---
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

// Snapshot obejmuje tez predkosc Mixa (mixRate), zeby Przywroc wracalo
// takze do samego Sped Up / Nightcore.
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

// Podglosnione karty z kluczy sesji (cachedActiveIds ginie przy usnieciu SW).
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

// --- Silnik: offscreen albo widoczna karta ---
async function hasOffscreen() {
  const c = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  return c.length > 0;
}

// engineTabId trzymany tez w storage.session: service worker bywa usypiany
// i traci zmienne, a zgubiona karta silnika = kolizja przechwytywania.
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

async function ensureEngine() {
  const mode = await getMode();
  if (mode === "closeTab") {
    if (await engineTabExists()) return;
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL("engine.html"),
      active: false,
      pinned: true,
    });
    await setEngineTabId(tab.id);
    await wait(300);
  } else {
    if (await hasOffscreen()) return;
    await chrome.offscreen.createDocument({
      url: "engine.html",
      reasons: ["USER_MEDIA"],
      justification: "Obrobka i wzmacnianie dzwieku przechwyconej karty.",
    });
    await wait(120);
  }
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
  const ids = await getActiveTabIds();
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
  const resp = await sendToEngine({ type: "vb-start", tabId, streamId, settings });
  if (!resp || !resp.ok) {
    await closeEngineIfEmpty();
    return { active: false, error: (resp && resp.error) || "start-failed" };
  }
  cachedActiveIds = resp.tabIds || cachedActiveIds;
  setBadge(tabId, true);
  return { active: true };
}

// Lekka sciezka dla suwaka w czasie rzeczywistym: bez sprawdzania kontekstow,
// inaczej zmiany docieraly skokowo.
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

// --- YouTube auto-continue (opcjonalne) ---
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

// --- Tryb Mix (Sped Up / Nightcore / wlasna predkosc) ---
// Stan per karta w storage.session: { rate, pitchOff, origin }. rate === 1 = off.
// Efekt robi content script mix.js, wstrzykiwany tylko na stronach, na ktore
// uzytkownik dal zgode.
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

// Rejestracja content scriptu na uzywanych (i dozwolonych zgoda) originach,
// dzieki czemu Mix przezywa przeladowanie strony.
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
      { id: MIX_SCRIPT_ID, matches: allowed, js: ["mix.js"], runAt: "document_idle", allFrames: true },
    ]);
  } catch (e) {}
}

async function injectMix(tabId) {
  if (!chrome.scripting) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["mix.js"] });
  } catch (e) {}
}

// Cofnij zgode na origin, jesli zaden Mix juz go nie uzywa (i nie trzyma go
// auto-kontynuacja YouTube).
async function maybeRevokeOrigin(origin) {
  if (!origin) return;
  const tabs = await activeMixTabs();
  if (tabs.some((t) => t.origin === origin)) return;
  const { ytAutoContinue } = await chrome.storage.local.get("ytAutoContinue");
  if (ytAutoContinue && /youtube\.com/.test(origin)) return;
  try {
    await chrome.permissions.remove({ origins: [origin] });
  } catch (e) {}
}

async function setMix(tabId, rate, origin) {
  if (!rate || rate === 1) {
    const prev = await getMixState(tabId);
    await chrome.storage.session.remove(mixKey(tabId));
    try {
      chrome.tabs.sendMessage(tabId, { type: "vb-mix-apply", off: true }, () => void chrome.runtime.lastError);
    } catch (e) {}
    await syncMixScript();
    if (prev && prev.origin) await maybeRevokeOrigin(prev.origin);
    return { rate: 1 };
  }
  const o = origin || (await getMixState(tabId) || {}).origin || null;
  await chrome.storage.session.set({ [mixKey(tabId)]: { rate, pitchOff: true, origin: o } });
  await syncMixScript();
  await injectMix(tabId);
  try {
    chrome.tabs.sendMessage(tabId, { type: "vb-mix-apply", rate, pitchOff: true }, () => void chrome.runtime.lastError);
  } catch (e) {}
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
  for (const t of tabs) {
    try {
      chrome.tabs.sendMessage(t.tabId, { type: "vb-mix-apply", off: true }, () => void chrome.runtime.lastError);
    } catch (e) {}
  }
  await syncMixScript();
  const origins = [...new Set(tabs.map((t) => t.origin).filter(Boolean))];
  for (const o of origins) await maybeRevokeOrigin(o);
}

// --- Wiadomosci ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.target === "engine") return false;

  if (msg.type === "vb-get") {
    (async () => {
      const [data, activeIds, local, mix] = await Promise.all([
        chrome.storage.session.get(keyFor(msg.tabId)),
        getActiveTabIds(),
        chrome.storage.local.get(["ytAutoContinue", "disableMode", "bindsEnabled"]),
        getMixState(msg.tabId),
      ]);
      const backup = await getBackup();
      sendResponse({
        active: activeIds.includes(msg.tabId),
        settings: data[keyFor(msg.tabId)] || PER_TAB_DEFAULTS,
        ytAutoContinue: !!local.ytAutoContinue,
        disableMode: local.disableMode === "closeTab" ? "closeTab" : "toggle",
        bindsEnabled: !!local.bindsEnabled,
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
          boosted: activeIds.includes(t.id),
          backup: backup[t.id] || null,
        }));
      // Podglosnione, ale wstrzymane karty (pauza = brak "audible") tez maja
      // byc na liscie - doklejamy je na koniec.
      const listed = new Set(list.map((t) => t.tabId));
      for (const id of activeIds) {
        if (listed.has(id) || id === engId) continue;
        try {
          const t = await chrome.tabs.get(id);
          list.push({
            tabId: id,
            title: t.title || t.url || "Karta " + id,
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
      // Najpierw realnie wylacz Mix: wstrzykniety mix.js zyje w karcie dalej
      // i samo wyczyszczenie uprawnien by go nie zatrzymalo.
      await clearAllMix();
      const all = await chrome.permissions.getAll();
      const origins = (all && all.origins) || [];
      if (origins.length) {
        try {
          await chrome.permissions.remove({ origins });
        } catch (e) {}
      }
      await chrome.storage.local.set({ ytAutoContinue: false });
      await syncMixScript();
      await syncYt();
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

  if (msg.type === "vb-set-binds") {
    (async () => {
      await chrome.storage.local.set({ bindsEnabled: !!msg.enabled });
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === "vb-clear-backup") {
    clearBackupTab(msg.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  // Backup na zadanie popupu (sam Mix nie przechodzi przez stopCapture).
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
    closeEngineIfEmpty();
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
      // Zamkniecie karty-silnika wylacza wszystko (tez Mix), z backupem
      // dla kazdej karty (takze tych z samym Mixem).
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

// Nawigacja karty celowo NIE zatrzymuje przechwytywania: strumien tabCapture
// jest przypiety do karty i przezywa zmiane utworu. Pelne przeladowanie (F5)
// jednak ubija strumien - ustawienia zostaja w storage.session i wznawiamy je
// automatycznie, gdy strona sie doladuje. Gdy Chrome odmowi streamId bez gestu
// uzytkownika, wznowi to popup przy najblizszym otwarciu.
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

// --- Skroty klawiszowe (domyslnie wylaczone przelacznikiem bindsEnabled) ---
chrome.commands.onCommand.addListener(async (command) => {
  const { bindsEnabled } = await chrome.storage.local.get("bindsEnabled");
  if (!bindsEnabled) return;

  if (command === "disable-all") {
    const snapshotted = new Set();
    await serialize(async () => {
      const ids = await getActiveTabIds();
      for (const id of ids) {
        await snapshotTab(id);
        snapshotted.add(id);
        chrome.storage.session.remove(keyFor(id));
      }
      await stopEverything();
    });
    // Karty z samym Mixem (bez podglosnienia) tez dostaja backup.
    for (const t of await activeMixTabs()) {
      if (!snapshotted.has(t.tabId)) await snapshotTab(t.tabId);
    }
    await clearAllMix();
    return;
  }

  if (command === "restore-previous") {
    const backup = await getBackup();
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab && tab.id != null && backup[tab.id]) {
      try {
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
        const r = await startCapture(tab.id, streamId, backup[tab.id]);
        if (r.active) await clearBackupTab(tab.id);
      } catch (e) {}
    }
  }
});

if (chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener(() => {
    syncMixScript();
    syncYt();
  });
}
if (chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(() => {
    syncMixScript();
    syncYt();
    finishPendingMix();
  });
}

// Prompt Chrome o zgode na strone zamyka popup (kradnie fokus). Popup przed
// prosba zapisuje "zamiar" w storage.session, a tlo dokancza go tutaj zaraz
// po kliknieciu Zezwol.
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
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
  }
  syncYt();
});

syncYt();
(async () => {
  const ids = await getActiveTabIds();
  ids.forEach((id) => setBadge(id, true));
})();
