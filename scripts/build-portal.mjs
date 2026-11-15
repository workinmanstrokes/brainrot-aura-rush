// Portal web builds (Poki / CrazyGames). Usage: node scripts/build-portal.mjs [poki|crazygames|all] [--zip <outdir>]
// Output: dist/portal-<target>/ and, with --zip, <outdir>/<APP>-<target>.zip. Nothing is uploaded anywhere.
// Portal builds: portal SDK events + portal rewarded ads, no AdMob/Capacitor, no service worker or PWA manifest,
// no external links (privacy/store), everything relative so it runs from the portal's CDN.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CFG } from './portal.config.mjs';
const args = process.argv.slice(2);
const zipAt = args.includes('--zip') ? args[args.indexOf('--zip') + 1] : null;
const which = args.find(a => !a.startsWith('--') && a !== zipAt) || 'all';
const targets = which === 'all' ? ['poki', 'crazygames'] : [which];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const t of targets) {
  if (!['poki', 'crazygames'].includes(t)) { console.error('unknown target ' + t); process.exit(1); }
  const out = path.join('dist', 'portal-' + t);
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(CFG.src, out, { recursive: true, filter: s => !(CFG.exclude || []).some(x => path.relative(CFG.src, s) === x) });
  let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  html = html.replace(/<link[^>]+rel="manifest"[^>]*>\s*/g, '').replace(/<link[^>]+rel="apple-touch-icon"[^>]*>\s*/g, '');
  for (const re of CFG.stripHtml || []) html = html.replace(re, '');
  if (!html.includes(CFG.portalTag)) throw new Error('portal tag not found in index.html: ' + CFG.portalTag);
  html = html.replace(CFG.portalTag, `<script>window.PORTAL_BUILD='${t}';</script>\n  ${CFG.portalTag}`);
  fs.writeFileSync(path.join(out, 'index.html'), html);
  const files = walk(out), bytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
  console.log(`built ${out}: ${files.length} files, ${(bytes / 1024).toFixed(0)} KB`);
  if (zipAt) {
    fs.mkdirSync(zipAt, { recursive: true });
    const zip = path.resolve(zipAt, `${CFG.app}-${t}.zip`); fs.rmSync(zip, { force: true });
    // zip(1) if present, else Python's zipfile (both give index.html at the zip root, as the portals require)
    try { execFileSync('zip', ['-qr9', zip, '.'], { cwd: out, stdio: 'ignore' }); }
    catch { execFileSync('python3', ['-c', 'import os,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],"w",zipfile.ZIP_DEFLATED,compresslevel=9)\nfor d,_,fs in os.walk("."):\n  for f in fs: z.write(os.path.join(d,f),os.path.relpath(os.path.join(d,f),"."))\nz.close()', zip], { cwd: out }); }
    console.log(`zipped ${zip} (${(fs.statSync(zip).size / 1024).toFixed(0)} KB)`);
  }
}
