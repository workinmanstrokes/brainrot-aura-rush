// Renders the cast lineup (every sprite at large size with its name) from www/js/sprites.js.
// Usage: node tools/art/cast-lineup.mjs [out.png]   (needs playwright-core + system Chrome; set PW / CHROME_PATH)
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const out = process.argv[2] || 'brainrot-cast.png';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
import http from 'node:http'; import fs from 'node:fs';
const srv = http.createServer((q, r) => { const f = path.join(root, 'www', decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.ttf') ? 'font/ttf' : 'text/html' }); r.end(d); } }); });
await new Promise(res => srv.listen(0, res)); const base0 = `http://localhost:${srv.address().port}`;
const p = await b.newPage({ viewport: { width: 2560, height: 800 }, deviceScaleFactor: 1 });
await p.goto(base0 + '/js/sprites.js');
await p.setContent(`<html><head><style>@font-face{font-family:G;src:url('${base0}/fonts/ArchivoBlack-Regular.ttf')}body{margin:0;background:linear-gradient(180deg,#fdf4ff,#e0f2fe)}</style></head><body><canvas id=c width=2560 height=800></canvas></body></html>`);
await p.addScriptTag({ url: base0 + '/js/sprites.js' });
await p.evaluate(async () => {
  await document.fonts.load('30px G');
  const c = document.getElementById('c').getContext('2d'), S = window.Sprites, cast = S.CAST;
  c.fillStyle = '#1a1033'; c.font = '44px G'; c.textAlign = 'center'; c.fillText('BRAINROT: TACTICAL AURA RUSH · THE CAST', 1280, 70);
  // [key, scale, slot width]; slot widths sum to ~2560px
  const order = [['trooper', 4.6, 200], ['trooper2', 4.6, 205], ['trooper3', 4.6, 180], ['trooper4', 4.6, 205], ['leader', 3.6, 360], ['swarmA', 4.2, 240], ['swarmC', 4.4, 240], ['swarmB', 4.4, 250], ['tank', 3.3, 260], ['boss', 2.0, 440]];
  const base = 600; let x0 = 0;
  order.forEach(([k, s, sw]) => {
    const x = x0 + sw / 2; x0 += sw;
    c.fillStyle = 'rgba(26,16,51,0.12)'; c.beginPath(); c.ellipse(x, base, cast[k].w * s * 0.42, 14, 0, 0, Math.PI * 2); c.fill();
    S.draw(c, k, 0, x, base, s);
    const nm = cast[k].name, words = nm.includes(', ') ? nm.split(', ') : nm.includes(' (') ? [nm.slice(0, nm.indexOf(' (')), nm.slice(nm.indexOf(' (') + 1)] : [nm.slice(0, nm.indexOf(' ')), nm.slice(nm.indexOf(' ') + 1)];
    const fit = (t, px, fam) => { while (px > 12) { c.font = `${fam.includes('G') ? '' : 'bold '}${px}px ${fam}`; if (c.measureText(t).width <= sw - 14) break; px--; } };
    c.fillStyle = '#1a1033'; words.forEach((w, j) => { fit(w, 25, 'G'); c.fillText(w, x, base + 52 + j * 30); });
    c.fillStyle = '#7c3aed'; fit(cast[k].role, 19, 'sans-serif'); c.fillText(cast[k].role, x, base + 52 + words.length * 30 + 4);
  });
});
await p.locator('#c').screenshot({ path: out }); await b.close(); srv.close(); console.log('wrote', out);
