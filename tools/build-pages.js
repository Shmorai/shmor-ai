/* Regenerates the inner pages (about, partners, contact, legal, 404) from
   one shared template. Run from the repo root:   node tools/build-pages.js
   Edit page copy in tools/pages/*.html, not in the generated output. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'pages');
const DOMAIN = 'https://shmor.ai';

const PAGES = [
  { slug: 'about', title: 'About Shmor', desc: 'Shmor.ai helps people find the right holiday, service or deal in one place. Search more, do less.', eyebrow: 'About us', h1: 'We do the searching, so you don’t have to.', lead: 'Shmor is a network of specialist marketplaces that bring the best options from trusted brands into one place.' },
  { slug: 'partners', title: 'Partner with Shmor', desc: 'Advertise with the Shmor marketplace network. Reach high-intent shoppers in the US, UK and Europe through Awin, CJ, Impact or directly.', eyebrow: 'For brands & advertisers', h1: 'Put your brand where people are ready to choose.', lead: 'Shmor marketplaces connect high-intent shoppers with the brands that suit them best, across travel, services, utilities and retail.' },
  { slug: 'contact', title: 'Contact us', desc: 'Get in touch with the Shmor.ai team.', eyebrow: 'Contact', h1: 'Get in touch', lead: 'Questions, feedback or partnership ideas? We’d love to hear from you.' },
  { slug: 'privacy', title: 'Privacy policy', desc: 'How Shmor.ai collects, uses and protects your personal data.', eyebrow: 'Legal', h1: 'Privacy policy', lead: 'How we collect, use and protect your personal information.' },
  { slug: 'cookies', title: 'Cookie policy', desc: 'How Shmor.ai and our partners use cookies and similar technologies.', eyebrow: 'Legal', h1: 'Cookie policy', lead: 'What cookies are used when you visit Shmor.ai, and how to control them.' },
  { slug: 'terms', title: 'Terms of use', desc: 'The terms that apply when you use Shmor.ai and the Shmor marketplace network.', eyebrow: 'Legal', h1: 'Terms of use', lead: 'The rules for using Shmor.ai and the Shmor marketplace network.' },
  { slug: 'affiliate-disclosure', title: 'How we make money', desc: 'Shmor.ai is free to use. Here is exactly how we make money, and how that does and doesn’t affect what you see.', eyebrow: 'Transparency', h1: 'How we make money', lead: 'Shmor is free for you to use. Here’s exactly how that works, in plain English.' },
];

function page({ slug, title, desc, eyebrow, h1, lead }, body, { depth = 1, rootAttr, canonical = true, noindex = false } = {}) {
  const r = rootAttr || '../'.repeat(depth);
  const url = `${DOMAIN}/${slug ? slug + '/' : ''}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Shmor.ai</title>
<meta name="description" content="${desc}">
${canonical ? `<link rel="canonical" href="${url}">\n` : ''}${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="Shmor.ai">
<meta property="og:title" content="${title} | Shmor.ai">
<meta property="og:description" content="${desc}">
<meta name="theme-color" content="#0A0C0E">
<link rel="icon" href="${r}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${r}assets/css/style.css">
</head>
<body data-root="${r}" data-page="${slug || '404'}">
<a class="skip" href="#main">Skip to content</a>
<header id="site-header" class="nav"></header>
<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="eyebrow">${eyebrow}</span>
    <h1>${h1}</h1>
    <p>${lead}</p>
  </div>
</section>
${body.trim()}
</main>
<footer id="site-footer" class="site-footer"></footer>
<script src="${r}assets/js/config.js"></script>
<script src="${r}assets/js/network.js"></script>
<script src="${r}assets/js/region.js"></script>
<script src="${r}assets/js/main.js"></script>
</body>
</html>
`;
}

for (const p of PAGES) {
  const body = fs.readFileSync(path.join(SRC, p.slug + '.html'), 'utf8');
  fs.mkdirSync(path.join(ROOT, p.slug), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p.slug, 'index.html'), page(p, body));
  console.log('built', p.slug + '/index.html');
}

// 404 — served by GitHub Pages at any depth, so it uses root-absolute paths
const nf = { slug: '', title: 'Page not found', desc: 'This page could not be found.', eyebrow: 'Error 404', h1: 'We searched more. Found less.', lead: 'That page doesn’t exist, or it has moved. Try a search from the homepage instead.' };
const nfBody = `<section class="page-body"><div class="wrap"><a href="/" class="btn btn-primary">Back to Shmor.ai</a></div></section>`;
fs.writeFileSync(path.join(ROOT, '404.html'), page(nf, nfBody, { rootAttr: '/', canonical: false, noindex: true }));
console.log('built 404.html');

// Sitemap
const today = new Date().toISOString().slice(0, 10);
const urls = ['', ...PAGES.map(p => p.slug + '/')];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${DOMAIN}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);
console.log('built sitemap.xml');
