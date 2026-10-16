/* =====================================================================
   Shmor network index: every indexable page of every marketplace, with the
   topic words used to find genuinely related pages across sites.

     node tools/build-network-index.js     writes network-index.json

   Used by:
     - each site's tools/build.js → "From across the Shmor network" boxes
       (up to 3 related articles from OTHER sites, same language)
     - tools/build-daily.js → the Shmor Daily blog on shmor.ai
   Run it before rebuilding sites (tools/rebuild-all.js does this for you).
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITES = path.resolve(ROOT, '..', 'sites');

// Shared with site-kit/tools/build.js: keep the two term() functions identical
const STOP = new Set(('your with what this that from have more best guide guides compare compared comparing deal deals 2025 2026 2027 when which free about into than them they will need know check find cheap costs cost price prices much does should what where while there their here every also just like make most other some only over such very many your yours want help using used uses works work worth tips step steps explained explainer what does how much the and for are can you our new near need' +
  ' pour avec dans votre vous comment quel quels quelle quelles plus sont nous leur leurs cette tout tous toutes faire guide prix entre aussi depuis sans sous chez bien' +
  ' ihre ihren sich oder nicht eine einen einem einer dass wird werden mehr alle beim sind kann auch nach uber unter diese dieser dieses haben wenn sowie zwischen kosten preis').split(/\s+/));
const term = s => [...new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)))];

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.json') ? [path.join(d, e.name)] : []);
const photo = src => /^https:\/\/images\.unsplash\.com\//.test(src) && !src.includes('?') ? `${src}?w=600&h=360&fit=crop&auto=format&q=70` : src;
const clean = t => String(t || '').replace(/\s*\|\s*[^|]+$/, '').trim();

const sites = [], items = [];
for (const dir of fs.readdirSync(SITES).filter(d => d.startsWith('shmor-'))) {
  const sd = path.join(SITES, dir);
  if (!fs.existsSync(path.join(sd, 'shmor-site.json'))) continue;
  const m = JSON.parse(fs.readFileSync(path.join(sd, 'shmor-site.json'), 'utf8'));
  if (m.status === 'planned') continue;
  const lang = ((m.seo && m.seo.locale) || 'en').slice(0, 2);
  const base = `https://${m.subdomain}.shmor.ai`;
  sites.push({ id: m.id, name: m.name, subdomain: m.subdomain, lang, accent: (m.card && m.card.accent) || m.accent, blurb: m.blurb,
    image: m.card && m.card.image ? photo(m.card.image.src) : null, status: m.status, url: `${base}/` });
  for (const f of walk(path.join(sd, 'content'))) {
    let p; try { p = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    if (typeof p.slug !== 'string' || p.noindex || !p.slug || p.type === 'blog') continue; // skip home + blog index
    if (/^(privacy|cookies|terms|impressum|datenschutz|mentions-legales|editorial|about|contact)/.test(p.slug)) continue;
    items.push({
      site: m.id, siteName: m.name, lang, type: p.type || 'page', date: p.date || p.updated || '',
      title: clean(p.h1 || p.title), text: p.cardText || p.description || '',
      url: `${base}/${p.slug}/`, image: p.image && p.image.src ? photo(p.image.src) : null,
      terms: term([p.title, p.h1, p.description, ...(p.keywords || [])].join(' ')),
    });
  }
}
fs.writeFileSync(path.join(ROOT, 'network-index.json'), JSON.stringify({ generated: new Date().toISOString(), sites, items }) + '\n');
console.log(`✓ network-index.json: ${sites.length} sites, ${items.length} pages`);
module.exports = { term };
