// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

// Auto-kontynuacja YouTube. Rejestrowany tylko na youtube.com i tylko gdy
// uzytkownik wlaczy te opcje (opcjonalna zgoda, cofana przy wylaczeniu).
// Bezpieczenstwo: nie klika na slepo pierwszego przycisku dialogu -
// yt-confirm-dialog-renderer sluzy tez do prawdziwych pytan (np. usuwanie
// playlisty). Ogolne dialogi potwierdzamy wylacznie bez widocznego "Anuluj".

if (!window.__vbYtContinue) {
  window.__vbYtContinue = true;

  const visible = (el) => !!el && el.offsetParent !== null;

  function clickIdleDialog() {
    // Dialog odtwarzacza: "Wideo zatrzymane. Kontynuowac ogladanie?".
    const player = document.querySelector(".ytp-confirm-dialog-renderer");
    if (visible(player)) {
      const buttons = player.querySelectorAll("button");
      const btn =
        player.querySelector(".ytp-confirm-dialog-confirm-button") ||
        (buttons.length === 1 ? buttons[0] : null);
      if (btn) {
        btn.click();
        return;
      }
    }

    // YouTube Music: "Nadal sluchasz?".
    const music = document.querySelector("ytmusic-you-there-renderer");
    if (visible(music)) {
      const btn = music.querySelector("button");
      if (btn) {
        btn.click();
        return;
      }
    }

    // Ogolny dialog bezczynnosci: potwierdzamy tylko bez widocznego "Anuluj".
    const dialogs = document.querySelectorAll("yt-confirm-dialog-renderer");
    for (const d of dialogs) {
      if (!visible(d)) continue;
      const cancel = d.querySelector("#cancel-button");
      if (cancel && visible(cancel)) continue;
      const ok = d.querySelector("#confirm-button button") || d.querySelector("#confirm-button");
      if (ok && visible(ok)) {
        ok.click();
        return;
      }
    }
  }

  // YouTube mutuje DOM bez przerwy - sprawdzamy najwyzej raz na 400 ms,
  // plus siatka bezpieczenstwa co 5 s.
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      clickIdleDialog();
    }, 400);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  setInterval(clickIdleDialog, 5000);
}
