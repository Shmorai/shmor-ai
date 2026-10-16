/* =====================================================================
   Shmor Weekly: build this week's email digest from every marketplace.

     node tools/build-weekly.js            writes weekly/latest.json + weekly/preview.html
     node tools/build-weekly.js --days 14  look further back for articles

   Picks the newest English articles ("type": "post") published in the
   last 7 days, at most one per site, up to 8 stories (backfilling from
   the last 30 days if a quiet week). The Google Sheet's Apps Script
   fetches https://shmor.ai/weekly/latest.json every Monday and emails it.
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITES = path.resolve(ROOT, '..', 'sites');
const OUT = path.join(ROOT, 'weekly');
const argDays = process.argv.indexOf('--days');
const DAYS = argDays > -1 ? Number(process.argv[argDays + 1]) : 7;
const MAX = 8;

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.json') ? [path.join(d, e.name)] : []);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const photo = src => /^https:\/\/images\.unsplash\.com\//.test(src) && !src.includes('?') ? `${src}?w=1120&h=560&fit=crop&auto=format&q=70` : src;
const clean = t => String(t).replace(/\s*\|\s*[^|]+$/, '').trim(); // drop " | SiteName" title suffixes

// ISO week id, e.g. 2026-W42
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}

const posts = [];
for (const dir of fs.readdirSync(SITES).filter(d => d.startsWith('shmor-'))) {
  const siteDir = path.join(SITES, dir);
  if (!fs.existsSync(path.join(siteDir, 'shmor-site.json'))) continue;
  const m = JSON.parse(fs.readFileSync(path.join(siteDir, 'shmor-site.json'), 'utf8'));
  if (m.status === 'planned' || (m.seo && m.seo.locale && m.seo.locale !== 'en')) continue;
  const accent = (m.card && m.card.accent) || m.accent || '#7644B0';
  for (const f of walk(path.join(siteDir, 'content'))) {
    let p; try { p = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    if (p.type !== 'post' || !p.date || p.noindex) continue;
    posts.push({
      site: m.name, siteId: m.id, accent,
      date: p.date,
      title: clean(p.h1 || p.title),
      blurb: p.cardText || p.description,
      url: `https://${m.subdomain}.shmor.ai/${p.slug}/`,
      image: p.image && p.image.src ? photo(p.image.src) : null,
      imageAlt: p.image && p.image.alt || '',
    });
  }
}
posts.sort((a, b) => b.date.localeCompare(a.date) || a.site.localeCompare(b.site));

const pick = days => {
  const cut = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const seen = new Set(), out = [];
  for (const p of posts) { if (p.date < cut || seen.has(p.siteId)) continue; seen.add(p.siteId); out.push(p); if (out.length >= MAX) break; }
  return out;
};
let items = pick(DAYS);
if (items.length < 4) items = pick(30);
if (!items.length) { console.error('No articles found for the digest.'); process.exit(1); }

const now = new Date();
const issue = isoWeek(now);
const lead = items[0];
const digest = {
  issue,
  generated: now.toISOString(),
  subject: `The Shmor Weekly: ${lead.title}`,
  preheader: `This week: ${items.slice(0, 3).map(i => i.site).join(', ')} and more, all in one place.`,
  intro: `Here's this week's round-up from across the Shmor network: the freshest guides and money-saving finds from ${items.length} of our marketplaces, picked so you don't have to go looking.`,
  items: items.map(i => ({ ...i, url: `${i.url}?utm_source=shmor-weekly&utm_medium=email&utm_campaign=${issue}` })),
  cta: { text: 'Explore every Shmor marketplace', url: `https://shmor.ai/?utm_source=shmor-weekly&utm_medium=email&utm_campaign=${issue}` },
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify(digest, null, 2) + '\n');

// Browser preview of the email body (the Apps Script renders the same layout)
const card = i => `<tr><td style="padding:0 0 22px"><a href="${esc(i.url)}" style="text-decoration:none;color:#F3F4F5">
${i.image ? `<img src="${esc(i.image)}" alt="${esc(i.imageAlt)}" width="560" style="width:100%;max-width:560px;height:auto;border-radius:14px;display:block">` : ''}
<div style="font:600 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${esc(i.accent)};margin:14px 0 6px">${esc(i.site)}</div>
<div style="font:700 20px/1.3 Arial,sans-serif;color:#F3F4F5">${esc(i.title)}</div>
<div style="font:15px/1.55 Arial,sans-serif;color:#B4BABE;margin-top:6px">${esc(i.blurb)}</div>
<div style="font:700 14px Arial,sans-serif;color:#B48BE6;margin-top:10px">Read more →</div></a></td></tr>`;
fs.writeFileSync(path.join(OUT, 'preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(digest.subject)}</title></head>
<body style="margin:0;background:#0A0C0E"><table role="presentation" width="100%" style="background:#0A0C0E"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="600" style="max-width:600px;width:100%;background:#121518;border-radius:20px"><tr><td style="padding:28px 20px">
<div style="font:700 26px Arial,sans-serif;color:#fff">Shmor<span style="color:#B48BE6">.ai</span> <span style="font-weight:400;color:#868D92;font-size:16px">Weekly · ${issue}</span></div>
<p style="font:16px/1.6 Arial,sans-serif;color:#B4BABE">Hi there, ${esc(digest.intro)}</p>
<table role="presentation" width="100%">${digest.items.map(card).join('')}</table>
<a href="${esc(digest.cta.url)}" style="display:inline-block;background:#613284;color:#fff;font:700 15px Arial,sans-serif;padding:13px 22px;border-radius:999px;text-decoration:none">${esc(digest.cta.text)}</a>
<p style="font:12px/1.6 Arial,sans-serif;color:#868D92;margin-top:26px">Preview only. The real email adds the subscriber's name, an unsubscribe link and the company address.</p>
</td></tr></table></td></tr></table></body></html>\n`);

console.log(`✓ Shmor Weekly ${issue}: ${digest.items.length} stories → weekly/latest.json (+ preview.html)`);
digest.items.forEach(i => console.log(`   ${i.date}  ${i.site}: ${i.title}`));
