/* DowntownDiddlerrr telemetry: crash reports (Sentry) + anonymous play stats (PostHog).
 * Kid-safe & private: no session replay, no autocapture, no input text, no user IDs/PII,
 * honors Do Not Track / Global Privacy Control, anonymous random ID only.
 * Loads lazily after the game is idle so it never slows startup or frame rate.
 * The DSN and phc_ key below are PUBLIC client keys (safe to ship), not secrets. */
(function (w, d) {
  var GAME = 'brainrot-aura-rush';
  var SENTRY_DSN = 'https://35100e2898c078abe8b40317fa63fde7@o4512310020407296.ingest.us.sentry.io/4512310038691840';
  var PH_KEY = 'phc_rBMVDM33tcz3GLrpiKqnRfAobinGsZyeSqwfrPgfKwom';
  var PH_HOST = 'https://us.i.posthog.com';
  var SENTRY_SRC = 'https://browser.sentry-cdn.com/11.9.0/bundle.min.js';
  var PH_SRC = 'https://us-assets.i.posthog.com/static/array.js';
  var n = w.navigator || {};
  var dnt = n.doNotTrack == '1' || w.doNotTrack == '1' || n.msDoNotTrack == '1' || n.globalPrivacyControl === true;
  w.TM = { event: function () {} };
  if (dnt || location.protocol === 'http:' && /^(localhost|127\.)/.test(location.hostname)) return;

  var EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  var clean = function (u) { return typeof u === 'string' ? u.split(/[?#]/)[0] : u; };
  var scrub = function (s) { return typeof s === 'string' ? s.replace(EMAIL, '[email]') : s; };

  // Buffer errors that happen before Sentry has loaded.
  var early = [];
  var onErr = function (e) { early.length < 10 && early.push(e.error || e.reason || e.message); };
  w.addEventListener('error', onErr);
  w.addEventListener('unhandledrejection', onErr);

  function load(src, cb) {
    var s = d.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = cb; s.onerror = function () {}; d.head.appendChild(s);
  }

  function startSentry() {
    load(SENTRY_SRC, function () {
      var S = w.Sentry; if (!S) return;
      S.init({
        dsn: SENTRY_DSN,
        sendDefaultPii: false,
        sampleRate: 1.0,
        maxBreadcrumbs: 20,
        initialScope: { tags: { game: GAME } },
        beforeBreadcrumb: function (b) { return b && b.category === 'ui.input' ? null : b; },
        beforeSend: function (ev) {
          delete ev.user; delete ev.server_name;
          if (ev.request) { ev.request = { url: clean(ev.request.url), headers: { 'User-Agent': (ev.request.headers || {})['User-Agent'] } }; }
          if (ev.message) ev.message = scrub(ev.message);
          (ev.exception && ev.exception.values || []).forEach(function (x) { x.value = scrub(x.value); });
          (ev.breadcrumbs || []).forEach(function (b) { b.message = scrub(b.message); if (b.data && b.data.url) b.data.url = clean(b.data.url); });
          return ev;
        }
      });
      w.removeEventListener('error', onErr); w.removeEventListener('unhandledrejection', onErr);
      early.forEach(function (e) { e && S.captureException(e); }); early = [];
    });
  }

  function startPostHog() {
    load(PH_SRC, function () {
      var P = w.posthog; if (!P || !P.init) return;
      P.init(PH_KEY, {
        api_host: PH_HOST,
        person_profiles: 'never',          // anonymous only, never identified
        autocapture: false,                // no clicks / no input text
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,   // no session replay
        disable_surveys: true,
        capture_exceptions: false,         // errors go to Sentry only
        capture_performance: false,
        advanced_disable_feature_flags: true,
        disable_external_dependency_loading: true,
        respect_dnt: true,
        ip: false,
        mask_all_text: true,
        mask_all_element_attributes: true,
        persistence: 'localStorage',
        save_referrer: false,
        property_denylist: ['$referrer', '$referring_domain', '$initial_referrer', '$initial_referring_domain'],
        sanitize_properties: function (p) { ['$current_url', '$pathname'].forEach(function (k) { if (p[k]) p[k] = clean(p[k]); }); return p; },
        loaded: function (ph) { ph.register({ game: GAME }); }
      });
      w.TM.event = function (name, props) { try { P.capture(name, props || {}); } catch (e) {} };
    });
  }

  var go = function () {
    var idle = w.requestIdleCallback || function (f) { return setTimeout(f, 1500); };
    idle(function () { startSentry(); startPostHog(); }, { timeout: 4000 });
  };
  if (d.readyState === 'complete') go(); else w.addEventListener('load', go);
})(window, document);
