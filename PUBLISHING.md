# Publishing Brainrot: Tactical Aura Rush to Google Play

> This project was split out of the original "Aether Surge" app (which now lives in its own repo,
> `workinmanstrokes/aether-surge`). Brainrot has its own app ID and must be published as a **separate**
> Play Console app — never upload it to the Aether Surge listing.

## Identity
- App ID / package: `com.brainrot.aurarush` (`capacitor.config.json`, `android/app/build.gradle` `applicationId` + `namespace`)
- App name: `Brainrot: Tactical Aura Rush` (`capacitor.config.json`); launcher label `Brainrot: Aura Rush`
  (`android/app/src/main/res/values/strings.xml` → `app_name`; shortened so it fits under the home-screen icon)
- Main activity: `android/app/src/main/java/com/brainrot/aurarush/MainActivity.java`

## Current state
- Native Android project (Capacitor 8). GitHub Actions (`.github/workflows/build-apk.yml`) builds a **debug APK** on
  push to `master`/`main` and on manual `workflow_dispatch`; the artifact is `BrainrotAuraRush-debug`.
- The game (`www/index.html`) is a self-contained canvas game with no network calls. It uses `localStorage` only for
  the best aura, best zone, sound and vibration settings (key `brainrot-aura-rush-v1`) and the Essence balance + permanent upgrade levels (key `as_meta`). It has its own pause/mute
  buttons and pauses when the app is backgrounded. The wordmark font (`www/fonts/`, SIL OFL) is bundled.
- Native plugins in use (via `window.Capacitor.Plugins`, all optional so the page still runs in a browser):
  `@capacitor/app` (Android back button: pause / resume / back to title / exit), `@capacitor/haptics` (hits, laser,
  good gates, boss kill; toggle in the pause menu), `@capacitor/status-bar` (hidden for full-screen play),
  `@capacitor/splash-screen`.
- **Opt-in rewarded ads (AdMob + UMP), no analytics.** See step 3. No native `.so` libraries are bundled, so the
  build is fully 64-bit compatible.

## Before you publish — required steps

### 1. Store art (done, regenerate with `tools/art/`)
All Brainrot art is generated from code by `tools/art/` (see `tools/art/README.md`). It's original, with no
third-party characters:
- Play icon: `store-assets/icon-512.png` (512x512, 32-bit PNG)
- Feature graphic: `store-assets/feature-graphic-1024x500.png` (24-bit PNG, no alpha)
- Phone screenshots: `store-assets/phone-1080x1920/` (8 real gameplay captures, 1080x1920)
- Launcher icons (`mipmap-*`, adaptive foreground/background) and all `drawable*/splash.png` are replaced, and so are
  the `assets/icon*` / `assets/splash*` sources. To change them, edit `tools/art/scenes.mjs` and run
  `cd tools/art && npm install && node generate.mjs`.
- Re-shoot the screenshots after gameplay changes (`node capture-screenshots.mjs`).

### 2. Signing key
Create a **new upload keystore for this app** (don't reuse the Aether Surge key), e.g.:
```
keytool -genkeypair -v -keystore keystore/brainrot-upload.jks -alias brainrot -keyalg RSA -keysize 2048 -validity 10000
```
**Done (Oct 17, 2026):** upload key `brainrotaurarush.jks` (alias `brainrotaurarush`, CN=Diddlerrr) was generated
on Launchpad's build box; Michael keeps the backup zip. Upload cert SHA-256:
`AF:C0:8C:B5:15:82:AF:B0:9C:6E:AD:7F:51:A7:12:56:8E:66:57:F1:3F:03:3E:FB:E1:DC:AC:DF:46:3E:72:36`.

Then create `android/keystore.properties` (git-ignored) with `storeFile`, `storePassword`, `keyAlias`, `keyPassword`
— `android/app/build.gradle` picks it up automatically. **Back the keystore and passwords up somewhere safe**; if you
lose them you cannot update the app. Keystores and `keystore.properties` are git-ignored — keep it that way.

### 3. Ads (rewarded only, opt-in)
AdMob rewarded ads via `@capacitor-community/admob` with Google UMP consent (Privacy options button on the title screen
when required) and max ad content rating T. No interstitials, no banners. Android only; web/iOS are a no-op
(`?adsim=1` simulates ads in a browser for testing). Placements, all optional buttons with caps, plus 20 ads/day overall:
- **Revive** after a wipe-out: once per run (+12 or more troopers, clears nearby enemies, 1 shield).
- **Double Essence** on the game-over screen: once per run end.
- **Bonus aura** on a zone clear: +50% of the zone's aura (min 250), once per zone.
- **Daily chest reroll** on the title screen: once per day, keeps the better roll (the chest itself is free).

`www/js/config.js` ships Google's TEST ids. `node scripts/configure.mjs --release` with the `ADMOB_APP_ID` +
`ADMOB_REWARDED_ID` env vars/secrets writes the real rewarded unit into config.js and the real App ID into the
git-ignored `android/admob.properties`; any non-release run puts the TEST ids back. CI fails if a debug APK carries real
ids. **A release AAB built without those secrets carries TEST ids and must not ship.**

### 4. Host the privacy policy
`privacy-policy.html` is complete (Diddlerrr, mscofield1588@gmail.com, ages 13+, AdMob rewarded ads + UMP). It is hosted at
https://workinmanstrokes.github.io/test-builds/privacy/brainrot-aura-rush.html: use that URL in Play Console.
(The game has Privacy policy link is on the title screen.)

### 5. Build the release
```
ADMOB_APP_ID=... ADMOB_REWARDED_ID=... node scripts/configure.mjs --release
npx cap sync android
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`.

### 6. Google Play Console checklist
1. Create a **new** app: Brainrot: Tactical Aura Rush, package `com.brainrot.aurarush`.
2. Store listing: descriptions, screenshots, feature graphic, 512x512 icon.
3. Content rating questionnaire.
4. Target audience and content — must match the privacy policy's children's statement.
5. Data safety form: AdMob collects/shares Device or other IDs (advertising ID), approximate location (IP), app interactions and diagnostics for advertising, analytics and fraud prevention; encrypted in transit; Contains ads: Yes.
6. Privacy policy URL.
7. Ads declaration: No.
8. Upload `app-release.aab` (start with Internal testing), then submit for review.

## Project layout
- `www/index.html` — the game (source of truth; `npx cap sync android` copies it into the Android project)
- `android/` — native Capacitor Android project
- `assets/`: icon/splash sources (generated by `tools/art/`)
- `store-assets/`: Play Store icon, feature graphic and phone screenshots
- `tools/art/`: code that generates all of the art above
- `capacitor.config.json` — app ID / name / web dir
