// Opt-in rewarded ads (AdMob via @capacitor-community/admob) with Google UMP consent. Rewarded only, never interstitials.
// Android app (AdMob) and web-portal builds (Poki/CrazyGames rewarded via js/portal.js). Elsewhere on web/iOS every call
// is a no-op and no ad buttons are shown.
// For browser testing, add ?adsim=1 to the URL to get a 2-second "TEST AD" overlay instead of a real ad.
(function (root) {
  'use strict';
  // ----- Pure logic (unit-tested in tests/unit.js) -----
  const dayKey = (now = Date.now()) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  // ledger lives in the save: { day, count, chest } - total rewarded ads today and chest rerolls today.
  function gate(led, placement, cfg, now = Date.now()) {
    const day = dayKey(now);
    if (led.day !== day) { led.day = day; led.count = 0; led.chest = 0; led.squad = 0; }
    if (led.count >= (cfg.dailyCap || 20)) return { ok: false, why: 'Daily ad limit reached' };
    if (placement === 'chest' && led.chest >= 1) return { ok: false, why: 'Chest already rerolled today' };
    if (placement === 'squad' && (led.squad || 0) >= (cfg.squadDailyCap || 3)) return { ok: false, why: 'Double squad used up today' };
    return { ok: true };
  }
  function record(led, placement) { led.count = (led.count || 0) + 1; if (placement === 'chest') led.chest = (led.chest || 0) + 1; if (placement === 'squad') led.squad = (led.squad || 0) + 1; }
  const core = { dayKey, gate, record };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ----- Runtime (browser / Capacitor) -----
  const CFG = (root.BR_CONFIG && root.BR_CONFIG.ADS) || { enabled: false };
  const cap = root.Capacitor;
  const android = !!(cap && cap.isNativePlatform && cap.isNativePlatform() && cap.getPlatform && cap.getPlatform() === 'android');
  const AdMob = android && cap.Plugins ? cap.Plugins.AdMob : null;
  const simulate = !android && /[?&]adsim=1\b/.test(root.location ? root.location.search : '');
  let ready = false, canRequest = false, privacyRequired = false, loaded = false, busy = false;

  async function init() {
    if (!CFG.enabled || !AdMob) return;
    try {
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
      applyConsent(info);
    } catch (e) { console.warn('consent', e); canRequest = false; }
    try {
      await AdMob.initialize({ initializeForTesting: CFG.testing, maxAdContentRating: CFG.maxAdContentRating || 'Teen' });
      ready = true; preload();
    } catch (e) { console.warn('ads init failed', e); }
    if (root.onAdsReady) root.onAdsReady();
  }
  function applyConsent(info) {
    canRequest = !!info && info.canRequestAds !== false;
    privacyRequired = !!info && info.privacyOptionsRequirementStatus === 'REQUIRED';
  }
  async function showPrivacyOptions() {
    if (!AdMob) return;
    try { await AdMob.showPrivacyOptionsForm(); applyConsent(await AdMob.requestConsentInfo()); preload(); } catch (e) { console.warn('privacy options', e); }
    if (root.onAdsReady) root.onAdsReady();
  }
  async function preload() {
    if (!ready || !canRequest || loaded) return;
    try { await AdMob.prepareRewardVideoAd({ adId: CFG.rewardedId, isTesting: CFG.testing }); loaded = true; } catch (e) { loaded = false; }
  }
  const portal = () => !!(root.Portal && root.Portal.active);
  const available = () => !!CFG.enabled && !busy && (simulate || portal() || (ready && canRequest));
  /** Can this placement be offered right now? (ads available + caps) */
  function canOffer(led, placement) { return available() && gate(led, placement, CFG).ok; }
  /** Resolves true only if the reward was earned. Never forced: only called from a button the player tapped. */
  async function show(led, placement) {
    if (!canOffer(led, placement)) return false;
    busy = true; let earned = false;
    try { earned = simulate ? await simulated() : portal() ? await root.Portal.rewarded(root.onAdPause, root.onAdResume) : await nativeRewarded(); } finally { busy = false; }
    if (earned) record(led, placement);
    return earned;
  }
  function nativeRewarded() {
    return new Promise(async res => {
      let earned = false, done = false; const hs = [];
      const finish = v => { if (done) return; done = true; hs.forEach(h => h && h.remove && h.remove()); loaded = false; setTimeout(preload, 1500); res(v); };
      try {
        hs.push(await AdMob.addListener('onRewardedVideoAdReward', () => { earned = true; }));
        hs.push(await AdMob.addListener('onRewardedVideoAdDismissed', () => finish(earned)));
        hs.push(await AdMob.addListener('onRewardedVideoAdFailedToShow', () => finish(false)));
        if (!loaded) await AdMob.prepareRewardVideoAd({ adId: CFG.rewardedId, isTesting: CFG.testing });
        const item = await AdMob.showRewardVideoAd(); if (item) earned = true;
        setTimeout(() => finish(earned), 90000);
      } catch (e) { finish(false); }
    });
  }
  function simulated() {
    return new Promise(res => {
      const el = document.createElement('div'); el.id = 'fakeAd';
      el.style.cssText = 'position:fixed;inset:0;z-index:999;background:#000d;color:#fff;display:flex;align-items:center;justify-content:center;font:bold 22px sans-serif;text-align:center';
      el.innerHTML = '<div>TEST AD<br><small style="font-size:13px">Real rewarded ads only play in the Android app</small><br><span>2</span></div>';
      document.body.appendChild(el); let n = 2;
      const t = setInterval(() => { n--; el.querySelector('span').textContent = n; if (n <= 0) { clearInterval(t); el.remove(); res(true); } }, 1000);
    });
  }
  root.BRAds = Object.assign({}, core, { init, available, canOffer, show, showPrivacyOptions,
    privacyRequired: () => privacyRequired, info: () => ({ android, simulate, ready, canRequest, privacyRequired, testing: !!CFG.testing }) });
})(typeof window !== 'undefined' ? window : globalThis);
