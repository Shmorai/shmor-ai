/* =====================================================================
   Shmor network test: crawls the master site and every marketplace the
   way GitHub Pages serves them, and checks every page and link.

     node tools/test-network.js              all sites
     node tools/test-network.js --external   also check every external image loads

   Checks: HTTP status of every page/link/asset, title, meta description,
   canonical, one <h1>, JSON-LD validity, unfilled placeholders, duplicate
   titles, sitemap + robots.txt, 404 page, search index, referral links
   (shmor.ai/go/ slugs must exist), links to shmor.ai pages and other
   network sites. Run it before every commit/launch.
   ===================================================================== */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const SHMOR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.resolve(__dirname, '..', '..');
const CHECK_EXTERNAL = process.argv.includes('--external');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function serve(root) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(root, p);
      if (!f.startsWith(root)) { rsp.writeHead(403); return rsp.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
        if (!p.endsWith('/')) { rsp.writeHead(301, { Location: p + '/' }); return rsp.end(); }
        f = path.join(f, 'index.html');
      }
      if (!fs.existsSync(f)) { rsp.writeHead(404, { 'Content-Type': 'text/html' }); return rsp.end(fs.existsSync(path.join(root, '404.html')) ? fs.readFileSync(path.join(root, '404.html')) : 'nf'); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      rsp.end(fs.readFileSync(f));
    }).listen(0, () => res({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}
const get = async url => { const r = await fetch(url, { redirect: 'follow' }); return { status: r.status, type: r.headers.get('content-type') || '', text: await r.text(), url: r.url }; };

// Master data: referral slugs, subdomains, master paths
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SHMOR, 'shmor-ai/assets/js/config.js'), 'utf8') + '\n' + fs.readFileSync(path.join(SHMOR, 'shmor-ai/assets/js/network.js'), 'utf8') + ';this.D={SITE,AFFILIATE_LINKS,SECTORS,POPULAR,OFFERS};', ctx);
const { AFFILIATE_LINKS, SECTORS } = ctx.D;
const SLUGS = new Set(Object.keys(AFFILIATE_LINKS));
const SUBS = new Set(SECTORS.map(s => s.sub));
const masterPathOk = p => { const f = path.join(SHMOR, 'shmor-ai', decodeURIComponent(p.split(/[?#]/)[0])); return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html'))); };

const externalImgs = new Map(); // url -> [where]
const report = [];

async function testSite(dir, host, isMaster) {
  const name = path.basename(dir);
  const { srv, base } = await serve(dir);
  const errs = [], warns = [];
  const E = m => errs.push(m), W = m => warns.push(m);
  const toLocal = u => u.replace(`https://${host}`, base);
  const seen = new Map(); // path -> status
  const queue = [];
  const titles = new Map();
  let pages = 0;

  // seeds: sitemap + home
  const sm = await get(`${base}/sitemap.xml`);
  if (sm.status !== 200) E('sitemap.xml missing');
  const smUrls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  smUrls.forEach(u => { if (!u.startsWith(`https://${host}/`)) E(`sitemap has foreign URL ${u}`); });
  const rb = await get(`${base}/robots.txt`);
  if (rb.status !== 200 || !rb.text.includes(`Sitemap: https://${host}/sitemap.xml`)) E('robots.txt missing or has no correct Sitemap line');
  const nf = await get(`${base}/this-page-does-not-exist-xyz/`);
  if (nf.status !== 404) E(`404 test returned ${nf.status}`);
  if (!isMaster) { const si = await get(`${base}/search-index.json`); try { JSON.parse(si.text); } catch { E('search-index.json invalid'); } }

  const add = p => { p = p.split('#')[0]; if (!p || seen.has(p)) return; seen.set(p, null); queue.push(p); };
  add('/'); smUrls.forEach(u => add(new URL(u).pathname));

  while (queue.length) {
    const p = queue.shift();
    const r = await get(base + p);
    seen.set(p, r.status);
    if (r.status !== 200) { E(`${p} → HTTP ${r.status}`); continue; }
    if (!r.type.includes('html')) continue;
    pages++;
    const h = r.text;
    const isSearch = p.startsWith('/search/');
    const noindex = /<meta name="robots" content="noindex/.test(h);
    const variant = p.includes('?'); // filter/search variants share the clean page's title + canonical (correct SEO)
    if (/{{[a-z_]+}}/.test(h)) E(`${p}: unfilled template placeholder`);
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1];
    if (!title) E(`${p}: no <title>`);
    else if (!noindex && !isMaster && !variant) { if (titles.has(title)) E(`${p}: duplicate title with ${titles.get(title)}`); titles.set(title, p); }
    if (!noindex && !/<meta name="description" content="[^"]{20,}"/.test(h)) E(`${p}: missing/short meta description`);
    const h1s = (h.match(/<h1[\s>]/g) || []).length;
    if (!isMaster && h1s !== 1 && !isSearch) E(`${p}: ${h1s} <h1> tags (want 1)`);
    if (!isMaster && !noindex) {
      const can = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
      if (can !== `https://${host}${p.split('?')[0]}`) E(`${p}: canonical ${can || 'missing'}`);
    }
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { E(`${p}: invalid JSON-LD`); } }

    // links + assets
    for (const m of h.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      let u = m[1].replace(/&amp;/g, '&');
      if (/^(mailto:|tel:|#|data:|javascript:)/.test(u)) continue;
      if (u.startsWith('//')) u = 'https:' + u;
      if (/^https?:/.test(u)) {
        const url = new URL(u);
        if (url.host === host) { add(url.pathname + url.search); continue; }
        if (url.host === 'shmor.ai' || url.host === 'www.shmor.ai') {
          if (url.pathname === '/go/') { const s = url.searchParams.get('to'); if (!SLUGS.has(s)) E(`${p}: referral link to unknown slug "${s}"`); }
          else if (!masterPathOk(url.pathname)) E(`${p}: link to missing shmor.ai page ${url.pathname}`);
          continue;
        }
        if (url.host.endsWith('.shmor.ai')) { const sub = url.host.split('.')[0]; if (!SUBS.has(sub)) E(`${p}: link to unknown network site ${url.host}`); continue; }
        if (/\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i.test(url.pathname) || url.host === 'images.unsplash.com') {
          const k = url.href; if (!externalImgs.has(k)) externalImgs.set(k, []); externalImgs.get(k).push(`${name}${p}`);
        }
        continue;
      }
      const abs = new URL(u, base + p);
      if (abs.origin !== base) continue;
      add(abs.pathname + abs.search);
    }
  }
  srv.close();
  const fails = [...seen].filter(([, s]) => s !== 200).length;
  report.push({ name, host, pages, urls: seen.size, sitemap: smUrls.length, errs, warns });
}

(async () => {
  await testSite(path.join(SHMOR, 'shmor-ai'), 'shmor.ai', true);
  for (const d of fs.readdirSync(path.join(SHMOR, 'sites')).filter(d => d.startsWith('shmor-'))) {
    const dir = path.join(SHMOR, 'sites', d);
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'shmor-site.json'), 'utf8'));
    await testSite(dir, `${m.subdomain}.shmor.ai`, false);
  }
  let total = 0;
  for (const r of report) {
    total += r.errs.length;
    console.log(`${r.errs.length ? '✗' : '✓'} ${r.name.padEnd(22)} ${String(r.pages).padStart(4)} pages  ${String(r.urls).padStart(4)} URLs checked  sitemap ${r.sitemap}  ${r.errs.length} problems`);
    r.errs.slice(0, 15).forEach(e => console.log('     - ' + e));
    if (r.errs.length > 15) console.log(`     … and ${r.errs.length - 15} more`);
  }
  console.log(`\nExternal images referenced: ${externalImgs.size}`);
  if (CHECK_EXTERNAL) {
    const list = [...externalImgs.keys()]; const bad = [];
    for (let i = 0; i < list.length; i += 12) {
      await Promise.all(list.slice(i, i + 12).map(async u => {
        try { const r = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' } }); if (r.status >= 400) bad.push([u, r.status]); }
        catch (e) { bad.push([u, 'network error']); }
      }));
    }
    console.log(`Broken external images: ${bad.length}`);
    bad.forEach(([u, s]) => console.log(`   ${s}  ${u}\n        used on: ${externalImgs.get(u).slice(0, 3).join(', ')}${externalImgs.get(u).length > 3 ? ' …' : ''}`));
    total += bad.length;
  }
  console.log(total ? `\n${total} problems found.` : '\nAll checks passed.');
})();
