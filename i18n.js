// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// All rights reserved / Wszelkie prawa zastrzezone. Copying and publication prohibited / Kopiowanie i publikacja zabronione (LICENSE.txt).

(function () {
  const THEMES = {
    neon: ["#3d8bff", "#7fb2ff"],
    crimson: ["#ff453a", "#ff2d55"],
    emerald: ["#22c55e", "#a3e635"],
    gold: ["#ff9f0a", "#ffd60a"],
    rose: ["#ff2d78", "#b56bff"],
    fire: ["#ff2d55", "#ff9f0a"],
    magenta: ["#a855f7", "#f0abfc"],
  };
  function applyTheme(name) {
    const t = THEMES[name] || THEMES.neon;
    const r = document.documentElement.style;
    r.setProperty("--accent", t[0]);
    r.setProperty("--accent-2", t[1]);
  }
  const GLOWS = {
    theme: null,
    white: "#ffffff",
    navy: "#3730a3",
    violet: "#6d28d9",
    plum: "#86198f",
    wine: "#9f1239",
    teal: "#0f766e",
    forest: "#047857",
    bronze: "#b45309",
    slate: "#475569",
  };
  function glowKey(v) {
    if (!v || v === "accent") return "theme";
    return Object.prototype.hasOwnProperty.call(GLOWS, v) ? v : "theme";
  }
  function applyGlow(d) {
    d = d || {};
    const on = d.vbGlowOn !== false;
    const s = typeof d.vbGlowStrength === "number" ? d.vbGlowStrength : 13;
    const key = glowKey(d.vbGlowColor);
    let tint;
    if (!on) tint = "transparent";
    else if (key === "white") tint = "rgba(255, 255, 255, " + s / 100 + ")";
    else if (key === "theme") tint = "color-mix(in srgb, var(--accent) " + s + "%, transparent)";
    else tint = "color-mix(in srgb, " + GLOWS[key] + " " + s + "%, transparent)";
    document.documentElement.style.setProperty("--glow-tint", tint);
  }
  const store = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  if (store) {
    store.get(["vbTheme", "vbGlowOn", "vbGlowStrength", "vbGlowColor"], (d) => {
      if (d.vbTheme && d.vbTheme !== "neon") applyTheme(d.vbTheme);
      applyGlow(d);
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== "local") return;
      if (ch.vbTheme) {
        applyTheme(ch.vbTheme.newValue);
        store.get(["vbGlowOn", "vbGlowStrength", "vbGlowColor"], applyGlow);
      }
      if (ch.vbGlowOn || ch.vbGlowStrength || ch.vbGlowColor) {
        store.get(["vbGlowOn", "vbGlowStrength", "vbGlowColor"], applyGlow);
      }
    });
  }
  window.VBTHEME = { THEMES, GLOWS, glowKey, applyTheme, applyGlow };

  const CHANGELOG = ["4.4.0", "4.3.1", "4.3.0"];
  window.VBCHANGELOG = {
    list: CHANGELOG,
    max: 3,
    url: "https://jestemkox123.github.io/Turn-It-Up-Son-Volume-Booster-Mixer/changelog.html",
    key: (v) => "cl_" + v.replace(/\./g, ""),
  };
})();

(function () {
  const DICT = {
    pl: {
      power_on: "Wł.",
      power_off: "Wył.",
      power_title: "Włącz/wyłącz na tej karcie",
      status_checking: "Sprawdzam kartę...",
      status_on: "Działa: {n}%",
      status_on_fx: "Działa: {n}% + Mix",
      status_mix: "Mix działa: {n}x",
      status_both: "Działa: {n}% + Mix {m}x",
      status_off: "Wyłączone",
      status_unsupported: "Nie da się tu włączyć (np. strona chrome://, sklep Chrome albo karta bez dźwięku)",
      status_cant_read: "Nie można odczytać aktywnej karty",
      restore: "Przywróć poprzednie ({n}%)",
      restore_mix: "Przywróć poprzednie ({n}% + Mix {m}x)",
      scale_quiet: "cicho",
      scale_danger: "strefa przesterów",
      eff_mono: "Napraw dźwięk na jedno ucho",
      eff_bass: "Podbicie basów",
      eff_yt: "Auto kontynuuj na YouTube",
      eff_skip: "Auto pomijanie artystów",
      skip_ban: "Pomijaj ten utwór",
      skip_ban_done: "Utwór na liście ✓",
      mix_title: "Miks i efekty",
      mix_open_sub: "Tempo, pogłos, jasność, 8D",
      mix_back: "Wróć",
      mix_normal: "Normalnie",
      mix_spedup: "Sped Up",
      mix_nightcore: "Nightcore",
      mix_spedup_reverb: "Sped Up + Reverb",
      mix_slowed_reverb: "Slowed + Reverb",
      mix_8d: "8D Audio",
      mix_drill: "Drill / Rap",
      mix_phonk: "Phonk",
      mix_nydrill: "NY Drill",
      mix_chilldrill: "Chill Drill",
      mix_speed_l: "Prędkość",
      mix_speed_d: "Tempo utworu. Szybciej podnosi też głos, wolniej go pogłębia.",
      mix_reverb_l: "Pogłos",
      mix_reverb_d: "Echo jak w dużej sali. Więcej = dźwięk dalej i bardziej rozmarzony.",
      mix_treble_l: "Jasność",
      mix_treble_d: "Podbija wysokie tony. Dźwięk robi się ostrzejszy i bardziej klarowny.",
      mix_muffle_l: "Tłumik",
      mix_muffle_d: "Przytłumia dźwięk jak przez ścianę. Zostaje głównie bas, jakby impreza grała w pokoju obok.",
      mix_vocal_l: "Wokal",
      mix_vocal_d: "Wyciąga głos na pierwszy plan, żeby nie ginął pod basem i pogłosem.",
      mix_power_l: "Moc",
      mix_power_d: "Spina miks i dodaje głośności jak w radiu. Limiter pilnuje, żeby nic nie charczało.",
      mix_bass_l: "Bas",
      mix_bass_d: "Klasyk = równy dół, Sub = najgłębiej, Punch = kopnięcie stopy, Grzmot = kinowy pomruk, 808 = drillowy boom, Ciepły = miękki, lampowy dół.",
      bm_classic: "Klasyk",
      bm_sub: "Sub",
      bm_punch: "Punch",
      bm_rumble: "Grzmot",
      bm_808: "808",
      bm_warm: "Ciepły",
      mix_spin_l: "Krążenie",
      mix_spin_d: "Jak szybko dźwięk okrąża głowę. Najlepiej słychać w słuchawkach.",
      mix_hint: "Prędkość działa na stronach z odtwarzaczem wideo lub audio. Pozostałe efekty działają wszędzie.",
      mix_unavailable: "Mix jest niedostępny na tej stronie.",
      mix_rate_unavailable: "Zmiana prędkości nie działa na tej stronie. Pogłos, jasność i 8D działają.",
      mix_ok: "Działa na tej stronie",
      mix_ready: "Karta gra dźwięk, Mix powinien tu działać",
      mix_full_l: "Pełny mikser",
      mix_full_d: "Wszystkie suwaki naraz, kręcisz po swojemu",
      mix_idle: "Włącz odtwarzanie, żeby usłyszeć efekt",
      mix_checking: "Sprawdzam tę stronę...",
      mix_save: "Zapisz jako mój mix",
      mix_save_name_ph: "Nazwa twojego mixu",
      mix_save_limit: "Limit 8 własnych mixów. Usuń któryś krzyżykiem, żeby dodać nowy.",
      mix_user_del: "Usuń ten mix",
      mix_tab_presets: "Presety",
      mix_tab_mine: "Twoje mixy",
      mix_mine_empty: "Nie masz jeszcze własnych mixów. Ustaw suwaki po swojemu (np. pełnym mikserem) i kliknij Zapisz jako mój mix.",
      tabs_title: "Aktywne zakładki odtwarzające dźwięk",
      tabs_empty: "Nie wykryto kart z dźwiękiem",
      btn_reset: "Reset",
      btn_settings: "Ustawienia",
      rate_ext: "Oceń wtyczkę",

      app_tagline: "Podgłaśniacz dźwięku dla każdej karty. YouTube, Spotify i cała reszta.",
      sec_look: "Wygląd",
      sec_basics: "Podstawowe",
      sec_about: "Funkcje",
      lang_h: "Język / Language",
      maxvol_h: "Maksymalna głośność",
      maxvol_d: "Górna granica suwaka głośności w okienku. Ustaw niżej, jeśli chcesz chronić słuch albo głośniki przed przypadkowym 700%.",
      theme_h: "Kolor wtyczki",
      theme_d: "Wybierz akcent kolorystyczny całej wtyczki: okienka, panelu Miks i tej strony. Zmiana działa od razu.",
      theme_neon: "Lazur",
      theme_crimson: "Czerwień",
      theme_emerald: "Zieleń",
      theme_gold: "Złoto",
      theme_rose: "Róż",
      theme_fire: "Ogień",
      theme_magenta: "Magenta",
      glow_h: "Poświata tła",
      glow_d: "Miękka poświata w tle okienka. Wyłącz, żeby mieć czystą czerń, albo ustaw jej siłę suwakiem.",
      glow_strength_h: "Siła poświaty",
      glow_color_h: "Kolor poświaty",
      glow_color_d: "Kolor blasku w tle okienka, niezależny od koloru wtyczki. Motyw idzie za akcentem.",
      glow_c_theme: "Motyw",
      glow_c_white: "Biała",
      glow_c_navy: "Granat",
      glow_c_violet: "Fiolet",
      glow_c_plum: "Śliwka",
      glow_c_wine: "Bordo",
      glow_c_teal: "Morska",
      glow_c_forest: "Butelkowa",
      glow_c_bronze: "Bronz",
      glow_c_slate: "Grafit",
      look_reset: "Przywróć domyślny wygląd",
      preset_names_h: "Własne nazwy presetów",
      preset_names_d: "Zmień nazwy wbudowanych presetów z panelu Miks na swoje. Puste pole = nazwa domyślna.",
      preset_names_reset: "Przywróć domyślne nazwy",
      defbass_h: "Domyślny charakter basu",
      defbass_d: "Ten charakter basu włącza się na kartach, na których jeszcze go nie wybrano. Zawsze możesz go zmienić w panelu Miks.",
      privacy_h: "Prywatność",
      privacy_1: "Cała obróbka dźwięku dzieje się lokalnie, w twojej przeglądarce. Wtyczka niczego nie nagrywa, nie zapisuje i nigdzie nie wysyła: zero serwerów, zero analityki, zero kont i logowania.",
      privacy_2: "Domyślnie nie czyta ani nie zmienia zawartości stron. Bierze tylko sam dźwięk karty, dlatego w menu rozszerzeń siedzi w sekcji Nie potrzebują dostępu.",
      privacy_3: "Dostęp do konkretnej strony dostaje dopiero, gdy sam włączysz tam zmianę prędkości (Mix) albo auto-kontynuację YouTube, i oddaje go zaraz po wyłączeniu. Aktualną listę stron z dostępem widzisz wyżej, w sekcji Dostęp do stron, i możesz ją wyczyścić jednym przyciskiem.",
      privacy_4: "Stałe uprawnienia i po co są: dźwięk karty (tabCapture) do podgłaśniania i efektów, lista kart (tabs) do spisu grających kart w okienku, pamięć (storage) do zapamiętania twoich ustawień, dokument w tle (offscreen) jako niewidoczny silnik dźwięku. Żadne z nich nie daje wglądu w treść stron.",
      privacy_5: "Ustawienia (głośność, efekty, język) trzymane są wyłącznie na twoim komputerze. Po odinstalowaniu wtyczki nic po niej nie zostaje.",
      privacy_note: 'Pasek Chrome "ta karta jest udostępniana" to wymóg przeglądarki przy braniu dźwięku karty. Dzięki temu działa też Spotify. Nie da się go schować w żadnej wtyczce tego typu.',
      access_h: "Dostęp do stron",
      access_d: "Wtyczka bierze dostęp do strony dopiero wtedy, gdy włączysz na niej Mix (albo auto-kontynuację YouTube), i oddaje go, gdy wyłączysz. Dzięki temu domyślnie siedzi w sekcji Nie potrzebują dostępu. Poniżej widzisz strony, które akurat mają dostęp.",
      access_grant_yt: "Nadaj dostęp do serwisów muzycznych",
      access_grant_yt_d: "Nadaj dostęp do serwisów muzycznych: wtyczka dostaje dostęp tylko do YouTube, Spotify i SoundCloud, żeby Mix, auto-kontynuacja i auto-skip działały tam bez pytania za każdym razem. Do żadnej innej strony to nie sięga.",
      access_revoke_d: "Zabierz dostęp wszystkim stronom: cofa wszystkie nadane zgody naraz i wtyczka wraca do zera dostępu.",
      access_current: "Strony z dostępem",
      access_none: "Żadna strona nie ma teraz dostępu.",
      access_all_sites: "Wszystkie strony",
      access_revoke: "Zabierz dostęp wszystkim stronom",
      access_granted: "Nadano dostęp.",
      access_revoked: "Zabrano dostęp.",
      saved: "Zapisano.",
      foot: "Tę stronę otworzysz zawsze przez okienko wtyczki, przycisk Ustawienia.",

      engine_name: "Silnik dźwięku",
      engine_live: "DZIAŁA",
      engine_hint: "Zamknij tę kartę, a podgłaśnianie od razu się wyłączy.",
      engine_support_h: "Wesprzyj rozwój",
      engine_donate: "Wesprzyj mnie",
      rate_d: "Krótka ocena w sklepie pomaga innym znaleźć wtyczkę.",
      donate_d: "Wtyczka jest darmowa. Jak się przydaje, możesz wesprzeć autora.",
      engine_why_h: "Dlaczego ta karta jest otwarta?",
      engine_why_d: "Ta karta to silnik dźwięku. Przeglądarka pozwala podbić głośność ponad 100% tylko wtedy, gdy dźwięk karty przechodzi przez taką stronę. Możesz ją zostawić w tle, niczego nie nagrywa i nigdzie nie wysyła.",
      feats_h: "Wszystkie funkcje",
      featl_vol_t: "Podgłaśnianie do 700%",
      featl_vol_d: "Zwykły suwak strony kończy się na 100%. Wtyczka przepuszcza dźwięk karty przez własny wzmacniacz, więc może grać do siedmiu razy głośniej. Każda karta ma osobny poziom.",
      featl_mix_t: "Miks: sped up, nightcore, slowed",
      featl_mix_d: "Nightcore to sposób przerabiania piosenek: utwór przyspiesza się o jakieś 10-30%, przez co wokal robi się wyraźnie wyższy. Nazwa wzięła się od norweskiego duetu Nightcore, który tak remiksował utwory na początku lat 2000. Sped up to nowsza odmiana tego samego pomysłu, znana głównie z TikToka, a slowed + reverb to jej przeciwieństwo: wolniej i z pogłosem. Suwak prędkości działa w zakresie 0.5x-1.6x.",
      featl_drill_t: "Drill / Rap i Chill Drill",
      featl_drill_d: "Dwa presety pod rap, oba w pełnym tempie, żeby bit nie tracił energii. Drill / Rap: ciężki, warczący bas 808, mroczny pogłos, wokal wyciągnięty do przodu i szczypta kompresora dla kopa. Chill Drill to łagodniejsza wersja: umiarkowany sub-bas, delikatny pogłos i czytelny głos, do słuchania na spokojnie.",
      featl_8d_t: "8D Audio i krążenie",
      featl_8d_d: "Dźwięk płynnie krąży wokół głowy (najlepiej w słuchawkach). Suwak Krążenie ustawia szybkość obrotu, a 0% wyłącza efekt.",
      featl_full_t: "Pełny mikser",
      featl_full_d: "Przełącznik w panelu Miks, który odsłania wszystkie suwaki naraz: prędkość, pogłos, jasność, tłumik, bas i krążenie. Do kręcenia własnych wersji.",
      featl_bass_t: "Podbicie basów (6 charakterów)",
      featl_bass_d: "Wzmacnia dół pasma, w którym siedzi bas i stopa perkusji. Do wyboru sześć charakterów: Klasyk (równe podbicie całego dołu), Sub (najgłębsze częstotliwości, czuć je w słuchawkach i na subwooferze), Punch (wąskie kopnięcie stopy), Grzmot (kinowy pomruk 30-55 Hz), 808 (drillowy boom, słychać go też na telefonie) i Ciepły (miękkie, lampowe ocieplenie bez dudnienia). Przełącznik w głównym widoku włącza bas jednym kliknięciem, a suwak w panelu Miks reguluje moc.",
      featl_treble_t: "Jasność",
      featl_treble_d: "Podbija wysokie tony, dźwięk robi się ostrzejszy i bardziej klarowny. Suwak znajdziesz w panelu Miks.",
      featl_reverb_t: "Reverb (pogłos)",
      featl_reverb_d: "Pogłos to odbicia dźwięku od ścian, które wybrzmiewają chwilę po oryginale. Efekt dodaje je do utworu, więc brzmi on, jakby grał w dużej sali.",
      featl_muffle_t: "Tłumik",
      featl_muffle_d: "Ścisza wysokie tony jak przegroda z betonu: zostaje bas i zarys melodii, jakby muzyka grała w pokoju obok. Suwak znajdziesz w panelu Miks (pełny mikser).",
      featl_vocal_t: "Wokal i Moc",
      featl_vocal_d: "Wokal podbija środek pasma, w którym siedzi głos, więc raper czy wokalista nie ginie pod ciężkim basem i pogłosem. Moc to kompresor: ścisza szczyty i podnosi całość, przez co muzyka brzmi głośniej i gęściej, jak w radiu. Oba suwaki znajdziesz w pełnym mikserze.",
      featl_styles_t: "Phonk i NY Drill",
      featl_styles_d: "Dwa style prosto z remixów. Phonk gra w pełnym tempie: agresywny, kopiący bas, ostra, chrupiąca góra pasma i kompresor dociskający całość jak w memphis rapie lat 90. NY Drill to brzmienie nowojorskiego drillu: bardzo głęboki, ślizgający się sub-bas, ciemny pogłos i wokal, który mimo tego basu nie ginie.",
      featl_mono_t: "Naprawa dźwięku na jedno ucho",
      featl_mono_d: "Część nagrań ma dźwięk tylko w lewym albo prawym kanale. Ta opcja miksuje oba kanały do środka, więc słychać w obu słuchawkach.",
      featl_limiter_t: "Limiter",
      featl_limiter_d: "Automatyczny strażnik na wyjściu: przy mocnym podbiciu dociska szczyty, żeby dźwięk nie trzeszczał. Działa sam, nic nie trzeba włączać.",
      featl_tabs_t: "Lista grających kart",
      featl_tabs_d: "W okienku widzisz wszystkie karty z dźwiękiem (wstrzymane też, jeśli są podgłośnione) i każdą włączasz lub wyłączasz jednym kliknięciem.",
      featl_resume_t: "Auto-wznawianie",
      featl_resume_d: "Po odświeżeniu strony podgłośnienie i efekty wracają same, bez ponownego klikania.",
      featl_yt_t: "Auto-kontynuacja YouTube",
      featl_yt_d: "Gdy YouTube wstrzymuje muzykę pytaniem, czy oglądasz dalej, wtyczka klika za ciebie. Wymaga zgody na youtube.com i oddaje ją przy wyłączeniu.",
      featl_skip_t: "Auto-pomijanie artystów",
      featl_skip_d: "Twoja lista artystów do pomijania na YouTube, YouTube Music, Spotify i SoundCloud. Gdy zacznie grać ktoś z listy, wtyczka od razu przeskakuje do następnego utworu.",
      skip_sec: "Auto-pomijanie",
      skip_h: "Auto-pomijanie artystów",
      skip_d: "Działa na YouTube, YouTube Music, Spotify i SoundCloud. Gdy zacznie grać utwór artysty z twojej listy, wtyczka sama przeskakuje do następnego. Wymaga zgody na te strony i oddaje ją przy wyłączeniu.",
      skip_ph: "Artysta, kanał albo link do utworu...",
      skip_add: "Dodaj",
      skip_empty: "Lista jest pusta. Dodaj artystę, którego chcesz pomijać.",
      skip_clear: "Wyczyść całą listę",
      skip_clear_confirm: "Na pewno? Kliknij jeszcze raz, żeby usunąć wszystko",
      skip_hint: "Wtyczka porównuje nazwę artysty, nazwę kanału i tytuł utworu. Wielkość liter i polskie znaki nie mają znaczenia. Możesz też wkleić link do konkretnego utworu z YouTube, Spotify lub SoundCloud, żeby pomijać tylko ten jeden utwór.",
      skip_remove: "Usuń",
      skip_dup: "To już jest na liście.",
      skip_bad: "Ta nazwa nie może być filtrem.",
      skip_link_bad: "Nie rozpoznaję tego linku. Działają linki do utworów z YouTube, Spotify i SoundCloud.",
      wipe_h: "Dane wtyczki",
      wipe_d: "Wtyczka nie trzyma żadnych cache, historii ani danych stron - tylko twoje ustawienia: głośności, motyw, język, listy auto-pomijania i własne mixy, wszystko lokalnie na tym komputerze. Ten przycisk czyści to do zera i wtyczka wraca do stanu jak po świeżej instalacji.",
      wipe_btn: "Wyczyść wszystkie dane wtyczki",
      wipe_confirm: "Na pewno? Kliknij jeszcze raz, żeby wyczyścić",
      skip_all_h: "Pomijaj wszędzie, nawet bez podgłośnienia",
      skip_all_d: "Domyślnie auto-pomijanie działa tylko na kartach, na których wtyczka gra (włączone podgłośnienie). Włącz, żeby pomijało na całej stronie, nawet gdy nic nie podgłaśniasz.",
      cl_440: "- Dodano: poświata w tle z własną paletą kolorów, niezależną od koloru wtyczki\n- Dodano: suwak siły poświaty i przycisk przywracania domyślnego wyglądu\n- Zmieniono: nowa ikona wtyczki\n- Zmieniono: odświeżony wygląd okienka, czarne tło z lazurowym akcentem\n- Zmieniono: wyraźniejsze przyciski Reset i Ustawienia na dole okienka\n- Zmieniono: usunięty powtarzający się motyw kolorów, zostało ich 7\n- Zmieniono: sekcja O wtyczce nazywa się teraz Funkcje\n- Zmieniono: usunięty pływający przycisk wsparcia w ustawieniach\n- Zmieniono: lista zmian pokazuje 3 ostatnie wersje, pełna historia jest na stronie\n- Naprawiono: tło nie rozjeżdża się już przy otwieraniu panelu Mix\n- Naprawiono: suwak siły poświaty zapisuje się za każdym razem\n- Naprawiono: ikona nie ma już obciętych rogów\n- Naprawiono: przewijany napis w ustawieniach nie ma już przerwy\n- Naprawiono: napis w tle ustawień nie przeskakuje przy zmianie zakładki",
      cl_431: "- Naprawiono: tempo (Sped Up itp.) nie gubi się już przy zmianie piosenki\n- Naprawiono: tempo naprawia się samo, kiedy YouTube gra normalnie mimo włączonego mixu\n- Naprawiono: presety nie kasują twojego bass boosta, a Reset czyści wszystko do zera\n- Naprawiono: wyłączenie karty na liście wyłącza też tempo, a włączenie je przywraca\n- Zmieniono: łagodniejszy bass boost, muzyka nie cichnie przy uderzeniach basu\n- Zmieniono: płynne włączanie i wyłączanie wzmocnienia, bez trzasku\n- Dodano: przycisk czyszczenia całej listy auto-pomijania",
      cl_430: "- Dodano: auto-pomijanie artystów na YouTube, YouTube Music, Spotify i SoundCloud\n- Dodano: pomijanie konkretnych utworów (jednym kliknięciem w okienku albo po wklejeniu linka)\n- Dodano: 2 nowe kolory wtyczki (Ogień, Magenta)\n- Dodano: czyszczenie wszystkich danych wtyczki jednym przyciskiem\n- Zmieniono: odświeżony, szklany wygląd okienka\n- Zmieniono: wyraźniejsze charaktery basu i mocniejszy suwak Wokal",
      tab_general: "Ogólne",
      tab_changelog: "Changelog",
      tab_privacy: "Prywatność i dostęp",
      bug_sec: "Zgłoś błąd lub pomysł",
      bug_h: "Masz błąd albo pomysł?",
      bug_d: "Napisz, co nie działa i na jakiej stronie, albo podziel się pomysłem na nową funkcję. Wiadomość wysyła się anonimowo, bez konta i logowania.",
      bug_ph: "Opisz błąd albo pomysł...",
      bug_send: "Wyślij",
      bug_sent: "Wysłane, dzięki!",
      changelog_h: "Historia zmian",
      cl_more_d: "Tutaj są tylko trzy ostatnie wydania. Pełna historia zmian jest na stronie wtyczki.",
      cl_full: "Zobacz pełną historię zmian",
      wlc_hi: "Dzięki za instalację!",
      wlc_start_h: "Szybki start",
      wlc_step1_t: "Przypnij wtyczkę do paska",
      wlc_step1_d: "Kliknij ikonę puzzla obok paska adresu i pinezkę przy Turn It Up, Son!",
      wlc_step2_t: "Włącz coś z dźwiękiem",
      wlc_step2_d: "YouTube, Spotify, film, cokolwiek gra w karcie.",
      wlc_step3_t: "Kliknij ikonę wtyczki",
      wlc_step3_d: "Przesuń suwak głośności do 700% albo otwórz panel Miks i wybierz preset.",
      wlc_step4_t: "Ciesz się",
      wlc_step4_d: "To wszystko. Podkręć, zremiksuj, pomiń czego nie lubisz i baw się dźwiękiem.",
      wlc_links_h: "Podoba się? To pomaga najbardziej",
      wlc_rate_t: "Oceń wtyczkę",
      wlc_rate_d: "Dobra ocena w Chrome Web Store pomaga innym ją znaleźć.",
      wlc_gh_d: "Kod jest publiczny. Zostaw gwiazdkę na repozytorium!",
      wlc_bmac_d: "Wtyczka jest w 100% darmowa. Jeśli się przyda, możesz postawić kawę.",
      wlc_priv: "Zero analityki, zero kont, zero serwerów. Cały dźwięk przetwarzany lokalnie w przeglądarce.",
      wlc_settings: "Ustawienia",
      wlc_bug_h: "Błąd albo pomysł?",
      wlc_bug_d: "Wtyczka jest młoda i często aktualizowana. Znalazłeś błąd albo masz pomysł? Napisz w Ustawieniach, w sekcji Zgłoś błąd lub pomysł. Czytamy każdą wiadomość.",
    },
    en: {
      power_on: "On",
      power_off: "Off",
      power_title: "Turn on/off on this tab",
      status_checking: "Checking tab...",
      status_on: "Active: {n}%",
      status_on_fx: "Active: {n}% + Mix",
      status_mix: "Mix active: {n}x",
      status_both: "Active: {n}% + Mix {m}x",
      status_off: "Off",
      status_unsupported: "Can't enable here (e.g. a chrome:// page, the Chrome store, or a tab with no audio)",
      status_cant_read: "Can't read the active tab",
      restore: "Restore previous ({n}%)",
      restore_mix: "Restore previous ({n}% + Mix {m}x)",
      scale_quiet: "quiet",
      scale_danger: "clipping zone",
      eff_mono: "Fix sound stuck in one ear",
      eff_bass: "Bass boost",
      eff_yt: "Auto continue on YouTube",
      eff_skip: "Auto skip artists",
      skip_ban: "Auto-skip this track",
      skip_ban_done: "Track on the list ✓",
      mix_title: "Mix and effects",
      mix_open_sub: "Tempo, reverb, brightness, 8D",
      mix_back: "Back",
      mix_normal: "Normal",
      mix_spedup: "Sped Up",
      mix_nightcore: "Nightcore",
      mix_spedup_reverb: "Sped Up + Reverb",
      mix_slowed_reverb: "Slowed + Reverb",
      mix_8d: "8D Audio",
      mix_drill: "Drill / Rap",
      mix_phonk: "Phonk",
      mix_nydrill: "NY Drill",
      mix_chilldrill: "Chill Drill",
      mix_speed_l: "Speed",
      mix_speed_d: "Song tempo. Faster also raises the voice, slower deepens it.",
      mix_reverb_l: "Reverb",
      mix_reverb_d: "Echo like in a big hall. More = the sound feels distant and dreamy.",
      mix_treble_l: "Brightness",
      mix_treble_d: "Boosts the high tones. The sound gets sharper and clearer.",
      mix_muffle_l: "Muffle",
      mix_muffle_d: "Muffles the sound like through a wall. Mostly the bass stays, like a party in the next room.",
      mix_vocal_l: "Vocal",
      mix_vocal_d: "Brings the voice to the front so it does not drown under the bass and reverb.",
      mix_power_l: "Power",
      mix_power_d: "Glues the mix and adds radio-style loudness. The limiter keeps it from crackling.",
      mix_bass_l: "Bass",
      mix_bass_d: "Classic = even low-end lift, Sub = the deepest bass, Punch = kick thump, Rumble = cinematic roar, 808 = drill boom, Warm = soft vintage low end.",
      bm_classic: "Classic",
      bm_sub: "Sub",
      bm_punch: "Punch",
      bm_rumble: "Rumble",
      bm_808: "808",
      bm_warm: "Warm",
      mix_spin_l: "Rotation",
      mix_spin_d: "How fast the sound circles your head. Best with headphones.",
      mix_hint: "Speed works on pages with a video or audio player. The other effects work everywhere.",
      mix_unavailable: "Mix is unavailable on this page.",
      mix_rate_unavailable: "Speed change does not work on this page. Reverb, brightness and 8D still do.",
      mix_ok: "Working on this page",
      mix_ready: "This tab is playing audio, Mix should work here",
      mix_full_l: "Full mixer",
      mix_full_d: "All sliders at once, dial it in yourself",
      mix_idle: "Start playback to hear the effect",
      mix_checking: "Checking this page...",
      mix_save: "Save as my mix",
      mix_save_name_ph: "Name your mix",
      mix_save_limit: "Limit of 8 custom mixes. Delete one with the × to add a new one.",
      mix_user_del: "Delete this mix",
      mix_tab_presets: "Presets",
      mix_tab_mine: "Your mixes",
      mix_mine_empty: "No custom mixes yet. Dial in the sliders (e.g. with the full mixer) and hit Save as my mix.",
      tabs_title: "Tabs currently playing audio",
      tabs_empty: "No tabs with audio detected",
      btn_reset: "Reset",
      btn_settings: "Settings",
      rate_ext: "Rate the extension",

      app_tagline: "A volume booster for any tab. YouTube, Spotify and everything else.",
      sec_look: "Appearance",
      sec_basics: "Basics",
      sec_about: "Features",
      lang_h: "Language / Język",
      maxvol_h: "Maximum volume",
      maxvol_d: "The upper limit of the volume slider in the popup. Set it lower to protect your ears or speakers from an accidental 700%.",
      theme_h: "Extension color",
      theme_d: "Pick the accent color for the whole extension: the popup, the Mix panel and this page. Applies instantly.",
      theme_neon: "Azure",
      theme_crimson: "Crimson",
      theme_emerald: "Emerald",
      theme_gold: "Gold",
      theme_rose: "Rose",
      theme_fire: "Fire",
      theme_magenta: "Magenta",
      glow_h: "Background glow",
      glow_d: "The soft glow behind the popup. Turn it off for pure black, or set its strength with the slider.",
      glow_strength_h: "Glow strength",
      glow_color_h: "Glow color",
      glow_color_d: "The color of the glow behind the popup, independent of the extension color. Theme follows the accent.",
      glow_c_theme: "Theme",
      glow_c_white: "White",
      glow_c_navy: "Navy",
      glow_c_violet: "Violet",
      glow_c_plum: "Plum",
      glow_c_wine: "Wine",
      glow_c_teal: "Teal",
      glow_c_forest: "Forest",
      glow_c_bronze: "Bronze",
      glow_c_slate: "Slate",
      look_reset: "Restore default look",
      preset_names_h: "Custom preset names",
      preset_names_d: "Rename the built-in presets from the Mix panel. An empty field = the default name.",
      preset_names_reset: "Restore default names",
      defbass_h: "Default bass flavor",
      defbass_d: "This bass flavor is used on tabs where you have not picked one yet. You can always change it in the Mix panel.",
      privacy_h: "Privacy",
      privacy_1: "All audio processing happens locally, in your browser. The extension records nothing, stores nothing remotely and sends nothing anywhere: zero servers, zero analytics, zero accounts or logins.",
      privacy_2: "By default it does not read or change page content. It only takes the tab's audio, which is why it sits under No access needed in the extensions menu.",
      privacy_3: "It gets access to a specific page only when you turn on speed change (Mix) or YouTube auto-continue there yourself, and gives it back right after you turn it off. The current list of sites with access is shown above in the Site access section and can be cleared with one button.",
      privacy_4: "Permanent permissions and what they are for: tab audio (tabCapture) for boosting and effects, tab list (tabs) for the playing-tabs list in the popup, storage for remembering your settings, background document (offscreen) as the invisible audio engine. None of them can see page content.",
      privacy_5: "Settings (volume, effects, language) are kept only on your computer. After uninstalling, nothing is left behind.",
      privacy_note: "The Chrome \"this tab is being shared\" bar is required by the browser when capturing tab audio. That is what makes Spotify work too. No extension of this kind can hide it.",
      access_h: "Site access",
      access_d: "The extension takes access to a page only when you turn on Mix there (or YouTube auto-continue), and gives it back when you turn it off. That way it stays under No access needed by default. Below are the sites that currently have access.",
      access_grant_yt: "Grant access to music sites",
      access_grant_yt_d: "Grant access to music sites: the extension gets access to YouTube, Spotify and SoundCloud only, so Mix, auto-continue and auto-skip work there without asking every time. It does not reach any other site.",
      access_revoke_d: "Revoke access from all sites: takes back every granted permission at once and the extension returns to zero access.",
      access_current: "Sites with access",
      access_none: "No site has access right now.",
      access_all_sites: "All sites",
      access_revoke: "Revoke access from all sites",
      access_granted: "Access granted.",
      access_revoked: "Access revoked.",
      saved: "Saved.",
      foot: "You can reopen this page anytime from the popup, the Settings button.",

      engine_name: "Audio engine",
      engine_live: "RUNNING",
      engine_hint: "Close this tab and boosting stops instantly.",
      engine_support_h: "Support development",
      engine_donate: "Support me",
      rate_d: "A short review in the store helps others find the extension.",
      donate_d: "The extension is free. If it helps you, you can support the author.",
      engine_why_h: "Why is this tab open?",
      engine_why_d: "This tab is the audio engine. The browser only allows boosting past 100% when the tab's audio flows through a page like this one. You can leave it in the background, it records nothing and sends nothing.",
      feats_h: "All features",
      featl_vol_t: "Boosting up to 700%",
      featl_vol_d: "A page's own slider stops at 100%. The extension routes the tab's audio through its own amplifier, so it can play up to seven times louder. Each tab has a separate level.",
      featl_mix_t: "Mix: sped up, nightcore, slowed",
      featl_mix_d: "Nightcore is a way of editing songs: the track is sped up by roughly 10-30%, which makes the vocals noticeably higher. The name comes from the Norwegian duo Nightcore, who remixed songs this way in the early 2000s. Sped up is the newer take on the same idea, known mostly from TikTok, and slowed + reverb is its opposite: slower and drenched in echo. The speed slider covers 0.5x-1.6x.",
      featl_drill_t: "Drill / Rap and Chill Drill",
      featl_drill_d: "Two presets made for rap, both at full tempo so the beat keeps its energy. Drill / Rap: a heavy growling 808 bass, dark reverb, the vocal pushed to the front and a pinch of compression for punch. Chill Drill is the softer take: moderate sub-bass, gentle reverb and a clear voice, for relaxed listening.",
      featl_8d_t: "8D Audio and rotation",
      featl_8d_d: "The sound smoothly circles your head (best with headphones). The Rotation slider sets how fast it spins, and 0% turns the effect off.",
      featl_full_t: "Full mixer",
      featl_full_d: "A switch in the Mix panel that reveals every slider at once: speed, reverb, brightness, muffle, bass and rotation. For dialing in your own versions.",
      featl_bass_t: "Bass boost (6 flavors)",
      featl_bass_d: "Strengthens the low end where the bass and kick drum sit. Six flavors to pick from: Classic (an even lift of the whole low end), Sub (the deepest frequencies, felt in headphones and on a subwoofer), Punch (a narrow kick-drum thump), Rumble (a cinematic 30-55 Hz roar), 808 (a drill boom you can hear even on a phone) and Warm (a soft vintage warmth with no booming). The switch in the main view enables bass with one click, the slider in the Mix panel sets the amount.",
      featl_treble_t: "Brightness",
      featl_treble_d: "Boosts the high tones, making the sound sharper and clearer. You will find the slider in the Mix panel.",
      featl_reverb_t: "Reverb",
      featl_reverb_d: "Reverb is the sound bouncing off walls and fading out just after the original. The effect adds those reflections to a track, so it sounds like it plays in a big hall.",
      featl_muffle_t: "Muffle",
      featl_muffle_d: "Cuts the high tones like a concrete wall: the bass and the outline of the melody stay, like music playing in the next room. The slider lives in the Mix panel (full mixer).",
      featl_vocal_t: "Vocal and Power",
      featl_vocal_d: "Vocal boosts the midrange where the voice sits, so the rapper or singer does not drown under heavy bass and reverb. Power is a compressor: it squeezes the peaks and lifts the whole track, making the music sound louder and denser, like on the radio. Both sliders live in the full mixer.",
      featl_styles_t: "Phonk and NY Drill",
      featl_styles_d: "Two styles straight from remix culture. Phonk runs at full tempo: an aggressive kicking bass, a sharp crunchy top end and a compressor squeezing it all like 90s Memphis rap. NY Drill is the New York drill sound: a very deep, sliding sub-bass, dark reverb and a vocal that still cuts through all that bass.",
      featl_mono_t: "Fix sound stuck in one ear",
      featl_mono_d: "Some recordings only have audio in the left or right channel. This option mixes both channels to the center, so you hear it in both earbuds.",
      featl_limiter_t: "Limiter",
      featl_limiter_d: "An automatic guard on the output: with heavy boosts it presses the peaks down so the sound does not crackle. Works on its own, nothing to enable.",
      featl_tabs_t: "List of playing tabs",
      featl_tabs_d: "The popup shows every tab with audio (paused ones too, if boosted) and each toggles on or off with a single click.",
      featl_resume_t: "Auto-resume",
      featl_resume_d: "After a page refresh the boost and effects come back on their own, no clicking needed.",
      featl_yt_t: "YouTube auto-continue",
      featl_yt_d: "When YouTube pauses the music asking if you are still watching, the extension clicks it for you. Needs access to youtube.com and gives it back when turned off.",
      featl_skip_t: "Auto-skip artists",
      featl_skip_d: "Your own list of artists to skip on YouTube, YouTube Music, Spotify and SoundCloud. When someone from the list starts playing, the extension jumps straight to the next track.",
      skip_sec: "Auto-skip",
      skip_h: "Auto-skip artists",
      skip_d: "Works on YouTube, YouTube Music, Spotify and SoundCloud. When a track by an artist from your list starts playing, the extension jumps to the next one by itself. Needs access to these sites and gives it back when turned off.",
      skip_ph: "Artist, channel or a song link...",
      skip_add: "Add",
      skip_empty: "The list is empty. Add an artist you want to skip.",
      skip_clear: "Clear the whole list",
      skip_clear_confirm: "Are you sure? Click again to remove everything",
      skip_hint: "The extension compares the artist name, the channel name and the track title. Letter case and accents do not matter. You can also paste a link to a specific track from YouTube, Spotify or SoundCloud to skip just that one track.",
      skip_remove: "Remove",
      skip_dup: "This is already on the list.",
      skip_bad: "This name cannot be used as a filter.",
      skip_link_bad: "This link is not recognized. Track links from YouTube, Spotify and SoundCloud work.",
      wipe_h: "Extension data",
      wipe_d: "The extension keeps no cache, history or site data - only your settings: volumes, theme, language, auto-skip lists and custom mixes, all locally on this computer. This button clears everything and the extension returns to a fresh-install state.",
      wipe_btn: "Clear all extension data",
      wipe_confirm: "Are you sure? Click again to clear",
      skip_all_h: "Skip everywhere, even without boosting",
      skip_all_d: "By default auto-skip works only on tabs where the extension is playing (boost on). Turn this on to skip on the whole site even when you are not boosting anything.",
      cl_440: "- Added: background glow with its own color palette, separate from the extension color\n- Added: glow strength slider and a button to restore the default look\n- Changed: new extension icon\n- Changed: refreshed popup look, black background with an azure accent\n- Changed: more visible Reset and Settings buttons at the bottom of the popup\n- Changed: removed a duplicate color theme, 7 left\n- Changed: the About section is now called Features\n- Changed: removed the floating support button in settings\n- Changed: the changelog shows the 3 latest versions, full history is on the website\n- Fixed: the background no longer shifts when the Mix panel opens\n- Fixed: the glow strength slider now saves every time\n- Fixed: the icon corners are no longer clipped\n- Fixed: the scrolling text in settings no longer has a gap\n- Fixed: the background text in settings no longer jumps when you switch tabs",
      cl_431: "- Fixed: tempo (Sped Up etc.) no longer gets lost when the song changes\n- Fixed: tempo repairs itself when YouTube plays at normal speed despite an active mix\n- Fixed: presets no longer wipe your bass boost, and Reset clears everything to zero\n- Fixed: turning a tab off in the list also stops the tempo, turning it back on restores it\n- Changed: gentler bass boost, music no longer goes quiet on bass hits\n- Changed: smooth engine on and off, no popping sound\n- Added: a button to clear the whole auto-skip list",
      cl_430: "- Added: auto-skip artists on YouTube, YouTube Music, Spotify and SoundCloud\n- Added: skip specific tracks (one click in the popup or by pasting a link)\n- Added: 2 new extension colors (Fire, Magenta)\n- Added: clear all extension data with one button\n- Changed: refreshed glass look for the popup\n- Changed: more distinct bass flavors and a stronger Vocal slider",
      tab_general: "General",
      tab_changelog: "Changelog",
      tab_privacy: "Privacy & access",
      bug_sec: "Report a bug or share an idea",
      bug_h: "Got a bug or an idea?",
      bug_d: "Tell us what broke and on which site, or share an idea for a new feature. The message is sent anonymously, no account or sign-in needed.",
      bug_ph: "Describe the bug or idea...",
      bug_send: "Send",
      bug_sent: "Sent, thanks!",
      changelog_h: "Changelog",
      cl_more_d: "Only the three latest releases are listed here. The full history is on the extension website.",
      cl_full: "See the full changelog",
      wlc_hi: "Thanks for installing!",
      wlc_start_h: "Quick start",
      wlc_step1_t: "Pin the extension to your toolbar",
      wlc_step1_d: "Click the puzzle icon next to the address bar, then the pin next to Turn It Up, Son!",
      wlc_step2_t: "Play something with sound",
      wlc_step2_d: "YouTube, Spotify, a movie, anything playing in a tab.",
      wlc_step3_t: "Click the extension icon",
      wlc_step3_d: "Drag the volume slider up to 700% or open the Mix panel and pick a preset.",
      wlc_step4_t: "Enjoy",
      wlc_step4_d: "That's it. Boost it, remix it, skip what you hate and have fun with your sound.",
      wlc_links_h: "Enjoying it? This helps the most",
      wlc_rate_t: "Rate the extension",
      wlc_rate_d: "A good rating on the Chrome Web Store helps others find it.",
      wlc_gh_d: "The code is public. Leave a star on the repo!",
      wlc_bmac_d: "The extension is 100% free. If it helps you, you can buy me a coffee.",
      wlc_priv: "No analytics, no accounts, no servers. All audio is processed locally in your browser.",
      wlc_settings: "Settings",
      wlc_bug_h: "Bug or idea?",
      wlc_bug_d: "This extension is young and updated often. Found a bug or have an idea? Go to Settings, to the Report a bug or share an idea section. We read every message.",
    },
  };

  let LANG = "en";
  let ready = false;
  const queue = [];

  function resolveLang(stored) {
    LANG = stored && DICT[stored] ? stored : "en";
  }

  function t(key, vars) {
    let s = (DICT[LANG] && DICT[LANG][key]) || DICT.en[key] || key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }

  function apply(root) {
    const r = root || document;
    r.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    r.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.getAttribute("data-i18n-title"));
    });
    r.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.getAttribute("data-i18n-ph"));
    });
  }

  const store = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;

  function setLang(l) {
    return new Promise((res) => {
      if (!store) {
        resolveLang(l);
        apply();
        res();
        return;
      }
      store.set({ lang: l }, () => {
        resolveLang(l);
        apply();
        res();
      });
    });
  }

  function boot(storedLang) {
    resolveLang(storedLang);
    ready = true;
    apply();
    queue.forEach((cb) => cb());
    queue.length = 0;
  }

  if (store) {
    store.get("lang", (d) => boot(d.lang));
  } else {
    boot("en");
  }

  window.VBI18N = {
    t,
    apply,
    setLang,
    getLang: () => LANG,
    ready: (cb) => (ready ? cb() : queue.push(cb)),
  };
})();
