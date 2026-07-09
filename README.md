# Turn It Up, Son! Volume Booster & Mixer

Podgłaśniacz dźwięku dla dowolnej karty w Chrome, Edge i Brave.
Działa na YouTube, Spotify i wszystkich innych stronach. Domyślnie nie ma
dostępu do treści stron.

Autor: romanzbudowy. Wszystkie prawa zastrzeżone (szczegóły w LICENSE.txt).

## Co potrafi

- Głośność do 700%, osobno dla każdej karty. Podbijasz jedną, reszta gra
  normalnie.
- Panel Miks: presety Sped Up, Nightcore, Sped Up + Reverb, Slowed + Reverb,
  Drill / Rap, NY Drill, Chill Drill, Phonk i 8D Audio (dźwięk krąży wokół
  głowy, najlepiej w słuchawkach) oraz suwaki prędkości (0.5x-1.6x), pogłosu,
  jasności, tłumika, basu, wokalu, mocy i krążenia. Przełącznik "Pełny mikser"
  odsłania wszystkie suwaki naraz.
- Naprawa dźwięku, który gra tylko w jednym uchu (miks kanałów do środka).
- Podbicie basów w trzech charakterach: Klasyk, Sub i Punch, z saturacją
  harmonicznych, dzięki której bas czuć też na małych głośnikach.
- Wokal (podbicie środka pasma, głos nie ginie pod basem) i Moc (kompresor
  dodający radiowej głośności). Tłumik robi klimat muzyki zza ściany.
- W ustawieniach: limit maksymalnej głośności (300/500/700%) i domyślny
  charakter basu.
- Automatyczny limiter na wyjściu: przy mocnym podbiciu dźwięk jest dociskany
  zamiast trzeszczeć.
- Lista wszystkich grających kart w okienku, każdą można włączyć i wyłączyć
  jednym kliknięciem.
- Opcjonalna auto-kontynuacja YouTube: klika "Czy nadal oglądasz?" za
  użytkownika.

## Jak to działa

Wtyczka bierze sam dźwięk karty (chrome.tabCapture) i puszcza go przez Web
Audio, gdzie dzieje się wzmocnienie, naprawa mono, korekcja i pogłos. Obróbka
mieszka w "silniku", który zależnie od ustawień jest niewidocznym dokumentem
w tle albo zwykłą, przypiętą kartą, której zamknięcie wyłącza wszystko naraz.

Zmiana prędkości (Sped Up, Nightcore, Slowed) działa inaczej: przyspiesza sam
odtwarzacz strony, więc wymaga zgody na dostęp do tej konkretnej strony.
Zgoda jest cofana, gdy efekt się wyłącza. Pogłos, jasność i 8D idą przez
silnik, więc działają wszędzie, także na Spotify.

## Uprawnienia

- tabCapture: branie dźwięku karty.
- tabs: lista kart z dźwiękiem w okienku.
- storage: zapamiętywanie ustawień.
- offscreen: niewidoczny silnik w trybie on/off.
- scripting + wybrane strony: opcjonalne, tylko gdy włączysz tam zmianę
  prędkości albo auto-kontynuację YouTube. Cofane przy wyłączeniu.

Domyślnie wtyczka siedzi w menu rozszerzeń w sekcji "Nie potrzebują dostępu".

## Instalacja (wersja deweloperska)

1. Wejdź na chrome://extensions (Edge: edge://extensions).
2. Włącz Tryb dewelopera.
3. Kliknij "Załaduj rozpakowane" i wskaż folder volume-booster.

Przy aktualizacji ze starszej wersji najlepiej usunąć wtyczkę i załadować ją
od nowa, żeby przeglądarka nie trzymała starych uprawnień.

## Używanie

1. Wejdź na kartę z dźwiękiem i kliknij ikonę wtyczki.
2. Rusz suwakiem albo kliknij włącznik. Głośność wchodzi płynnie.
3. Zielona plakietka ON na ikonie znaczy, że karta jest podgłośniona.
4. Przycisk "Miks i efekty" otwiera panel z presetami i suwakami.

Na suwaku głośności od pewnego poziomu robi się czerwono: to strefa, w której
materiał może przesterowywać. Limiter łagodzi trzaski, ale najczyściej gra
się poniżej tej strefy.

## Czego się spodziewać

- Pasek "ta karta jest udostępniana" to wymóg przeglądarki przy braniu dźwięku
  karty. Dzięki tej metodzie działa też Spotify. Żadna wtyczka tego typu nie
  może go ukryć.
- Po przeładowaniu strony wtyczka sama wznawia podgłośnienie. Gdyby
  przeglądarka na to nie pozwoliła, ustawienia wracają przy najbliższym
  otwarciu okienka.
- Nie działa tam, gdzie przeglądarka nie pozwala przechwytywać dźwięku
  (strony chrome://, sklep Chrome).
- Zmiana prędkości nie działa na Spotify (jego odtwarzacz nie używa zwykłego
  elementu audio). Pogłos, jasność i 8D działają tam normalnie.
