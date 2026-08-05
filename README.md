<p align="center">
  <img src="icons/icon128.png" width="96" alt="Turn It Up, Son!">
</p>

<h1 align="center">Turn It Up, Son!</h1>
<p align="center"><b>Volume Booster &amp; Mixer for Chrome, Edge and Brave</b></p>

<p align="center">
  Boost any tab up to 700 percent, fix one-sided audio, add bass, and run a full mixer with presets.<br>
  Works on YouTube, Spotify, SoundCloud and everything else. Free, private, no tracking.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/pgcnncfhomdjnliognejpjgllhbmleik"><img src="https://img.shields.io/badge/Chrome%20Web%20Store-Install-4a90ff?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Install from the Chrome Web Store"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-4.5.0-4a90ff" alt="Version 4.5.0">
  <img src="https://img.shields.io/badge/Manifest-V3-5c6bc0" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Chrome-109%2B-4a90ff" alt="Chrome 109 or newer">
  <img src="https://img.shields.io/badge/languages-44-2ea44f" alt="44 languages">
  <img src="https://img.shields.io/badge/tracking-none-2ea44f" alt="No tracking">
</p>

---

## Highlights

- **Up to 700 percent per tab.** Boost one tab while every other tab keeps playing at its normal level.
- **Honest at 100 percent.** With the boost at 100 and the effects off, the extension is transparent: measured on real material, the difference between what goes in and what comes out stays below -95 dB. Nothing is colored until you ask for it, or until the material itself reaches the ceiling and the limiter steps in.
- **No site access needed.** The extension reads only the tab audio, so it sits in the extensions menu under "No access needed". Site permission is asked for only if you turn on speed change or auto-skip, and it is handed back when you turn them off.
- **Fullscreen keeps working** while a tab is boosted, on every site.

## Features

### Volume and mixing

| Feature | What it does |
| --- | --- |
| Per-tab boost | Up to 700 percent, independently for every tab. The cap can be lowered to 300 or 500 in settings. |
| Mix panel | Ten built-in presets: Normal, Sped Up, Nightcore, Sped Up + Reverb, Slowed + Reverb, 8D Audio, Drill / Rap, Phonk, NY Drill and Chill Drill. |
| Your own mixes | Set the sliders your way, save the result and it shows up as your own tile next to the presets. |
| Full mixer | One switch reveals every slider at once: speed (0.5x to 1.6x), reverb, brightness, muffle, bass, vocal, power and spin. |
| Bass boost | Six flavors: Classic, Sub, Punch, Rumble, 808 and Warm, each with harmonic saturation so the low end is felt on small speakers too. |
| 8D audio | The sound orbits around your head. Best with headphones. |
| Mono fix | Rescues audio that plays in one ear only by mixing the channels back to the center. |
| Vocal and Power | Vocal lifts the midrange so the voice does not drown under the bass. Power is a compressor that adds radio style loudness. |

### Sound quality

| Feature | What it does |
| --- | --- |
| Lookahead limiter | Runs in an audio worklet with a 5 ms lookahead and a separate band for the bass, so a heavy kick does not duck the whole mix. |
| Limiter controls | Volume ceiling, bass ceiling and a cap on how much the limiter may take, plus a live reduction meter. |
| Voice lift | Optional phase shift around 150 Hz, the same trick radio stations use on the microphone chain. It boosts nothing and cuts nothing, but speech sits more evenly. Off by default. |

### Convenience

| Feature | What it does |
| --- | --- |
| Tab list | Every tab currently playing audio, each one switched on or off with a single click. |
| Auto-skip artists | Keep a list of artists you never want to hear. On YouTube, YouTube Music, Spotify and SoundCloud the extension jumps to the next track by itself. |
| YouTube auto-continue | Clicks the "Video paused. Continue watching?" prompt for you. |
| Appearance | Pick the extension color and the background glow. |
| 44 languages | The whole interface, including the store listing. |

## How it works

The extension captures the tab audio through `chrome.tabCapture` and runs it through the Web Audio API in an offscreen document. Boosting, mono fix, EQ, saturation, reverb and limiting all happen there, on your machine. Because it works on the captured audio rather than on the page, it does not need access to any website and it works on sites that block page scripts.

Speed change is the one exception. Slowing down or speeding up means touching the page player itself, so that single feature asks for permission for that one site and gives it back when you switch the effect off. Everything else, reverb and brightness and 8D included, goes through the audio engine and works everywhere.

While a boosted tab is captured, Chrome expands fullscreen inside the tab instead of the window. The extension notices this and switches the browser window to fullscreen itself, then puts it back when you leave. No extra permission is involved.

## Permissions

| Permission | Why |
| --- | --- |
| `tabCapture` | Takes the audio of the tab you boost. |
| `tabs` | Lists the tabs that are playing audio in the popup. |
| `storage` | Keeps your settings on your device. |
| `offscreen` | Runs the invisible audio engine. |
| `scripting` and selected sites | Optional. Requested only when you enable speed change, auto-skip or YouTube auto-continue, and revoked when you turn them off. |

## Privacy

No data is collected, stored remotely, transmitted or sold. No servers, no analytics, no accounts, no tracking. The audio never leaves your device, is never recorded and is never sent anywhere. Settings live in local browser storage and disappear when you uninstall.

## Install

**From the Chrome Web Store:** [Turn It Up, Son! Volume Booster &amp; Mixer](https://chromewebstore.google.com/detail/pgcnncfhomdjnliognejpjgllhbmleik)

**Developer version:**

1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on Developer mode.
3. Click "Load unpacked" and point it at this folder.

When you move from an older version, remove the extension first and load it again, so the browser does not keep permissions from before.

## Usage

1. Open a tab with sound and click the extension icon.
2. Drag the slider or hit the switch. The volume fades in smoothly.
3. A green ON badge on the icon means that tab is boosted.
4. "Mix and effects" opens the panel with presets and sliders.

Past a certain point the slider turns red. That is the range where the source itself may start to break up. The limiter softens it, but the cleanest sound is below that mark.

## Links

- [Website](https://letmecook.pl)
- [Changelog](https://letmecook.pl/changelog)
- [Buy me a coffee](https://buymeacoffee.com/romanzbudowy)
- Bugs and ideas: the extension settings have a "Got a bug or an idea?" form. It sends anonymously, no account needed.

## License

Author: romanzbudowy. All rights reserved. Copying and publication are prohibited, see [LICENSE.txt](LICENSE.txt).
