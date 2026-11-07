// Unit tests: ad caps (js/ads.js) and the debug/release ad-id switch (scripts/configure.mjs). Run: npm test
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { execFileSync } = require('node:child_process');
const ads = require('../www/js/ads.js');
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok -', name); };
const T0 = new Date(2026, 9, 17, 10).getTime(), T1 = new Date(2026, 9, 18, 9).getTime();
const cfg = { dailyCap: 3 };

ok('fresh ledger allows every placement', () => { const l = {}; for (const p of ['revive', 'double', 'zone', 'chest']) assert.equal(ads.gate(l, p, cfg, T0).ok, true); });
ok('daily cap blocks all placements', () => {
  const l = {}; for (let i = 0; i < 3; i++) { assert.ok(ads.gate(l, 'zone', cfg, T0).ok); ads.record(l, 'zone'); }
  assert.equal(ads.gate(l, 'revive', cfg, T0).ok, false); assert.equal(ads.gate(l, 'zone', cfg, T0).why, 'Daily ad limit reached');
});
ok('chest reroll is once per day', () => { const l = {}; ads.gate(l, 'chest', cfg, T0); ads.record(l, 'chest'); assert.equal(ads.gate(l, 'chest', cfg, T0).ok, false); assert.equal(ads.gate(l, 'double', cfg, T0).ok, true); });
ok('double squad is capped per day (squadDailyCap) and resets tomorrow', () => {
  const c = { dailyCap: 20, squadDailyCap: 3 }, l = {};
  for (let k = 0; k < 3; k++) { assert.ok(ads.gate(l, 'squad', c, T0).ok); ads.record(l, 'squad'); }
  assert.equal(ads.gate(l, 'squad', c, T0).ok, false); assert.equal(ads.gate(l, 'revive', c, T0).ok, true);
  assert.equal(ads.gate(l, 'squad', c, T1).ok, true);
});
ok('caps reset on a new day', () => { const l = {}; ads.gate(l, 'chest', cfg, T0); for (let i = 0; i < 3; i++) ads.record(l, 'chest'); assert.equal(ads.gate(l, 'chest', cfg, T1).ok, true); assert.equal(l.count, 0); });
ok('dayKey uses local calendar day', () => { assert.equal(ads.dayKey(T0), '2026-10-17'); assert.notEqual(ads.dayKey(T0), ads.dayKey(T1)); });

// configure.mjs in a scratch copy so the repo isn't touched
const root = path.join(__dirname, '..');
function scratch() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'brcfg-')); fs.mkdirSync(path.join(d, 'www/js'), { recursive: true }); fs.mkdirSync(path.join(d, 'android'));
  fs.copyFileSync(path.join(root, 'www/js/config.js'), path.join(d, 'www/js/config.js')); return d;
}
const REAL = { ADMOB_APP_ID: 'ca-app-pub-1111111111111111~2222222222', ADMOB_REWARDED_ID: 'ca-app-pub-1111111111111111/3333333333' };
const run = (d, args, extra) => execFileSync(process.execPath, [path.join(root, 'scripts/configure.mjs'), ...args], { cwd: d, env: { PATH: process.env.PATH, ...extra } }).toString();
ok('committed config.js carries Google TEST ids', () => { const c = fs.readFileSync(path.join(root, 'www/js/config.js'), 'utf8'); assert.match(c, /3940256099942544\/5224354917/); assert.match(c, /testing: true/); });
ok('debug build ignores real secrets', () => {
  const d = scratch(); run(d, [], REAL); const c = fs.readFileSync(path.join(d, 'www/js/config.js'), 'utf8');
  assert.match(c, /3940256099942544\/5224354917/); assert.doesNotMatch(c, /1111111111111111/); assert.equal(fs.existsSync(path.join(d, 'android/admob.properties')), false);
});
ok('release build uses real secrets', () => {
  const d = scratch(); run(d, ['--release'], REAL); const c = fs.readFileSync(path.join(d, 'www/js/config.js'), 'utf8');
  assert.match(c, /1111111111111111\/3333333333/); assert.match(c, /testing: false/);
  assert.equal(fs.readFileSync(path.join(d, 'android/admob.properties'), 'utf8').trim(), 'appId=' + REAL.ADMOB_APP_ID);
  run(d, [], {}); assert.match(fs.readFileSync(path.join(d, 'www/js/config.js'), 'utf8'), /3940256099942544\/5224354917/); // back to test
  assert.equal(fs.existsSync(path.join(d, 'android/admob.properties')), false);
});
ok('release without secrets stays on TEST ids and warns', () => { const d = scratch(); const out = run(d, ['--release'], {}); assert.match(out, /MUST NOT SHIP/); assert.match(fs.readFileSync(path.join(d, 'www/js/config.js'), 'utf8'), /testing: true/); });
ok('malformed ids are rejected', () => { const d = scratch(); assert.throws(() => run(d, ['--release'], { ...REAL, ADMOB_REWARDED_ID: 'oops' })); });
// sprite cast (js/sprites.js): original names, all roles present, sane sizes
const { CAST } = (() => { const g = {}; new Function('window', require('fs').readFileSync(path.join(root, 'www/js/sprites.js'), 'utf8'))(g); return g.Sprites; })();
ok('cast has every gameplay role with unique original names', () => {
  for (const k of ['trooper', 'leader', 'swarmA', 'swarmB', 'swarmC', 'tank', 'boss', 'sweeper', 'espresso', 'flamenco', 'squaloBoss', 'yeti', 'argento']) { assert.ok(CAST[k], k); assert.ok(CAST[k].w > 0 && CAST[k].h > 0 && CAST[k].frames >= 2); }
  assert.deepEqual(['trooper', 'leader', 'swarmC', 'boss', 'espresso', 'flamenco', 'squaloBoss', 'yeti', 'argento'].map(k => CAST[k].name), ['Mulletto Bastonato', 'Nonno Scopazzo', 'Lavatrino Schiumoso', 'Testone Baffolini, the Grump King', 'Espressorilla, the Gorilla King', 'Flamenco Rotorina', 'Squalo Supremo', 'Yeti Scudiero', 'Asciero Argento, the Silver Warden']);
  const names = Object.values(CAST).map(c => c.name); assert.equal(new Set(names).size, names.length);
  assert.ok(!names.some(nm => /bombardiro|crocodilo|cappuccina|tung|sahur|tralalero|tralala|lirili|larila|brr ?brr|patapim|skibidi|toilet|chimpanzini|bananini|assassino|trippi|troppi/i.test(nm)));
  const Y = (() => { const g = {}; new Function('window', require('fs').readFileSync(path.join(root, 'www/js/sprites.js'), 'utf8'))(g); return g.Sprites.Yeti; })();
  assert.equal(Y.count(), 40);
  const Ag = (() => { const g = {}; new Function('window', require('fs').readFileSync(path.join(root, 'www/js/sprites.js'), 'utf8'))(g); return g.Sprites.Argento; })();
  assert.equal(Ag.count(), 70);
});
ok('squad evolution stages unlock at 0 / 1500 / 5000 / 12000 run aura', () => {
  const { EVOLVE, stageFor } = (() => { const g = {}; new Function('window', require('fs').readFileSync(path.join(root, 'www/js/sprites.js'), 'utf8'))(g); return g.Sprites; })();
  assert.deepEqual(EVOLVE.map(e => [e.key, e.title, e.at]), [['trooper', 'ROOKIE', 0], ['trooper2', 'RUNNER', 1500], ['trooper3', 'CAPED', 5000], ['trooper4', 'LEGEND', 12000]]);
  for (const [v, st] of [[0, 0], [1499, 0], [1500, 1], [4999, 1], [5000, 2], [11999, 2], [12000, 3], [1e9, 3]]) assert.equal(stageFor(v), st, 'aura ' + v);
  for (const e of EVOLVE) assert.ok(CAST[e.key] && CAST[e.key].frames >= 2, e.key);
  for (let i = 1; i < EVOLVE.length; i++) assert.ok(CAST[EVOLVE[i].key].h > CAST[EVOLVE[i - 1].key].h, 'each stage is bigger');
});

// Aura Box (js/aurabox.js): odds, rolls, run grants, migration-safe state
const AB = require('../www/js/aurabox.js');
const near = (a, b, eps) => Math.abs(a - b) <= eps;
ok('aura box: base, final and mutation odds each sum to 100%', () => {
  assert.ok(near(AB.TIERS.reduce((a, t) => a + t.w, 0), 1, 1e-9)); assert.ok(near(AB.MUTS.reduce((a, m) => a + m.w, 0), 1, 1e-9));
  const fo = AB.finalOdds(); assert.equal(fo.length, 5); assert.ok(near(fo.reduce((a, b) => a + b, 0), 1, 1e-9));
  for (let i = 0; i < 4; i++) assert.ok(fo[i + 1] < fo[i], 'rarer tiers are less likely');
});
ok('aura box: rolled outcomes match the published final odds', () => {
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const N = 200000, cnt = [0, 0, 0, 0, 0], mc = { n: 0, g: 0, r: 0 }, fo = AB.finalOdds();
  for (let i = 0; i < N; i++) {
    const r = AB.rollBox(rng), t = AB.finalTier(r); cnt[t]++; mc[r.mut]++;
    assert.equal(AB.ITEMS.find(x => x.id === r.item).t, t); assert.equal(r.ups.length, AB.UP_TAPS);
  }
  cnt.forEach((c, i) => assert.ok(near(c / N, fo[i], 0.006), `tier ${i}: ${c / N} vs ${fo[i]}`));
  AB.MUTS.forEach(m => assert.ok(near(mc[m.id] / N, m.w, 0.005), m.id));
});
ok('aura box: 3 original auras per tier, unique names, no trademarked brainrot names', () => {
  for (let t = 0; t < 5; t++) assert.equal(AB.ITEMS.filter(i => i.t === t).length, 3);
  const names = AB.ITEMS.map(i => i.n); assert.equal(new Set(names).size, names.length); assert.equal(AB.TOTAL, 45);
  assert.ok(!names.some(nm => /bombardiro|crocodilo|cappuccina|tung|sahur|tralalero|tralala|lirili|larila|patapim|skibidi|toilet|chimpanzini|bananini|assassino|trippi|troppi/i.test(nm)));
});
ok('aura box: one free box per played run, one ad bonus per run', () => {
  const s = AB.fresh(); assert.equal(AB.endRun(s, true), false, 'no run started');
  AB.startRun(s); assert.equal(AB.canBonus(s), false); assert.equal(AB.endRun(s, false), false, 'start->quit gives nothing');
  assert.equal(AB.endRun(s, true), true); assert.equal(AB.endRun(s, true), false, 'revive + second wipe-out: still 1'); assert.equal(s.pending, 1);
  assert.equal(AB.grantBonus(s), true); assert.equal(AB.grantBonus(s), false); assert.equal(s.pending, 2);
  AB.startRun(s); assert.equal(AB.canBonus(s), false, 'bonus belongs to a finished run'); AB.endRun(s, true); assert.equal(AB.canBonus(s), true);
});
ok('aura box: opening records the prize; duplicates pay Essence (x3 gold, x6 rainbow)', () => {
  const s = AB.fresh(); s.pending = 3; const roll = { base: 2, ups: [false, false, false, false], mut: 'n', item: 'gelatogalaxy', seed: 1, taps: 4 };
  const a = AB.record(s, roll); assert.deepEqual([a.isNew, a.essence, a.tier], [true, 0, 2]); assert.equal(s.pending, 2); assert.equal(s.news['gelatogalaxy|n'], 1);
  const b = AB.record(s, roll); assert.deepEqual([b.isNew, b.essence], [false, AB.TIERS[2].dupe]);
  AB.record(s, { ...roll, mut: 'r' }); assert.equal(AB.record(s, { ...roll, mut: 'r' }).essence, AB.TIERS[2].dupe * 6);
  assert.deepEqual(AB.completion(s), { have: 2, total: 45, pct: 4 });
  assert.equal(AB.tierAt({ base: 0, ups: [true, false, true, false] }, 1), 1); assert.equal(AB.tierAt({ base: 0, ups: [true, false, true, false] }, 4), 2);
});
ok('aura box: migrate() survives garbage and keeps valid data', () => {
  for (const bad of [null, undefined, 42, 'x', [], { owned: 'nope', pending: 'lots', cur: 5 }]) { const s = AB.migrate(bad); assert.equal(s.v, AB.VERSION); assert.equal(s.pending, 0); assert.deepEqual(s.owned, {}); }
  const s = AB.migrate({ pending: 1e9, run: 4, granted: 9, bonus: -3, owned: { 'mewmist|n': 2, 'mewmist|zz': 1, 'ghost|n': 3, 'sigmahalo|g': -1 }, news: { 'mewmist|n': 1, 'ghost|n': 1 }, equipped: 'ghost|n' });
  assert.equal(s.pending, 99); assert.equal(s.granted, 4); assert.equal(s.bonus, 0); assert.deepEqual(s.owned, { 'mewmist|n': 2 }); assert.deepEqual(s.news, { 'mewmist|n': 1 }); assert.equal(s.equipped, null);
  assert.deepEqual(AB.migrate({ found: ['rizzripple', 'nope'] }).owned, { 'rizzripple|n': 1 }, 'pre-v1 list of ids');
  const fut = AB.migrate({ v: 3, futureThing: { a: 1 }, owned: { 'spaghettiverse|r': 1 }, equipped: 'spaghettiverse|r' });
  assert.equal(fut.v, 3); assert.deepEqual(fut.futureThing, { a: 1 }); assert.equal(fut.equipped, 'spaghettiverse|r');
  const cur = { base: 1, ups: [true, false, false, false], mut: 'g', item: 'lasagnavortex', seed: 5, taps: 2 };
  assert.deepEqual(AB.migrate({ pending: 1, cur }).cur, cur, 'half-opened box resumes');
  assert.equal(AB.migrate({ pending: 1, cur: { ...cur, item: 'mewmist' } }).cur, null, 'inconsistent box dropped');
  assert.equal(AB.migrate({ pending: 0, cur }).cur, null);
  const rt = AB.migrate(JSON.parse(JSON.stringify(s))); assert.deepEqual(rt, s, 'round-trips');
});
ok('aura box bonus ad uses the shared daily ad cap', () => { const l = {}, c = { dailyCap: 2 }; ads.gate(l, 'aurabox', c, T0); ads.record(l, 'aurabox'); ads.record(l, 'aurabox'); assert.equal(ads.gate(l, 'aurabox', c, T0).ok, false); });

// Squad motion: smooth start, exact stop, stride locked to distance, reduced-motion still steers.
const Motion = require('../www/js/motion.js');
function simMove(target, secs, opt, m0) {
  const m = m0 || Motion.create();
  const dt = 1 / 60;
  let peak = m.x, minX = m.x;
  const samples = [];
  for (let t = 0; t < secs; t += dt) {
    Motion.step(m, target, dt, opt);
    if (m.x > peak) peak = m.x;
    if (m.x < minX) minX = m.x;
    samples.push(m.x);
  }
  return { m, peak, minX, samples };
}
ok('motion eases off the line instead of jumping, then settles on the target', () => {
  const m = Motion.create();
  Motion.step(m, 120, 1 / 60, { forward: 0 });
  assert.ok(m.x > 2 && m.x < 28, 'first frame moves but stays under a quarter of the gap, got ' + m.x);
  assert.ok(m.v > 20, 'velocity has started, got ' + m.v);
  const done = simMove(120, 0.7, { forward: 240 });
  assert.equal(done.m.x, 120);
  assert.equal(done.m.v, 0);
  assert.ok(done.peak <= 120.6, 'no overshoot ' + done.peak);
  const mid = simMove(120, 0.22, { forward: 240 });
  assert.ok(mid.m.x > 80, 'most of the way there by 0.22s, got ' + mid.m.x);
});
ok('motion reverses cleanly and respects the road', () => {
  const m = Motion.create(); m.x = 100; m.v = 400;
  const back = simMove(-80, 0.8, { forward: 240 }, m);
  assert.equal(back.m.x, -80);
  assert.equal(back.m.v, 0);
  assert.ok(back.minX >= -80.6, 'no overshoot past the new target ' + back.minX);
  const wall = simMove(999, 0.5, { forward: 0 });
  assert.equal(wall.m.x, 150);
  assert.ok(wall.m.v >= 0 && wall.peak <= 150);
});
ok('stride phase matches distance and plants have no bob', () => {
  const m = Motion.create();
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) Motion.step(m, 0, dt, { forward: 240 });
  const expect = 240 / Motion.STRIDE;
  assert.ok(Math.abs(m.phase - expect) < 0.05, `phase ${m.phase} vs ${expect}`);
  const planted = Motion.pose({ phase: 4, lean: 0.1, v: 0, hit: 0 }, 0, { hasCycle: true });
  assert.equal(planted.bob, 0);
  assert.equal(planted.frame, 0);
  const mid = Motion.pose({ phase: 4.5, lean: 0, v: 0, hit: 0 }, 0, { hasCycle: true });
  assert.ok(Math.abs(mid.bob - Motion.BOB) < 1e-6);
  assert.equal(mid.frame, 0); // still the plant frame until the next integer
  const next = Motion.pose({ phase: 5, lean: 0, v: 0, hit: 0 }, 0, { hasCycle: true });
  assert.equal(next.frame, 1);
  assert.equal(next.bob, 0);
  const held = Motion.create(); held.phase = 3.2;
  Motion.step(held, 0, 0.5, { forward: 0 });
  assert.equal(held.phase, 3.2, 'standing still does not cycle the feet');
  assert.equal(Motion.pose(held, 0, { hasCycle: false }).frame, 0);
});
ok('reduced motion keeps steering and drops bob, lean and the run cycle', () => {
  const m = simMove(100, 0.35, { forward: 240, reduced: true });
  assert.ok(Math.abs(m.m.x - 100) < 1, 'still arrives, got ' + m.m.x);
  assert.equal(m.m.phase, 0);
  assert.ok(Math.abs(m.m.lean) < 0.02);
  const pose = Motion.pose(m.m, 2, { hasCycle: true, reduced: true });
  assert.equal(pose.frame, 0);
  assert.equal(pose.bob, 0);
  assert.equal(pose.lean, 0);
});
ok('dust slow reaches later than a clean stride', () => {
  const fast = simMove(120, 0.16, { forward: 200 });
  const slow = simMove(120, 0.16, { forward: 200, dustSlow: true });
  assert.ok(slow.m.x < fast.m.x * 0.65, `${slow.m.x} should lag ${fast.m.x}`);
});

// Asciero Argento: telegraph, strike frames, safe sidestep, shield, death payout.
const Axe = require('../www/js/axe-boss.js');
function fwd(b, secs, ctx) {
  const dt = 1 / 60;
  const ev = [];
  for (let t = 0; t < secs; t += dt) ev.push(Axe.step(b, Object.assign({ dt }, ctx)));
  return ev;
}
ok('argento asset strips are the supplied 10-frame sets and nothing named spin', () => {
  assert.deepEqual(Axe.ANIMS, ['idle', 'run', 'hurt', 'death', 'overhead', 'leap', 'cast']);
  for (const a of Axe.ANIMS) {
    for (let i = 0; i < 10; i++) {
      const p = path.join(root, 'www/assets/argento', `${a}_${i}.png`);
      const buf = fs.readFileSync(p);
      assert.equal(buf.readUInt32BE(16), 384, p);
      assert.equal(buf.readUInt32BE(20), 384, p);
      assert.ok(buf.length > 2000, p);
    }
  }
  const names = fs.readdirSync(path.join(root, 'www/assets/argento'));
  assert.equal(names.length, 70);
  assert.ok(!names.some(n => /spin/i.test(n)));
});
ok('argento cast only hurts on the bolt frames and a sidestep is safe', () => {
  const b = Axe.fresh({ hp: 5000, timer: 0 });
  const first = Axe.step(b, { dt: 1 / 60, squadX: 40, level: 1, squadCount: 20, shieldCharges: 0 });
  assert.equal(b.state, 'CAST');
  assert.equal(first.drain, 0);
  assert.ok(b.lanes.length >= 1);
  const wind = fwd(b, 0.5, { squadX: b.lanes[0], level: 1, squadCount: 20, shieldCharges: 0 });
  assert.ok(wind.every(e => e.drain === 0), 'wind-up frames deal nothing');
  assert.ok(b.frame < 7);
  const strike = fwd(b, 0.4, { squadX: b.lanes[0], level: 1, squadCount: 20, shieldCharges: 0 });
  const dealt = strike.reduce((s, e) => s + e.drain, 0);
  assert.ok(dealt > 1, 'standing in the lane during the bolt takes damage ' + dealt);
  const safe = Axe.fresh({ hp: 5000, timer: 0 });
  Axe.step(safe, { dt: 1 / 60, squadX: 0, level: 1, squadCount: 20, shieldCharges: 0 });
  const side = fwd(safe, 1.1, { squadX: safe.lanes[0] + Axe.LANE_R + 20, level: 1, squadCount: 20, shieldCharges: 0 });
  assert.equal(side.reduce((s, e) => s + e.drain, 0), 0);
  assert.ok(safe.state === 'RECOVER' || safe.state === 'IDLE');
});
ok('argento overhead and leap hit once, only inside the telegraph', () => {
  function open(which) {
    // attacks % 3: 1 cast, 2 overhead, 0 leap. Seed attacks so the next increment lands on which.
    const b = Axe.fresh({ hp: 8000, timer: 0 });
    b.attacks = which === 'overhead' ? 1 : which === 'leap' ? 2 : 0;
    Axe.step(b, { dt: 1 / 60, squadX: 20, level: 4, squadCount: 30, shieldCharges: 0 });
    assert.equal(b.state, which === 'overhead' ? 'OVERHEAD' : 'LEAP');
    return b;
  }
  for (const which of ['overhead', 'leap']) {
    const on = open(which);
    const aim = on.targetX;
    const ev = fwd(on, 1.1, { squadX: aim, level: 4, squadCount: 30, shieldCharges: 0 });
    const hits = ev.filter(e => e.melee > 0);
    assert.equal(hits.length, 1, which + ' swings once');
    assert.ok(hits[0].melee >= 7, which + ' melee ' + hits[0].melee);
    const windHits = ev.filter((e, i) => e.melee > 0 && i < 20);
    assert.equal(windHits.length, 0, which + ' wind-up is safe');
    const off = open(which);
    const ev2 = fwd(off, 1.1, { squadX: off.targetX + Axe.SLAM_R + 18, level: 4, squadCount: 30, shieldCharges: 0 });
    assert.equal(ev2.reduce((s, e) => s + e.melee, 0), 0, which + ' sidestep');
  }
});
ok('argento shield eats one slam and a cast lane always leaves a pocket', () => {
  const b = Axe.fresh({ hp: 8000, timer: 0 });
  b.attacks = 1;
  Axe.step(b, { dt: 1 / 60, squadX: 10, level: 2, squadCount: 16, shieldCharges: 1 });
  const ev = fwd(b, 1.1, { squadX: b.targetX, level: 2, squadCount: 16, shieldCharges: 1 });
  assert.equal(ev.filter(e => e.shield).length, 1);
  assert.equal(ev.reduce((s, e) => s + e.melee, 0), 0);
  const c = Axe.fresh({ hp: 5000, timer: 0 });
  Axe.step(c, { dt: 1 / 60, squadX: 30, level: 6, squadCount: 20, shieldCharges: 0 });
  assert.ok(c.lanes.length >= 1 && c.lanes.length <= 2);
  let pocket = false;
  for (let x = -150; x <= 150; x += 2) {
    if (c.lanes.every(lx => Math.abs(x - lx) > Axe.LANE_R + 6)) { pocket = true; break; }
  }
  assert.ok(pocket, 'lanes ' + c.lanes.join(','));
});
ok('argento death plays out then pays the same aura as the other bosses', () => {
  const b = Axe.fresh({ hp: 400, timer: 1 });
  b.state = 'CAST'; b.lanes = [0]; b.anim = 'cast'; b.frame = 8;
  Axe.onHit(b);
  assert.equal(b.state, 'CAST', 'a hit does not cancel a telegraph');
  Axe.kill(b);
  assert.equal(b.dying, true);
  assert.equal(b.anim, 'death');
  const ev = fwd(b, 1.4, { squadX: 0, level: 7, squadCount: 12, shieldCharges: 0 });
  const wins = ev.filter(e => e.victory);
  assert.equal(wins.length, 1);
  assert.equal(wins[0].aura, 5000 + 6 * 1000);
  assert.equal(b.active, false);
  assert.equal(ev.reduce((s, e) => s + e.drain + e.melee, 0), 0, 'the corpse does not keep swinging');
  const again = Axe.step(b, { dt: 0.1, squadX: 0, level: 7, squadCount: 12, shieldCharges: 0 });
  assert.equal(again.victory, false);
});
ok('argento flinch uses the hurt strip between attacks only', () => {
  const b = Axe.fresh({ hp: 900, timer: 2 });
  Axe.onHit(b);
  assert.ok(b.flinch > 0);
  Axe.step(b, { dt: 0.05, squadX: 0, level: 1, squadCount: 8, shieldCharges: 0 });
  assert.equal(b.anim, 'hurt');
  assert.equal(b.state, 'IDLE');
  Axe.onHit(b); // still inside the cooldown
  const cd = b.flinchCd;
  assert.ok(cd > 0);
});
console.log(`\n${n} tests passed`);
