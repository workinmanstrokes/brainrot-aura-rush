// Brainrot: Tactical Aura Rush runtime config. scripts/configure.mjs rewrites the lines marked @cfg.
// Defaults are Google's official AdMob TEST units. Real units are written ONLY by `configure.mjs --release`
// from the ADMOB_REWARDED_ID secret, so debug/test APKs can never generate invalid traffic on the real account.
// The AdMob *App ID* is native: android/admob.properties (written by configure.mjs --release), TEST app id otherwise.
window.BR_CONFIG = {
  ADS: {
    enabled: true,
    testing: true,                                         // @cfg testing
    rewardedId: 'ca-app-pub-3940256099942544/5224354917',  // @cfg rewarded (TEST)
    maxAdContentRating: 'Teen',                            // matches the AdMob app's max ad content rating (T)
    dailyCap: 20,                                          // max rewarded ads per day, all placements together
    squadDailyCap: 3,                                      // 'double squad' at the boss gate: max per day (and once per zone)
  },
  PRIVACY_URL: 'https://workinmanstrokes.github.io/test-builds/privacy/brainrot-aura-rush.html',
};
