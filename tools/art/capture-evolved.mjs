#!/usr/bin/env node
// Captures one 1080x1920 gameplay shot of the evolved squad (stage 4, LEGEND) right after the evolve announcement.
//   node tools/art/capture-evolved.mjs [--seed N] [--aura N] [--out FILE]
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), www = path.join(root, 'www');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('--seed', 700), auraGain = +arg('--aura', 13000), out = path.resolve(arg('--out', 'evolved.png'));
const server = http.createServer((req, res) => {
  const f = path.join(www, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(www) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
await ctx.addInitScript(s => { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`); await page.waitForTimeout(800);
await page.click('text=TAP TO START'); await page.waitForTimeout(3200);
await page.evaluate(g => { squad.count = Math.max(squad.count, 30); addAura(g); }, auraGain);
await page.waitForTimeout(650);
await page.screenshot({ path: out }); console.log('wrote', out, await page.evaluate(() => document.getElementById('tierBadge').textContent));
await browser.close(); server.close();
