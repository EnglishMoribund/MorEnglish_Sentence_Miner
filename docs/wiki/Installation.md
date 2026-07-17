# Installation

No install needed to try it: the
[web version](https://englishmoribund.github.io/MorEnglish_Sentence_Miner/)
runs in your browser (plugins/AI, the library, and custom tags are
desktop-only).

Prebuilt packages ship on the
[releases page](https://github.com/EnglishMoribund/MorEnglish_Sentence_Miner/releases).

| Platform | Install |
|---|---|
| Debian / Ubuntu | `sudo apt install ./morenglish-sentence-miner_<ver>_amd64.deb` |
| Fedora / openSUSE | `sudo rpm -i morenglish-sentence-miner-<ver>-1.x86_64.rpm` |
| Arch | `sudo pacman -U morenglish-sentence-miner-bin-<ver>-1-x86_64.pkg.tar.zst` |
| Windows | run `morenglish-sentence-miner_<ver>_x64-setup.exe` |
| Android | install `morenglish-sentence-miner_<ver>_android.apk` (sideload; allow unknown apps) |

`SHA256SUMS.txt` on the release page covers every artifact. Arch users can also
build from the repo: `cd packaging/arch && makepkg -si`.

### Android notes

The APK is an offline shell around the same web UI (mining, tagging, diagrams,
exports that work in the browser). Desktop-only features — plugins/AI, the
connector API, custom tags file, native save dialogs — are not available.
Enable “Install unknown apps” for your browser/file manager, then open the APK.
Rebuild from source: see `packaging/android/README.md`.

## From source

Needs Rust (stable), Node.js, and the
[Tauri v2 Linux prerequisites](https://v2.tauri.app/start/prerequisites/)
(webkit2gtk-4.1, gtk3).

```sh
git clone https://github.com/EnglishMoribund/MorEnglish_Sentence_Miner.git
cd MorEnglish_Sentence_Miner
npm install
npm run dev          # development
npm run build        # release bundles → src-tauri/target/release/bundle/
```

## First run

The app creates its config dir (Linux: `~/.config/com.sentence.miner/`)
containing:

| File | Purpose |
|---|---|
| `registry.toml` | your custom grammar tags |
| `plugins.toml` | commands for the plugin manager |
| `library.json` | saved sentences |
| `api-token` | shared secret for the [[Connector API]] |
