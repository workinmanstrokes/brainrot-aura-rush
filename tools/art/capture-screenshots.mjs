#!/usr/bin/env node
// Captures Play Store phone screenshots (1080x1920) from real gameplay of www/index.html.
//   cd tools/art && npm install && node capture-screenshots.mjs [--seed N] [--out DIR]
// How: serves www/ locally, opens it in headless Chrome at 432x768 CSS px with deviceScaleFactor 2.5
// (= 1080x1920 device px, no image upscaling), seeds Math.random so a run is repeatable, and lets a
// simple autopilot steer the squad with real mouse-drag events. Shots are taken when a moment happens.
// The game renders its canvas at devicePixelRatio itself, so no capture tweaks are needed.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('--seed', 7);
const out = path.resolve(arg('--out', path.join(root, 'store-assets/phone-1080x1920')));
const maxSec = +arg('--max', 150);
const only = arg('--only', '') ? arg('--only').split(',') : null; // e.g. --only 06-gorilla-king
fs.mkdirSync(out, { recursive: true });

const www = path.join(root, 'www');
const server = http.createServer((req, res) => {
  const f = path.join(www, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(www) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
async function run(runSeed) {
const ctx = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
await ctx.addInitScript(s => {
  let a = s >>> 0; // mulberry32
  Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}, runSeed);
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(url);
await page.waitForTimeout(800);

async function snap(name) {
  if (taken.has(name) || (only && !only.includes(name))) return;
  taken.add(name);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log('shot', name, 'seed', runSeed);
}
await snap('01-start');
await page.click('text=TAP TO START');
// Autopilot: picks the better gate, dodges enemies, sidesteps the boss laser. Uses real drag events.
await page.evaluate(() => {
  const cx = innerWidth / 2;
  const steer = tx => {
    tx = Math.max(-150, Math.min(150, tx));
    dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: 600 }));
    dispatchEvent(new MouseEvent('mousemove', { clientX: cx + (tx - squad.targetX) * (typeof VS !== 'undefined' ? VS : 1) / 1.6, clientY: 600 }));
    dispatchEvent(new MouseEvent('mouseup', {}));
  };
  window.__pilot = setInterval(() => {
    if (state !== 'PLAYING' && state !== 'BOSS') return;
    let tx = squad.targetX;
    if (state === 'BOSS' && boss) {
      if (boss.state === 'TELEGRAPH' || boss.state === 'STRIKE' || boss.state === 'CAST' || boss.state === 'OVERHEAD' || boss.state === 'LEAP') { const lanes = boss.lanes && boss.lanes.length ? boss.lanes : [boss.targetX]; let best = null, bd = -1; for (let x = -150; x <= 150; x += 10) { const d = Math.min(...lanes.map(l => Math.abs(l - x))); if (d >= 80 && (best === null || Math.abs(x - squad.x) < Math.abs(best - squad.x))) best = x; if (d > bd) bd = d; } tx = best !== null ? best : (boss.targetX > 0 ? -150 : 150); }
      else tx = boss.x;
    } else {
      const g = entities.gates.find(g => g.active && g.y > trackProgress && g.y - trackProgress < 500);
      const score = s => s.isBad ? -100 : (s.type === 'SQUAD' ? s.val * 3 : (s.type === 'FORM' ? 20 : 8));
      const ens = entities.enemies.filter(e => e.active && e.y > trackProgress - 20 && e.y - trackProgress < 260);
      if (g) tx = score(g.left) >= score(g.right) ? -80 : 80;
      else if (ens.length) { let best = 0, bd = -1; for (let x = -150; x <= 150; x += 10) { const d = Math.min(...ens.map(e => Math.abs(e.x - x))); if (d > bd) { bd = d; best = x; } } tx = best; }
      else tx = 0;
    }
    if (Math.abs(tx - squad.targetX) > 3) steer(tx);
  }, 50);
});

const t0 = Date.now();
while (Date.now() - t0 < maxSec * 1000 && taken.size < want) {
  if (errors.length) { console.log('page error:', errors[0]); break; }
  const s = await page.evaluate(() => {
    const g = entities.gates.find(g => g.active && g.y > trackProgress);
    return {
      state, count: squad.count, form: squad.formation, slow: slowMoTimer, texts: entities.texts.length,
      gateAhead: g ? g.y - trackProgress : null, gateFresh: g ? !g.left.hitTime && !g.right.hitTime : false,
      gateBad: g ? !!(g.left.isBad || g.right.isBad) : false,
      gateForm: g ? (g.left.type === 'FORM' || g.right.type === 'FORM') : false,
      enemiesNear: entities.enemies.filter(e => e.active && e.y - trackProgress > 120 && e.y - trackProgress < 420).length,
      boss: boss ? { st: boss.state, t: boss.timer } : null,
    };
  });
  if (s.state === 'GAMEOVER') { await page.waitForTimeout(400); await page.click('#nextBtn'); continue; }
  if (s.state === 'VICTORY') {
    await page.waitForTimeout(700); await snap('07-stage-clear');
    for (let i = 0; i < 3; i++) { const b = await page.$('#shop .upg:not([disabled])'); if (!b) break; await b.click(); await page.waitForTimeout(80); }
    await page.click('#nextBtn'); continue;
  }
  if (s.state === 'PLAYING') {
    if (s.gateAhead > 240 && s.gateAhead < 330 && s.count >= 10 && s.texts === 0 && s.gateBad) await snap('02-choose-a-gate');
    else if (s.enemiesNear >= 2 && s.texts >= 1 && s.count >= 8) await snap('03-blast-the-swarm');
    else if (s.form === 'WIDE' && s.count >= 25 && s.texts === 0) await snap('04-wide-formation');
    else if (s.form === 'SPEARHEAD' && s.count >= 20) await snap('05-spearhead');
    else if (s.gateForm && s.gateAhead > 200 && s.gateAhead < 360 && s.texts === 0) await snap('08-formation-gate'); // was a slow-mo 'last stand' that rarely triggers (hung the capture)
  }
  if (s.state === 'BOSS' && s.boss && s.boss.st === 'STRIKE' && s.boss.t < 0.65) await snap('06-gorilla-king-laser');
  await page.waitForTimeout(40);
}
await ctx.close();
}

const taken = new Set();
const want = only ? only.length : 8;
for (let r = 0; r < +arg('--runs', 6) && taken.size < want; r++) await run(seed + r);
console.log('captured', [...taken].sort().join(', '));
await browser.close();
server.close();
