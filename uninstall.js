/* Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
   All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt). */
(function () {
var drops = document.getElementById("drops");
if (drops) {
  for (var i = 0; i < 46; i++) {
    var x = Math.round(20 + Math.random() * 1360);
    var y = Math.round(120 + Math.random() * 700);
    var len = 14 + Math.round(Math.random() * 18);
    var l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", x);
    l.setAttribute("y1", y);
    l.setAttribute("x2", x - 4);
    l.setAttribute("y2", y + len);
    l.setAttribute("class", "drop");
    l.style.animationDelay = (-(Math.random() * 1.5)).toFixed(2) + "s";
    l.style.animationDuration = (1.1 + Math.random() * 0.9).toFixed(2) + "s";
    drops.appendChild(l);
  }
}

var FORM = "https://docs.google.com/forms/d/e/1FAIpQLScyvm-FU6kLwyjPL0qpIXS-48m-jQ-F63kFdvA3Z7JjRaT0dg";
var ENTRY_REASON = "entry.225153063";
var ENTRY_DETAILS = "entry.688777186";

var REASONS = [
  { v: "It was too loud or the audio was distorted", en: "Too loud or the sound was distorted", pl: "Za głośno albo dźwięk był zniekształcony" },
  { v: "It didn't work on the website I use", en: "Did not work on a site I use", pl: "Nie działało na stronie, której używam" },
  { v: "It was too complicated to use", en: "Too complicated to use", pl: "Zbyt skomplikowana obsługa" },
  { v: "I found a better extension", en: "I found a better extension", pl: "Znalazłem lepszą wtyczkę" },
  { v: "I was just testing it", en: "I was just testing it", pl: "Tylko testowałem" },
  { v: "Other reason", en: "Other reason", pl: "Inny powód" }
];

var DICT = {
  en: {
    eyebrow: "well, that happened",
    h1: "Sorry to see you go",
    sub: "The extension is fully removed. It never collected anything, so there is nothing left behind: no data, no accounts, no traces.",
    why: "Mind telling us why?",
    hint: "One click is enough. It sends anonymously - no account, no sign-in, nothing else to do.",
    thanks: "Thanks, sent!",
    ph: "Anything else you want to add? (optional)",
    send: "Send details",
    sent: "Sent, thank you!",
    back: "Changed your mind or removed it by accident?",
    btn: "Reinstall from the Chrome Web Store"
  },
  pl: {
    eyebrow: "no i stało się",
    h1: "Szkoda, że odchodzisz",
    sub: "Wtyczka została całkowicie usunięta. Niczego nie zbierała, więc nic po niej nie zostało: zero danych, zero kont, zero śladów.",
    why: "Powiesz nam dlaczego?",
    hint: "Wystarczy jedno kliknięcie. Wysyła się anonimowo - bez konta, bez logowania, bez niczego.",
    thanks: "Dzięki, wysłane!",
    ph: "Chcesz dodać coś więcej? (opcjonalnie)",
    send: "Wyślij szczegóły",
    sent: "Wysłane, dziękujemy!",
    back: "Zmiana zdania albo usunięcie przez przypadek?",
    btn: "Zainstaluj ponownie z Chrome Web Store"
  }
};

var LANG = "en";
var detailsEl = document.getElementById("details");
var sendBtn = document.getElementById("sendBtn");
var langEn = document.getElementById("langEn");
var langPl = document.getElementById("langPl");
var eyebrowEl = document.querySelector(".sorry-head .eyebrow");
var chosen = null;
var box = document.getElementById("reasons");
var buttons = [];

function post(params) {
  var body = Object.keys(params)
    .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
    .join("&");
  return fetch(FORM + "/formResponse", {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body
  });
}

REASONS.forEach(function (r) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "reason";
  b.textContent = r.en;
  b.addEventListener("click", function () {
    if (chosen) return;
    chosen = r.v;
    buttons.forEach(function (x) { x.disabled = true; });
    b.classList.add("sel");
    var p = {};
    p[ENTRY_REASON] = r.v;
    try {
      post(p);
    } catch (e) {
      window.open(FORM + "/viewform?usp=pp_url&" + ENTRY_REASON + "=" + encodeURIComponent(r.v), "_blank");
    }
    document.getElementById("extra").hidden = false;
    detailsEl.focus();
  });
  box.appendChild(b);
  buttons.push(b);
});

function applyLang(l) {
  LANG = DICT[l] ? l : "en";
  var T = DICT[LANG];
  eyebrowEl.textContent = T.eyebrow;
  document.getElementById("t-h1").textContent = T.h1;
  document.getElementById("t-sub").textContent = T.sub;
  document.getElementById("t-why").textContent = T.why;
  document.getElementById("t-hint").textContent = T.hint;
  document.getElementById("t-thanks").textContent = T.thanks;
  document.getElementById("t-back").textContent = T.back;
  document.getElementById("t-btn").textContent = T.btn;
  document.getElementById("t-sent").textContent = T.sent;
  detailsEl.placeholder = T.ph;
  sendBtn.textContent = T.send;
  document.documentElement.lang = LANG;
  langEn.classList.toggle("on", LANG === "en");
  langPl.classList.toggle("on", LANG === "pl");
  buttons.forEach(function (b, i) {
    b.textContent = LANG === "pl" ? REASONS[i].pl : REASONS[i].en;
  });
}

langEn.addEventListener("click", function () { applyLang("en"); });
langPl.addEventListener("click", function () { applyLang("pl"); });

sendBtn.addEventListener("click", function () {
  var txt = detailsEl.value.trim();
  if (!txt || !chosen) return;
  sendBtn.disabled = true;
  detailsEl.disabled = true;
  var p = {};
  p[ENTRY_REASON] = chosen;
  p[ENTRY_DETAILS] = txt;
  try {
    post(p);
  } catch (e) {}
  document.getElementById("t-sent").hidden = false;
});

applyLang("en");
})();
