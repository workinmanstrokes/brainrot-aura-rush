# Web portals (Poki / CrazyGames)

`npm run portal:build` writes `dist/portal-poki/` and `dist/portal-crazygames/` and zips them to
`/workspace/out/brainrot-aura-rush-{poki,crazygames}.zip` (index.html at the zip root). Nothing is uploaded.

- `www/js/portal.js` loads the portal SDK only in a portal build (`window.PORTAL_BUILD`), with `?portal=poki|crazygames`
  for testing, or on the portal's domain. Everywhere else it is a no-op.
- Events: `loadingFinished` after the sprite atlas is built; `gameplayStart` on run start / resume / revive / next zone /
  boss fight; `gameplayStop` on pause, gate offer, zone clear, game over and quit.
- Ads: the same opt-in rewarded buttons as Android (revive, double Essence, zone bonus aura, chest reroll, double squad)
  go through the portal's rewarded break, with the same daily caps. `commercialBreak` is called only at the natural
  break when the player taps NEXT ZONE / NEW RUN (the portal decides whether an ad plays). Never mid-play.
- No AdMob in portal builds (AdMob only runs inside the Android app), no external links (privacy link hidden).
- Keyboard: ←/→ or A/D steer, Enter/Space start / continue / fight, Esc/P pause. Mouse drag and touch also steer.
- Poki requires web exclusivity: pick Poki **or** CrazyGames per game before submitting.
