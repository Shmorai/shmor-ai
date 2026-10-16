/* =====================================================================
   Shmor SEO audit: reads every built page of every site and reports what
   affects Google indexing and ranking.

     node tools/audit-seo.js            summary per site
     node tools/audit-seo.js --detail   also list every flagged page

   Per page: words of real content, H2 count, internal links in/out, links to
   other Shmor sites, images without alt text, lang attribute, canonical,
   structured data. Per site: sitemap coverage, orphan pages (nothing links
   to them), thin pages (< 300 words), cross-network links.
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHMOR = path.dirname(ROOT);
const DETAIL = process.argv.includes('--detail');
const THIN = 300;

const walkHtml = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return ['content', 'templates', 'tools', 'assets', 'node_modules', '.git', 'search', 'weekly', 'go'].includes(e.name) && d === base ? [] : walkHtml(p, base);
  return e.name === 'index.html' ? [p] : [];
});
const text = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

function auditSite(dir, host, locale) {
  const pages = new Map(); // path -> info
  for (const f of walkHtml(dir)) {
    const rel = '/' + path.relative(dir, path.dirname(f)).replace(/\\/g, '/');
    const p = rel === '/' ? '/' : rel + '/';
    const h = fs.readFileSync(f, 'utf8');
    const noindex = /<meta name="robots" content="noindex/.test(h);
    const main = (h.match(/<main[\s\S]*?<\/main>/) || [h])[0];
    const links = [...main.matchAll(/<a\s[^>]*href="([^"#]+)/g)].map(m => m[1]);
    const internal = links.filter(u => u.startsWith('/') && !u.startsWith('//')).map(u => u.split('?')[0]);
    const network = links.filter(u => /^https:\/\/[a-z0-9-]+\.shmor\.ai\//.test(u) && !u.includes(`//${host}/`)).map(u => new URL(u).host);
    pages.set(p, {
      p, noindex,
      words: text(main).split(' ').filter(Boolean).length,
      h2: (main.match(/<h2[\s>]/g) || []).length,
      internal, network,
      imgNoAlt: (h.match(/<img(?![^>]*\salt=)[^>]*>/g) || []).length, // alt="" is correct for decorative images; only a missing alt counts
      lang: (h.match(/<html[^>]*\slang="([^"]+)"/) || [])[1] || '',
      canonical: /<link rel="canonical"/.test(h),
      ld: (h.match(/"@type":"([A-Za-z]+)"/g) || []).map(s => s.slice(9, -1)),
    });
  }
  // inbound counts (from any page of the site, incl. header/footer: use whole files)
  const inbound = new Map([...pages.keys()].map(k => [k, 0]));
  for (const f of walkHtml(dir)) {
    const h = fs.readFileSync(f, 'utf8');
    const self = '/' + path.relative(dir, path.dirname(f)).replace(/\\/g, '/');
    for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) {
      const t = m[1].endsWith('/') ? m[1] : m[1] + '/';
      if (inbound.has(t) && (t !== (self === '/' ? '/' : self + '/'))) inbound.set(t, inbound.get(t) + 1);
    }
  }
  const sm = fs.existsSync(path.join(dir, 'sitemap.xml')) ? fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8') : '';
  const inSitemap = new Set([...sm.matchAll(/<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(m => m[1]));
  const idx = [...pages.values()].filter(x => !x.noindex && x.p !== '/404/');
  const missingFromSitemap = idx.filter(x => !inSitemap.has(x.p)).map(x => x.p);
  const orphans = idx.filter(x => x.p !== '/' && inbound.get(x.p) === 0).map(x => x.p);
  const thin = idx.filter(x => x.words < THIN).map(x => `${x.p} (${x.words}w)`);
  const wrongLang = idx.filter(x => !x.lang.toLowerCase().startsWith((locale || 'en').slice(0, 2))).map(x => x.p);
  const netHosts = new Set(idx.flatMap(x => x.network));
  return {
    pages: idx.length, avgWords: Math.round(idx.reduce((s, x) => s + x.words, 0) / Math.max(1, idx.length)),
    thin, orphans, missingFromSitemap, wrongLang,
    noCanonical: idx.filter(x => !x.canonical).map(x => x.p),
    imgNoAlt: idx.reduce((s, x) => s + x.imgNoAlt, 0),
    networkLinks: idx.reduce((s, x) => s + x.network.length, 0), networkSites: netHosts.size,
    ldTypes: [...new Set(idx.flatMap(x => x.ld))].sort(),
  };
}

const rows = [];
const masterRobots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
for (const d of fs.readdirSync(path.join(SHMOR, 'sites')).filter(d => d.startsWith('shmor-'))) {
  const dir = path.join(SHMOR, 'sites', d);
  if (!fs.existsSync(path.join(dir, 'shmor-site.json'))) continue;
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'shmor-site.json'), 'utf8'));
  const robots = fs.existsSync(path.join(dir, 'robots.txt')) ? fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8') : '';
  rows.push({ name: m.name, id: m.id, robotsOk: robots.includes(`Sitemap: https://${m.subdomain}.shmor.ai/sitemap.xml`), ...auditSite(dir, `${m.subdomain}.shmor.ai`, m.seo && m.seo.locale) });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('SITE', 18) + pad('PAGES', 7) + pad('AVG WORDS', 11) + pad('THIN', 6) + pad('ORPHANS', 9) + pad('NOT IN SITEMAP', 16) + pad('IMG NO ALT', 12) + pad('LINKS→NETWORK', 15) + 'SCHEMA');
for (const r of rows) {
  console.log(pad(r.name, 18) + pad(r.pages, 7) + pad(r.avgWords, 11) + pad(r.thin.length, 6) + pad(r.orphans.length, 9) + pad(r.missingFromSitemap.length, 16) + pad(r.imgNoAlt, 12) +
    pad(`${r.networkLinks} (${r.networkSites} sites)`, 15) + r.ldTypes.join(','));
  if (DETAIL) {
    for (const [k, v] of [['thin', r.thin], ['orphans', r.orphans], ['not in sitemap', r.missingFromSitemap], ['wrong lang', r.wrongLang], ['no canonical', r.noCanonical]])
      if (v.length) console.log(`     ${k}: ${v.slice(0, 12).join('  ')}${v.length > 12 ? `  …+${v.length - 12}` : ''}`);
    if (!r.robotsOk) console.log('     robots.txt missing correct Sitemap line');
  }
}
const tot = k => rows.reduce((s, r) => s + (Array.isArray(r[k]) ? r[k].length : r[k]), 0);
console.log(`\nTOTAL: ${rows.length} sites, ${tot('pages')} indexable pages · thin ${tot('thin')} · orphans ${tot('orphans')} · missing from sitemap ${tot('missingFromSitemap')} · images without alt ${tot('imgNoAlt')} · wrong lang ${tot('wrongLang')} · bad robots ${rows.filter(r => !r.robotsOk).length}`);
