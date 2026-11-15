#!/usr/bin/env node
// Store art featuring the brainrot cast (www/js/sprites.js), drawn on canvas in headless Chrome.
//   node tools/art/store-art.mjs --shots DIR --out DIR
// Writes to --out (and store-assets/ in the repo):
//   icon-512.png (32-bit RGBA), feature-1024x500.png (24-bit), 01..08-*.png 1080x1920 captioned phone screenshots
//   built from the raw gameplay captures in --shots (from capture-screenshots.mjs).
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { forceRGBA } from './png.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const APP = process.argv.includes('--app'), APP_ONLY = process.argv.includes('--app-only');
const shots = path.resolve(arg('--shots', '/tmp/shots')), out = path.resolve(arg('--out', path.join(root, 'store-assets/store')));
fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = u.startsWith('/shots/') ? path.join(shots, u.slice(7)) : path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.png') ? 'image/png' : f.endsWith('.ttf') ? 'font/ttf' : 'text/html' }); r.end(d); });
});
await new Promise(res => srv.listen(0, '127.0.0.1', res)); const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(base + '/www/js/sprites.js');
await page.setContent(`<html><head><style>@font-face{font-family:G;src:url('${base}/tools/art/fonts/ArchivoBlack-Regular.ttf')}body{margin:0}canvas{display:block}</style></head><body><canvas id=c></canvas></body></html>`);
await page.addScriptTag({ url: base + '/www/js/sprites.js' });
await page.evaluate(() => document.fonts.load('40px G'));

async function render(W, H, fnSrc, arg) {
  await page.setViewportSize({ width: W, height: H });
  const dataUrl = await page.evaluate(async ([W, H, src, arg]) => {
    const cv = document.getElementById('c'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.clearRect(0, 0, W, H);
    const S = window.Sprites; const fn = new Function('c', 'S', 'W', 'H', 'arg', 'return (async () => {' + src + '})()');
    await fn(c, S, W, H, arg); return cv.toDataURL('image/png');
  }, [W, H, fnSrc, arg]);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}
const helpers = `
  const sky = (top, bot) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  const rays = (cx, cy, col) => { c.save(); c.translate(cx, cy); c.fillStyle = col; for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(W, -W * 0.12); c.lineTo(W, W * 0.12); c.fill(); } c.restore(); };
  const shadow = (x, y, rx) => { c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(x, y, rx, rx * 0.22, 0, 0, Math.PI * 2); c.fill(); };
  const word = (t, x, y, px, fill, stroke, lw) => { c.font = px + 'px G'; while (px > 20 && c.measureText(t).width > W - 90) { px -= 2; c.font = px + 'px G'; } c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(t, x, y); c.fillStyle = fill; c.fillText(t, x, y); };
`;
// ---- icon scene (512 design space): Testone Baffolini, Cilindrino Bimbetto (Legend evolution) and Ananasso Spadino in a gold aura ----
const ICON_BG = `{ const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#3b0764'); g.addColorStop(1, '#0c4a6e'); c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  c.save(); c.translate(256, 300); c.fillStyle = 'rgba(250,204,21,0.13)'; for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(700, -84); c.lineTo(700, 84); c.fill(); } c.restore();
  const ring = c.createRadialGradient(256, 290, 120, 256, 290, 240); ring.addColorStop(0, 'rgba(250,204,21,0.55)'); ring.addColorStop(1, 'rgba(250,204,21,0)'); c.fillStyle = ring; c.fillRect(0, 0, 512, 512); }`;
const ICON_FG = `shadow(256, 470, 170);
  S.draw(c, 'boss', 2, 256, 330, 1.05);
  S.draw(c, 'trooper4', 0, 140, 484, 3.7);
  S.draw(c, 'swarmA', 1, 385, 482, 3.6);`;
// k: scale of the 512 scene; fg-only draws the characters centred inside the adaptive-icon safe zone
const iconSrc = ({ bg = true, fg = true, k = null, mask = null } = {}) => helpers + `
  const k = ${k === null ? 'W / 512' : k + ' * W / 512'};
  c.save(); ${mask === 'circle' ? 'c.beginPath(); c.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); c.clip();' : mask === 'rounded' ? 'c.beginPath(); c.roundRect(0, 0, W, H, W * 0.18); c.clip();' : ''}
  ${bg ? `{ const W0 = W, H0 = H; c.save(); c.scale(W / 512, H / 512); { const W = 512, H = 512; ${ICON_BG} } c.restore(); }` : ''}
  ${fg ? `c.save(); ${k === null ? 'c.scale(k, k);' : 'c.translate(W / 2, H / 2); c.scale(k, k); c.translate(-262, -310);'} { const W = 512, H = 512; ${ICON_FG} } c.restore();` : ''}
  c.restore();`;
const icon = await render(512, 512, iconSrc());
fs.writeFileSync(path.join(out, 'icon-512.png'), forceRGBA(icon));
// ---- feature graphic 1024x500 ----
const feat = await render(1024, 500, helpers + `
  sky('#2e1065', '#0e7490'); rays(512, 330, 'rgba(250,204,21,0.10)');
  c.fillStyle = 'rgba(2,6,23,0.35)'; c.fillRect(0, 380, W, 120);
  shadow(150, 455, 80); shadow(870, 455, 110); shadow(512, 470, 200);
  S.draw(c, 'boss', 2, 870, 470, 1.55);
  S.draw(c, 'tank', 1, 690, 470, 2.6);
  S.draw(c, 'swarmB', 0, 455, 482, 2.2);
  S.draw(c, 'leader', 0, 318, 462, 1.95);
  S.draw(c, 'swarmC', 1, 610, 482, 2.2);
  [[130, 430, 'trooper'], [215, 434, 'trooper2'], [90, 480, 'trooper'], [255, 482, 'trooper3'], [172, 490, 'trooper4']].forEach(([x, y, k], i) => S.draw(c, k, i & 1, x, y, 2.7));
  S.draw(c, 'swarmA', 1, 540, 484, 2.3);
  word('BRAINROT', 512, 112, 92, '#facc15', '#1a1033', 16);
  word('TACTICAL AURA RUSH', 512, 172, 46, '#ffffff', '#1a1033', 10);
  word('Grow the squad. Topple the Grump King.', 512, 222, 26, '#a5f3fc', '#1a1033', 7);`);
// re-shoot the drawn canvas as an opaque screenshot: Play wants a 24-bit feature graphic without alpha
fs.writeFileSync(path.join(out, 'feature-1024x500.png'), await page.screenshot({ clip: { x: 0, y: 0, width: 1024, height: 500 } }));
// ---- captioned phone screenshots 1080x1920 ----
const SHOTS = APP_ONLY ? [] : [
  ['02-choose-a-gate.png', 'PICK THE RIGHT GATES', 'Grow a squad of top-hat kids'],
  ['09-evolved.png', 'YOUR SQUAD EVOLVES', 'Earn aura: Rookie to Legend'],
  ['06-gorilla-king-laser.png', 'DODGE THE GRUMP KING', 'His shades glow red, then: laser!'],
  ['03-blast-the-swarm.png', 'BLAST THE SWARM', 'Pineapple knights and angry washers'],
  ['08-formation-gate.png', 'SWITCH FORMATIONS', 'Grid, Wide or Spearhead'],
  ['05-spearhead.png', 'SPEARHEAD THROUGH', 'Shark tanks and pineapple knights'],
  ['07-stage-clear.png', 'SPEND AURA ON UPGRADES', 'Get stronger every zone'],
  ['01-start.png', 'FREE DAILY CHEST', 'Plus permanent Essence upgrades'],
];
let n = 0;
for (const [file, cap, sub] of SHOTS) {
  if (!fs.existsSync(path.join(shots, file))) { console.warn('missing capture', file); continue; }
  n++;
  const png = await render(1080, 1920, helpers + `
    sky('#4c1d95', '#0f172a');
    const img = new Image(); img.src = '/shots/${file}?' + Date.now(); await img.decode();
    const top = 300, h = H - top - 40, w = h * 1080 / 1920, x = (W - w) / 2;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 40; c.beginPath(); c.roundRect(x, top, w, h, 36); c.fillStyle = '#000'; c.fill(); c.restore();
    c.save(); c.beginPath(); c.roundRect(x, top, w, h, 36); c.clip(); c.drawImage(img, x, top, w, h); c.restore();
    c.lineWidth = 6; c.strokeStyle = '#38bdf8'; c.beginPath(); c.roundRect(x, top, w, h, 36); c.stroke();
    word(${JSON.stringify(cap)}, W / 2, 150, 76, '#facc15', '#1a1033', 14);
    word(${JSON.stringify(sub)}, W / 2, 232, 44, '#ffffff', '#1a1033', 9);`);
  fs.writeFileSync(path.join(out, `${String(n).padStart(2, '0')}-${file.replace(/^\d+-/, '')}`), png);
}
console.log(`wrote icon, feature graphic and ${n} screenshots to ${out}`);

// ---- --app: launcher icons (legacy + adaptive, all densities), splash screens, @capacitor/assets sources, feature SVG ----
if (APP || APP_ONLY) {
  const res = path.join(root, 'android/app/src/main/res'), A = path.join(root, 'assets');
  const put = (p, buf) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); };
  const opaque = async (W, H, src) => { await render(W, H, src); return page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } }); };
  const FG_K = 0.6; // characters fit the 66dp safe circle of the 108dp adaptive layer
  const dens = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const legacy = Math.round(48 * k), layer = Math.round(108 * k), dir = path.join(res, `mipmap-${d}`);
    put(path.join(dir, 'ic_launcher.png'), await render(legacy, legacy, iconSrc({ mask: 'rounded' })));
    put(path.join(dir, 'ic_launcher_round.png'), await render(legacy, legacy, iconSrc({ mask: 'circle' })));
    put(path.join(dir, 'ic_launcher_foreground.png'), await render(layer, layer, iconSrc({ bg: false, k: FG_K })));
    put(path.join(dir, 'ic_launcher_background.png'), await opaque(layer, layer, iconSrc({ fg: false })));
  }
  put(path.join(A, 'icon.png'), await render(1024, 1024, iconSrc()));
  put(path.join(A, 'icon-foreground.png'), await render(1024, 1024, iconSrc({ bg: false, k: FG_K })));
  put(path.join(A, 'icon-background.png'), await opaque(1024, 1024, iconSrc({ fg: false })));
  const splashSrc = night => helpers + `
    sky(${night ? "'#0b0420', '#05162a'" : "'#2e1065', '#0c4a6e'"}); rays(W / 2, H * 0.55, 'rgba(250,204,21,${night ? 0.06 : 0.1})');
    const u = Math.min(W, H) / 1000; c.save(); c.translate(W / 2, H * 0.5);
    shadow(0, 300 * u, 380 * u);
    S.draw(c, 'boss', 0, 0, 250 * u, 2.5 * u);
    [[-330, 320], [-215, 340], [215, 340], [330, 320]].forEach(([x, y], i) => S.draw(c, 'trooper', i & 1, x * u, y * u, 4.4 * u));
    c.restore();
    word('BRAINROT', W / 2, H * 0.5 - 330 * u, 120 * u, '#facc15', '#1a1033', 20 * u);
    word('TACTICAL AURA RUSH', W / 2, H * 0.5 - 255 * u, 56 * u, '#ffffff', '#1a1033', 11 * u);`;
  put(path.join(A, 'splash.png'), await opaque(2732, 2732, splashSrc(false)));
  put(path.join(A, 'splash-dark.png'), await opaque(2732, 2732, splashSrc(true)));
  const port = { ldpi: [240, 320], mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
  const splashes = [['drawable', 320, 480, false], ['drawable-night', 320, 240, true]];
  for (const [d, [w, h]] of Object.entries(port)) splashes.push([`drawable-port-${d}`, w, h, false], [`drawable-port-night-${d}`, w, h, true], [`drawable-land-${d}`, h, w, false], [`drawable-land-night-${d}`, h, w, true]);
  for (const [dir, w, h, night] of splashes) put(path.join(res, dir, 'splash.png'), await opaque(w, h, splashSrc(night)));
  // SVG sources: the cast is drawn with canvas, so these wrap the rendered art (kept for @capacitor/assets and editing)
  const wrap = (W, H, png) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><!-- Generated by tools/art/store-art.mjs --app from www/js/sprites.js --><image width="${W}" height="${H}" xlink:href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
  const feat = fs.readFileSync(path.join(out, 'feature-1024x500.png'));
  put(path.join(root, 'store-assets/feature-graphic.svg'), wrap(1024, 500, feat));
  put(path.join(root, 'store-assets/feature-graphic-1024x500.png'), feat);
  put(path.join(root, 'store-assets/icon-512.png'), fs.readFileSync(path.join(out, 'icon-512.png')));
  for (const [n, W] of [['icon', 1024], ['icon-foreground', 1024], ['icon-background', 1024], ['splash', 2732]]) put(path.join(A, n + '.svg'), wrap(W, W, fs.readFileSync(path.join(A, n + '.png'))));
  console.log('wrote launcher icons, adaptive layers, splash screens, assets/ sources and store-assets/feature-graphic.svg');
}
await browser.close(); srv.close();
