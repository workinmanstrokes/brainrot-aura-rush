/* iOS / PWA support (Safari "Add to Home Screen"). Web-only: does nothing harmful inside the native Capacitor app.
   - registers the offline service worker (sw.js) on real web hosts only
   - unlocks WebAudio on the first tap (iOS starts every AudioContext suspended)
   - stops pinch / double-tap zoom and rubber-band page scroll, keeps inner scroll areas working */
(function () {
  'use strict';
  var w = window, d = document;
  var native = !!(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform());
  if (native) return; // the Android/Capacitor app keeps its existing behaviour untouched
  var topLevel = (function () { try { return w.top === w; } catch (e) { return false; } })();
  var standalone = w.navigator.standalone === true || (w.matchMedia && w.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
  d.documentElement.classList.add(standalone ? 'pwa-standalone' : 'pwa-browser');

  // 1. Service worker: only on http(s) web hosts, never in the native app or inside a portal iframe.
  var capHost = location.protocol === 'https:' && location.hostname === 'localhost' && !location.port; // Capacitor Android origin
  if (!native && !capHost && topLevel && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    w.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.update && reg.update();
      }).catch(function () {});
    });
  }

  // 2. WebAudio unlock: remember every AudioContext and resume them on the first user gesture.
  var AC = w.AudioContext || w.webkitAudioContext, ctxs = [];
  if (AC && !AC.__iosPatched) {
    var Patched = function (opts) { var c = opts === undefined ? new AC() : new AC(opts); ctxs.push(c); return c; };
    Patched.prototype = AC.prototype; Patched.__iosPatched = true;
    try { w.AudioContext = Patched; if (w.webkitAudioContext) w.webkitAudioContext = Patched; } catch (e) {}
  }
  function unlock() {
    for (var i = 0; i < ctxs.length; i++) {
      var c = ctxs[i];
      if (c.state === 'suspended' || c.state === 'interrupted') { try { c.resume(); } catch (e) {} }
      try { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
    }
  }
  ['touchend', 'pointerup', 'click', 'keydown'].forEach(function (t) { d.addEventListener(t, unlock, { capture: true, passive: true }); });
  // Coming back from the background (iOS suspends audio): resume on the next tap too, which the listeners above do.
  d.addEventListener('visibilitychange', function () { if (!d.hidden) unlock(); });

  // 3. Zoom + rubber-band control.
  var css = 'html,body{overscroll-behavior:none;-webkit-text-size-adjust:100%;text-size-adjust:100%}' +
    'html,body,button,a,canvas,[role=button]{touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    'canvas{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}';
  var st = d.createElement('style'); st.id = 'ios-pwa-style'; st.textContent = css; (d.head || d.documentElement).appendChild(st);
  ['gesturestart', 'gesturechange'].forEach(function (t) { d.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false }); });
  function scrollable(el) {
    for (; el && el !== d.body && el !== d.documentElement; el = el.parentElement) {
      if (el.nodeType !== 1) continue;
      var cs = getComputedStyle(el), oy = cs.overflowY, ox = cs.overflowX;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    }
    var se = d.scrollingElement || d.documentElement;
    return se.scrollHeight > w.innerHeight + 1; // a page that really scrolls keeps scrolling
  }
  d.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) { e.preventDefault(); return; } // pinch
    if (e.cancelable && !scrollable(e.target)) e.preventDefault(); // no rubber-band on fixed game screens
  }, { passive: false });
})();
