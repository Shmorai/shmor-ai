/* =====================================================================
   Shmor Daily: the live network blog on shmor.ai, rebuilt every day.

     node tools/build-daily.js        (run after build-network-index.js)

   Writes static, crawlable pages:
     /daily/                 today's edition (indexable hub, always fresh)
     /daily/YYYY-MM-DD/      dated editions (noindex,follow: they repeat the hub)
     /daily/feed.xml         RSS feed of the stories
     /marketplaces/          directory of every Shmor marketplace (indexable)
     sitemap-network.xml     sitemap index: shmor.ai + every marketplace sitemap
   Sections fill themselves from the network: top stories, stories by topic,
   partner offers & referral picks (from network.js, only when they exist),
   French and German stories, and the edition archive.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://shmor.ai';
const NET = JSON.parse(fs.readFileSync(path.join(ROOT, 'network-index.json'), 'utf8'));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/config.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'assets/js/network.js'), 'utf8') + ';this.D={SITE,AFFILIATE_LINKS,OFFERS,SECTORS};', ctx);
const { AFFILIATE_LINKS, OFFERS, SECTORS } = ctx.D;

const TODAY = new Date().toISOString().slice(0, 10);
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nice = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const short = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Topic groups (sites not listed fall into "More from the network")
const TOPICS = [
  { id: 'travel', title: 'Travel & days out', sites: ['traveldeals', 'cruisedeals', 'hotelhero', 'carhiredeals', 'happydaysout'] },
  { id: 'home', title: 'Home, energy & money', sites: ['domcominsure', 'energysavers', 'storagesavings', 'petsavings', 'localplumbers', 'tradesstation', 'uksew', 'carecompass'] },
  { id: 'business', title: 'Business, law & work', sites: ['prosourced', 'profinders', 'onbuslaw', 'buildlaw', 'taptill'] },
  { id: 'shopping', title: 'Tech, deals & shopping', sites: ['viralgadgets', 'vouchervault', 'bestvpns', 'fullbars'] },
];
const topicOf = id => (TOPICS.find(t => t.sites.includes(id)) || { id: 'more', title: 'More from the network' });

const site = id => NET.sites.find(s => s.id === id) || {};
const posts = NET.items.filter(i => i.type === 'post' && i.date).sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url));
const en = posts.filter(p => p.lang === 'en');

// Pick fresh stories: last 2 days first, widen to 7/30 days if quiet; max 2 per site
function pickStories(maxTotal) {
  for (const days of [2, 7, 30]) {
    const cut = daysAgo(days), per = new Map(), out = [];
    for (const p of en) {
      if (p.date < cut) continue;
      if ((per.get(p.site) || 0) >= 2) continue;
      per.set(p.site, (per.get(p.site) || 0) + 1); out.push(p);
      if (out.length >= maxTotal) break;
    }
    if (out.length >= 8 || days === 30) return { stories: out, window: days };
  }
}
const { stories, window } = pickStories(24);
const top = stories.slice(0, 4), rest = stories.slice(4);
const weekCount = en.filter(p => p.date >= daysAgo(7)).length;
const weekSites = new Set(en.filter(p => p.date >= daysAgo(7)).map(p => p.site)).size;
const intl = ['fr', 'de'].map(l => ({ lang: l, items: posts.filter(p => p.lang === l).slice(0, 3) })).filter(x => x.items.length);

// Partner offers & referral picks (only real, configured ones)
const offers = (OFFERS || []).filter(o => AFFILIATE_LINKS[o.link]);
const featured = Object.entries(AFFILIATE_LINKS).filter(([, l]) => l.featured).slice(0, 8);

/* ---------- Page shell (header/footer come from main.js, like every shmor.ai page) ---------- */
function page({ title, desc, canonical, robots, root, main, ld }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${robots}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Shmor.ai">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canonical}">
${top[0] && top[0].image ? `<meta property="og:image" content="${esc(top[0].image)}">` : ''}
<meta name="theme-color" content="#0A0C0E">
<link rel="icon" href="${root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="Shmor Daily" href="${DOMAIN}/daily/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}assets/css/style.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body data-root="${root}" data-page="daily">
<a class="skip" href="#main">Skip to content</a>
<header id="site-header" class="nav"></header>
<main id="main">
${main}
</main>
<footer id="site-footer" class="site-footer"></footer>
<script src="${root}assets/js/config.js"></script>
<script src="${root}assets/js/network.js"></script>
<script src="${root}assets/js/region.js"></script>
<script src="${root}assets/js/main.js"></script>
</body>
</html>
`;
}

const card = (p, big) => {
  const s = site(p.site);
  return `<a class="dly-card${big ? ' dly-big' : ''}" href="${esc(p.url)}" style="--accent:${esc(s.accent || '#7644B0')}">
    ${p.image ? `<img src="${esc(p.image)}" alt="" loading="${big ? 'eager' : 'lazy'}" width="600" height="360">` : ''}
    <span class="dly-meta"><b>${esc(p.siteName)}</b> · ${esc(short(p.date))}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.text)}</p>
  </a>`;
};

function dailyMain(date, archive, root) {
  const groups = [...TOPICS, { id: 'more', title: 'More from the network', sites: [] }]
    .map(t => ({ ...t, items: rest.filter(p => topicOf(p.site).id === t.id) })).filter(g => g.items.length);
  return `<section class="page-hero"><div class="wrap">
  <span class="eyebrow">Shmor Daily · ${esc(nice(date))}</span>
  <h1>Today across the Shmor network</h1>
  <p>The freshest guides, money-saving tips and news from every Shmor marketplace, picked and updated every day. ${weekCount} new articles from ${weekSites} marketplaces this week.</p>
  <p class="dly-jump">${groups.map(g => `<a href="#${g.id}">${esc(g.title)}</a>`).join('')}${offers.length || featured.length ? '<a href="#offers">Partner offers</a>' : ''}<a href="#marketplaces">All marketplaces</a></p>
</div></section>

<section class="dly-sec"><div class="wrap">
  <h2>Top stories</h2>
  <div class="dly-top">${top.map(p => card(p, true)).join('')}</div>
</div></section>

${groups.map(g => `<section class="dly-sec" id="${g.id}"><div class="wrap">
  <h2>${esc(g.title)}</h2>
  <div class="dly-grid">${g.items.map(p => card(p)).join('')}</div>
</div></section>`).join('\n')}

${offers.length || featured.length ? `<section class="dly-sec" id="offers"><div class="wrap">
  <h2>Partner offers &amp; picks</h2>
  <div class="dly-grid">${offers.map(o => `<a class="dly-card dly-offer" href="${root}go/?to=${encodeURIComponent(o.link)}&src=daily" rel="sponsored nofollow noopener" target="_blank">
    <span class="dly-meta"><b>${esc(o.merchant || AFFILIATE_LINKS[o.link].merchant)}</b>${o.badge ? ` · ${esc(o.badge)}` : ''}</span><h3>${esc(o.title)}</h3>${o.terms ? `<p>${esc(o.terms)}</p>` : ''}</a>`).join('')}
  ${featured.map(([slug, l]) => `<a class="dly-card dly-offer" href="${root}go/?to=${encodeURIComponent(slug)}&src=daily" rel="sponsored nofollow noopener" target="_blank">
    <span class="dly-meta"><b>Partner</b></span><h3>${esc(l.merchant)}</h3><p>${esc(l.blurb || `Visit ${l.merchant}`)}</p></a>`).join('')}</div>
  <p class="dly-note">Some links are affiliate links: we may earn a commission at no extra cost to you. <a href="${root}affiliate-disclosure/">How we make money</a>.</p>
</div></section>` : ''}

${intl.length ? `<section class="dly-sec"><div class="wrap">
  <h2>In French &amp; German</h2>
  <div class="dly-grid">${intl.flatMap(x => x.items).map(p => card(p)).join('')}</div>
</div></section>` : ''}

<section class="dly-sec" id="marketplaces"><div class="wrap">
  <h2>Explore every Shmor marketplace</h2>
  <div class="dly-sites">${NET.sites.map(s => `<a href="${esc(s.url)}" style="--accent:${esc(s.accent || '#7644B0')}"><b>${esc(s.name)}</b><span>${esc(s.blurb || '')}</span></a>`).join('')}</div>
  <p><a class="btn btn-quiet" href="${root}marketplaces/">See the full marketplace directory</a></p>
</div></section>

<section class="dly-sec"><div class="wrap dly-cta">
  <div><h2>Get the best of Shmor once a week</h2><p>The Shmor Weekly rounds up the standout stories in one friendly email.</p></div>
  <a class="btn btn-primary" href="${root}#updates">Join the Shmor Weekly</a>
</div></section>

${archive && archive.length ? `<section class="dly-sec"><div class="wrap">
  <h2>Previous editions</h2>
  <p class="dly-archive">${archive.map(d => `<a href="${root}daily/${d}/">${esc(short(d))}</a>`).join('')}</p>
</div></section>` : ''}`;
}

const itemList = list => ({ '@type': 'ItemList', itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: p.url, name: p.title })) });
const DAILY = path.join(ROOT, 'daily');
fs.mkdirSync(DAILY, { recursive: true });
const archive = fs.readdirSync(DAILY).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== TODAY).sort().reverse().slice(0, 30);

const hubTitle = 'Shmor Daily: today’s best guides & deals across the network';
const hubDesc = `Updated every day: the newest money-saving guides, travel tips, home and business advice from all ${NET.sites.length} Shmor marketplaces, in one place.`;
const ldFor = url => ({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'CollectionPage', '@id': url + '#page', url, name: hubTitle, description: hubDesc, dateModified: TODAY, isPartOf: { '@type': 'WebSite', name: 'Shmor.ai', url: DOMAIN + '/' } },
  itemList(stories),
  { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' }, { '@type': 'ListItem', position: 2, name: 'Shmor Daily', item: DOMAIN + '/daily/' }] },
] });

// Hub (indexable) + today's dated edition (noindex,follow)
fs.writeFileSync(path.join(DAILY, 'index.html'), page({ title: hubTitle, desc: hubDesc, canonical: `${DOMAIN}/daily/`, robots: 'index, follow, max-image-preview:large', root: '../', main: dailyMain(TODAY, archive, '../'), ld: ldFor(`${DOMAIN}/daily/`) }));
fs.mkdirSync(path.join(DAILY, TODAY), { recursive: true });
fs.writeFileSync(path.join(DAILY, TODAY, 'index.html'), page({ title: `Shmor Daily, ${nice(TODAY)}`, desc: hubDesc, canonical: `${DOMAIN}/daily/${TODAY}/`, robots: 'noindex, follow', root: '../../', main: dailyMain(TODAY, archive, '../../').replace('<h1>Today across the Shmor network</h1>', `<h1>Shmor Daily: ${esc(nice(TODAY))}</h1>`), ld: ldFor(`${DOMAIN}/daily/${TODAY}/`) }));

// RSS
fs.writeFileSync(path.join(DAILY, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Shmor Daily</title><link>${DOMAIN}/daily/</link><description>${esc(hubDesc)}</description><language>en</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${stories.map(p => `<item><title>${esc(p.title)}</title><link>${esc(p.url)}</link><guid isPermaLink="true">${esc(p.url)}</guid><pubDate>${new Date(p.date + 'T08:00:00Z').toUTCString()}</pubDate><category>${esc(p.siteName)}</category><description>${esc(p.text)}</description></item>`).join('\n')}
</channel></rss>
`);

// Marketplace directory (indexable)
const dirGroups = [...TOPICS, { id: 'more', title: 'More marketplaces', sites: [] }]
  .map(t => ({ ...t, list: NET.sites.filter(s => topicOf(s.id).id === t.id) })).filter(g => g.list.length);
const langNote = { fr: ' · in French', de: ' · in German' };
const dirMain = `<section class="page-hero"><div class="wrap">
  <span class="eyebrow">The Shmor network</span>
  <h1>All Shmor marketplaces</h1>
  <p>${NET.sites.length} specialist comparison sites for the US, UK and Europe, each focused on one thing: travel, home, money, business, tech and more. Free to use, with guides written to help you choose.</p>
</div></section>
${dirGroups.map(g => `<section class="dly-sec"><div class="wrap"><h2>${esc(g.title)}</h2><div class="dly-sites">${g.list.map(s =>
  `<a href="${esc(s.url)}" style="--accent:${esc(s.accent || '#7644B0')}"><b>${esc(s.name)}</b><span>${esc(s.blurb || '')}</span><small>${esc(s.subdomain)}.shmor.ai${langNote[s.lang] || ''}</small></a>`).join('')}</div></div></section>`).join('\n')}
<section class="dly-sec"><div class="wrap dly-cta"><div><h2>What’s new today?</h2><p>See the latest guides from every marketplace in the Shmor Daily.</p></div><a class="btn btn-primary" href="../daily/">Read the Shmor Daily</a></div></section>`;
fs.mkdirSync(path.join(ROOT, 'marketplaces'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'marketplaces', 'index.html'), page({
  title: 'All Shmor marketplaces: travel, home, money, business & tech',
  desc: `Browse all ${NET.sites.length} Shmor marketplaces: specialist comparison sites for travel, insurance, energy, home services, business and tech in the US, UK and Europe.`,
  canonical: `${DOMAIN}/marketplaces/`, robots: 'index, follow', root: '../', main: dirMain,
  ld: { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Shmor marketplaces', itemListElement: NET.sites.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: s.url, name: s.name })) },
}));

// Sitemap index for the whole network (submit once in Search Console with the shmor.ai domain property)
fs.writeFileSync(path.join(ROOT, 'sitemap-network.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${DOMAIN}/sitemap.xml</loc><lastmod>${TODAY}</lastmod></sitemap>
${NET.sites.map(s => `  <sitemap><loc>https://${s.subdomain}.shmor.ai/sitemap.xml</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('\n')}
</sitemapindex>
`);


// Homepage strip: the 6 newest stories, written into index.html so the links are crawlable from shmor.ai
{
  const ix = path.join(ROOT, 'index.html');
  let h = fs.readFileSync(ix, 'utf8');
  const strip = `<!-- DAILY:START (written by tools/build-daily.js every day; don't edit by hand) -->
<section class="dly-sec dly-home" id="today"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Shmor Daily · ${esc(nice(TODAY))}</span><h2>Today on the Shmor network</h2></div>
  <div class="dly-grid">${stories.slice(0, 6).map(p => card(p)).join('')}</div>
  <p style="margin-top:18px"><a class="btn btn-quiet" href="daily/">Read today’s Shmor Daily</a></p>
</div></section>
<!-- DAILY:END -->`;
  h = h.replace(/<!-- DAILY:START[\s\S]*?<!-- DAILY:END -->/, () => strip);
  fs.writeFileSync(ix, h);
}

console.log(`✓ Shmor Daily ${TODAY}: ${stories.length} stories (last ${window} days), ${offers.length + featured.length} partner picks, ${archive.length} past editions · /marketplaces/ (${NET.sites.length} sites) · sitemap-network.xml`);
