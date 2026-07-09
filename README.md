# Turn It Up, Son! Volume Booster & Mixer

Per-tab volume booster for Chrome, Edge and Brave. Boost any tab up to 700%, including Spotify and YouTube, with bass boost, 8D audio and a full audio mixer. Free, private, no tracking.

<p align="center">
  <a href="https://chromewebstore.google.com/detail/pgcnncfhomdjnliognejpjgllhbmleik"><img src="https://img.shields.io/badge/Chrome%20Web%20Store-Install-4a90ff?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Install from the Chrome Web Store"></a>
</p>

**Language: English | [Polski](#polski)**

Author: romanzbudowy. All rights reserved (see LICENSE.txt).

---

## What it does

- Volume up to 700%, per tab. Boost one tab while the rest play at normal level.
- Mix panel with presets: Sped Up, Nightcore, Sped Up + Reverb, Slowed + Reverb, Drill / Rap, NY Drill, Chill Drill, Phonk and 8D Audio (sound orbits around your head, best with headphones). Plus sliders for speed (0.5x-1.6x), reverb, brightness, muffle, bass, vocal, power and spin. A "Full mixer" switch reveals every slider at once.
- Fixes audio that plays in one ear only (mixes channels to center).
- Bass boost in three flavors: Classic, Sub and Punch, with harmonic saturation so the bass is felt even on small speakers.
- Vocal (midrange lift so the voice does not get buried under the bass) and Power (a compressor that adds radio-style loudness). Muffle gives that "music from the next room" vibe.
- Settings: maximum volume cap (300 / 500 / 700%) and a default bass flavor.
- Automatic output limiter: on heavy boost the sound is pushed down instead of crackling.
- A list of every tab that is playing audio, each one toggled on and off with one click.
- Optional YouTube auto-continue: clicks "Video paused. Continue watching?" for you.

## How it works

The extension captures only the tab audio (chrome.tabCapture) and runs it through the Web Audio API, where the boosting, mono fix, EQ and reverb happen. This processing lives in an "engine" that, depending on your settings, is either an invisible background document or a normal pinned tab whose closing turns everything off at once.

Speed change (Sped Up, Nightcore, Slowed) works differently: it speeds up the page player itself, so it needs permission for that one site. The permission is revoked when the effect is turned off. Reverb, brightness and 8D go through the engine, so they work everywhere, including Spotify.

## Permissions

- tabCapture: captures the tab audio.
- tabs: lists the tabs playing audio in the popup.
- storage: saves your settings locally.
- offscreen: runs the invisible audio engine in on/off mode.
- scripting + selected sites: optional, only when you enable speed change or YouTube auto-continue there. Revoked when turned off.

By default the extension sits in the extensions menu under "No access needed".

## Privacy

No data is collected, stored remotely, transmitted or sold. No servers, no analytics, no accounts, no tracking. Audio is processed entirely on your device and never recorded or sent anywhere. Settings stay in local browser storage and are removed when you uninstall.

## Install (developer version)

1. Open chrome://extensions (Edge: edge://extensions).
2. Turn on Developer mode.
3. Click "Load unpacked" and point it at this folder.

When updating from an older version it is best to remove the extension and load it again, so the browser does not keep old permissions.

## Usage

1. Open a tab with audio and click the extension icon.
2. Move the slider or hit the switch. Volume fades in smoothly.
3. A green ON badge on the icon means the tab is boosted.
4. The "Mix and effects" button opens the panel with presets and sliders.

Above a certain level the volume slider turns red: that is the zone where the material may clip. The limiter softens crackles, but the cleanest sound is below that zone.

---

<a name="polski"></a>
## Polski

Podgłaśniacz dźwięku dla dowolnej karty w Chrome, Edge i Brave. Działa na YouTube, Spotify i wszystkich innych stronach. Domyślnie nie ma dostępu do treści stron.

**Język: [English](#turn-it-up-son-volume-booster--mixer) | Polski**

Autor: romanzbudowy. Wszystkie prawa zastrzeżone (szczegóły w LICENSE.txt).

### Co potrafi

- Głośność do 700%, osobno dla każdej karty. Podbijasz jedną, reszta gra normalnie.
- Panel Miks: presety Sped Up, Nightcore, Sped Up + Reverb, Slowed + Reverb, Drill / Rap, NY Drill, Chill Drill, Phonk i 8D Audio (dźwięk krąży wokół głowy, najlepiej w słuchawkach) oraz suwaki prędkości (0.5x-1.6x), pogłosu, jasności, tłumika, basu, wokalu, mocy i krążenia. Przełącznik "Pełny mikser" odsłania wszystkie suwaki naraz.
- Naprawa dźwięku, który gra tylko w jednym uchu (miks kanałów do środka).
- Podbicie basów w trzech charakterach: Klasyk, Sub i Punch, z saturacją harmonicznych, dzięki której bas czuć też na małych głośnikach.
- Wokal (podbicie środka pasma, głos nie ginie pod basem) i Moc (kompresor dodający radiowej głośności). Tłumik robi klimat muzyki zza ściany.
- W ustawieniach: limit maksymalnej głośności (300/500/700%) i domyślny charakter basu.
- Automatyczny limiter na wyjściu: przy mocnym podbiciu dźwięk jest dociskany zamiast trzeszczeć.
- Lista wszystkich grających kart w okienku, każdą można włączyć i wyłączyć jednym kliknięciem.
- Opcjonalna auto-kontynuacja YouTube: klika "Czy nadal oglądasz?" za użytkownika.

### Jak to działa

Wtyczka bierze sam dźwięk karty (chrome.tabCapture) i puszcza go przez Web Audio, gdzie dzieje się wzmocnienie, naprawa mono, korekcja i pogłos. Obróbka mieszka w "silniku", który zależnie od ustawień jest niewidocznym dokumentem w tle albo zwykłą, przypiętą kartą, której zamknięcie wyłącza wszystko naraz.

Zmiana prędkości (Sped Up, Nightcore, Slowed) działa inaczej: przyspiesza sam odtwarzacz strony, więc wymaga zgody na dostęp do tej konkretnej strony. Zgoda jest cofana, gdy efekt się wyłącza. Pogłos, jasność i 8D idą przez silnik, więc działają wszędzie, także na Spotify.

### Uprawnienia

- tabCapture: branie dźwięku karty.
- tabs: lista kart z dźwiękiem w okienku.
- storage: zapamiętywanie ustawień.
- offscreen: niewidoczny silnik w trybie on/off.
- scripting + wybrane strony: opcjonalne, tylko gdy włączysz tam zmianę prędkości albo auto-kontynuację YouTube. Cofane przy wyłączeniu.

Domyślnie wtyczka siedzi w menu rozszerzeń w sekcji "Nie potrzebują dostępu".

### Prywatność

Wtyczka nie zbiera, nie przechowuje zdalnie, nie przesyla i nie sprzedaje żadnych danych. Zero serwerow, zero analityki, zero kont, zero śledzenia. Dźwięk jest przetwarzany w całości na Twoim urządzeniu i nigdy nie jest nagrywany ani wysyłany. Ustawienia są trzymane lokalnie i znikają po odinstalowaniu.

### Instalacja (wersja deweloperska)

1. Wejdź na chrome://extensions (Edge: edge://extensions).
2. Włącz Tryb dewelopera.
3. Kliknij "Załaduj rozpakowane" i wskaż ten folder.

### Używanie

1. Wejdź na kartę z dźwiękiem i kliknij ikonę wtyczki.
2. Rusz suwakiem albo kliknij włącznik. Głośność wchodzi płynnie.
3. Zielona plakietka ON na ikonie znaczy, że karta jest podgłośniona.
4. Przycisk "Miks i efekty" otwiera panel z presetami i suwakami.
