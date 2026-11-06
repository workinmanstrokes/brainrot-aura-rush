# Brainrot: Tactical Aura Rush

Portrait canvas runner for Android (3rd-person camera behind your squad), built with Capacitor 8. Steer your squad through gates, blast
the swarm, evolve your hero and take down zone bosses (Grump King, Sweeping Old Man, Espressorilla, Flamenco Rotorina, Squalo Supremo, Yeti Scudiero — cycles each zone). This repo started as the original Aether
Surge app and was split at commit `9fd7c02`; Aether Surge now lives in
[workinmanstrokes/aether-surge](https://github.com/workinmanstrokes/aether-surge). The two are
separate apps with separate Play listings.

- App ID: `com.brainrot.aurarush`
- App name: `Brainrot: Tactical Aura Rush` (launcher label `Brainrot: Aura Rush`)

## Stack

- Game: self-contained HTML5 canvas game in `www/index.html` with helpers in `www/js/`
  (`sprites.js`, `aurabox.js`, `ads.js`, `portal.js`, `config.js`). No network calls in the game itself;
  progress is saved in `localStorage`.
- Android: Capacitor 8 (`android/`) with the App, Haptics, Status Bar and Splash Screen plugins.
- Ads: opt-in rewarded ads only, via `@capacitor-community/admob` with Google UMP consent. Debug builds use
  Google test ad IDs.
- Web portals: Poki and CrazyGames builds (see `PORTALS.md`).

## Commands

```bash
npm ci
npm test                  # unit tests (tests/unit.js)
npm run smoke             # smoke test (tests/smoke.mjs)
npm run configure         # write www/js/config.js for a debug build (test ads)
npx cap sync android      # copy www/ into the Android project
npm run portal:build      # Poki + CrazyGames zips in /workspace/out
```

Debug APK locally (JDK 21 + Android SDK):

```bash
cd android && ./gradlew assembleDebug
```

## CI

`.github/workflows/build-apk.yml` runs unit tests and builds a debug APK (test ads only) on pushes to
`master`/`main` and on pull requests. A manual `workflow_dispatch` run also builds a signed release
`.aab` from repository secrets.

## Docs

- `PUBLISHING.md`: Google Play checklist, identity, ads and consent setup
- `PORTALS.md`: web portal builds and SDK events
- `tools/art/README.md`: how the store and in-game art is generated
- `privacy-policy.html`: privacy policy
