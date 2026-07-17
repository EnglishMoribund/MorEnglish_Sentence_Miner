# Android APK (offline web shell)

Packages the same frontend as the [web version](https://englishmoribund.github.io/MorEnglish_Sentence_Miner/)
into a sideloadable APK. Desktop-only features (plugins/AI, connector API,
custom tags file, native save dialogs) are unavailable — diagram style and
session state use `localStorage` like the browser build.

## Prerequisites

- JDK 17+
- Android SDK (`ANDROID_HOME`) with platform 35 and build-tools
- Network once, so Gradle can fetch the Android Gradle Plugin

```sh
# Arch example — command-line tools only
export ANDROID_HOME="$HOME/Android/Sdk"
# …install cmdline-tools, then:
yes | sdkmanager --licenses
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
```

## Build

```sh
cd packaging/android
./gradlew assembleRelease
# → app/build/outputs/apk/release/app-release.apk
```

Copy/rename for the release page:

```sh
cp app/build/outputs/apk/release/app-release.apk \
  ../../morenglish-sentence-miner_0.3.1_android.apk
```

## Signing

`keystore.jks` (password defaults: `sentence-miner`) is the FOSS sideload
key. Keep it so updates install over previous APKs. Override with:

```sh
export ANDROID_KEYSTORE_PASSWORD=…
export ANDROID_KEY_ALIAS=…
export ANDROID_KEY_PASSWORD=…
```

## Notes

- Min SDK 24 (Android 7)
- ES modules are served via `WebViewAssetLoader` (not `file://`)
- External links (Wiktionary, etc.) open in the system browser
