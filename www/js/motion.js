// Squad locomotion. Drag and keys still set a target; this eases the body onto it.
// Critically damped so starts ramp from rest, stops settle exactly (no creep), and
// turns don't snap. Stride phase advances with distance traveled so the two-frame
// run plants its feet with the ground. prefers-reduced-motion keeps the steering
// and drops bob / lean / cycle.
(function (root) {
  'use strict';
  const OMEGA = 18;          // ~95% of a step in about 0.27s
  const OMEGA_SLOW = 6;      // dust slow: about 3x softer, same shape
  const STRIDE = 54;         // world units per footfall (one frame of a 2-frame run)
  const MOVE_EPS = 30;       // below this speed the cycle holds (idle plant)
  const MAX_LEAN = 0.2;
  const BOB = 2.15;

  function create() { return { x: 0, v: 0, phase: 0, lean: 0, hit: 0 }; }

  function step(m, target, dt, opt) {
    opt = opt || {};
    const lo = opt.minX != null ? opt.minX : -150;
    const hi = opt.maxX != null ? opt.maxX : 150;
    const reduced = !!opt.reduced;
    target = Math.max(lo, Math.min(hi, target));
    if (!(dt > 0)) return m;
    if (reduced) {
      const k = Math.min(1, (opt.dustSlow ? 6 : 14) * dt);
      m.x += (target - m.x) * k;
      if (Math.abs(target - m.x) < 0.4) m.x = target;
      m.v = 0;
      m.lean += (0 - m.lean) * Math.min(1, dt * 10);
      if (m.hit > 0) m.hit = Math.max(0, m.hit - dt);
      return m;
    }
    const omega = opt.dustSlow ? OMEGA_SLOW : OMEGA;
    const steps = Math.max(1, Math.min(8, Math.ceil(dt / (1 / 120))));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      // x'' = ω² (target - x) - 2ω x'   (critical damping, no overshoot)
      const acc = omega * omega * (target - m.x) - 2 * omega * m.v;
      m.v += acc * h;
      m.x += m.v * h;
    }
    if (m.x < lo) { m.x = lo; if (m.v < 0) m.v = 0; }
    if (m.x > hi) { m.x = hi; if (m.v > 0) m.v = 0; }
    if (Math.abs(target - m.x) < 0.45 && Math.abs(m.v) < 8) { m.x = target; m.v = 0; }
    const speed = Math.hypot(m.v, opt.forward || 0);
    if (speed > MOVE_EPS) m.phase += (speed * dt) / STRIDE;
    const leanT = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, m.v * 0.00115));
    m.lean += (leanT - m.lean) * Math.min(1, dt * 12);
    if (m.hit > 0) m.hit = Math.max(0, m.hit - dt);
    return m;
  }

  // Bob is 0 at integer phase (the frame change / plant) and peaks mid-step.
  function pose(m, index, opt) {
    opt = opt || {};
    const reduced = !!opt.reduced;
    const phase = m.phase + (reduced ? 0 : (index || 0) * 0.37);
    const lean = reduced ? 0 : m.lean;
    if (reduced || !opt.hasCycle) return { frame: 0, bob: 0, lean, phase };
    const frame = Math.floor(phase) & 1;
    const t = phase - Math.floor(phase);
    const bob = Math.sin(t * Math.PI) * (opt.bob == null ? BOB : opt.bob);
    return { frame, bob, lean, phase };
  }

  const api = { OMEGA, OMEGA_SLOW, STRIDE, MOVE_EPS, MAX_LEAN, BOB, create, step, pose };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Motion = api;
})(typeof window !== 'undefined' ? window : globalThis);
