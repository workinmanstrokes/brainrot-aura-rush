// Build-time ad config. Never prints secret values. Run from the repo root.
//   ADMOB_APP_ID + ADMOB_REWARDED_ID -> real AdMob app + rewarded unit, ONLY with --release (release AAB).
//   Debug/test builds always get Google's TEST app id + TEST rewarded unit + test mode, so test installs can't
//   generate invalid traffic on Michael's real AdMob account.
// Flags: --release (use real ids if both secrets exist)  --dry-run (print the decision, write nothing)
import fs from 'node:fs';
const env = process.env;
const RELEASE = process.argv.includes('--release'), DRY = process.argv.includes('--dry-run');
const tag = RELEASE ? '[release]' : '[debug]';
const cfgPath = 'www/js/config.js', propsPath = 'android/admob.properties';
const TEST_UNIT = 'ca-app-pub-3940256099942544/5224354917';
let cfg = fs.readFileSync(cfgPath, 'utf8');
const set = (mark, re, val) => { cfg = cfg.split('\n').map(l => l.includes(`@cfg ${mark}`) ? l.replace(re, val) : l).join('\n'); };

const real = RELEASE && env.ADMOB_APP_ID && env.ADMOB_REWARDED_ID;
if (real) {
  if (!/^ca-app-pub-\d+~\d+$/.test(env.ADMOB_APP_ID)) { console.error('ADMOB_APP_ID looks malformed'); process.exit(1); }
  if (!/^ca-app-pub-\d+\/\d+$/.test(env.ADMOB_REWARDED_ID)) { console.error('ADMOB_REWARDED_ID looks malformed'); process.exit(1); }
  if (env.ADMOB_APP_ID.includes('3940256099942544')) { console.error('ADMOB_APP_ID is a Google TEST id'); process.exit(1); }
  console.log(`${tag} AdMob: PRODUCTION app id + rewarded unit (secrets), test mode off`);
} else {
  const why = RELEASE ? ' (ADMOB_APP_ID/ADMOB_REWARDED_ID secrets missing: THIS BUILD MUST NOT SHIP)' : (env.ADMOB_REWARDED_ID ? ' (real ids ignored for non-release builds)' : '');
  console.log(`${tag} AdMob: Google TEST app id + rewarded unit, test mode on${why}`);
}
if (DRY) process.exit(0);

if (real) {
  set('rewarded', /'[^']*'/, `'${env.ADMOB_REWARDED_ID}'`);
  set('testing', /true/, 'false');
  fs.writeFileSync(propsPath, `appId=${env.ADMOB_APP_ID}\n`);
} else {
  set('rewarded', /'[^']*'/, `'${TEST_UNIT}'`);
  set('testing', /false/, 'true');
  fs.rmSync(propsPath, { force: true });
}
fs.writeFileSync(cfgPath, cfg);
