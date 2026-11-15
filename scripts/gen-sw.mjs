// Regenerates sw.js: precaches every file in the web folder and stamps a content hash as the cache
// version, so each new build ships a new cache and old caches are deleted. Usage: node gen-sw.mjs <webDir> <appKey> [extraShellRuntimeHostsRegex]
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [dir, key] = process.argv.slice(2);
const skip = /(^|\/)(sw\.js|\.DS_Store)$|\.map$|(^|\/)(poki|crazygames|gamedistribution)\//;
const files = [];
(function walk(p) { for (const f of fs.readdirSync(p, { withFileTypes: true })) { const fp = path.join(p, f.name); if (f.isDirectory()) walk(fp); else files.push(path.relative(dir, fp).split(path.sep).join('/')); } })(dir);
const list = files.filter((f) => !skip.test(f)).sort();
const MAX = 15 * 1024 * 1024; let total = 0; const pre = [];
for (const f of list) { const s = fs.statSync(path.join(dir, f)).size; if (s > 4 * 1024 * 1024 || total + s > MAX) continue; total += s; pre.push(f); }
const h = crypto.createHash('sha256'); for (const f of list) { h.update(f); h.update(fs.readFileSync(path.join(dir, f))); }
const ver = h.digest('hex').slice(0, 10);
const tpl = fs.readFileSync(new URL('./sw.tpl.js', import.meta.url), 'utf8');
fs.writeFileSync(path.join(dir, 'sw.js'), tpl.replace('__CACHE__', `${key}-${ver}`).replace('__FILES__', JSON.stringify(['./', ...pre])));
console.log(`sw.js ${key}-${ver}: ${pre.length} files, ${(total / 1024 / 1024).toFixed(1)} MB precached`);
