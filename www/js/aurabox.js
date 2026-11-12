// Aura Box: a free mystery box after every run. Tap to crack it (cracks -> shakes -> light leaks); each of the first
// 4 taps may upgrade the prize one rarity tier. Prizes are cosmetic aura collectibles (procedural canvas art) with
// Gold / Rainbow mutations, kept in the Aura Index. Boxes are EARNED ONLY (1 per finished run + 1 optional rewarded-ad
// bonus per run) and never sold. Drop odds are shown in game (ODDS button). State: localStorage, versioned + migrated.
(function (root) {
  'use strict';
  // ----- Pure logic (unit-tested in tests/unit.js) -----
  const VERSION = 1, KEY = 'brainrot-aura-rush-aurabox';
  const TIERS = [
    { id: 'common', n: 'COMMON', w: 0.58, hi: '#f1f5f9', col: '#94a3b8', lo: '#475569', dk: '#1e293b', glow: '#e2e8f0', dupe: 5 },
    { id: 'rare', n: 'RARE', w: 0.26, hi: '#bae6fd', col: '#38bdf8', lo: '#0369a1', dk: '#082f49', glow: '#7dd3fc', dupe: 12 },
    { id: 'epic', n: 'EPIC', w: 0.11, hi: '#f3e8ff', col: '#a855f7', lo: '#6b21a8', dk: '#2e1065', glow: '#c084fc', dupe: 30 },
    { id: 'legendary', n: 'LEGENDARY', w: 0.04, hi: '#fef3c7', col: '#f59e0b', lo: '#b45309', dk: '#451a03', glow: '#fcd34d', dupe: 80 },
    { id: 'mythic', n: 'MYTHIC', w: 0.01, hi: '#ffe4e6', col: '#f43f5e', lo: '#be123c', dk: '#4c0519', glow: '#fb7185', dupe: 200 },
  ];
  const MUTS = [{ id: 'n', n: 'NORMAL', w: 0.90, mul: 1 }, { id: 'g', n: 'GOLD', w: 0.08, mul: 3 }, { id: 'r', n: 'RAINBOW', w: 0.02, mul: 6 }];
  const TAPS = 5, UP_TAPS = 4, UP_CHANCE = 0.10;
  // p = [light, mid, dark, accent]; m = motif; f = face
  const ITEMS = [
    { id: 'mewmist', n: 'Mewing Mist', t: 0, m: 'mist', f: 'smug', p: ['#ccfbf1', '#2dd4bf', '#115e59', '#99f6e4'], d: 'Jawline so sharp the fog parts.' },
    { id: 'npcstatic', n: 'NPC Static', t: 0, m: 'static', f: 'npc', p: ['#e2e8f0', '#94a3b8', '#334155', '#f8fafc'], d: 'Says the same line. Forever.' },
    { id: 'rizzripple', n: 'Rizz Ripple', t: 0, m: 'ripple', f: 'wink', p: ['#fce7f3', '#f472b6', '#9d174d', '#fbcfe8'], d: 'Smooth waves. Zero words.' },
    { id: 'sigmahalo', n: 'Sigma Halo', t: 1, m: 'halo', f: 'cool', p: ['#dbeafe', '#60a5fa', '#1e3a8a', '#fde68a'], d: '4 a.m. grindset glow.' },
    { id: 'ohioorbit', n: 'Ohio Orbit', t: 1, m: 'orbit', f: 'wired', p: ['#dcfce7', '#4ade80', '#166534', '#d9f99d'], d: 'Only in this orbit.' },
    { id: 'moggmirage', n: 'Mogging Mirage', t: 1, m: 'mirage', f: 'smug', p: ['#e0f2fe', '#22d3ee', '#155e75', '#a5f3fc'], d: 'Looks taller from every angle.' },
    { id: 'lasagnavortex', n: 'Lasagnino Vortex', t: 2, m: 'vortex', f: 'cute', p: ['#ffedd5', '#fb923c', '#9a3412', '#fde047'], d: 'Layers on layers on layers.' },
    { id: 'gelatogalaxy', n: 'Gelato Galaxy', t: 2, m: 'galaxy', f: 'cute', p: ['#f5d0fe', '#c084fc', '#581c87', '#f9a8d4'], d: 'Three scoops of starlight.' },
    { id: 'pizzaprism', n: 'Pizzanova Prism', t: 2, m: 'prism', f: 'wink', p: ['#fef9c3', '#facc15', '#a16207', '#ef4444'], d: 'Every slice refracts.' },
    { id: 'baffocrown', n: "Baffolini's Crown", t: 3, m: 'crown', f: 'mustache', p: ['#fee2e2', '#f87171', '#991b1b', '#fbbf24'], d: 'Swiped from the Grump King.' },
    { id: 'espressonova', n: 'Espresso Nova', t: 3, m: 'nova', f: 'wired', p: ['#fde68a', '#c2783a', '#451a03', '#fef3c7'], d: 'Triple shot. Supernova.' },
    { id: 'scopazzostorm', n: 'Scopazzo Storm', t: 3, m: 'storm', f: 'angry', p: ['#e0e7ff', '#818cf8', '#312e81', '#facc15'], d: 'Nonno swept the sky clean.' },
    { id: 'aurainfinita', n: 'Aura Infinita', t: 4, m: 'infinity', f: 'star', p: ['#fae8ff', '#e879f9', '#4a044e', '#67e8f9'], d: '+\u221e aura. Literally.' },
    { id: 'cannolisingularity', n: 'Cannoli Singularity', t: 4, m: 'singularity', f: 'glow', p: ['#fef3c7', '#312e81', '#020617', '#fbbf24'], d: 'Nothing escapes the filling.' },
    { id: 'spaghettiverse', n: 'Spaghettiverse', t: 4, m: 'noodle', f: 'tongue', p: ['#fef08a', '#f97316', '#7c2d12', '#fde047'], d: 'One noodle. Infinite universes.' },
  ];
  const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i])), MUT = Object.fromEntries(MUTS.map(m => [m.id, m]));
  const TOTAL = ITEMS.length * MUTS.length;
  /** Final chance of each tier once all tap upgrades are applied (what the Odds panel shows). */
  function finalOdds() {
    let dist = TIERS.map(t => t.w);
    for (let k = 0; k < UP_TAPS; k++) {
      const nd = dist.map(() => 0), top = TIERS.length - 1;
      dist.forEach((p, i) => { if (i === top) nd[i] += p; else { nd[i] += p * (1 - UP_CHANCE); nd[i + 1] += p * UP_CHANCE; } });
      dist = nd;
    }
    return dist;
  }
  function pickW(arr, r) { let a = 0; for (let i = 0; i < arr.length; i++) { a += arr[i].w; if (r < a) return i; } return arr.length - 1; }
  /** Whole outcome is rolled up front (so the published odds are exact); taps only reveal it. */
  function rollBox(rng = Math.random) {
    const base = pickW(TIERS, rng()), ups = []; let t = base;
    for (let k = 0; k < UP_TAPS; k++) { const up = rng() < UP_CHANCE && t < TIERS.length - 1; ups.push(up); if (up) t++; }
    const mut = MUTS[pickW(MUTS, rng())].id, pool = ITEMS.filter(it => it.t === t);
    const item = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].id;
    return { base, ups, mut, item, seed: Math.floor(rng() * 1e9), taps: 0 };
  }
  const tierAt = (roll, taps) => roll.base + roll.ups.slice(0, Math.min(taps, UP_TAPS)).filter(Boolean).length;
  const finalTier = roll => tierAt(roll, UP_TAPS);
  const fresh = () => ({ v: VERSION, pending: 0, run: 0, granted: 0, bonus: 0, opened: 0, owned: {}, news: {}, cur: null, equipped: null });
  const int = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v)) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d;
  const validKey = k => { if (typeof k !== 'string') return false; const [id, m] = k.split('|'); return !!(ITEM[id] && MUT[m]); };
  /** Any stored value -> a valid current-version state. Unknown items are dropped; unknown top-level fields from a
   * newer build are kept so a downgrade never wipes them. Never throws. */
  function migrate(raw) {
    const s = fresh();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;
    for (const k of Object.keys(raw)) if (!(k in s) && k !== 'found') s[k] = raw[k];
    s.v = Math.max(VERSION, int(raw.v, 0, 1e6, 0));
    s.pending = int(raw.pending, 0, 99, 0); s.run = int(raw.run, 0, 1e9, 0);
    s.granted = int(raw.granted, 0, s.run, 0); s.bonus = int(raw.bonus, 0, s.run, 0); s.opened = int(raw.opened, 0, 1e9, 0);
    const own = raw.owned && typeof raw.owned === 'object' && !Array.isArray(raw.owned) ? raw.owned : {};
    for (const k of Object.keys(own)) if (validKey(k)) { const c = int(own[k], 0, 1e6, 0); if (c > 0) s.owned[k] = c; }
    if (Array.isArray(raw.found)) for (const id of raw.found) if (ITEM[id]) s.owned[id + '|n'] = Math.max(1, s.owned[id + '|n'] || 0); // pre-v1 list of ids
    const nw = raw.news && typeof raw.news === 'object' ? raw.news : {};
    for (const k of Object.keys(nw)) if (s.owned[k]) s.news[k] = 1;
    const c = raw.cur;
    if (c && typeof c === 'object' && Number.isInteger(c.base) && TIERS[c.base] && Array.isArray(c.ups) && c.ups.length === UP_TAPS && MUT[c.mut] && ITEM[c.item]) {
      const cur = { base: c.base, ups: c.ups.map(Boolean), mut: c.mut, item: c.item, seed: int(c.seed, 0, 1e9, 0), taps: int(c.taps, 0, TAPS - 1, 0) };
      if (finalTier(cur) < TIERS.length && ITEM[cur.item].t === finalTier(cur) && s.pending > 0) s.cur = cur;
    }
    if (validKey(raw.equipped) && s.owned[raw.equipped]) s.equipped = raw.equipped;
    return s;
  }
  function startRun(s) { s.run = Math.min(1e9, s.run + 1); }
  /** Free box for a finished run (once per run, only if the run was actually played). */
  function endRun(s, played) { if (!played || s.run < 1 || s.granted === s.run) return false; s.granted = s.run; s.pending = Math.min(99, s.pending + 1); return true; }
  const canBonus = s => s.run > 0 && s.granted === s.run && s.bonus !== s.run && s.pending < 99;
  function grantBonus(s) { if (!canBonus(s)) return false; s.bonus = s.run; s.pending++; return true; }
  /** Opening the current box: adds the prize; a duplicate converts to Essence. */
  function record(s, roll) {
    const t = finalTier(roll), key = roll.item + '|' + roll.mut, isNew = !s.owned[key];
    s.owned[key] = (s.owned[key] || 0) + 1; s.opened++; s.pending = Math.max(0, s.pending - 1); s.cur = null;
    if (isNew) s.news[key] = 1;
    return { key, tier: t, isNew, essence: isNew ? 0 : TIERS[t].dupe * MUT[roll.mut].mul };
  }
  function completion(s) { const have = Object.keys(s.owned).filter(validKey).length; return { have, total: TOTAL, pct: Math.floor(have / TOTAL * 100) }; }
  const core = { VERSION, KEY, TIERS, MUTS, ITEMS, TAPS, UP_TAPS, UP_CHANCE, TOTAL, finalOdds, rollBox, tierAt, finalTier, fresh, migrate, startRun, endRun, canBonus, grantBonus, record, completion };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ----- Runtime -----
  const doc = root.document, FONT = 'GameFont, "Arial Black", Impact, Roboto, Arial, sans-serif';
  const TAU = Math.PI * 2, clamp01 = x => Math.max(0, Math.min(1, x));
  const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
  let S = fresh(), hooks = {};
  function load() {
    let raw = null;
    try { raw = root.localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
    if (raw) { try { S = migrate(JSON.parse(raw)); } catch (e) { try { root.localStorage.setItem(KEY + '-corrupt', raw); } catch (e2) { /* ignore */ } S = fresh(); } }
  }
  function persist() { try { root.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  load();

  // ---- Procedural ASMR sounds (WebAudio, through the game's master gain) ----
  let noiseBuf = null;
  function A() { const a = hooks.audio && hooks.audio(); return a && a.actx && a.master && !a.muted && a.actx.state !== 'closed' ? a : null; }
  function noise(c) {
    if (!noiseBuf) { const n = c.sampleRate; noiseBuf = c.createBuffer(1, n, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = c.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function env(g, t, peak, att, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec); }
  function bell(a, f, t, vol, dec = 1.1, type = 'sine') {
    const c = a.actx;
    [[1, 1, dec], [2.76, 0.32, dec * 0.45], [5.4, 0.12, dec * 0.22]].forEach(([r, v, d]) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f * r; env(g, t, vol * v, 0.004, d);
      o.connect(g).connect(a.master); o.start(t); o.stop(t + d + 0.05);
    });
  }
  const NOTE = st => 523.25 * Math.pow(2, st / 12);
  const SFX = {
    pop(p = 1) {
      const a = A(); if (!a) return; const c = a.actx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(560 * p, t); o.frequency.exponentialRampToValueAtTime(150 * p, t + 0.09);
      env(g, t, 0.32, 0.004, 0.13); o.connect(g).connect(a.master); o.start(t); o.stop(t + 0.17);
      const n = noise(c), f = c.createBiquadFilter(), g2 = c.createGain(); f.type = 'bandpass'; f.frequency.value = 2600 * p; f.Q.value = 2.5;
      env(g2, t, 0.1, 0.002, 0.035); n.connect(f).connect(g2).connect(a.master); n.start(t, Math.random() * 0.8); n.stop(t + 0.05);
    },
    squelch(p = 1) {
      const a = A(); if (!a) return; const c = a.actx, t = c.currentTime;
      const n = noise(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.Q.value = 9;
      f.frequency.setValueAtTime(260 * p, t); f.frequency.exponentialRampToValueAtTime(1350 * p, t + 0.08); f.frequency.exponentialRampToValueAtTime(380 * p, t + 0.22);
      env(g, t, 0.55, 0.01, 0.22); n.connect(f).connect(g).connect(a.master); n.start(t, Math.random() * 0.8); n.stop(t + 0.26);
      const o = c.createOscillator(), g2 = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150 * p, t); o.frequency.exponentialRampToValueAtTime(70 * p, t + 0.2);
      env(g2, t, 0.16, 0.01, 0.2); o.connect(g2).connect(a.master); o.start(t); o.stop(t + 0.24);
    },
    crack(v = 1) {
      const a = A(); if (!a) return; const c = a.actx, t = c.currentTime;
      [0, 0.028, 0.05].forEach((d, i) => {
        const n = noise(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 1800 + i * 900;
        env(g, t + d, 0.22 * v / (i + 1), 0.001, 0.05); n.connect(f).connect(g).connect(a.master); n.start(t + d, Math.random() * 0.8); n.stop(t + d + 0.07);
      });
    },
    chime(tier) { const a = A(); if (!a) return; const t = a.actx.currentTime; [0, 4, 7, 12].forEach((st, i) => bell(a, NOTE(st + tier * 2), t + i * 0.065, 0.11, 0.9)); },
    whoosh() {
      const a = A(); if (!a) return; const c = a.actx, t = c.currentTime;
      const n = noise(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.Q.value = 4;
      f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.32);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      n.connect(f).connect(g).connect(a.master); n.start(t); n.stop(t + 0.75);
    },
    fanfare(tier) {
      const a = A(); if (!a) return; const c = a.actx, t = c.currentTime;
      const seq = [0, 4, 7, 12, 16, 19, 24, 28].slice(0, 3 + tier);
      seq.forEach((st, i) => bell(a, NOTE(st), t + 0.05 + i * 0.075, 0.12, 1.4));
      bell(a, NOTE(12 + tier), t + 0.05 + seq.length * 0.075, 0.08, 2.2, 'triangle');
      if (tier >= 3) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.8); env(g, t, 0.5, 0.01, 0.8); o.connect(g).connect(a.master); o.start(t); o.stop(t + 0.9); }
    },
    shimmer() { const a = A(); if (!a) return; const t = a.actx.currentTime; for (let i = 0; i < 12; i++) bell(a, 900 * Math.pow(2, i / 5), t + i * 0.035, 0.05, 0.5, 'triangle'); },
    gold() {
      const a = A(); if (!a) return; const t = a.actx.currentTime;
      bell(a, 1568, t, 0.12, 1.6, 'triangle'); bell(a, 2349, t + 0.09, 0.08, 1.4, 'triangle');
      for (let i = 0; i < 6; i++) bell(a, 3000 + Math.random() * 2500, t + 0.15 + i * 0.06, 0.035, 0.18);
    },
  };
  const buzz = k => { try { hooks.buzz && hooks.buzz(k); } catch (e) { /* haptics unavailable */ } };

  // ---- Shared drawing helpers ----
  const glowCache = new Map();
  function glow(col) {
    let g = glowCache.get(col); if (g) return g;
    if (glowCache.size > 80) glowCache.clear();
    g = doc.createElement('canvas'); g.width = g.height = 128; const c = g.getContext('2d');
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, col); r.addColorStop(0.35, withA(col, 0.6)); r.addColorStop(1, withA(col, 0));
    c.fillStyle = r; c.fillRect(0, 0, 128, 128); glowCache.set(col, g); return g;
  }
  function glowAt(c, col, x, y, r, a = 1) { if (r <= 0 || a <= 0) return; const ga = c.globalAlpha; c.globalAlpha = ga * a; c.drawImage(glow(col), x - r, y - r, r * 2, r * 2); c.globalAlpha = ga; }
  function star4(c, x, y, r, rot = 0) {
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i & 1 ? r * 0.28 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath();
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = (a, b, c) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };

  // ---- Aura collectible art: a squishy glowing spirit + a motif per item; mutations recolor + overlay ----
  function palette(it, mut, t) {
    if (mut === 'g') return ['#fff4c2', '#f5a50b', '#6b2f05', '#fde68a'];
    if (mut === 'r') { const h = t * 70; return [hsl(h, 100, 82), hsl(h + 70, 100, 56), hsl(h + 150, 90, 32), hsl(h + 210, 100, 64)]; }
    return it.p;
  }
  const withA = (col, a) => col.startsWith('#') ? col + Math.round(a * 255).toString(16).padStart(2, '0') : col.replace(/,\s*[\d.]+\)$/, `,${a})`);
  function blob(c, R, t, k = 0.035) {
    c.beginPath();
    for (let i = 0; i <= 56; i++) {
      const a = i / 56 * TAU, r = R * (1 + k * Math.sin(3 * a + t * 2.2) + k * 0.6 * Math.sin(5 * a - t * 3.1));
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.97; i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  }
  function eyeBall(c, x, y, r, look, big) {
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, r, r * 1.15, 0, 0, TAU); c.fill();
    c.fillStyle = '#0f172a'; c.beginPath(); c.ellipse(x + look * r * 0.18, y + r * 0.1, r * (big ? 0.72 : 0.6), r * (big ? 0.8 : 0.68), 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + look * r * 0.18 - r * 0.24, y - r * 0.2, r * 0.26, 0, TAU); c.fill();
    c.beginPath(); c.arc(x + look * r * 0.18 + r * 0.22, y + r * 0.3, r * 0.11, 0, TAU); c.fill();
  }
  function face(c, Rb, it, t, P) {
    const f = it.f, ex = Rb * 0.36, ey = -Rb * 0.04, er = Rb * 0.17, look = Math.sin(t * 0.9) * 0.8;
    const blink = ((t * 0.55 + it.id.length * 0.37) % 3.3) < 0.13;
    const ink = '#1e1033'; c.lineCap = 'round'; c.lineJoin = 'round';
    if (f !== 'npc' && f !== 'cool') {
      c.fillStyle = 'rgba(255,110,170,0.42)';
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * Rb * 0.58, Rb * 0.2, Rb * 0.15, Rb * 0.085, 0, 0, TAU); c.fill(); }
    }
    const eyes = big => { for (const s of [-1, 1]) { if (blink) { c.strokeStyle = ink; c.lineWidth = Rb * 0.05; c.beginPath(); c.moveTo(s * ex - er, ey); c.quadraticCurveTo(s * ex, ey + er * 0.5, s * ex + er, ey); c.stroke(); } else eyeBall(c, s * ex, ey, er, look, big); } };
    const mouth = kind => {
      c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = Rb * 0.05; const my = Rb * 0.3;
      if (kind === 'w') { c.beginPath(); c.moveTo(-Rb * 0.14, my); c.quadraticCurveTo(-Rb * 0.07, my + Rb * 0.1, 0, my); c.quadraticCurveTo(Rb * 0.07, my + Rb * 0.1, Rb * 0.14, my); c.stroke(); }
      else if (kind === 'smirk') { c.beginPath(); c.moveTo(-Rb * 0.12, my + Rb * 0.02); c.quadraticCurveTo(Rb * 0.04, my + Rb * 0.08, Rb * 0.17, my - Rb * 0.06); c.stroke(); }
      else if (kind === 'flat') { c.beginPath(); c.moveTo(-Rb * 0.1, my); c.lineTo(Rb * 0.1, my); c.stroke(); }
      else if (kind === 'frown') { c.beginPath(); c.arc(0, my + Rb * 0.12, Rb * 0.13, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
      else if (kind === 'zig') { c.beginPath(); for (let i = 0; i <= 6; i++) { const x = -Rb * 0.16 + i * Rb * 0.053, y = my + (i & 1 ? -1 : 1) * Rb * 0.035; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
      else {
        c.beginPath(); c.moveTo(-Rb * 0.17, my - Rb * 0.04); c.quadraticCurveTo(0, my + Rb * 0.3, Rb * 0.17, my - Rb * 0.04); c.closePath(); c.fill();
        c.fillStyle = '#fb7185'; c.beginPath();
        if (kind === 'tongue') c.ellipse(Rb * 0.03, my + Rb * 0.16 + Math.sin(t * 4) * Rb * 0.02, Rb * 0.09, Rb * 0.12, 0.2, 0, TAU);
        else c.ellipse(0, my + Rb * 0.1, Rb * 0.08, Rb * 0.05, 0, 0, TAU);
        c.fill();
      }
    };
    if (f === 'npc') { c.fillStyle = ink; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * ex, ey, blink ? er * 0.12 : er * 0.33, 0, TAU); c.fill(); } mouth('flat'); }
    else if (f === 'cool') {
      c.fillStyle = '#0b0a1a'; c.strokeStyle = '#0b0a1a'; c.lineWidth = Rb * 0.06;
      for (const s of [-1, 1]) { c.beginPath(); c.roundRect(s * ex - er * 1.35, ey - er * 0.85, er * 2.7, er * 1.6, er * 0.6); c.fill(); }
      c.beginPath(); c.moveTo(-ex + er, ey - er * 0.4); c.lineTo(ex - er, ey - er * 0.4); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = Rb * 0.035;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * ex - er * 0.8, ey - er * 0.35); c.lineTo(s * ex - er * 0.2, ey - er * 0.6); c.stroke(); }
      mouth('smirk');
    } else if (f === 'smug') {
      eyes(false);
      if (!blink) for (const s of [-1, 1]) { c.fillStyle = P[1]; c.beginPath(); c.ellipse(s * ex, ey - er * 0.45, er * 1.2, er * 0.8, 0, Math.PI, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = Rb * 0.045; c.beginPath(); c.moveTo(s * ex - er * 1.05, ey - er * 0.45); c.lineTo(s * ex + er * 1.05, ey - er * 0.45); c.stroke(); }
      mouth('smirk');
    } else if (f === 'wink') {
      eyeBall(c, -ex, ey, er, look, true);
      c.strokeStyle = ink; c.lineWidth = Rb * 0.055; c.beginPath(); c.moveTo(ex - er, ey + er * 0.2); c.lineTo(ex, ey - er * 0.45); c.lineTo(ex + er, ey + er * 0.2); c.stroke();
      mouth('open');
    } else if (f === 'mustache') {
      eyes(false);
      c.strokeStyle = ink; c.lineWidth = Rb * 0.07; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * ex * 1.45, ey - er * 1.55); c.lineTo(s * ex * 0.45, ey - er * 1.05); c.stroke(); }
      c.fillStyle = '#3b1d0e'; c.beginPath(); const my = Rb * 0.25;
      c.moveTo(0, my - Rb * 0.04);
      c.bezierCurveTo(-Rb * 0.18, my - Rb * 0.16, -Rb * 0.44, my - Rb * 0.06, -Rb * 0.5, my - Rb * 0.2);
      c.bezierCurveTo(-Rb * 0.62, my - Rb * 0.02, -Rb * 0.42, my + Rb * 0.16, -Rb * 0.2, my + Rb * 0.08);
      c.quadraticCurveTo(-Rb * 0.06, my + Rb * 0.04, 0, my + Rb * 0.06);
      c.quadraticCurveTo(Rb * 0.06, my + Rb * 0.04, Rb * 0.2, my + Rb * 0.08);
      c.bezierCurveTo(Rb * 0.42, my + Rb * 0.16, Rb * 0.62, my - Rb * 0.02, Rb * 0.5, my - Rb * 0.2);
      c.bezierCurveTo(Rb * 0.44, my - Rb * 0.06, Rb * 0.18, my - Rb * 0.16, 0, my - Rb * 0.04);
      c.fill();
    } else if (f === 'wired') {
      for (const s of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(s * ex, ey, er * 1.15, 0, TAU); c.fill(); c.fillStyle = ink; c.beginPath(); c.arc(s * ex + Math.sin(t * 9 + s) * er * 0.25, ey, blink ? er * 0.1 : er * 0.3, 0, TAU); c.fill(); }
      mouth('zig');
    } else if (f === 'angry') {
      eyes(false);
      c.strokeStyle = ink; c.lineWidth = Rb * 0.07; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * ex * 1.5, ey - er * 1.6); c.lineTo(s * ex * 0.35, ey - er * 0.9); c.stroke(); }
      mouth('frown');
    } else if (f === 'star') {
      for (const s of [-1, 1]) { c.fillStyle = '#fff'; star4(c, s * ex, ey, er * (blink ? 0.6 : 1.35), t * 0.8); c.fill(); c.fillStyle = P[3]; star4(c, s * ex, ey, er * 0.6, t * 0.8); c.fill(); }
      mouth('open');
    } else if (f === 'glow') {
      c.globalCompositeOperation = 'lighter';
      for (const s of [-1, 1]) glowAt(c, '#fbbf24', s * ex, ey, er * 1.7, 0.55);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#fff7d6'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * ex, ey, er * 0.75, blink ? er * 0.1 : er * 0.95, 0, 0, TAU); c.fill(); }
      c.strokeStyle = '#fde68a'; c.lineWidth = Rb * 0.05; c.beginPath(); c.moveTo(-Rb * 0.14, Rb * 0.3); c.quadraticCurveTo(-Rb * 0.07, Rb * 0.4, 0, Rb * 0.3); c.quadraticCurveTo(Rb * 0.07, Rb * 0.4, Rb * 0.14, Rb * 0.3); c.stroke();
    } else if (f === 'tongue') {
      c.strokeStyle = ink; c.lineWidth = Rb * 0.06;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * ex - er, ey + er * 0.25); c.quadraticCurveTo(s * ex, ey - er * 1.0, s * ex + er, ey + er * 0.25); c.stroke(); }
      mouth('tongue');
    } else { eyes(true); mouth('w'); }
  }
  function ring(c, rx, ry, rot, a0, a1, w, col) { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.ellipse(0, 0, rx, ry, rot, a0, a1); c.stroke(); }
  function moon(c, R, a, P) {
    const x = Math.cos(a) * R * 0.98, y = Math.sin(a) * R * 0.3, rr = R * 0.12;
    c.save(); c.rotate(-0.35); const g = c.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 0, x, y, rr); g.addColorStop(0, '#fff'); g.addColorStop(1, P[1]);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); c.restore();
  }
  function disk(c, R, t, P, front, sil) {
    const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : TAU;
    c.save(); c.rotate(-0.22);
    const g = c.createLinearGradient(-R, 0, R, 0); g.addColorStop(0, '#b7791f'); g.addColorStop(0.5, '#f6d58e'); g.addColorStop(1, '#b7791f');
    c.lineWidth = R * 0.2; c.strokeStyle = sil ? P[1] : g; c.beginPath(); c.ellipse(0, 0, R * 1.0, R * 0.3, 0, a0, a1); c.stroke();
    if (!sil) {
      c.lineWidth = R * 0.03; c.strokeStyle = '#fff7e0'; c.beginPath(); c.ellipse(0, 0, R * 0.9, R * 0.255, 0, a0, a1); c.stroke();
      c.fillStyle = '#3b1d0e';
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + t * 0.6; if ((Math.sin(a) >= 0) !== front) continue; c.beginPath(); c.arc(Math.cos(a) * R * 1.0, Math.sin(a) * R * 0.3, R * 0.03, 0, TAU); c.fill(); }
    }
    c.restore();
  }
  function motifBack(c, it, R, Rb, t, P, sil) {
    const m = it.m;
    if (m === 'mist') {
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + t * 0.35; const x = Math.cos(a) * R * 0.66, y = Math.sin(a) * R * 0.5 + R * 0.08; const g = c.createRadialGradient(x, y, 0, x, y, R * 0.34); g.addColorStop(0, withA(P[0], 0.8)); g.addColorStop(1, withA(P[0], 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 0.34, 0, TAU); c.fill(); }
    } else if (m === 'static') {
      c.setLineDash([R * 0.08, R * 0.06]); c.lineDashOffset = -t * R * 0.4;
      ring(c, Rb * 1.32, Rb * 1.32, 0, 0, TAU, R * 0.03, withA(P[1], 0.7)); c.lineDashOffset = t * R * 0.3; ring(c, Rb * 1.55, Rb * 1.55, 0, 0, TAU, R * 0.02, withA(P[0], 0.45)); c.setLineDash([]);
    } else if (m === 'ripple') {
      for (let i = 0; i < 3; i++) { const fr = (t * 0.45 + i / 3) % 1; ring(c, Rb * (1.05 + fr * 0.75), Rb * (1.05 + fr * 0.75) * 0.92, 0, 0, TAU, R * 0.04 * (1 - fr) + 1, sil ? P[1] : withA(P[1], (1 - fr) * 0.85)); }
    } else if (m === 'halo') {
      c.globalAlpha = 0.45; c.fillStyle = P[3];
      for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * TAU / 8 + t * 0.2); c.beginPath(); c.moveTo(-R * 0.035, 0); c.lineTo(0, -R * 1.05); c.lineTo(R * 0.035, 0); c.fill(); c.restore(); }
      c.globalAlpha = 1;
    } else if (m === 'orbit') {
      ring(c, R * 0.98, R * 0.3, -0.35, Math.PI, TAU, R * 0.075, P[3]);
      const a = t * 1.3; if (Math.sin(a) < 0) moon(c, R, a, P);
    } else if (m === 'mirage') {
      c.strokeStyle = withA(P[0], 0.5); c.lineWidth = R * 0.025;
      for (let k = 0; k < 4; k++) { const y = -R * 0.75 + k * R * 0.5; c.beginPath(); for (let i = 0; i <= 24; i++) { const x = -R + i * R / 12; const yy = y + Math.sin(i * 0.9 + t * 3 + k) * R * 0.035; i ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
      if (!sil) for (const s of [-1, 1]) { c.save(); c.globalAlpha = 0.3; c.translate(s * R * (0.16 + 0.05 * Math.sin(t * 2)), -R * 0.03); blob(c, Rb, t); c.fillStyle = P[3]; c.fill(); c.restore(); }
    } else if (m === 'vortex') {
      c.lineCap = 'round';
      for (let k = 0; k < 3; k++) for (let i = 0; i < 18; i++) {
        const r0 = Rb * 0.6 + i * R * 0.028, r1 = r0 + R * 0.03, a0 = k * TAU / 3 - t * 1.6 - r0 / R * 2.6, a1 = k * TAU / 3 - t * 1.6 - r1 / R * 2.6;
        c.strokeStyle = k & 1 ? P[3] : P[1]; c.globalAlpha = 0.85 * (1 - i / 18); c.lineWidth = R * 0.07 * (1 - i / 22);
        c.beginPath(); c.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); c.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); c.stroke();
      }
      c.globalAlpha = 1;
    } else if (m === 'galaxy') {
      const g = c.createLinearGradient(-Rb * 0.6, Rb * 0.5, Rb * 0.6, Rb * 1.8); g.addColorStop(0, '#f6c27a'); g.addColorStop(1, '#b7712c');
      c.fillStyle = sil ? P[1] : g; c.beginPath(); c.moveTo(-Rb * 0.72, Rb * 0.5); c.lineTo(Rb * 0.72, Rb * 0.5); c.lineTo(0, Rb * 1.78); c.closePath(); c.fill();
      if (!sil) {
        c.save(); c.clip(); c.strokeStyle = '#8a4b17'; c.lineWidth = R * 0.022;
        for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * Rb * 0.2 - Rb, Rb * 0.4); c.lineTo(i * Rb * 0.2 + Rb, Rb * 1.9); c.stroke(); c.beginPath(); c.moveTo(i * Rb * 0.2 + Rb, Rb * 0.4); c.lineTo(i * Rb * 0.2 - Rb, Rb * 1.9); c.stroke(); }
        c.restore();
      }
    } else if (m === 'prism') {
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + t * 0.5, x = Math.cos(a) * R * 0.86, y = Math.sin(a) * R * 0.7, s = R * (0.14 + 0.04 * Math.sin(t * 2 + i));
        c.save(); c.translate(x, y); c.rotate(a + t);
        const g = c.createLinearGradient(-s, -s, s, s); g.addColorStop(0, '#fff'); g.addColorStop(0.5, sil ? P[1] : hsl(i * 60 + t * 40, 95, 70)); g.addColorStop(1, P[2]);
        c.fillStyle = sil ? P[1] : g; c.beginPath(); c.moveTo(0, -s * 1.3); c.lineTo(s, s * 0.8); c.lineTo(-s, s * 0.8); c.closePath(); c.fill();
        c.restore();
      }
    } else if (m === 'nova') {
      c.save(); c.globalCompositeOperation = sil ? 'source-over' : 'lighter';
      for (const [n, ro, ri, sp, a] of [[12, 1.2, 0.62, 0.25, 0.55], [8, 0.98, 0.55, -0.4, 0.4]]) {
        const g = c.createRadialGradient(0, 0, Rb * 0.5, 0, 0, R * ro); g.addColorStop(0, P[3]); g.addColorStop(1, withA(P[1], 0));
        c.fillStyle = sil ? P[1] : g; c.globalAlpha = a; c.beginPath();
        for (let i = 0; i < n * 2; i++) { const ang = t * sp + i * Math.PI / n, rr = (i & 1 ? ri : ro) * R; i ? c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : c.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
        c.closePath(); c.fill();
      }
      c.restore();
    } else if (m === 'storm') {
      c.lineCap = 'round'; c.strokeStyle = sil ? P[1] : '#8b5a2b'; c.lineWidth = R * 0.075;
      c.beginPath(); c.moveTo(R * 0.8, -R * 0.82); c.lineTo(-R * 0.62, R * 0.62); c.stroke();
      c.save(); c.translate(-R * 0.62, R * 0.62); c.rotate(Math.PI * 0.25);
      c.fillStyle = sil ? P[1] : '#e8c36a'; c.beginPath(); c.moveTo(-R * 0.1, 0); c.lineTo(R * 0.1, 0); c.lineTo(R * 0.24, R * 0.42); c.lineTo(-R * 0.24, R * 0.42); c.closePath(); c.fill();
      if (!sil) { c.strokeStyle = '#b8862f'; c.lineWidth = R * 0.015; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * R * 0.025, R * 0.04); c.lineTo(i * R * 0.07, R * 0.4); c.stroke(); } c.fillStyle = '#c2410c'; c.fillRect(-R * 0.12, R * 0.02, R * 0.24, R * 0.06); }
      c.restore();
      for (let i = 0; i < 5; i++) { const x = -R * 0.6 + i * R * 0.3, y = -R * 0.78 + Math.sin(i * 2 + t) * R * 0.04; c.fillStyle = sil ? P[1] : (i & 1 ? '#475569' : '#64748b'); c.beginPath(); c.arc(x, y, R * (0.2 + (i % 3) * 0.04), 0, TAU); c.fill(); }
      const fl = (t * 0.9) % 1.6;
      if (!sil && fl < 0.22) {
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = P[3]; c.lineJoin = 'miter';
        for (const [x0, w] of [[-R * 0.55, R * 0.06], [R * 0.6, R * 0.045]]) { c.lineWidth = w; c.beginPath(); c.moveTo(x0, -R * 0.65); c.lineTo(x0 + R * 0.1, -R * 0.35); c.lineTo(x0 - R * 0.04, -R * 0.3); c.lineTo(x0 + R * 0.08, -R * 0.02); c.stroke(); }
        c.restore();
      }
    } else if (m === 'infinity') {
      c.save(); c.globalCompositeOperation = sil ? 'source-over' : 'lighter';
      const lem = s => { const d = 1 + Math.sin(s) * Math.sin(s); return [R * 1.08 * Math.cos(s) / d, R * 0.9 * Math.sin(s) * Math.cos(s) / d]; };
      const g = c.createLinearGradient(-R, 0, R, 0); g.addColorStop(0, P[3]); g.addColorStop(0.5, P[1]); g.addColorStop(1, P[3]);
      c.strokeStyle = sil ? P[1] : g; c.lineWidth = R * 0.1; c.lineCap = 'round'; c.beginPath();
      for (let i = 0; i <= 80; i++) { const [x, y] = lem(i / 80 * TAU); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      if (!sil) for (let k = 0; k < 2; k++) { const [x, y] = lem(t * 1.6 + k * Math.PI); glowAt(c, '#ffffff', x, y, R * 0.2, 0.9); }
      c.restore();
    } else if (m === 'singularity') {
      disk(c, R, t, P, false, sil);
    } else if (m === 'noodle') {
      c.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const a = k * TAU / 7 + t * 0.15; const pts = [];
        for (let i = 0; i <= 18; i++) { const r = Rb * 0.5 + i * R * 0.034, w = Math.sin(i * 0.7 - t * 3 + k) * R * 0.07; pts.push([Math.cos(a) * r - Math.sin(a) * w, Math.sin(a) * r + Math.cos(a) * w]); }
        for (const [lw, col] of [[R * 0.075, sil ? P[1] : '#b45309'], [R * 0.045, sil ? P[1] : '#fde68a']]) { c.lineWidth = lw; c.strokeStyle = col; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
      }
    }
  }
  function motifInner(c, it, Rb, t, P) {
    const m = it.m;
    if (m === 'static') {
      const s = Rb * 0.17, f = Math.floor(t * 9);
      for (let i = -6; i < 6; i++) for (let j = -6; j < 6; j++) { const h = hash(i, j, f); if (h > 0.72) { c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(i * s, j * s, s, s); } else if (h < 0.1) { c.fillStyle = 'rgba(15,23,42,0.25)'; c.fillRect(i * s, j * s, s, s); } }
      c.fillStyle = 'rgba(15,23,42,0.12)'; for (let y = -Rb; y < Rb; y += Rb * 0.09) c.fillRect(-Rb, y, Rb * 2, Rb * 0.03);
    } else if (m === 'mirage') {
      for (let k = 0; k < 5; k++) { c.fillStyle = k & 1 ? 'rgba(255,255,255,0.13)' : 'rgba(8,47,73,0.1)'; c.fillRect(-Rb, -Rb + ((k * 0.4 + t * 0.3) % 2) * Rb, Rb * 2, Rb * 0.16); }
    } else if (m === 'vortex') {
      const cols = [P[0], P[3], '#ef4444', P[0], '#16a34a', P[3]];
      for (let k = 0; k < 7; k++) { c.fillStyle = cols[k % cols.length]; c.globalAlpha = 0.32; c.beginPath(); const y = -Rb + k * Rb * 0.32 + Rb * 0.06; c.moveTo(-Rb, y); for (let i = 0; i <= 12; i++) c.lineTo(-Rb + i * Rb / 6, y + Math.sin(i * 1.3 + k + t * 2) * Rb * 0.045); c.lineTo(Rb, y + Rb * 0.11); c.lineTo(-Rb, y + Rb * 0.11); c.fill(); }
      c.globalAlpha = 1;
    } else if (m === 'galaxy' || m === 'infinity') {
      const rnd = mulberry(it.id.length * 99);
      for (let i = 0; i < 3; i++) { const x = (rnd() - 0.5) * Rb * 1.2, y = (rnd() - 0.5) * Rb * 1.2; const g = c.createRadialGradient(x, y, 0, x, y, Rb * 0.6); g.addColorStop(0, withA(i & 1 ? P[3] : P[0], 0.4)); g.addColorStop(1, withA(P[0], 0)); c.fillStyle = g; c.fillRect(-Rb, -Rb, Rb * 2, Rb * 2); }
      c.fillStyle = '#fff'; for (let i = 0; i < 22; i++) { const x = (rnd() - 0.5) * Rb * 1.9, y = (rnd() - 0.5) * Rb * 1.9, tw = 0.5 + 0.5 * Math.sin(t * 3 + i); c.globalAlpha = 0.4 + 0.6 * tw; c.beginPath(); c.arc(x, y, Rb * (0.015 + 0.02 * rnd()), 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    } else if (m === 'prism') {
      for (let i = 0; i < 8; i++) { const a0 = i * TAU / 8 + 0.2, a1 = a0 + TAU / 8; c.fillStyle = i & 1 ? 'rgba(255,255,255,0.18)' : 'rgba(120,53,15,0.12)'; c.beginPath(); c.moveTo(0, -Rb * 0.1); c.lineTo(Math.cos(a0) * Rb * 1.2, Math.sin(a0) * Rb * 1.2); c.lineTo(Math.cos(a1) * Rb * 1.2, Math.sin(a1) * Rb * 1.2); c.fill(); }
      for (const [x, y, r] of [[-0.55, -0.45, 0.13], [0.5, -0.5, 0.11], [0.58, 0.42, 0.12], [-0.48, 0.5, 0.1]]) { c.fillStyle = P[3]; c.beginPath(); c.arc(x * Rb, y * Rb, r * Rb, 0, TAU); c.fill(); c.fillStyle = 'rgba(127,29,29,0.5)'; c.beginPath(); c.arc(x * Rb + r * Rb * 0.3, y * Rb + r * Rb * 0.2, r * Rb * 0.25, 0, TAU); c.fill(); }
    } else if (m === 'nova') {
      c.strokeStyle = 'rgba(254,243,199,0.45)'; c.lineWidth = Rb * 0.09; c.beginPath(); c.arc(0, 0, Rb * 0.86, 0, TAU); c.stroke();
    } else if (m === 'singularity') {
      c.strokeStyle = 'rgba(129,140,248,0.45)'; c.lineWidth = Rb * 0.04; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, Rb * (0.45 + i * 0.18), t * (1 + i), t * (1 + i) + 2.2); c.stroke(); }
    } else if (m === 'noodle') {
      c.fillStyle = 'rgba(127,29,29,0.35)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(Math.cos(i * 1.7) * Rb * 0.6, Math.sin(i * 2.3) * Rb * 0.6, Rb * 0.08, 0, TAU); c.fill(); }
    }
  }
  function motifFront(c, it, R, Rb, t, P, sil) {
    const m = it.m;
    if (m === 'mist') {
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { c.fillStyle = sil ? P[1] : (i === 1 ? '#ffffff' : P[0]); c.beginPath(); c.arc(s * (Rb * 0.45 + i * Rb * 0.22), Rb * 0.88 - (i === 1 ? Rb * 0.1 : 0), Rb * (0.24 - i * 0.03), 0, TAU); c.fill(); }
    } else if (m === 'ripple') {
      const fr = (t * 0.5) % 1, y = -Rb * 1.0 - fr * R * 0.2, x = Rb * 0.85, s = R * 0.09;
      c.globalAlpha = 1 - fr * 0.7; c.fillStyle = sil ? P[1] : '#fb7185'; c.beginPath();
      c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4); c.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); c.fill(); c.globalAlpha = 1;
    } else if (m === 'halo') {
      c.save(); c.translate(0, -Rb * 1.12 + Math.sin(t * 2) * Rb * 0.04);
      if (!sil) { c.globalCompositeOperation = 'lighter'; glowAt(c, '#fbbf24', 0, 0, Rb * 0.9, 0.5); c.globalCompositeOperation = 'source-over'; }
      const g = c.createLinearGradient(-Rb * 0.6, 0, Rb * 0.6, 0); g.addColorStop(0, '#fff7cc'); g.addColorStop(0.5, P[3]); g.addColorStop(1, '#fff7cc');
      ring(c, Rb * 0.6, Rb * 0.16, 0, 0, TAU, Rb * 0.12, sil ? P[1] : g); c.restore();
    } else if (m === 'orbit') {
      ring(c, R * 0.98, R * 0.3, -0.35, 0, Math.PI, R * 0.075, P[3]);
      const a = t * 1.3; if (Math.sin(a) >= 0) moon(c, R, a, P);
    } else if (m === 'galaxy') {
      c.fillStyle = P[0]; for (let i = 0; i < 6; i++) { const x = -Rb * 0.75 + i * Rb * 0.3; c.beginPath(); c.arc(x, Rb * 0.6, Rb * 0.15, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(-Rb * 0.32, Rb * 0.8, Rb * 0.07, Rb * 0.14 + Math.sin(t * 1.5) * Rb * 0.03, 0, 0, TAU); c.fill();
      c.fillStyle = sil ? P[1] : '#ef4444'; c.beginPath(); c.arc(Rb * 0.12, -Rb * 0.98, Rb * 0.13, 0, TAU); c.fill();
      c.strokeStyle = sil ? P[1] : '#166534'; c.lineWidth = Rb * 0.04; c.beginPath(); c.moveTo(Rb * 0.12, -Rb * 1.08); c.quadraticCurveTo(Rb * 0.2, -Rb * 1.25, Rb * 0.32, -Rb * 1.24); c.stroke();
    } else if (m === 'crown') {
      c.save(); c.translate(0, -Rb * 0.98); c.rotate(-0.12 + Math.sin(t * 1.8) * 0.04);
      const w = Rb * 0.6, h = Rb * 0.5, g = c.createLinearGradient(0, -h, 0, h * 0.3); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#fbbf24'); g.addColorStop(1, '#b45309');
      c.fillStyle = sil ? P[1] : g; c.strokeStyle = sil ? P[1] : '#78350f'; c.lineWidth = Rb * 0.04; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-w, h * 0.3); c.lineTo(-w * 1.05, -h * 0.75); c.lineTo(-w * 0.5, -h * 0.15); c.lineTo(0, -h); c.lineTo(w * 0.5, -h * 0.15); c.lineTo(w * 1.05, -h * 0.75); c.lineTo(w, h * 0.3); c.closePath(); c.fill(); c.stroke();
      if (!sil) { [[-w * 0.55, '#ef4444'], [0, '#3b82f6'], [w * 0.55, '#22c55e']].forEach(([x, col]) => { c.fillStyle = col; c.beginPath(); c.arc(x, h * 0.02, Rb * 0.075, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - Rb * 0.025, h * 0.02 - Rb * 0.025, Rb * 0.022, 0, TAU); c.fill(); }); for (const x of [-w * 1.05, 0, w * 1.05]) { c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(x, x ? -h * 0.75 : -h, Rb * 0.06, 0, TAU); c.fill(); } }
      c.restore();
    } else if (m === 'nova') {
      c.lineCap = 'round'; c.lineWidth = Rb * 0.07;
      for (let i = 0; i < 3; i++) { const fr = (t * 0.6 + i / 3) % 1, x0 = (i - 1) * Rb * 0.35; c.strokeStyle = sil ? P[1] : `rgba(255,251,235,${(1 - fr) * 0.75})`; c.beginPath(); for (let k = 0; k <= 10; k++) { const y = -Rb * 0.95 - fr * Rb * 0.5 - k * Rb * 0.06, x = x0 + Math.sin(k * 0.8 + t * 3 + i) * Rb * 0.08; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    } else if (m === 'singularity') {
      if (!sil) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = P[3]; c.lineWidth = Rb * 0.05; c.globalAlpha = 0.8; c.beginPath(); c.arc(0, 0, Rb * 1.04, 0, TAU); c.stroke(); c.restore(); }
      disk(c, R, t, P, true, sil);
    } else if (m === 'noodle') {
      const a = t * 1.1, x = Math.cos(a) * R * 0.82, y = Math.sin(a) * R * 0.45 + R * 0.25, r = R * 0.12;
      const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r); g.addColorStop(0, '#d08a5a'); g.addColorStop(1, '#6b3415');
      c.fillStyle = sil ? P[1] : g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  }
  /** Draw an aura collectible centred at (0,0) in a box of radius R. opts.sil = undiscovered silhouette. */
  function drawAura(c, it, mut, t, R, opts = {}) {
    const sil = !!opts.sil, P = sil ? ['#2a2f4d', '#1c2140', '#12162b', '#2a2f4d'] : palette(it, mut, t);
    const oy = it.m === 'galaxy' ? -R * 0.16 : it.m === 'crown' || it.m === 'halo' ? R * 0.1 : 0;
    const Rb = R * 0.56, sq = Math.sin(t * 3.2) * 0.035;
    c.save(); c.translate(0, oy);
    if (!sil && !opts.noGlow) { c.globalCompositeOperation = 'lighter'; glowAt(c, mut === 'g' ? '#f59e0b' : mut === 'r' ? '#e879f9' : it.p[1], 0, 0, R * 1.45, mut === 'n' ? 0.55 : 0.4); c.globalCompositeOperation = 'source-over'; }
    motifBack(c, it, R, Rb, t, P, sil);
    c.save(); c.scale(1 + sq, 1 - sq);
    blob(c, Rb, t);
    if (sil) { c.fillStyle = P[1]; c.fill(); c.strokeStyle = '#3b4170'; c.lineWidth = R * 0.025; c.stroke(); }
    else {
      const g = c.createRadialGradient(-Rb * 0.32, -Rb * 0.38, Rb * 0.05, 0, 0, Rb * 1.05); g.addColorStop(0, P[0]); g.addColorStop(0.55, P[1]); g.addColorStop(1, P[2]);
      c.fillStyle = g; c.fill();
      c.save(); c.clip(); motifInner(c, it, Rb, t, P);
      if (mut === 'g' || mut === 'r') { // mutation sheen sweeps across the body
        const x = ((t * 0.55) % 1.7 - 0.35) * Rb * 3 - Rb * 1.5, sg = c.createLinearGradient(x - Rb * 0.45, -Rb, x + Rb * 0.45, Rb);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, mut === 'g' ? 'rgba(255,250,215,0.7)' : 'rgba(255,255,255,0.5)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = sg; c.fillRect(-Rb * 1.2, -Rb * 1.2, Rb * 2.4, Rb * 2.4);
        if (mut === 'r') { const rg = c.createLinearGradient(-Rb, -Rb, Rb, Rb); for (let i = 0; i <= 6; i++) rg.addColorStop(i / 6, hsl(t * 120 + i * 60, 100, 60)); c.globalAlpha = 0.22; c.globalCompositeOperation = 'screen'; c.fillStyle = rg; c.fillRect(-Rb * 1.2, -Rb * 1.2, Rb * 2.4, Rb * 2.4); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      }
      c.restore();
      c.strokeStyle = mut === 'g' ? '#fff3c4' : P[3]; c.globalAlpha = 0.75; c.lineWidth = R * 0.028; blob(c, Rb, t); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-Rb * 0.38, -Rb * 0.52, Rb * 0.24, Rb * 0.13, -0.6, 0, TAU); c.fill();
      c.beginPath(); c.arc(-Rb * 0.08, -Rb * 0.7, Rb * 0.05, 0, TAU); c.fill();
      face(c, Rb, it, t, P);
    }
    c.restore();
    motifFront(c, it, R, Rb, t, P, sil);
    if (!sil && !opts.noSpark) {
      const n = mut === 'n' ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + t * 0.7, tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7), r = R * (0.88 + 0.1 * Math.sin(i * 3.1));
        c.fillStyle = mut === 'r' ? hsl(t * 90 + i * 45, 100, 80) : mut === 'g' ? '#fff3b0' : (i & 1 ? '#ffffff' : P[3]);
        c.globalAlpha = 0.35 + 0.65 * tw; star4(c, Math.cos(a) * r, Math.sin(a) * r * 0.9, R * (0.05 + 0.04 * tw), t); c.fill();
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }

  // ---- Box screen ----
  let ov = null, cv = null, cx2 = null, W = 0, H = 0, DPR = 1, raf = 0, lastT = 0, T = 0;
  let phase = 'closed', roll = null, taps = 0, tier = 0, tierPop = 0, flash = 0, sq = 0, sqv = 0, shake = 0, boxIn = 0, cracks = [], crackBorn = [];
  let revT = 0, result = null, mutShown = false, mutFlash = 0, upMsg = null, upT = 0, btnShown = false, busy = false;
  const parts = [], motes = [];
  function css() {
    if (doc.getElementById('abxCss')) return;
    const st = doc.createElement('style'); st.id = 'abxCss'; st.textContent = `
.abx{position:fixed;inset:0;z-index:300;display:none;background:radial-gradient(130% 75% at 50% 42%,#2b1460 0%,#120a33 55%,#05030f 100%);touch-action:none;font-family:${FONT};color:#fff;overflow:hidden}
.abx canvas.abx-c{position:absolute;inset:0;width:100%;height:100%}
.abx-top{position:absolute;top:calc(max(env(safe-area-inset-top,0px),14px) + 4px);left:14px;right:14px;display:flex;justify-content:space-between;align-items:center;pointer-events:none;z-index:2}
.abx-x{pointer-events:auto;width:44px;height:44px;border-radius:50%;border:2px solid #6b7280;background:rgba(15,23,42,.82);color:#fff;font-size:18px;font-family:sans-serif;cursor:pointer}
.abx-x:active{transform:scale(.92)}
.abx-chip{background:rgba(15,23,42,.8);border:2px solid #f472b6;border-radius:20px;padding:7px 14px;font-size:14px;box-shadow:0 0 16px rgba(244,114,182,.35)}
.abx-bot{position:absolute;left:16px;right:16px;bottom:calc(max(env(safe-area-inset-bottom,0px),16px) + 6px);display:flex;flex-direction:column;gap:10px;z-index:2;transition:opacity .25s,transform .25s}
.abx-bot.hide{opacity:0;transform:translateY(16px);pointer-events:none}
.abx-row{display:flex;gap:10px}.abx-row .btn{flex:1;font-size:14px;padding:12px 6px;margin:0;letter-spacing:.5px}
.abx .btn{margin:0}
.btn.abx-pink{background:linear-gradient(180deg,#f0abfc 0%,#c026d3 50%,#86198f 100%);border-color:#fae8ff;color:#fff;text-shadow:0 2px 0 rgba(80,7,80,.6);box-shadow:0 8px 24px rgba(217,70,239,.5)}
.btn.abx-dim{background:rgba(30,27,75,.88);border-color:#6366f1;color:#e0e7ff;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.btn.abx-dim.on{border-color:#facc15;color:#fde68a}
.abx-menu{display:flex;gap:10px;margin-top:10px}.abx-menu .btn{margin:0;font-size:15px;padding:11px 8px;flex:1;position:relative;letter-spacing:.5px}
.abx-badge{position:absolute;top:-10px;right:-6px;min-width:24px;height:24px;border-radius:12px;background:#ef4444;color:#fff;font-size:13px;line-height:20px;border:2px solid #fff;padding:0 5px;animation:abxPulse 1s infinite alternate}
@keyframes abxPulse{from{transform:scale(1)}to{transform:scale(1.15)}}
.btn.abx-end{margin-bottom:10px;font-size:16px;padding:12px 16px;animation:abxGlow 1.2s infinite alternate}
@keyframes abxGlow{from{box-shadow:0 6px 18px rgba(236,72,153,.4)}to{box-shadow:0 6px 30px rgba(244,114,182,.9)}}
.abx-ix{position:fixed;inset:0;z-index:310;display:none;background:linear-gradient(180deg,#1b0f45 0%,#0b0820 100%);color:#fff;font-family:${FONT};overflow-y:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch}
.abx-ix *{touch-action:pan-y}
.abx-ix-in{padding:calc(max(env(safe-area-inset-top,0px),14px) + 4px) 14px calc(max(env(safe-area-inset-bottom,0px),16px) + 20px);max-width:560px;margin:0 auto}
.abx-ihead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.abx-ihead h2{font-size:26px;font-weight:normal;letter-spacing:1px;background:linear-gradient(90deg,#f0abfc,#facc15);-webkit-background-clip:text;background-clip:text;color:transparent}
.abx-prog{background:rgba(15,23,42,.7);border:2px solid #4c1d95;border-radius:16px;padding:12px 14px;margin-bottom:12px}
.abx-prog .l{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}.abx-prog b{font-size:28px;font-weight:normal;color:#facc15}
.abx-prog small{font-family:Roboto,Arial,sans-serif;font-weight:bold;color:#c4b5fd;font-size:12px;text-align:right}
.abx-bar{height:12px;border-radius:8px;background:#0f0a24;overflow:hidden;border:1px solid #6d28d9}.abx-bar i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#a855f7,#f472b6,#facc15);box-shadow:0 0 10px #f472b6}
.abx-tabs{display:flex;gap:8px;margin-bottom:12px}.abx-tabs button{flex:1;padding:10px 4px;border-radius:12px;border:2px solid #4338ca;background:rgba(30,27,75,.8);color:#c7d2fe;font-family:inherit;font-size:12px;cursor:pointer;letter-spacing:.5px}
.abx-tabs button.on{border-color:#facc15;color:#fff;background:linear-gradient(180deg,#4c1d95,#2e1065);box-shadow:0 0 14px rgba(250,204,21,.35)}
.abx-tabs button[data-m=g].on{border-color:#fbbf24;background:linear-gradient(180deg,#92400e,#451a03)}
.abx-tabs button[data-m=r].on{border-color:#f0abfc;background:linear-gradient(120deg,#be185d,#6d28d9,#0369a1)}
.abx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.abx-tile{position:relative;border-radius:16px;border:2px solid var(--tc);background:radial-gradient(circle at 50% 38%,var(--tg) 0%,rgba(15,10,40,.95) 70%);padding:6px 4px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;color:#fff;font-family:inherit;overflow:hidden}
.abx-tile:active{transform:scale(.96)}
.abx-tile canvas{width:100%;aspect-ratio:1/1;display:block}
.abx-tile .nm{font-size:11px;line-height:1.15;min-height:26px;display:flex;align-items:center;justify-content:center;text-align:center;letter-spacing:.3px}
.abx-tile .tr{font-family:Roboto,Arial,sans-serif;font-weight:bold;font-size:9px;color:var(--tc);letter-spacing:1px}
.abx-tile.lock .nm{color:#64748b}.abx-tile.lock{border-color:#312e81;background:rgba(15,10,40,.9)}
.abx-tile .ct{position:absolute;top:6px;right:7px;font-style:normal;font-size:11px;background:rgba(0,0,0,.55);border-radius:8px;padding:1px 6px}
.abx-tile .eq{position:absolute;bottom:42px;right:7px;font-style:normal;font-size:10px;background:#facc15;color:#1e1033;border-radius:8px;padding:2px 6px}
.abx-tile .nw{position:absolute;top:6px;left:6px;font-style:normal;font-size:10px;background:#ef4444;border-radius:8px;padding:2px 6px;animation:abxPulse .8s infinite alternate}
.abx-tile.mg:not(.lock){box-shadow:0 0 14px rgba(251,191,36,.45)}
.abx-tile.mr:not(.lock){box-shadow:0 0 14px rgba(240,171,252,.5)}
.abx-tile.mg:not(.lock)::after,.abx-tile.mr:not(.lock)::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.3) 47%,transparent 60%);background-size:250% 100%;animation:abxSheen 2.6s infinite linear}
@keyframes abxSheen{from{background-position:150% 0}to{background-position:-100% 0}}
.abx-tier{grid-column:1/-1;font-size:12px;letter-spacing:2px;margin:6px 2px -2px;color:var(--tc);display:flex;align-items:center;gap:8px}
.abx-tier::after{content:'';flex:1;height:2px;background:linear-gradient(90deg,var(--tc),transparent);opacity:.5}
.abx-m{position:fixed;inset:0;z-index:330;display:none;align-items:center;justify-content:center;background:rgba(2,0,12,.82);backdrop-filter:blur(5px)}
.abx-card{width:90%;max-width:400px;max-height:90vh;overflow-y:auto;touch-action:pan-y;background:linear-gradient(180deg,#24124f,#0d0a26);border:3px solid #a855f7;border-radius:22px;padding:20px 18px;color:#fff;font-family:${FONT};text-align:center;box-shadow:0 20px 60px rgba(168,85,247,.35);animation:slideUp .35s ease-out}
.abx-card h3{font-size:22px;font-weight:normal;color:#f0abfc;margin-bottom:6px;letter-spacing:1px}
.abx-card p{font-family:Roboto,Arial,sans-serif;font-weight:bold;font-size:13px;color:#c4b5fd;line-height:1.45;margin:8px 0}
.abx-card .btn{margin-top:8px}
.abx-odds{width:100%;border-collapse:collapse;margin:8px 0;font-size:14px}.abx-odds td,.abx-odds th{padding:7px 6px;border-bottom:1px solid rgba(167,139,250,.25)}
.abx-odds th{font-size:10px;color:#a5b4fc;font-weight:normal;letter-spacing:1px}.abx-odds td{text-align:right;font-family:Roboto,Arial,sans-serif;font-weight:bold}
.abx-odds td:first-child{text-align:left;font-family:${FONT};font-weight:normal}
.abx-det canvas{width:min(66vw,270px);aspect-ratio:1/1;display:block;margin:0 auto}
.abx-vars{display:flex;gap:8px;justify-content:center;margin:10px 0}.abx-vars button{flex:1;max-width:110px;padding:8px 4px;border-radius:12px;border:2px solid #4338ca;background:rgba(30,27,75,.8);color:#c7d2fe;font-family:inherit;font-size:11px;cursor:pointer}
.abx-vars button.on{border-color:#facc15;color:#fff}.abx-vars button:disabled{opacity:.4}
.abx-chipT{display:inline-block;border:2px solid var(--tc);color:var(--tc);border-radius:12px;padding:3px 10px;font-size:12px;letter-spacing:1px;margin:2px}
`;
    doc.head.appendChild(st);
  }
  function el(tag, cls, html) { const e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function build() {
    if (ov) return; css();
    ov = el('div', 'abx'); ov.id = 'auraBox';
    cv = el('canvas', 'abx-c'); ov.appendChild(cv); cx2 = cv.getContext('2d');
    const top = el('div', 'abx-top'); top.innerHTML = '<span class="abx-chip" id="abxCount"></span>';
    const x = el('button', 'abx-x', '\u2715'); x.id = 'abxClose'; x.setAttribute('aria-label', 'Close'); x.onclick = close; top.appendChild(x); ov.appendChild(top);
    const bot = el('div', 'abx-bot'); bot.id = 'abxBot'; ov.appendChild(bot);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); tap(); });
    doc.body.appendChild(ov);
    root.addEventListener('resize', size);
  }
  let dprCap = 3, slowN = 0, slowT = 0; // adaptive: a device that can't hold ~60fps at full DPR drops to 2x
  function size() { if (!ov) return; DPR = Math.min(root.devicePixelRatio || 1, dprCap); W = ov.clientWidth || root.innerWidth; H = ov.clientHeight || root.innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
  const L = () => { const s = Math.min(W * 0.5, H * 0.25), cy = H * 0.42; return { s, cx: W / 2, cy, base: cy + s * 0.62, R: Math.min(W * 0.37, H * 0.175) }; };
  function cube(s) { return { T: [0, -0.6 * s], L: [-0.52 * s, -0.3 * s], R: [0.52 * s, -0.3 * s], C: [0, 0], BL: [-0.52 * s, 0.36 * s], BR: [0.52 * s, 0.36 * s], B: [0, 0.66 * s] }; }
  function faceXf(P, f) { const [o, a, b] = f === 0 ? [P.L, P.C, P.BL] : f === 1 ? [P.C, P.R, P.B] : [P.L, P.T, P.C]; return [(a[0] - o[0]) / 100, (a[1] - o[1]) / 100, (b[0] - o[0]) / 100, (b[1] - o[1]) / 100, o[0], o[1]]; }
  function makeCracks(seed) {
    const rnd = mulberry(seed || 1), out = [], cl = v => Math.max(4, Math.min(96, v));
    const plan = [[1, 0], [2, 1], [2, 0], [3, 1], [3, 2], [3, 0], [4, 0], [4, 1], [4, 2], [4, 1]];
    for (const [stage, face] of plan) {
      const pts = [[25 + rnd() * 50, 25 + rnd() * 50]]; let ang = rnd() * TAU;
      for (let i = 0; i < 5 + Math.floor(rnd() * 3); i++) { ang += (rnd() - 0.5) * 1.4; const l = 7 + rnd() * 9, p = pts[pts.length - 1]; pts.push([cl(p[0] + Math.cos(ang) * l), cl(p[1] + Math.sin(ang) * l)]); }
      const k = 1 + Math.floor(rnd() * (pts.length - 2)), br = [pts[k]]; let a2 = ang + 1.2;
      for (let i = 0; i < 3; i++) { a2 += (rnd() - 0.5) * 1.2; const p = br[br.length - 1]; br.push([cl(p[0] + Math.cos(a2) * 7), cl(p[1] + Math.sin(a2) * 7)]); }
      out.push({ stage, face, pts, br });
    }
    return out;
  }
  const visStage = () => Math.min(taps, UP_TAPS);
  function spawn(p) { if (parts.length < 520) parts.push(p); }
  function burst(x, y, n, cols, spd = 420, kinds = ['dot', 'star']) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * (0.25 + Math.random()); spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.2, g: 380, life: 0, max: 0.7 + Math.random() * 0.8, size: 3 + Math.random() * 7, col: cols[i % cols.length], kind: kinds[i % kinds.length], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, drag: 0.92 }); }
  }
  function open() {
    build(); if (hooks.initAudio) hooks.initAudio();
    ov.style.display = 'block'; size(); parts.length = 0; motes.length = 0;
    for (let i = 0; i < 34; i++) motes.push({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2.5, v: 0.02 + Math.random() * 0.05, p: Math.random() * TAU });
    prepare();
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function prepare() {
    btnShown = false; result = null; mutShown = false; mutFlash = 0; revT = 0; upMsg = null; flash = 0;
    if (S.pending > 0) {
      if (!S.cur) { S.cur = rollBox(); persist(); }
      roll = S.cur; taps = roll.taps || 0; tier = tierAt(roll, taps); cracks = makeCracks(roll.seed); crackBorn = cracks.map(c => (c.stage <= taps ? -9 : 0));
      phase = 'idle'; boxIn = 0; sq = 0; sqv = 0; shake = 0; tierPop = 0;
      SFX.whoosh();
    } else { phase = 'empty'; roll = null; boxIn = 1; taps = 0; tier = 0; }
    renderButtons(); refreshButtons();
  }
  function close() {
    if (!ov) return; ov.style.display = 'none'; phase = 'closed';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    refreshButtons(); renderEndOffer(); if (hooks.onClose) hooks.onClose();
  }
  function tap() {
    if (phase !== 'idle' || boxIn < 0.75) return;
    taps++; roll.taps = Math.min(taps, TAPS - 1); persist();
    const L0 = L(); sqv += 11; shake = 7 + taps * 2.5; tierPop = Math.max(tierPop, 0.35);
    SFX.pop(1 + taps * 0.13); SFX.squelch(0.9 + taps * 0.08); if (taps <= UP_TAPS) SFX.crack(0.6 + taps * 0.15);
    buzz(taps >= 3 ? 'heavy' : 'light');
    cracks.forEach((c, i) => { if (c.stage === taps) crackBorn[i] = T; });
    const tr = TIERS[tier];
    for (let i = 0; i < 10 + taps * 4; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 160 + Math.random() * 360; spawn({ x: L0.cx + (Math.random() - 0.5) * L0.s * 0.6, y: L0.cy - L0.s * 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 520, life: 0, max: 0.5 + Math.random() * 0.6, size: 4 + Math.random() * 8, col: i & 1 ? tr.glow : tr.hi, kind: i % 3 ? 'bubble' : 'star', rot: 0, vr: 4, drag: 0.95 }); }
    if (taps <= UP_TAPS && roll.ups[taps - 1]) {
      tier++; upMsg = TIERS[tier].n; upT = 0; tierPop = 1; flash = Math.max(flash, 0.55);
      spawn({ kind: 'ring', x: L0.cx, y: L0.cy, r: L0.s * 0.3, vr: L0.s * 4.5, life: 0, max: 0.55, col: TIERS[tier].glow, size: 10 });
      burst(L0.cx, L0.cy, 46, [TIERS[tier].glow, TIERS[tier].hi, '#ffffff'], 520);
      const t2 = tier; setTimeout(() => SFX.chime(t2), 60); buzz('success');
    }
    if (taps >= TAPS) reveal();
  }
  function reveal() {
    phase = 'reveal'; revT = 0; const ft = finalTier(roll);
    result = record(S, roll); persist();
    if (result.essence && hooks.award) hooks.award(result.essence);
    const L0 = L(), tr = TIERS[ft], cols = [tr.hi, tr.col, tr.lo];
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, v = 300 + Math.random() * 600, sz = L0.s * (0.1 + Math.random() * 0.14); spawn({ kind: 'shard', x: L0.cx + (Math.random() - 0.5) * L0.s * 0.5, y: L0.cy + (Math.random() - 0.5) * L0.s * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 300, g: 1500, life: 0, max: 1.3, size: sz, col: cols[i % 3], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, drag: 0.99, pts: [[-1, -0.6], [1, -0.9], [0.3, 1]] }); }
    burst(L0.cx, L0.cy, 50 + ft * 30, [tr.glow, tr.hi, '#ffffff'], 600 + ft * 120, ['dot', 'star', 'dot']);
    spawn({ kind: 'ring', x: L0.cx, y: L0.cy, r: L0.s * 0.2, vr: L0.s * 6, life: 0, max: 0.7, col: tr.glow, size: 14 });
    if (ft >= 3) for (let i = 0; i < 70; i++) spawn({ kind: 'conf', x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 80, vy: 120 + Math.random() * 220, g: 60, life: 0, max: 3 + Math.random() * 1.5, size: 5 + Math.random() * 5, col: hsl(Math.random() * 360, 90, 62), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, drag: 1 });
    SFX.crack(1.4); SFX.pop(0.7); SFX.fanfare(ft); buzz('success'); if (ft >= 3) setTimeout(() => buzz('heavy'), 160);
    renderButtons(); refreshButtons();
  }
  function mutBeat() {
    mutShown = true; mutFlash = 1; const L0 = L(), y = L0.cy;
    if (roll.mut === 'g') { SFX.gold(); for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, v = 200 + Math.random() * 500; spawn({ kind: 'coin', x: L0.cx, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 350, g: 900, life: 0, max: 1.4, size: 7 + Math.random() * 6, col: '#fbbf24', rot: Math.random() * TAU, vr: 10 + Math.random() * 10, drag: 0.985 }); } }
    else { SFX.shimmer(); for (let i = 0; i < 60; i++) { const a = Math.random() * TAU, v = 150 + Math.random() * 550; spawn({ kind: 'star', x: L0.cx, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, g: 300, life: 0, max: 1.2 + Math.random() * 0.6, size: 5 + Math.random() * 8, col: hsl(i * 25, 100, 70), rot: 0, vr: 6, drag: 0.95 }); } }
    spawn({ kind: 'ring', x: L0.cx, y, r: 10, vr: W * 2.2, life: 0, max: 0.6, col: roll.mut === 'g' ? '#fde68a' : '#f0abfc', size: 12 });
    buzz('heavy');
  }
  function renderButtons() {
    const bot = doc.getElementById('abxBot'); if (!bot) return; bot.innerHTML = '';
    const mk = (cls, txt, fn, id) => { const b = el('button', 'btn ' + cls, txt); if (id) b.id = id; b.onclick = fn; return b; };
    const row = el('div', 'abx-row');
    bot.classList.toggle('hide', phase === 'reveal' && !btnShown);
    if (phase === 'reveal') {
      if (S.pending > 0) bot.appendChild(mk('abx-pink', `\ud83c\udf81 OPEN NEXT BOX (${S.pending})`, prepare, 'abxNext'));
      else { const ad = bonusButton(); if (ad) bot.appendChild(ad); }
      const key = result && result.key;
      if (key) row.appendChild(mk('abx-dim' + (S.equipped === key ? ' on' : ''), S.equipped === key ? '\u2714 EQUIPPED' : '\u2728 EQUIP', () => { equip(key); renderButtons(); }, 'abxEquip'));
    } else if (phase === 'empty') { const ad = bonusButton(); if (ad) bot.appendChild(ad); }
    row.appendChild(mk('abx-dim', '\ud83d\udcd6 INDEX', openIndex, 'abxIndex'));
    row.appendChild(mk('abx-dim', '% ODDS', openOdds, 'abxOdds'));
    bot.appendChild(row);
    if (phase !== 'idle') bot.appendChild(mk('gold', 'DONE', close, 'abxDone'));
    const n = doc.getElementById('abxCount'); if (n) n.textContent = `\ud83c\udf81 ${S.pending} BOX${S.pending === 1 ? '' : 'ES'} LEFT`;
  }
  function bonusButton() {
    if (!canBonus(S) || !(hooks.ads && hooks.ads.can())) return null;
    const b = el('button', 'btn ad', '\u25b6 BONUS BOX (WATCH AD)'); b.id = 'abxBonus'; b.style.marginBottom = '0';
    b.onclick = async () => {
      if (busy) return; busy = true; b.disabled = true; let ok = false;
      try { ok = await hooks.ads.show(); } catch (e) { ok = false; }
      busy = false;
      if (ok && grantBonus(S)) { persist(); prepare(); } else renderButtons();
    };
    return b;
  }
  function update(dt) {
    T += dt;
    boxIn = Math.min(1, boxIn + dt / 0.75);
    sqv += (-170 * sq - 13 * sqv) * dt; sq += sqv * dt; sq = Math.max(-0.6, Math.min(0.6, sq));
    shake = Math.max(0, shake - dt * 40); tierPop = Math.max(0, tierPop - dt * 1.6); flash = Math.max(0, flash - dt * (phase === 'reveal' ? 1.6 : 2.5)); mutFlash = Math.max(0, mutFlash - dt * 1.8); upT += dt;
    if (phase === 'reveal') {
      revT += dt;
      if (!mutShown && roll.mut !== 'n' && revT > 1.05) mutBeat();
      if (!btnShown && revT > (roll.mut !== 'n' ? 1.9 : 1.0)) { btnShown = true; renderButtons(); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt; if (p.life >= p.max) { parts.splice(i, 1); continue; }
      if (p.kind === 'ring') { p.r += p.vr * dt; p.vr *= 0.9; continue; }
      p.vy += p.g * dt; const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  }
  const easeBounce = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
  const easeElastic = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1;
  function text(c, str, x, y, size, fill, stroke, scale = 1, sw = 0.16) {
    c.save(); c.translate(x, y); c.scale(scale, scale); c.font = `${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    if (stroke) { c.lineWidth = size * sw; c.strokeStyle = stroke; c.strokeText(str, 0, 0); }
    c.fillStyle = typeof fill === 'function' ? fill(c, size) : fill; c.fillText(str, 0, 0); c.restore();
  }
  const vgrad = (a, b) => (c, s) => { const g = c.createLinearGradient(0, -s * 0.5, 0, s * 0.5); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const rainbowFill = w => c => { const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, hsl(T * 140 + i * 55, 100, 66)); return g; };
  function rays(c, x, y, len, n, rot, col, a, wd = 0.13) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
    const g = c.createRadialGradient(x, y, 0, x, y, len); g.addColorStop(0, col); g.addColorStop(1, withA(col, 0)); c.fillStyle = g; c.beginPath();
    for (let i = 0; i < n; i++) { const an = rot + i * TAU / n; c.moveTo(x, y); c.lineTo(x + Math.cos(an - wd) * len, y + Math.sin(an - wd) * len); c.lineTo(x + Math.cos(an + wd) * len, y + Math.sin(an + wd) * len); c.closePath(); }
    c.fill(); c.restore();
  }
  const hexPath = (c, P) => { c.beginPath(); [P.T, P.R, P.BR, P.B, P.BL, P.L].forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  function drawBox(c, s, tr, stage, dim) {
    const P = cube(s);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const faces = [[0, [P.L, P.C, P.B, P.BL], tr.col, tr.lo], [1, [P.C, P.R, P.BR, P.B], tr.lo, tr.dk], [2, [P.T, P.R, P.C, P.L], tr.hi, tr.col]];
    for (const [f, pts, a, b] of faces) {
      const ys = pts.map(p => p[1]), g = c.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys)); g.addColorStop(0, a); g.addColorStop(1, b);
      c.fillStyle = g; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill();
      c.save(); c.transform(...faceXf(P, f));
      c.strokeStyle = 'rgba(255,255,255,0.32)'; c.lineWidth = 3; c.beginPath(); c.roundRect(11, 11, 78, 78, 10); c.stroke();
      if (f < 2) {
        c.font = `64px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 7; c.strokeStyle = 'rgba(15,10,40,0.45)'; c.strokeText('?', 50, 54); c.fillStyle = f === 0 ? tr.hi : tr.glow; c.fillText('?', 50, 54);
        const sx = ((T * 0.5 + f * 0.4) % 1.6 - 0.3) * 160 - 30, sg = c.createLinearGradient(sx - 18, 0, sx + 18, 100);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sg; c.fillRect(0, 0, 100, 100);
      } else {
        c.strokeStyle = withA(tr.dk, 0.65); c.lineWidth = 5; c.beginPath(); c.arc(50, 50, 22, 0, TAU); c.stroke();
        c.strokeStyle = '#ffffff'; c.globalAlpha = 0.75; c.lineWidth = 3.5; c.beginPath(); for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 1.6 + T, r = 3 + i * 0.6; i ? c.lineTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r) : c.moveTo(50 + Math.cos(a) * r, 50 + Math.sin(a) * r); } c.stroke(); c.globalAlpha = 1;
      }
      if (!dim) cracks.forEach((cr, i) => {
        if (cr.face !== f || cr.stage > stage) return;
        const grow = clamp01((T - crackBorn[i]) / 0.18), n = Math.max(2, Math.ceil(cr.pts.length * grow));
        c.globalCompositeOperation = 'lighter';
        for (const [lw, col, al] of [[9, tr.glow, 0.28 + 0.1 * stage], [4, tr.hi, 0.7], [1.6, '#ffffff', 1]]) {
          c.globalAlpha = al; c.lineWidth = lw; c.strokeStyle = col; c.beginPath();
          cr.pts.slice(0, n).forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
          if (grow >= 1) cr.br.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
          c.stroke();
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      });
      c.restore();
    }
    c.strokeStyle = tr.hi; c.lineWidth = s * 0.03; hexPath(c, P); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = s * 0.016; c.beginPath(); c.moveTo(P.L[0], P.L[1]); c.lineTo(0, 0); c.lineTo(P.R[0], P.R[1]); c.moveTo(0, 0); c.lineTo(P.B[0], P.B[1]); c.stroke();
    if (stage >= 3 && !dim) { // light leaking out of the seams
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp01(0.35 + 0.25 * Math.sin(T * 12) + (stage - 3) * 0.25); c.strokeStyle = tr.glow; c.lineWidth = s * 0.05;
      c.beginPath(); c.moveTo(P.L[0], P.L[1]); c.lineTo(0, 0); c.lineTo(P.R[0], P.R[1]); c.moveTo(0, 0); c.lineTo(P.B[0], P.B[1]); c.stroke(); c.restore();
    }
    return P;
  }
  function leaks(c, P, s, tr, stage) {
    if (stage < 3) return;
    c.save(); c.globalCompositeOperation = 'lighter';
    cracks.forEach((cr, i) => {
      if (cr.stage > stage || T - crackBorn[i] < 0.15) return;
      const m = faceXf(P, cr.face), p = cr.pts[Math.floor(cr.pts.length / 2)];
      const x = m[0] * p[0] + m[2] * p[1] + m[4], y = m[1] * p[0] + m[3] * p[1] + m[5];
      let dx = x, dy = y - s * 0.05; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const len = s * (0.45 + 0.25 * (stage - 3)) * (0.8 + 0.2 * Math.sin(T * 9 + i)), w = s * 0.07;
      const g = c.createLinearGradient(x, y, x + dx * len, y + dy * len); g.addColorStop(0, tr.hi); g.addColorStop(1, withA(tr.glow, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(x - dy * w * 0.2, y + dx * w * 0.2); c.lineTo(x + dx * len - dy * w, y + dy * len + dx * w); c.lineTo(x + dx * len + dy * w, y + dy * len - dx * w); c.lineTo(x + dy * w * 0.2, y - dx * w * 0.2); c.closePath(); c.fill();
    });
    c.restore();
  }
  function drawParts(c) {
    for (const p of parts) {
      const k = 1 - p.life / p.max;
      if (p.kind === 'ring') { c.globalCompositeOperation = 'lighter'; c.globalAlpha = k; c.strokeStyle = p.col; c.lineWidth = p.size * k + 1; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.stroke(); continue; }
      c.globalAlpha = Math.min(1, k * 1.6);
      if (p.kind === 'dot') { c.globalCompositeOperation = 'lighter'; c.drawImage(glow(p.col), p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4); }
      else if (p.kind === 'star') { c.globalCompositeOperation = 'lighter'; c.fillStyle = p.col; star4(c, p.x, p.y, p.size * (0.6 + 0.4 * k), p.rot); c.fill(); }
      else if (p.kind === 'bubble') { c.globalCompositeOperation = 'source-over'; c.strokeStyle = p.col; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, p.size * (1.3 - 0.5 * k), 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, TAU); c.fill(); }
      else {
        c.globalCompositeOperation = 'source-over'; c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        if (p.kind === 'shard') { c.fillStyle = p.col; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); p.pts.forEach(([x, y], i) => i ? c.lineTo(x * p.size, y * p.size) : c.moveTo(x * p.size, y * p.size)); c.closePath(); c.fill(); c.stroke(); }
        else if (p.kind === 'coin') { c.scale(Math.max(0.08, Math.abs(Math.cos(p.rot * 1.3))), 1); const g = c.createLinearGradient(-p.size, -p.size, p.size, p.size); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#f59e0b'); g.addColorStop(1, '#92400e'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.size, 0, TAU); c.fill(); c.strokeStyle = '#fde68a'; c.lineWidth = 1.5; c.stroke(); }
        else if (p.kind === 'conf') { c.fillStyle = p.col; c.scale(1, Math.cos(p.rot)); c.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6); }
        c.restore();
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  function draw() {
    const c = cx2; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
    const L0 = L(), st = visStage();
    const tr = TIERS[phase === 'reveal' ? result.tier : phase === 'empty' ? 0 : tier];
    c.globalCompositeOperation = 'lighter';
    for (const m of motes) { const y = ((m.y - T * m.v) % 1 + 1) % 1; glowAt(c, tr.glow, m.x * W, y * H, m.s * 3, 0.25 + 0.25 * Math.sin(T * 2 + m.p)); }
    c.globalCompositeOperation = 'source-over';
    if (phase === 'idle' || phase === 'empty') {
      const dim = phase === 'empty';
      text(c, 'AURA BOX', W / 2, H * 0.13, Math.min(46, W * 0.1), vgrad('#fdf4ff', '#f0abfc'), '#3b0764', 1);
      const sub = dim ? 'NO BOXES RIGHT NOW' : taps === 0 ? 'TAP THE BOX TO CRACK IT' : taps < TAPS - 1 ? 'KEEP TAPPING!' : 'ONE MORE TAP!';
      const upOn = !dim && upMsg && upT < 1.3;
      if (!upOn) { c.globalAlpha = dim ? 0.85 : 0.65 + 0.35 * Math.sin(T * 5); text(c, sub, W / 2, H * 0.13 + 40, 16, '#e9d5ff', null); c.globalAlpha = 1; }
      const e = dim ? 1 : easeBounce(boxIn), dropY = (1 - e) * -H * 0.55;
      const jx = (Math.random() - 0.5) * shake + (st >= 2 && !dim ? Math.sin(T * 40) * (st - 1) * 1.3 : 0), jy = (Math.random() - 0.5) * shake * 0.6;
      c.globalCompositeOperation = 'lighter';
      glowAt(c, tr.glow, L0.cx, L0.cy, L0.s * (1.05 + st * 0.22 + tierPop * 0.4), dim ? 0.15 : Math.min(1, 0.32 + st * 0.12 + tierPop * 0.4));
      c.globalCompositeOperation = 'source-over';
      if (st >= 1 && !dim) rays(c, L0.cx, L0.cy, L0.s * (1.1 + st * 0.35), 12, T * 0.3, tr.glow, 0.08 + st * 0.07);
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(L0.cx, L0.base + 4, L0.s * 0.62 * (1 + sq * 0.2) * (0.6 + 0.4 * e), L0.s * 0.12, 0, 0, TAU); c.fill();
      c.save(); c.translate(L0.cx + jx, L0.base + dropY + jy); c.scale(1 + sq * 0.17, 1 - sq * 0.17); c.translate(0, -L0.s * 0.66 + (dim ? 0 : Math.sin(T * 2.4) * L0.s * 0.015));
      c.rotate((st >= 2 && !dim ? Math.sin(T * 31) * 0.012 * st : 0) + (Math.random() - 0.5) * shake * 0.003);
      if (dim) c.globalAlpha = 0.45;
      const P = drawBox(c, L0.s, tr, dim ? 0 : st, dim);
      if (!dim) leaks(c, P, L0.s, tr, st);
      if (tierPop > 0 && !dim) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = tierPop * 0.5; c.fillStyle = '#ffffff'; hexPath(c, P); c.fill(); }
      c.restore(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      if (!dim) {
        const ly = L0.base + 46;
        text(c, `${tr.n} BOX`, W / 2, ly, 26, vgrad(tr.hi, tr.col), tr.dk, 1 + tierPop * 0.35);
        for (let i = 0; i < TAPS; i++) {
          const x = W / 2 + (i - (TAPS - 1) / 2) * 30, on = i < taps;
          c.fillStyle = on ? tr.glow : 'rgba(255,255,255,0.12)'; c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
          c.beginPath(); c.arc(x, ly + 38, on ? 8 : 7, 0, TAU); c.fill(); c.stroke();
        }
        if (upMsg && upT < 1.3) { const k = clamp01(upT / 0.25), a = upT > 1 ? 1 - (upT - 1) / 0.3 : 1; c.globalAlpha = a; text(c, `UPGRADE \u2192 ${upMsg}!`, W / 2, H * 0.13 + 44 - upT * 6, Math.min(28, W * 0.062), vgrad('#ffffff', TIERS[tier].glow), TIERS[tier].dk, easeElastic(k), 0.2); c.globalAlpha = 1; }
      } else {
        text(c, 'Finish a run to earn a free Aura Box.', W / 2, L0.base + 40, 15, '#c4b5fd', null);
        text(c, 'Every run = 1 box. Never sold.', W / 2, L0.base + 64, 13, '#8b7fc7', null);
      }
    } else if (phase === 'reveal') {
      const it = ITEM[roll.item], ft = result.tier, showMut = mutShown ? roll.mut : 'n', R = L0.R, iy = L0.cy - R * 0.1, big = ft >= 3;
      const rcol = showMut === 'g' ? '#fbbf24' : tr.glow, len = Math.max(W, H);
      if (showMut === 'r') for (let i = 0; i < 6; i++) rays(c, L0.cx, iy, len * 0.8, 3, T * 0.35 + i * 0.35, hsl(T * 90 + i * 60, 100, 60), 0.16, 0.07);
      else rays(c, L0.cx, iy, len * 0.9, 16, T * 0.35, rcol, big ? 0.34 : 0.24, 0.09);
      rays(c, L0.cx, iy, len * 0.6, 10, -T * 0.5, '#ffffff', 0.1, 0.05);
      c.globalCompositeOperation = 'lighter'; glowAt(c, showMut === 'g' ? '#fbbf24' : tr.glow, L0.cx, iy, R * 2.4, 0.5 + 0.1 * Math.sin(T * 3)); c.globalCompositeOperation = 'source-over';
      const e = easeElastic(clamp01(revT / 0.75)), bob = Math.sin(T * 2) * R * 0.04, sc = e * (1 + mutFlash * 0.15);
      if (sc > 0.01) { c.save(); c.translate(L0.cx, iy + bob); c.scale(sc, sc); drawAura(c, it, showMut, T, R); c.restore(); }
      const k = clamp01((revT - 0.3) / 0.35), ty = iy + R * 1.45;
      if (k > 0) {
        c.globalAlpha = k;
        text(c, tr.n, W / 2, ty, Math.min(48, W * 0.105), vgrad(tr.hi, tr.col), tr.dk, 0.6 + 0.4 * easeElastic(k), 0.18);
        text(c, it.n.toUpperCase(), W / 2, ty + 44, Math.min(24, W * 0.055), '#ffffff', '#1e1033', 1, 0.2);
        const tag = result.isNew ? '\u2605 NEW AURA! \u2605' : `DUPLICATE \u2192 +\u25c8 ${result.essence} ESSENCE`;
        text(c, tag, W / 2, ty + 78, 15, result.isNew ? '#fde047' : '#c4b5fd', '#1e1033', 1 + (result.isNew ? 0.06 * Math.sin(T * 6) : 0), 0.25);
        c.globalAlpha = 1;
      }
      if (mutShown) {
        const mk = clamp01((revT - 1.05) / 0.3), lbl = roll.mut === 'g' ? '\u2726 GOLD MUTATION \u2726' : '\u2726 RAINBOW MUTATION \u2726', sz = Math.min(28, W * 0.06);
        text(c, lbl, W / 2, iy - R * 1.35, sz, roll.mut === 'g' ? vgrad('#fffbe6', '#f59e0b') : rainbowFill(W * 0.8), '#1e1033', easeElastic(mk), 0.2);
      }
      if (mutFlash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = mutFlash * 0.45; c.fillStyle = roll.mut === 'g' ? '#fbbf24' : '#f0abfc'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    }
    drawParts(c);
    if (flash > 0) { c.globalAlpha = Math.min(1, flash) * (phase === 'reveal' ? 0.9 : 0.35); c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  }
  function frame(now) {
    if (phase === 'closed') { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (dprCap > 2 && DPR > 2) { slowN++; slowT += dt; if (slowN >= 90) { if (slowT / slowN > 0.021) { dprCap = 2; size(); } slowN = 0; slowT = 0; } }
    try { update(dt); draw(); } catch (e) { console.error('[aurabox]', e); }
  }

  // ---- Odds panel (Google Play loot-box disclosure) ----
  let mOdds = null;
  function openOdds() {
    css();
    if (!mOdds) { mOdds = el('div', 'abx-m'); mOdds.id = 'abxOddsPanel'; mOdds.onclick = e => { if (e.target === mOdds) mOdds.style.display = 'none'; }; doc.body.appendChild(mOdds); }
    const fo = finalOdds(), pct = v => (v * 100 >= 10 ? (v * 100).toFixed(1) : (v * 100).toFixed(2)) + '%';
    const rows = TIERS.map((t, i) => `<tr><td style="color:${t.col}">${t.n}</td><td>${pct(t.w)}</td><td style="color:#fff">${pct(fo[i])}</td></tr>`).join('');
    const mcol = { n: '#cbd5e1', g: '#fbbf24', r: '#f0abfc' };
    mOdds.innerHTML = `<div class="abx-card" style="border-color:#facc15"><h3 style="color:#fde047">AURA BOX ODDS</h3>
      <table class="abx-odds"><tr><th style="text-align:left">RARITY</th><th style="text-align:right">BOX STARTS</th><th style="text-align:right">FINAL CHANCE</th></tr>${rows}</table>
      <p>Each of your first ${UP_TAPS} taps has a ${Math.round(UP_CHANCE * 100)}% chance to upgrade the box one rarity. Final chance includes these upgrades.</p>
      <table class="abx-odds"><tr><th style="text-align:left">MUTATION</th><th style="text-align:right">CHANCE</th></tr>${MUTS.map(m => `<tr><td style="color:${mcol[m.id]}">${m.id === 'n' ? 'NONE' : m.n}</td><td>${pct(m.w)}</td></tr>`).join('')}</table>
      <p>All ${ITEMS.length / TIERS.length} auras of a rarity are equally likely. A duplicate turns into Essence.</p>
      <p style="color:#fde68a">Aura Boxes are earned free by playing: 1 per finished run, plus 1 optional bonus box per run for watching an ad. They can't be bought with money.</p>
      <button class="btn gold" id="abxOddsClose">GOT IT</button></div>`;
    mOdds.querySelector('#abxOddsClose').onclick = () => { mOdds.style.display = 'none'; };
    mOdds.style.display = 'flex';
  }

  // ---- Aura Index (collection) ----
  let ix = null, ixTab = 'n', det = null, detRaf = 0;
  function openIndex() {
    css(); if (hooks.initAudio) hooks.initAudio();
    if (!ix) { ix = el('div', 'abx-ix'); ix.id = 'abxIndexScreen'; doc.body.appendChild(ix); }
    ix.style.display = 'block'; renderIndex();
  }
  function closeIndex() { if (ix) ix.style.display = 'none'; refreshButtons(); }
  function renderIndex() {
    const cp = completion(S), cnt = m => ITEMS.filter(i => S.owned[i.id + '|' + m]).length, sc = ix.scrollTop;
    ix.innerHTML = `<div class="abx-ix-in"><div class="abx-ihead"><h2>AURA INDEX</h2><button class="abx-x" id="abxIxClose" aria-label="Close">\u2715</button></div>
      <div class="abx-prog"><div class="l"><b>${cp.pct}% COMPLETE</b><small>${cp.have} / ${cp.total} FOUND<br>${S.opened} BOXES OPENED</small></div><div class="abx-bar"><i style="width:${Math.max(2, cp.have / cp.total * 100)}%"></i></div></div>
      <div class="abx-tabs">${MUTS.map(m => `<button data-m="${m.id}" class="${ixTab === m.id ? 'on' : ''}">${m.id === 'n' ? '' : '\u2726 '}${m.n} ${cnt(m.id)}/${ITEMS.length}</button>`).join('')}</div>
      <div class="abx-grid" id="abxGrid"></div>
      <button class="btn abx-dim" id="abxIxOdds" style="margin-top:14px;font-size:14px">% DROP ODDS</button></div>`;
    ix.querySelector('#abxIxClose').onclick = closeIndex; ix.querySelector('#abxIxOdds').onclick = openOdds;
    ix.querySelectorAll('.abx-tabs button').forEach(b => b.onclick = () => { ixTab = b.dataset.m; SFX.pop(1.1); renderIndex(); });
    const grid = ix.querySelector('#abxGrid'), dpr = Math.min(root.devicePixelRatio || 1, 3), draws = [];
    TIERS.forEach((tr, ti) => {
      const h = el('div', 'abx-tier', tr.n); h.style.setProperty('--tc', tr.col); grid.appendChild(h);
      ITEMS.filter(i => i.t === ti).forEach(it => {
        const key = it.id + '|' + ixTab, n = S.owned[key] || 0, lock = !n;
        const b = el('button', `abx-tile m${ixTab}${lock ? ' lock' : ''}`); b.dataset.key = key;
        b.style.setProperty('--tc', tr.col); b.style.setProperty('--tg', lock ? 'rgba(30,27,75,.6)' : withA(tr.col, 0.38));
        const cvs = el('canvas'); b.appendChild(cvs);
        b.appendChild(el('span', 'nm', lock ? '???' : it.n)); b.appendChild(el('span', 'tr', tr.n + (ixTab !== 'n' ? ' \u00b7 ' + MUT[ixTab].n : '')));
        if (n > 1) b.appendChild(el('i', 'ct', 'x' + n));
        if (S.news[key]) b.appendChild(el('i', 'nw', 'NEW'));
        if (S.equipped === key) b.appendChild(el('i', 'eq', 'EQUIPPED'));
        b.onclick = () => { if (!lock) openDetail(it, ixTab); else { SFX.pop(0.6); buzz('light'); } };
        grid.appendChild(b); draws.push([cvs, it, lock]);
      });
    });
    ix.scrollTop = sc;
    requestAnimationFrame(() => draws.forEach(([cvs, it, lock]) => {
      const w = cvs.clientWidth || 110; cvs.width = Math.round(w * dpr); cvs.height = Math.round(w * dpr);
      const c = cvs.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, w / 2 * dpr, w / 2 * dpr);
      drawAura(c, it, ixTab, 1.3 + it.id.length * 0.2, w * 0.4, { sil: lock });
      if (lock) { c.setTransform(dpr, 0, 0, dpr, 0, 0); text(c, '?', w / 2, w / 2 + 2, w * 0.3, '#5b5f9e', null); }
    }));
  }
  function openDetail(it, mut) {
    css();
    if (!det) { det = el('div', 'abx-m'); det.id = 'abxDetail'; det.onclick = e => { if (e.target === det) closeDetail(); }; doc.body.appendChild(det); }
    const key = it.id + '|' + mut; if (S.news[key]) { delete S.news[key]; persist(); }
    const tr = TIERS[it.t], eq = S.equipped === key;
    det.innerHTML = `<div class="abx-card abx-det" style="border-color:${tr.col}"><canvas id="abxDetCv"></canvas>
      <h3 style="color:#fff;margin-top:4px">${it.n}</h3><div><span class="abx-chipT" style="--tc:${tr.col}">${tr.n}</span>${mut !== 'n' ? `<span class="abx-chipT" style="--tc:${mut === 'g' ? '#fbbf24' : '#f0abfc'}">${MUT[mut].n}</span>` : ''}</div>
      <p>\u201c${it.d}\u201d</p><p style="color:#a5b4fc;margin:2px 0">Owned: x${S.owned[key] || 0} \u00b7 Equip it to wear this aura in your runs</p>
      <div class="abx-vars">${MUTS.map(m => { const has = !!S.owned[it.id + '|' + m.id]; return `<button data-m="${m.id}" class="${m.id === mut ? 'on' : ''}" ${has ? '' : 'disabled'}>${has ? m.n : '\ud83d\udd12 ' + m.n}</button>`; }).join('')}</div>
      <button class="btn ${eq ? 'abx-dim on' : 'gold'}" id="abxEquipD">${eq ? '\u2714 EQUIPPED (TAP TO REMOVE)' : '\u2728 EQUIP AURA'}</button>
      <button class="btn ghost" id="abxDetClose">CLOSE</button></div>`;
    det.querySelectorAll('.abx-vars button').forEach(b => b.onclick = () => { if (!b.disabled) openDetail(it, b.dataset.m); });
    det.querySelector('#abxEquipD').onclick = () => { equip(eq ? null : key); openDetail(it, mut); };
    det.querySelector('#abxDetClose').onclick = closeDetail;
    det.style.display = 'flex';
    const cvs = det.querySelector('#abxDetCv'), dpr = Math.min(root.devicePixelRatio || 1, 3), t0 = performance.now();
    if (detRaf) cancelAnimationFrame(detRaf);
    const loop = now => {
      if (det.style.display !== 'flex' || !cvs.isConnected) { detRaf = 0; return; }
      detRaf = requestAnimationFrame(loop);
      const w = cvs.clientWidth || 260; if (cvs.width !== Math.round(w * dpr)) cvs.width = cvs.height = Math.round(w * dpr);
      const c = cvs.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, w); c.translate(w / 2, w / 2);
      drawAura(c, it, mut, (now - t0) / 1000 + 1, w * 0.36);
    };
    detRaf = requestAnimationFrame(loop);
  }
  function closeDetail() { if (det) det.style.display = 'none'; if (detRaf) { cancelAnimationFrame(detRaf); detRaf = 0; } if (ix && ix.style.display === 'block') renderIndex(); }
  function equip(key) { S.equipped = key && S.owned[key] ? key : null; persist(); SFX.pop(1.2); if (key) SFX.chime(1); buzz('success'); }

  // ---- In-run: the equipped aura glows under the squad (called from the game's render, world coords) ----
  const RB = ['#f43f5e', '#facc15', '#4ade80', '#38bdf8', '#a855f7', '#f472b6', '#fb923c'];
  function drawEquipped(c, hw, t) {
    if (!S.equipped) return;
    const [id, m] = S.equipped.split('|'), it = ITEM[id]; if (!it) return;
    const P = m === 'g' ? ['#fffbeb', '#fbbf24', '#7c3a06', '#fef08a'] : it.p, rx = hw + 40, ry = rx * 0.42, y0 = -10;
    c.save(); c.globalCompositeOperation = 'lighter';
    c.save(); c.translate(0, y0); c.scale(1, 0.42); glowAt(c, m === 'r' ? RB[Math.floor(t * 2) % RB.length] : P[1], 0, 0, rx * 1.25, 0.5 + 0.12 * Math.sin(t * 3)); c.restore();
    c.setLineDash([14, 10]); c.lineDashOffset = -t * 40; c.strokeStyle = m === 'r' ? hsl(t * 90, 100, 70) : P[3]; c.globalAlpha = 0.65; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, y0, rx, ry, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    for (let i = 0; i < 7; i++) { const a = t * 1.2 + i * TAU / 7; glowAt(c, m === 'r' ? RB[i] : (i & 1 ? P[0] : P[3]), Math.cos(a) * rx, y0 + Math.sin(a) * ry, 9, 0.6 + 0.4 * Math.sin(t * 5 + i)); }
    c.restore();
  }

  // ---- Menu / end-of-run integration ----
  function refreshButtons() {
    const b = doc.getElementById('boxBtn'); if (b) b.innerHTML = `\ud83c\udf81 AURA BOX${S.pending ? `<span class="abx-badge">${S.pending}</span>` : ''}`;
    const i = doc.getElementById('indexBtn'); if (i) i.textContent = `\ud83d\udcd6 INDEX ${completion(S).pct}%`;
  }
  function renderEndOffer() {
    const box = doc.getElementById('boxOffer'); if (!box) return; box.innerHTML = '';
    if (!hooks.isRunOver || !hooks.isRunOver() || S.pending < 1) return;
    css(); const b = el('button', 'btn abx-pink abx-end', `\ud83c\udf81 OPEN AURA BOX${S.pending > 1 ? ` (${S.pending})` : ''}`); b.id = 'endBoxBtn'; b.onclick = open; box.appendChild(b);
  }
  const isOpen = () => phase !== 'closed' || !!(ix && ix.style.display === 'block') || !!(mOdds && mOdds.style.display === 'flex') || !!(det && det.style.display === 'flex');
  const covering = () => phase !== 'closed' || !!(ix && ix.style.display === 'block');
  /** Android back / Escape: close the topmost aura screen. Returns true if one was open. */
  function back() {
    if (det && det.style.display === 'flex') { closeDetail(); return true; }
    if (mOdds && mOdds.style.display === 'flex') { mOdds.style.display = 'none'; return true; }
    if (ix && ix.style.display === 'block') { closeIndex(); return true; }
    if (phase !== 'closed') { close(); return true; }
    return false;
  }
  root.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { back(); return; }
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && phase === 'idle' && !(mOdds && mOdds.style.display === 'flex') && !(ix && ix.style.display === 'block')) { e.preventDefault(); tap(); }
  });
  root.AuraBox = Object.assign({}, core, {
    init(h) { hooks = h || {}; css(); refreshButtons(); },
    open, close, openIndex, openOdds, back, isOpen, covering, drawEquipped, drawAura, refreshButtons, renderEndOffer, tap,
    startRun() { startRun(S); persist(); },
    endRun(played) { const g = endRun(S, played); if (g) persist(); refreshButtons(); renderEndOffer(); return g; },
    state: () => S, phase: () => phase,
    /** QA hook (screenshots): queue a box with a fixed outcome, e.g. { base: 2, ups: [false, true, false, false], mut: 'g' }. */
    debugBox(o) {
      const r = Object.assign(rollBox(), o || {}); r.taps = 0;
      if (!o || !o.item) { const pool = ITEMS.filter(i => i.t === finalTier(r)); r.item = pool[Math.floor(Math.random() * pool.length)].id; }
      S.cur = r; S.pending = Math.max(1, S.pending); persist(); refreshButtons();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
