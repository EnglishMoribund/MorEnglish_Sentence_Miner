# Packaging

Prebuilt packages for each release are on the
[releases page](https://github.com/EnglishMoribund/MorEnglish_Sentence_Miner/releases):

| Platform | Install |
|---|---|
| Debian / Ubuntu | `sudo apt install ./morenglish-sentence-miner_<ver>_amd64.deb` |
| Fedora / openSUSE | `sudo rpm -i morenglish-sentence-miner-<ver>-1.x86_64.rpm` |
| Arch | `sudo pacman -U morenglish-sentence-miner-bin-<ver>-1-x86_64.pkg.tar.zst` |
| Android | sideload `morenglish-sentence-miner_<ver>_android.apk` |

## Building them yourself

deb + rpm come from the Tauri bundler:

```sh
npm install
npm run build -- --bundles deb rpm   # → src-tauri/target/release/bundle/{deb,rpm}/
```

The Arch package repackages the released .deb:

```sh
cd packaging/arch && makepkg -f
```

Android APK (offline web shell — see [android/README.md](android/README.md)):

```sh
cd packaging/android
# needs JDK 17+, ANDROID_HOME, and a release keystore (see android/README.md)
./gradlew assembleRelease
```
