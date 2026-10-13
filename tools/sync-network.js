/* =====================================================================
   Shmor network sync
   Pulls every marketplace manifest into the master site.

     node tools/sync-network.js           sync + regenerate assets/js/network.js
     node tools/sync-network.js --check   validate only, change nothing

   Sources (later wins):
     1. network/<id>.json                  registry kept in this repo
     2. ../sites/shmor-<id>/shmor-site.json   each marketplace's own folder in
                                              Shmor/sites/; copied back into
                                              network/<id>.json
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const NET_DIR = path.join(ROOT, 'network');
const OUT = path.join(ROOT, 'assets', 'js', 'network.js');
const CHECK_ONLY = process.argv.includes('--check');

const STATUSES = ['planned', 'building', 'live'];
const NETWORKS = ['awin', 'cj', 'impact', 'rakuten', 'partnerize', 'tradedoubler', 'webgains', 'direct'];

// Things the manifests are validated against
const config = (() => {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/config.js'), 'utf8') + ';this.C={SITE,AFFILIATE_LINKS};', ctx);
  return ctx.C;
})();
const REGIONS = Object.keys(config.SITE.regions.list);
const ICONS = [...fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8')
  .split('const ICONS = {')[1].split('};')[0].matchAll(/^\s{4}(\w+): \[/gm)].map(m => m[1]);

const errors = [], warnings = [];
const err = (id, msg) => errors.push(`  ✗ [${id}] ${msg}`);
const warn = (id, msg) => warnings.push(`  ! [${id}] ${msg}`);

/* ---------- 1. Collect manifests ---------- */
const manifests = new Map();   // id -> { data, from }
for (const f of fs.readdirSync(NET_DIR).filter(f => f.endsWith('.json'))) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(NET_DIR, f), 'utf8'));
    manifests.set(data.id, { data, from: `network/${f}` });
  } catch (e) { err(f, `invalid JSON: ${e.message}`); }
}
const pulled = [];
const SITES = path.join(path.dirname(ROOT), 'sites');
for (const dir of fs.existsSync(SITES) ? fs.readdirSync(SITES) : []) {
  const file = path.join(SITES, dir, 'shmor-site.json');
  if (!fs.existsSync(file)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    manifests.set(data.id, { data, from: `sites/${dir}/shmor-site.json` });
    pulled.push(data.id);
  } catch (e) { err(dir, `invalid shmor-site.json: ${e.message}`); }
}

/* ---------- 2. Validate ---------- */
const isHttps = u => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u);
const seenSub = new Map(), slugOwner = new Map();
for (const slug of Object.keys(config.AFFILIATE_LINKS)) slugOwner.set(slug, 'config.js');

for (const [id, { data: m }] of manifests) {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(id || '')) err(id, 'id must be lowercase letters/numbers/dashes');
  for (const k of ['name', 'subdomain', 'icon', 'accent', 'blurb']) if (!m[k]) err(id, `missing "${k}"`);
  if (m.subdomain && !/^[a-z0-9-]+$/.test(m.subdomain)) err(id, `bad subdomain "${m.subdomain}"`);
  if (seenSub.has(m.subdomain)) err(id, `subdomain "${m.subdomain}" also used by ${seenSub.get(m.subdomain)}`);
  seenSub.set(m.subdomain, id);
  if (!STATUSES.includes(m.status)) err(id, `status must be one of ${STATUSES.join(', ')}`);
  if (m.icon && !ICONS.includes(m.icon)) err(id, `unknown icon "${m.icon}". Available: ${ICONS.join(', ')}`);
  if (m.accent && !/^#[0-9a-f]{6}$/i.test(m.accent)) err(id, `accent must be a hex colour like #613284`);
  if (!Array.isArray(m.keywords) || !m.keywords.length) err(id, 'needs a non-empty "keywords" list (drives search routing)');

  for (const [slug, l] of Object.entries(m.links || {})) {
    if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) err(id, `link slug "${slug}" must be lowercase letters/numbers/dashes`);
    if (slugOwner.has(slug)) err(id, `link slug "${slug}" already used in ${slugOwner.get(slug)}`);
    slugOwner.set(slug, id);
    if (!l.merchant) err(id, `link "${slug}" needs a "merchant" name`);
    const nets = [l.network, ...Object.values(l.networks || {})].filter(Boolean);
    nets.forEach(n => { if (!NETWORKS.includes(n)) warn(id, `link "${slug}": unknown network "${n}" (no sub-ID will be added)`); });
    if (typeof l.url === 'string') { if (!isHttps(l.url)) err(id, `link "${slug}" url must start with https://`); }
    else if (l.url && typeof l.url === 'object') {
      for (const [r, u] of Object.entries(l.url)) {
        if (!REGIONS.includes(r)) err(id, `link "${slug}": unknown region "${r}" (use ${REGIONS.join('/')})`);
        if (!isHttps(u)) err(id, `link "${slug}" (${r}) url must start with https://`);
      }
      const missing = REGIONS.filter(r => !l.url[r]);
      if (missing.length) warn(id, `link "${slug}" has no ${missing.join('/').toUpperCase()} url; those visitors get the ${config.SITE.regions.default.toUpperCase()} link`);
    } else err(id, `link "${slug}" needs a "url"`);
  }
}
// Cross-references (after all slugs are known)
for (const [id, { data: m }] of manifests) {
  if (m.fallback && !slugOwner.has(m.fallback)) err(id, `fallback "${m.fallback}" isn't a known link slug`);
  (m.offers || []).forEach((o, i) => {
    if (!o.title) err(id, `offer #${i + 1} needs a "title"`);
    if (!slugOwner.has(o.link)) err(id, `offer "${o.title || i + 1}" points at unknown link "${o.link}"`);
  });
  (m.popular || []).forEach((p, i) => { if (!p.label || !p.q) err(id, `popular #${i + 1} needs "label" and "q"`); });
}

if (warnings.length) console.log('Warnings:\n' + warnings.join('\n'));
if (errors.length) { console.error('\nSync stopped. Fix these and run again:\n' + errors.join('\n')); process.exit(1); }
if (CHECK_ONLY) { console.log(`✓ ${manifests.size} manifests valid.`); process.exit(0); }

/* ---------- 3. Copy pulled manifests back into the registry ---------- */
for (const id of pulled) {
  fs.writeFileSync(path.join(NET_DIR, `${id}.json`), JSON.stringify(manifests.get(id).data, null, 2) + '\n');
}

/* ---------- 4. Generate assets/js/network.js ---------- */
const list = [...manifests.values()].map(x => x.data).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
const sectors = list.map(m => ({
  id: m.id, name: m.name, sub: m.subdomain, icon: m.icon, accent: m.accent,
  live: m.status === 'live', status: m.status, fallback: m.fallback || '',
  blurb: m.blurb, keywords: m.keywords,
}));
const links = {}, popular = [], offers = [];
for (const m of list) {
  for (const [slug, l] of Object.entries(m.links || {})) links[slug] = { ...l, sector: m.id };
  for (const p of m.popular || []) popular.push({ ...p, sector: m.id });
  for (const o of m.offers || []) offers.push({ ...o, sector: m.id });
}
const J = v => JSON.stringify(v, null, 2);
fs.writeFileSync(OUT, `/* GENERATED by tools/sync-network.js on ${new Date().toISOString().slice(0, 10)} — do not edit.
   Edit network/<id>.json (or the site's own shmor-site.json) and re-run the sync. */
const SECTORS = ${J(sectors)};

Object.assign(AFFILIATE_LINKS, ${J(links)});

POPULAR.unshift(...${J(popular)});

OFFERS.push(...${J(offers)});
`);

/* ---------- 5. Summary ---------- */
const pad = (s, n) => String(s).padEnd(n);
console.log('\n' + pad('SITE', 14) + pad('SUBDOMAIN', 26) + pad('STATUS', 10) + pad('LINKS', 7) + pad('OFFERS', 8) + 'SOURCE');
for (const m of list) {
  console.log(pad(m.id, 14) + pad(`${m.subdomain}.${config.SITE.domain}`, 26) + pad(m.status, 10) +
    pad(Object.keys(m.links || {}).length, 7) + pad((m.offers || []).length, 8) + manifests.get(m.id).from);
}
console.log(`\n✓ Wrote assets/js/network.js: ${sectors.length} marketplaces, ${Object.keys(links).length} referral links, ${offers.length} offers.`);
