#!/usr/bin/env node
/* =====================================================================
   IndexNow: tell Bing (and Yandex, Seznam, Naver…) about new and updated
   pages on every Shmor site, so they're crawled within hours.

     node --use-system-ca tools/indexnow.js --setup     # write the key file into every site (once, then commit + push)
     node --use-system-ca tools/indexnow.js             # submit new/changed URLs (run AFTER pushing, once Pages has deployed)
     node --use-system-ca tools/indexnow.js --dry-run   # list what would be submitted

   How it works: reads each site's local sitemap.xml (shmor.ai + ../sites/shmor-*),
   compares <loc> + <lastmod> with tools/indexnow-state.json, and submits only what's
   new or changed, one request per host (api.indexnow.org shares it with all engines).
   The key is public by design: https://<host>/<KEY>.txt must contain the key.
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITES = path.join(ROOT, '..', 'sites');
const KEY = 'c48b0266cdbb4a604b84b26058a21c14';
const STATE = path.join(__dirname, 'indexnow-state.json');
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const args = process.argv.slice(2);

const dirs = [ROOT, ...fs.readdirSync(SITES).filter(d => d.startsWith('shmor-')).map(d => path.join(SITES, d))]
  .filter(d => fs.existsSync(path.join(d, 'CNAME')) && fs.existsSync(path.join(d, 'sitemap.xml')));

if (args.includes('--setup')) {
  for (const d of dirs) fs.writeFileSync(path.join(d, `${KEY}.txt`), KEY);
  console.log(`✓ Key file ${KEY}.txt written to ${dirs.length} sites. Commit and push them, then run without --setup.`);
  process.exit(0);
}

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const DRY = args.includes('--dry-run');

(async () => {
  let total = 0, failed = 0;
  for (const d of dirs) {
    const host = fs.readFileSync(path.join(d, 'CNAME'), 'utf8').trim();
    if (!fs.existsSync(path.join(d, `${KEY}.txt`))) { console.log(`! ${host}: no key file (run --setup, commit, push)`); continue; }
    const xml = fs.readFileSync(path.join(d, 'sitemap.xml'), 'utf8');
    const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)].map(m => ({ loc: m[1], mod: m[2] || '' }));
    const changed = urls.filter(u => state[u.loc] !== u.mod);
    if (!changed.length) continue;
    if (DRY) { console.log(`${host}: ${changed.length} to submit`); total += changed.length; continue; }
    // Only submit once GitHub Pages serves this sitemap (i.e. the push has deployed); wait up to ~6 minutes
    let live = false;
    for (let t = 0; t < 24 && !live; t++) {
      live = await fetch(`https://${host}/sitemap.xml`, { cache: 'no-store' }).then(r => r.text()).then(s => s.trim() === xml.trim()).catch(() => false);
      if (!live) await new Promise(r => setTimeout(r, 15000));
    }
    if (!live) { console.log(`… ${host}: live sitemap doesn't match yet (not pushed/deployed?), will retry next run`); continue; }
    for (let i = 0; i < changed.length; i += 10000) {
      const batch = changed.slice(i, i + 10000);
      const res = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList: batch.map(u => u.loc) }),
      }).catch(e => ({ ok: false, status: e.message }));
      // 200 = accepted, 202 = accepted (key validation pending)
      if (res.ok || res.status === 202) { batch.forEach(u => { state[u.loc] = u.mod; }); total += batch.length; console.log(`✓ ${host}: ${batch.length} URLs (HTTP ${res.status})`); }
      else { failed += batch.length; console.log(`✗ ${host}: HTTP ${res.status}`); }
    }
  }
  if (!DRY) fs.writeFileSync(STATE, JSON.stringify(state, null, 0) + '\n');
  console.log(`${DRY ? 'Would submit' : 'Submitted'} ${total} URL(s)${failed ? `, ${failed} failed` : ''}.`);
  if (failed) process.exitCode = 1;
})();
