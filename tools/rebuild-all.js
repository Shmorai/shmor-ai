/* =====================================================================
   Rebuild the whole Shmor network in the right order.

     node tools/rebuild-all.js            index → every site → master sync → daily blog → weekly digest
     node tools/rebuild-all.js --kit      also copy the site kit's build.js into every site first

   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SITES = path.resolve(ROOT, '..', 'sites');
const run = (file, args = [], cwd = ROOT) => execFileSync(process.execPath, [file, ...args], { cwd, stdio: 'pipe' }).toString().trim();

if (process.argv.includes('--kit')) {
  const kit = path.join(__dirname, 'site-kit', 'tools', 'build.js');
  for (const d of fs.readdirSync(SITES).filter(d => d.startsWith('shmor-'))) fs.copyFileSync(kit, path.join(SITES, d, 'tools', 'build.js'));
  console.log('✓ kit build.js copied into every site');
}
console.log(run(path.join(__dirname, 'build-network-index.js')));
let failed = 0;
for (const d of fs.readdirSync(SITES).filter(d => d.startsWith('shmor-'))) {
  const dir = path.join(SITES, d);
  if (!fs.existsSync(path.join(dir, 'tools', 'build.js'))) continue;
  try { console.log('  ' + run(path.join(dir, 'tools', 'build.js'), [], dir).split('\n').pop()); }
  catch (e) { failed++; console.error(`  ✗ ${d}: ${(e.stderr || e.message).toString().split('\n').slice(-3).join(' ')}`); }
}
console.log(run(path.join(__dirname, 'sync-network.js')).split('\n').pop());
if (fs.existsSync(path.join(__dirname, 'build-daily.js'))) console.log(run(path.join(__dirname, 'build-daily.js')).split('\n').pop());
console.log(run(path.join(__dirname, 'build-weekly.js')).split('\n')[0]);
if (failed) { console.error(`\n${failed} site(s) failed to build.`); process.exit(1); }
