// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(() => {
  const $ = (id) => document.getElementById(id);

  const vol = $("volume");
  const label = $("volumeLabel");
  const slider = vol && vol.closest(".vol-slider");
  const block = slider && (slider.closest(".volume-block") || slider);
  const ticks = Array.from(document.querySelectorAll(".tick"));
  const maxOf = () => Number(vol.max) || 700;
  const stepOf = () => Number(vol.step) || 10;

  function paintVolume() {
    if (!slider) return;
    const m = maxOf();
    const v = Math.max(0, Math.min(m, Number(vol.value) || 0));
    const at = (p) => "calc(10px + (100% - 20px) * " + (Math.min(m, p) / m).toFixed(4) + ")";
    slider.style.setProperty("--f", (v / m).toFixed(4));
    slider.style.setProperty(
      "--vol-grad",
      "linear-gradient(90deg, var(--accent-2) " + at(0) + ", var(--accent) " + at(100) + ", var(--accent) " + at(250) + ", var(--warm) " + at(420) + ", var(--hot) " + at(580) + ")"
    );
    block.dataset.zone = v >= 500 ? "hot" : v >= 250 ? "warm" : v > 100 ? "boost" : "base";
    ticks.forEach((t) => t.classList.toggle("cur", v === Number(t.dataset.v)));
  }

  function setVolume(v) {
    const m = maxOf();
    const s = stepOf();
    v = Math.max(0, Math.min(m, Math.round(v / s) * s));
    if (String(v) === vol.value) return;
    vol.value = String(v);
    vol.dispatchEvent(new Event("input", { bubbles: true }));
    paintVolume();
  }

  if (slider) {
    let wheelTimer = null;
    block.addEventListener(
      "wheel",
      (e) => {
        if (e.target.closest("#status, #guard")) return;
        e.preventDefault();
        setVolume(Number(vol.value) + (e.deltaY < 0 ? 1 : -1) * stepOf());
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => vol.dispatchEvent(new Event("change", { bubbles: true })), 250);
      },
      { passive: false }
    );
    vol.addEventListener("input", paintVolume);
    new MutationObserver(paintVolume).observe(label, { childList: true, characterData: true, subtree: true });
    new MutationObserver(paintVolume).observe(vol, { attributes: true, attributeFilter: ["max"] });
    paintVolume();
  }

  function paintRanges() {
    document.querySelectorAll(".mix-view input[type=range]").forEach((r) => {
      const min = Number(r.min) || 0;
      const max = Number(r.max) || 100;
      r.style.setProperty("--p", (((Number(r.value) - min) / (max - min)) * 100).toFixed(2) + "%");
    });
  }

  let raf = 0;
  function repaintMix() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      paintRanges();
    });
  }
  const mixView = $("mixView");
  if (mixView) {
    new MutationObserver(repaintMix).observe(mixView, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    mixView.addEventListener("input", repaintMix);
  }
  paintRanges();
})();
