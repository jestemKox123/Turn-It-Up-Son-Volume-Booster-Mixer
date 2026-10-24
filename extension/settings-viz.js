// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

window.VBCLVIZ = function (box, kind) {
  if (kind !== "speed") return;
  const t = (k, f) => (window.VBI18N ? VBI18N.t(k) : f);
  const wrap = document.createElement("div");
  wrap.className = "clv";
  const k = document.createElement("p");
  k.className = "clv-k";
  k.textContent = "Sped Up · Nightcore · Slowed";
  const h = document.createElement("p");
  h.className = "clv-t";
  h.textContent = t("clv_t", "Sped Up now works on Spotify");
  const s = document.createElement("p");
  s.className = "clv-s";
  s.textContent = t("clv_s", "and on other sites where it did not work before");
  const ul = document.createElement("ul");
  ul.className = "clv-list";
  ["Spotify", "SoundCloud", "Deezer", "Bandcamp"].forEach((name, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", String(i));
    li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
    li.appendChild(document.createTextNode(name));
    ul.appendChild(li);
  });
  wrap.append(k, h, s, ul);
  box.appendChild(wrap);
};

(function () {
  const frame = document.getElementById("previewFrame");
  if (!frame) return;
  frame.addEventListener("load", () => {
    const d = frame.contentDocument;
    if (!d || !d.body) return;
    const fit = () => {
      const h = Math.ceil(d.body.getBoundingClientRect().height);
      if (h > 100) frame.style.height = h + "px";
    };
    new ResizeObserver(fit).observe(d.body);
    document.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest('.tab[data-pane="look"]')) setTimeout(fit, 30);
    });
  });
  const load = () => {
    if (!frame.getAttribute("src")) frame.src = "preview.html";
  };
  if (document.querySelector('.tabpane.on[data-pane="look"]')) load();
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest('.tab[data-pane="look"]')) load();
  });
})();
