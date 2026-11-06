// Playwright smoke test of the web build: start a run, daily chest, and the three in-run ad offers using the
// browser ad simulator (?adsim=1), plus a check that no ad buttons show without it (web = ads no-op).
// Usage: python3 -m http.server 8812 -d www &  PW=playwright-core URL=http://localhost:8812/ CHROME=/usr/bin/google-chrome node tests/smoke.mjs
const { chromium } = await import(process.env.PW || 'playwright-core');
const URL = process.env.URL || 'http://localhost:8812/';
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
const errs = []; let fails = 0;
const fail = m => { console.error('FAIL', m); fails++; }, pass = m => console.log('ok -', m);
async function page(q) {
  const p = await b.newPage({ viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL + q, { waitUntil: 'load' }); await p.waitForTimeout(400); return p;
}
// 1) plain web: no ad buttons anywhere
let p = await page('');
if (await p.$('#chestBtn')) pass('daily chest offered'); else fail('no chest');
await p.click('#chestBtn'); const e1 = await p.evaluate(() => meta.essence);
if (e1 > 0) pass('chest gave ◈ ' + e1); else fail('chest gave nothing');
if (await p.$('.btn.ad')) fail('ad button shown on web without adsim'); else pass('no ad buttons on plain web');
const href = await p.getAttribute('#privacyLink', 'href'); if (/test-builds\/privacy\/brainrot-aura-rush\.html$/.test(href)) pass('privacy link'); else fail('privacy link ' + href);
await p.click('text=TAP TO START'); await p.waitForTimeout(1500);
if (await p.evaluate(() => state) === 'PLAYING') pass('run started'); else fail('run did not start');
await p.evaluate(() => { squad.count = 0; gameOver(); }); await p.waitForTimeout(200);
if (await p.$('#adOffers .btn')) fail('ad offers on plain web'); else pass('game over shows no ad offers on plain web');
await p.close();

// 2) simulated ads
p = await page('?adsim=1');
await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(400);
await p.click('#chestBtn'); await p.waitForSelector('#adChest');
const before = await p.evaluate(() => ({ e: meta.essence, a: save.chestAmt }));
await p.click('#adChest'); await p.waitForTimeout(2600);
const after = await p.evaluate(() => ({ e: meta.essence, a: save.chestAmt, led: save.ads }));
if (after.a >= before.a && after.e - before.e === after.a - before.a && after.led.chest === 1) pass(`chest reroll (${before.a} -> ${after.a})`); else fail('chest reroll ' + JSON.stringify({ before, after }));
if (await p.$('#adChest')) fail('chest reroll offered twice'); else pass('chest reroll capped at 1/day');
await p.click('text=TAP TO START'); await p.waitForTimeout(2500);
await p.evaluate(() => { runKills = 40; runAuraEarned = 1200; squad.count = 0; gameOver(); }); await p.waitForTimeout(200);
const g = await p.evaluate(() => ({ lastGained, e: meta.essence }));
if (await p.$('#revive') && await p.$('#double')) pass('game over offers revive + double (◈ +' + g.lastGained + ')'); else fail('missing offers');
await p.click('#revive'); await p.waitForTimeout(2600);
const r = await p.evaluate(() => ({ state, count: squad.count, e: meta.essence, runRevived, modal: $('endModal').style.display }));
if (r.state === 'PLAYING' && r.count >= 12 && r.modal === 'none' && r.e === g.e - g.lastGained) pass(`revived with ${r.count} troopers, essence refunded`); else fail('revive ' + JSON.stringify(r));
await p.waitForTimeout(1200);
await p.evaluate(() => { squad.count = 0; gameOver(); }); await p.waitForTimeout(200);
if (await p.$('#revive')) fail('second revive offered'); else pass('revive capped at 1/run');
const g2 = await p.evaluate(() => ({ lastGained, e: meta.essence }));
await p.click('#double'); await p.waitForTimeout(2600);
const d = await p.evaluate(() => ({ e: meta.essence, desc: $('endDesc').textContent }));
if (d.e === g2.e + g2.lastGained && /doubled/.test(d.desc)) pass('essence doubled (+' + g2.lastGained + ')'); else fail('double ' + JSON.stringify(d));
if (await p.$('#double')) fail('double offered twice'); else pass('double capped at 1/run end');
await p.click('#nextBtn'); await p.waitForTimeout(800);
await p.evaluate(() => { aura = 2000; victory(); }); await p.waitForTimeout(200);
const a0 = await p.evaluate(() => aura);
if (await p.$('#zone')) pass('zone clear offers bonus aura'); else fail('no zone bonus');
await p.click('#zone'); await p.waitForTimeout(2600);
const a1 = await p.evaluate(() => aura);
if (a1 > a0 && !(await p.$('#zone'))) pass(`bonus aura ${a0} -> ${a1}, capped at 1/zone`); else fail('zone bonus ' + a0 + ' ' + a1);
await p.click('#nextBtn'); await p.waitForTimeout(1500);
if (await p.evaluate(() => state) === 'PLAYING' && await p.evaluate(() => level) === 2) pass('zone 2 runs'); else fail('zone 2');
await p.screenshot({ path: process.env.SHOT || '/tmp/br-smoke.png' });
const ev = await p.evaluate(() => { const s0 = troopStage; addAura(1600); const s1 = troopStage, b1 = document.getElementById('tierBadge').textContent; addAura(20000); return { s0, s1, b1, s2: troopStage }; });
if (ev.s0 === 0 && ev.s1 === 1 && /EVOLVED: RUNNER/.test(ev.b1) && ev.s2 === 3) pass(`squad evolves ${ev.s0} -> ${ev.s1} -> ${ev.s2} (${ev.b1})`); else fail('evolution ' + JSON.stringify(ev));
const at = await p.evaluate(() => { const a = Sprites.atlas(); return a && { w: a.width, h: a.height }; });
if (at && at.w <= 1800 && at.h <= 4096) pass(`sprite atlas ${at.w}x${at.h}`); else fail('sprite atlas ' + JSON.stringify(at));
await p.evaluate(() => { level = 3; initLevel(); spawnBoss(); boss.state = 'TELEGRAPH'; }); await p.waitForTimeout(600);
if (await p.evaluate(() => entities.enemies.some(e => e.skin === 'swarmB'))) pass('zone 3 spawns gelato snails'); else fail('no swarmB in zone 3');
if (await p.evaluate(() => { const lv = level; level = 2; const n0 = entities.enemies.length; spawnSwarmRow(900); level = lv; const row = entities.enemies.slice(n0); return row.some(e => e.skin === 'swarmC') && row.some(e => e.skin === 'swarmA'); })) pass('washer grunts mixed with pineapple knights'); else fail('no swarmC/swarmA mix');
const led = await p.evaluate(() => save.ads.count); if (led === 4) pass('ledger counted 4 rewarded ads'); else fail('ledger ' + led);
// Boss roster: zone cycles grump -> sweeper -> espresso -> flamenco -> squalo. Force with spawnBoss(kind).
await p.evaluate(() => { level = 2; initLevel(); spawnBoss('sweeper'); boss.timer = 0; boss.attacks = 0; }); await p.waitForTimeout(1500);
const sw = await p.evaluate(() => ({ kind: boss.kind, name: $('bossName').textContent, dust: entities.dust.length, r: entities.dust.reduce((m, d) => Math.max(m, d.r), 0), st: boss.state }));
if (sw.kind === 'sweeper' && /SWEEPING OLD MAN/.test(sw.name) && sw.dust > 0 && sw.r > 14) pass(`sweeper boss throws dust balls (${sw.dust}, r ${sw.r.toFixed(1)})`); else fail('sweeper ' + JSON.stringify(sw));
await p.evaluate(() => { squad.count = 14; troopStage = 2; evolveFlash = 0; entities.texts.length = 0; }); await p.waitForTimeout(700);
await p.screenshot({ path: process.env.BOSS_SHOT || '/tmp/br-sweeper.png' });
const rot = await p.evaluate(() => [1,2,3,4,5].map(lv => { level = lv; return bossKind(); }));
if (rot.join(',') === 'grump,sweeper,espresso,flamenco,squalo') pass('boss rotation ' + rot.join(' -> ')); else fail('rotation ' + rot);
await p.evaluate(() => { level = 3; initLevel(); spawnBoss('espresso'); boss.timer = 0; boss.attacks = 2; }); await p.waitForTimeout(1400);
const es = await p.evaluate(() => ({ kind: boss.kind, name: $('bossName').textContent, dust: entities.dust.length, fl: entities.dust[0] && entities.dust[0].flavor }));
if (es.kind === 'espresso' && /ESPRESSORILLA/.test(es.name) && es.dust > 0 && es.fl === 'espresso') pass(`espresso cups (${es.dust})`); else fail('espresso ' + JSON.stringify(es));
await p.screenshot({ path: '/tmp/br-espresso.png' });
await p.evaluate(() => { level = 4; initLevel(); spawnBoss('flamenco'); boss.timer = 0; boss.attacks = 1; }); await p.waitForTimeout(1200);
const fl = await p.evaluate(() => ({ kind: boss.kind, name: $('bossName').textContent, st: boss.state, near: boss.near }));
if (fl.kind === 'flamenco' && /FLAMENCO/.test(fl.name)) pass(`flamenco rotor (${fl.st})`); else fail('flamenco ' + JSON.stringify(fl));
await p.screenshot({ path: '/tmp/br-flamenco.png' });
await p.evaluate(() => { level = 5; initLevel(); spawnBoss('squalo'); boss.timer = 0; boss.attacks = 0; }); await p.waitForTimeout(1300);
const sqb = await p.evaluate(() => ({ kind: boss.kind, name: $('bossName').textContent, dust: entities.dust.length, fl: entities.dust[0] && entities.dust[0].flavor }));
if (sqb.kind === 'squalo' && /SQUALO/.test(sqb.name) && sqb.dust > 0 && sqb.fl === 'shell') pass(`squalo shells (${sqb.dust})`); else fail('squalo ' + JSON.stringify(sqb));
await p.screenshot({ path: '/tmp/br-squalo.png' });
if (await p.evaluate(() => { level = 1; initLevel(); spawnBoss(); return boss.kind; }) === 'grump') pass('zone 1 is the Grump King'); else fail('zone1 grump');
// boss gate: optional "double squad" offer, once per zone
await p.evaluate(() => { localStorage.clear(); save.ads = { day: '', count: 0, chest: 0 }; quitToTitle(); });
await p.click('text=TAP TO START'); await p.waitForTimeout(500);
await p.evaluate(() => { squad.count = 15; trackProgress = trackLength + 1; }); await p.waitForTimeout(300);
if (await p.evaluate(() => state) === 'GATE' && await p.$('#squad')) pass('boss gate offers double squad'); else fail('no double squad offer ' + await p.evaluate(() => state));
await p.click('#squad'); await p.waitForTimeout(2600);
const sq = await p.evaluate(() => ({ state, count: squad.count, led: save.ads.squad, modal: $('gateModal').style.display }));
if (sq.state === 'BOSS' && sq.count === 30 && sq.led === 1 && sq.modal === 'none') pass('squad doubled 15 -> 30, boss fight starts'); else fail('double squad ' + JSON.stringify(sq));
await p.evaluate(() => { level = 2; initLevel(); squad.count = 10; trackProgress = trackLength + 1; }); await p.waitForTimeout(300);
await p.click('#gateFight'); await p.waitForTimeout(200);
if (await p.evaluate(() => state) === 'BOSS') pass('FIGHT NOW skips the offer'); else fail('fight now');
await p.evaluate(() => { save.ads.squad = 3; level = 3; initLevel(); trackProgress = trackLength + 1; }); await p.waitForTimeout(300);
if (await p.evaluate(() => state) === 'BOSS') pass('no offer once the daily cap (3) is used'); else fail('squad daily cap');
await p.close();

// 3) portal build mode (?portal=poki) with a mock SDK: events + rewarded via the portal, keyboard steering
p = await b.newPage({ viewport: { width: 900, height: 700 } });
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__calls = []; const c = n => (...a) => { window.__calls.push(n); return n === 'rewardedBreak' ? Promise.resolve(true) : Promise.resolve(); };
  window.PokiSDK = { init: c('init'), gameLoadingFinished: c('gameLoadingFinished'), gameplayStart: c('gameplayStart'), gameplayStop: c('gameplayStop'), commercialBreak: c('commercialBreak'), rewardedBreak: c('rewardedBreak') }; });
await p.goto(URL + '?portal=poki', { waitUntil: 'load' }); await p.waitForTimeout(500);
if (await p.evaluate(() => Portal.active && document.querySelector('.legal').style.display === 'none')) pass('portal mode: active, no external links'); else fail('portal mode');
await p.keyboard.press('Enter'); await p.waitForTimeout(400);
if (await p.evaluate(() => state) === 'PLAYING') pass('Enter starts a run'); else fail('Enter start');
const x0 = await p.evaluate(() => squad.targetX); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight');
const x1 = await p.evaluate(() => squad.targetX); if (x1 > x0 + 40) pass(`arrow keys steer (${x0} -> ${Math.round(x1)})`); else fail('arrow steer ' + x0 + ' ' + x1);
await p.evaluate(() => { squad.count = 0; gameOver(); }); await p.waitForTimeout(200);
if (await p.$('#revive')) pass('portal rewarded offers show'); else fail('no portal offers');
await p.click('#revive'); await p.waitForTimeout(400);
if (await p.evaluate(() => state) === 'PLAYING') pass('revive via portal rewardedBreak'); else fail('portal revive');
await p.evaluate(() => { squad.count = 0; gameOver(); }); await p.click('#nextBtn'); await p.waitForTimeout(400);
const calls = await p.evaluate(() => window.__calls.join(','));
const want = ['init', 'gameLoadingFinished', 'gameplayStart', 'gameplayStop', 'rewardedBreak'];
if (want.every(w => calls.includes(w)) && !calls.includes('commercialBreak') && calls.indexOf('gameLoadingFinished') < calls.indexOf('gameplayStart')) pass('poki events (no commercialBreak): ' + calls); else fail('poki events ' + calls);
await p.close();

// 6) Aura Box: free box per played run, tap-to-crack reveal, odds panel, index, ad bonus (simulated)
p = await page('?adsim=1');
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
await p.click('text=TAP TO START'); await p.waitForTimeout(800);
await p.evaluate(() => { squad.count = 0; gameOver(); }); await p.waitForTimeout(200);
if (await p.$('#endBoxBtn')) fail('box for an unplayed run'); else pass('no aura box for a start->die run');
await p.click('#nextBtn'); await p.waitForTimeout(600);
await p.evaluate(() => { runKills = 20; squad.count = 0; gameOver(); }); await p.waitForTimeout(200);
await p.evaluate(() => { reviveRun(); runKills = 25; squad.count = 0; gameOver(); }); await p.waitForTimeout(200);
if (await p.evaluate(() => AuraBox.state().pending) === 1 && await p.$('#endBoxBtn')) pass('1 aura box per played run (revive adds none)'); else fail('box grant ' + await p.evaluate(() => AuraBox.state().pending));
await p.click('#endBoxBtn'); await p.waitForTimeout(800);
await p.click('#abxOdds'); const odds = await p.textContent('#abxOddsPanel');
if (/FINAL CHANCE/.test(odds) && /MYTHIC/.test(odds) && /can't be bought/.test(odds)) pass('odds panel discloses drop rates'); else fail('odds panel');
await p.click('#abxOddsClose');
for (let i = 0; i < 5; i++) { await p.tap('#auraBox canvas'); await p.waitForTimeout(120); }
await p.waitForTimeout(2300);
const ab = await p.evaluate(() => ({ ph: AuraBox.phase(), st: AuraBox.state() }));
if (ab.ph === 'reveal' && ab.st.opened === 1 && Object.keys(ab.st.owned).length === 1 && ab.st.pending === 0) pass('5 taps crack the box and add an aura'); else fail('box open ' + JSON.stringify(ab));
if (await p.$('#abxBonus')) { await p.click('#abxBonus'); await p.waitForTimeout(2600); } else fail('no bonus box offer');
const bonus = await p.evaluate(() => ({ pend: AuraBox.state().pending, ph: AuraBox.phase(), again: !!document.querySelector('#abxBonus'), led: save.ads.count }));
if (bonus.pend === 1 && bonus.ph === 'idle' && bonus.led >= 1) pass('rewarded bonus box granted'); else fail('bonus ' + JSON.stringify(bonus));
for (let i = 0; i < 5; i++) { await p.tap('#auraBox canvas'); await p.waitForTimeout(120); }
await p.waitForTimeout(2300);
if (await p.$('#abxBonus')) fail('bonus offered twice in one run'); else pass('bonus box capped at 1 per run');
await p.click('#abxIndex'); await p.waitForTimeout(400);
const tiles = await p.$$eval('.abx-tile', t => [t.length, t.filter(x => !x.classList.contains('lock')).length]);
if (tiles[0] === 15 && tiles[1] >= 1) pass(`index: 15 tiles, ${tiles[1]} discovered`); else fail('index ' + tiles);
await p.click('#abxIxClose'); await p.click('#abxDone');
const pers = await p.evaluate(() => JSON.parse(localStorage.getItem('brainrot-aura-rush-aurabox')));
if (pers.v === 1 && pers.opened === 2) pass('aura box state persisted (v1)'); else fail('persist ' + JSON.stringify(pers));
await p.close();
await b.close();
if (errs.length) fail('page errors: ' + errs.join(' | ')); else pass('no page errors');
process.exitCode = fails ? 1 : 0; console.log(fails ? `${fails} failed` : 'smoke passed');
