# Packaging

Prebuilt packages for each release are on the
[releases page](https://github.com/EnglishMoribund/MorEnglish_Sentence_Miner/releases):

| Distro | Install |
|---|---|
| Debian / Ubuntu | `sudo apt install ./morenglish-sentence-miner_<ver>_amd64.deb` |
| Fedora / openSUSE | `sudo rpm -i morenglish-sentence-miner-<ver>-1.x86_64.rpm` |
| Arch | `sudo pacman -U morenglish-sentence-miner-bin-<ver>-1-x86_64.pkg.tar.zst` |

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
