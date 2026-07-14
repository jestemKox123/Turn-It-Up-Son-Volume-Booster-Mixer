// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

if (!window.__vbYtContinue) {
  window.__vbYtContinue = true;

  let vbEnabled = true;
  try {
    chrome.storage.local.get("ytAutoContinue", (d) => {
      if (!chrome.runtime.lastError && d) vbEnabled = !!d.ytAutoContinue;
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === "local" && ch.ytAutoContinue) vbEnabled = !!ch.ytAutoContinue.newValue;
    });
  } catch (e) {}

  const visible = (el) => {
    if (!el) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const norm = (s) =>
    (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ł/g, "l")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const IDLE_RX = /(continue watching|still watching|still listening|are you (there|still)|video paused|chcesz ogladac|ogladac dalej|nadal ogladasz|nadal sluchasz|zostal wstrzymany|zostalo wstrzymane|wideo wstrzymane)/;
  const YES_RX = /^(tak|yes|ok|okej|continue|kontynuuj|dalej|resume|wznow)\b/;
  const NO_RX = /(anuluj|cancel|not now|nie teraz|^nie\b|^no\b)/;

  const label = (b) => norm(b.textContent || b.getAttribute("aria-label"));

  function press(b) {
    const inner = b.tagName === "BUTTON" ? b : b.querySelector("button");
    (inner || b).click();
  }

  function tryDialog(d) {
    if (!visible(d)) return false;
    if (!IDLE_RX.test(norm(d.textContent))) return false;
    const btns = [...d.querySelectorAll("button, [role='button']")].filter(visible);
    if (!btns.length) return false;
    const yes = btns.find((b) => YES_RX.test(label(b)));
    if (yes) {
      press(yes);
      return true;
    }
    if (btns.length === 1 && !NO_RX.test(label(btns[0]))) {
      press(btns[0]);
      return true;
    }
    return false;
  }

  function clickIdleDialog() {
    if (!vbEnabled) return;

    const player = document.querySelector(".ytp-confirm-dialog-renderer");
    if (visible(player)) {
      const btn = player.querySelector(".ytp-confirm-dialog-confirm-button");
      if (btn && visible(btn)) {
        btn.click();
        return;
      }
      if (tryDialog(player)) return;
    }

    const music = document.querySelector("ytmusic-you-there-renderer");
    if (visible(music)) {
      const btn = music.querySelector("button");
      if (btn) {
        btn.click();
        return;
      }
    }

    const nodes = document.querySelectorAll(
      "yt-confirm-dialog-renderer, tp-yt-paper-dialog, dialog, [role='dialog'], [role='alertdialog']"
    );
    for (const d of nodes) {
      if (tryDialog(d)) return;
    }
  }

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
