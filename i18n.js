// Turn It Up, Son! Volume Booster & Mixer - (c) 2026 romanzbudowy.
// Wszelkie prawa zastrzezone. Kopiowanie i publikacja zabronione (LICENSE.txt).

(function () {
  const THEMES = {
    neon: ["#6e56ff", "#3ddcff"],
    crimson: ["#ff453a", "#ff2d55"],
    ocean: ["#2f7cf6", "#2fd8f6"],
    emerald: ["#22c55e", "#a3e635"],
    gold: ["#ff9f0a", "#ffd60a"],
    rose: ["#ff2d78", "#b56bff"],
  };
  function applyTheme(name) {
    const t = THEMES[name] || THEMES.neon;
    const r = document.documentElement.style;
    r.setProperty("--accent", t[0]);
    r.setProperty("--accent-2", t[1]);
  }
  const store = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  if (store) {
    store.get("vbTheme", (d) => {
      if (d.vbTheme && d.vbTheme !== "neon") applyTheme(d.vbTheme);
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === "local" && ch.vbTheme) applyTheme(ch.vbTheme.newValue);
    });
  }
  window.VBTHEME = { THEMES, applyTheme };
})();

(function () {
  const DICT = {
    pl: {
      power_on: "Wł.",
      power_off: "Wył.",
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
      eff_yt: "Auto-kontynuuj na YouTube",
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
      sec_behavior: "Działanie",
      sec_about: "O wtyczce",
      disable_q: "Jak chcesz wyłączać wtyczkę?",
      opt_toggle_t: "Przełącznikiem on/off (nic się nie otwiera)",
      opt_toggle_d: "Włączasz i wyłączasz suwakiem w okienku wtyczki. Nic dodatkowego nie wyskakuje. Polecane, jak nie chcesz mieć extra karty.",
      opt_tab_t: "Zamknięciem karty silnika",
      opt_tab_d: "Przy pierwszym podgłośnieniu otwiera się mała, przypięta karta po lewej (sam favicon). Trzyma cały dźwięk. Zamykasz ją i wtyczka od razu przestaje działać na wszystkich kartach.",
      lang_h: "Język / Language",
      maxvol_h: "Maksymalna głośność",
      maxvol_d: "Górna granica suwaka głośności w okienku. Ustaw niżej, jeśli chcesz chronić słuch albo głośniki przed przypadkowym 700%.",
      theme_h: "Kolor wtyczki",
      theme_d: "Wybierz akcent kolorystyczny całej wtyczki: okienka, panelu Miks i tej strony. Zmiana działa od razu.",
      theme_neon: "Neon",
      theme_crimson: "Czerwień",
      theme_ocean: "Ocean",
      theme_emerald: "Zieleń",
      theme_gold: "Złoto",
      theme_rose: "Róż",
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
      access_grant_yt: "Nadaj dostęp do YouTube",
      access_grant_yt_d: "Nadaj dostęp do YouTube: wtyczka dostaje dostęp tylko do youtube.com, żeby Mix i auto-kontynuacja działały tam bez pytania za każdym razem. Do żadnej innej strony to nie sięga.",
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
      tab_general: "Ogólne",
      tab_privacy: "Prywatność i dostęp",
      bug_sec: "Zgłoś błąd",
      bug_h: "Znalazłeś błąd?",
      bug_d: "Napisz, co nie działa i na jakiej stronie. Wiadomość wysyła się anonimowo, bez konta i logowania.",
      bug_ph: "Opisz problem...",
      bug_send: "Wyślij",
      bug_sent: "Wysłane, dzięki!",
      changelog_h: "Historia zmian",
      cl_421: "Naprawiona auto-kontynuacja YouTube (działa z nowym wyglądem dialogów i od razu po włączeniu, bez odświeżania strony). Naprawione zacinanie i nakładanie się dźwięku przy bardzo szybkim klikaniu presetów w panelu Miks. Strona powitalna po instalacji (szybki start, wybór języka), domyślny język angielski, ciemny wygląd rozwijanych list, anonimowe zgłaszanie błędów w ustawieniach i strona z pytaniem o powód po odinstalowaniu.",
      cl_420: "Własne mixy (zakładka Twoje mixy), wybór koloru wtyczki i własne nazwy presetów w ustawieniach, 3 nowe charaktery basu (Grzmot, 808, Ciepły), głośniejsze wysokie poziomy i pewniejsze Przywróć poprzednie (łapie też Mix).",
      wlc_hi: "Dzięki za instalację!",
      wlc_start_h: "Szybki start",
      wlc_step1_t: "Przypnij wtyczkę do paska",
      wlc_step1_d: "Kliknij ikonę puzzla obok paska adresu i pinezkę przy Turn It Up, Son!",
      wlc_step2_t: "Włącz coś z dźwiękiem",
      wlc_step2_d: "YouTube, Spotify, film, cokolwiek gra w karcie.",
      wlc_step3_t: "Kliknij ikonę wtyczki",
      wlc_step3_d: "Przesuń suwak głośności do 700% albo otwórz panel Miks i wybierz preset.",
      wlc_links_h: "Podoba się? To pomaga najbardziej",
      wlc_rate_t: "Oceń wtyczkę",
      wlc_rate_d: "Dobra ocena w Chrome Web Store pomaga innym ją znaleźć.",
      wlc_gh_d: "Kod jest publiczny. Zostaw gwiazdkę na repozytorium!",
      wlc_bmac_d: "Wtyczka jest w 100% darmowa. Jeśli się przyda, możesz postawić kawę.",
      wlc_priv: "Zero analityki, zero kont, zero serwerów. Cały dźwięk przetwarzany lokalnie w przeglądarce.",
      wlc_settings: "Ustawienia",
    },
    en: {
      power_on: "On",
      power_off: "Off",
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
      eff_yt: "Auto-continue on YouTube",
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
      sec_behavior: "Behavior",
      sec_about: "About",
      disable_q: "How do you want to turn the extension off?",
      opt_toggle_t: "With the on/off switch (nothing opens)",
      opt_toggle_d: "You turn it on and off with the slider in the popup. Nothing extra pops up. Recommended if you don't want an extra tab.",
      opt_tab_t: "By closing the engine tab",
      opt_tab_d: "On the first boost a small pinned tab opens on the left (just a favicon). It holds all the audio. Close it and the extension stops on every tab at once.",
      lang_h: "Language / Język",
      maxvol_h: "Maximum volume",
      maxvol_d: "The upper limit of the volume slider in the popup. Set it lower to protect your ears or speakers from an accidental 700%.",
      theme_h: "Extension color",
      theme_d: "Pick the accent color for the whole extension: the popup, the Mix panel and this page. Applies instantly.",
      theme_neon: "Neon",
      theme_crimson: "Crimson",
      theme_ocean: "Ocean",
      theme_emerald: "Emerald",
      theme_gold: "Gold",
      theme_rose: "Rose",
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
      access_grant_yt: "Grant access to YouTube",
      access_grant_yt_d: "Grant access to YouTube: the extension gets access to youtube.com only, so Mix and auto-continue work there without asking every time. It does not reach any other site.",
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
      tab_general: "General",
      tab_privacy: "Privacy & access",
      bug_sec: "Report a bug",
      bug_h: "Found a bug?",
      bug_d: "Tell us what broke and on which site. The message is sent anonymously, no account or sign-in needed.",
      bug_ph: "Describe the problem...",
      bug_send: "Send",
      bug_sent: "Sent, thanks!",
      changelog_h: "Changelog",
      cl_421: "Fixed YouTube auto-continue (works with the new dialog design and right after enabling, no page refresh needed). Fixed audio stutter and overlap when clicking Mix presets very fast. Welcome page after install (quick start, language picker), English as the default language, dark styling for dropdown lists, anonymous bug reports in the settings and a page asking why after uninstall.",
      cl_420: "Custom mixes (the Your mixes tab), extension color themes and custom preset names in the settings, 3 new bass flavors (Rumble, 808, Warm), louder high levels and a more reliable Restore previous (it now covers Mix too).",
      wlc_hi: "Thanks for installing!",
      wlc_start_h: "Quick start",
      wlc_step1_t: "Pin the extension to your toolbar",
      wlc_step1_d: "Click the puzzle icon next to the address bar, then the pin next to Turn It Up, Son!",
      wlc_step2_t: "Play something with sound",
      wlc_step2_d: "YouTube, Spotify, a movie, anything playing in a tab.",
      wlc_step3_t: "Click the extension icon",
      wlc_step3_d: "Drag the volume slider up to 700% or open the Mix panel and pick a preset.",
      wlc_links_h: "Enjoying it? This helps the most",
      wlc_rate_t: "Rate the extension",
      wlc_rate_d: "A good rating on the Chrome Web Store helps others find it.",
      wlc_gh_d: "The code is public. Leave a star on the repo!",
      wlc_bmac_d: "The extension is 100% free. If it helps you, you can buy me a coffee.",
      wlc_priv: "No analytics, no accounts, no servers. All audio is processed locally in your browser.",
      wlc_settings: "Settings",
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
