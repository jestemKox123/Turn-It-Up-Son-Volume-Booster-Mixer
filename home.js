/* Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
   All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt). */
const PRESET_NOTE = {
  Normal: "untouched, the way the artist left it",
  "Sped Up": "1.25x, and the voice rises with the tempo",
  Nightcore: "1.35x with the top end lifted, the classic edit",
  "Sped Up + Reverb": "1.25x with a hall around it",
  "Slowed + Reverb": "0.85x, dragged out and drowned in reverb",
  "8D Audio": "the sound orbits your head, put headphones on",
  "Drill / Rap": "808 bass, tempo untouched, vocals kept up front",
  Phonk: "punchy bass, bright top, cranked to radio loudness",
  "NY Drill": "0.95x, deep sub bass and a touch of haze",
  "Chill Drill": "light sub bass, easy on everything else"
};

const presets = document.getElementById("presets");
const note = document.getElementById("presetNote");

presets.addEventListener("click", (e) => {
  const b = e.target.closest(".pbtn");
  if (!b) return;
  presets.querySelectorAll(".pbtn").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  note.textContent = PRESET_NOTE[b.textContent.trim()] || "";
});

const mqPath = document.getElementById("mqPath");
const mqBulbs = document.getElementById("mqBulbs");
if (mqPath && mqBulbs) {
  const total = mqPath.getTotalLength();
  const count = 26;
  const step = total / count;
  for (let i = 0; i < count; i++) {
    const p = mqPath.getPointAtLength(i * step);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x.toFixed(1));
    c.setAttribute("cy", p.y.toFixed(1));
    c.setAttribute("r", "5.6");
    c.setAttribute("class", "bulb");
    c.style.animationDelay = (-(i / count) * 1.5).toFixed(3) + "s";
    mqBulbs.appendChild(c);
  }
}

if ("IntersectionObserver" in window) {
  document.documentElement.classList.add("js");
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".rv").forEach((el) => io.observe(el));
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    const t = id === "top" ? null : document.getElementById(id);
    if (id !== "top" && !t) return;
    e.preventDefault();
    if (t) t.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", location.pathname);
  });
});

if (location.hash) history.replaceState(null, "", location.pathname);
