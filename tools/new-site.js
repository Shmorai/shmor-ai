/* =====================================================================
   Create a new Shmor marketplace site in Shmor/sites/, with the SEO site
   kit (tools/site-kit), then sync it into the master site.

     node tools/new-site.js <id> [--name "TravelDeals"] [--sub traveldeals]
                                 [--from travel]      reuse + replace a planned entry
                                 [--icon plane] [--accent "#hex"]
                                 [--blurb "One sentence for the card."]
                                 [--keywords "a,b,c"]

   Creates Shmor/sites/shmor-<id>/  (own git repo, own design, own SEO):
     shmor-site.json      card, keywords, referral links, offers, seo
     content/*.json       one file per page (each = an indexable keyword page)
     templates/layout.html + assets/site.css   this site's design
     tools/build.js       builds pages, sitemap, robots, structured data
     tools/serve.js       local preview
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const KIT = path.join(__dirname, 'site-kit');
const PROJECT = path.dirname(ROOT);
const WORKSPACE = path.dirname(PROJECT);
const args = process.argv.slice(2);
const id = (args[0] || '').toLowerCase();
const flag = k => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : undefined; };

if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
  console.error('Usage: node tools/new-site.js <id> [--name "X"] [--sub x] [--from plannedId] [--icon name] [--accent "#hex"] [--blurb "..."] [--keywords "a,b,c"]');
  process.exit(1);
}

const fromId = flag('from') || id;
const regFile = path.join(ROOT, 'network', `${fromId}.json`);
const existing = fs.existsSync(regFile) ? JSON.parse(fs.readFileSync(regFile, 'utf8')) : null;
if (flag('from') && !existing) { console.error(`No planned entry network/${fromId}.json to reuse.`); process.exit(1); }
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const name = flag('name') || (existing && !flag('from') ? existing.name : null) || cap(id);
const sub = flag('sub') || (existing && !flag('from') ? existing.subdomain : null) || id;
const blurb = flag('blurb') || existing?.blurb || `${cap(id)} options compared in one place.`;

const m = {
  $schema: 'shmor-site/1',
  id,
  name,
  subdomain: sub,
  order: existing?.order ?? 100 + fs.readdirSync(path.join(ROOT, 'network')).length * 10,
  status: 'building',
  icon: flag('icon') || existing?.icon || 'search',
  accent: flag('accent') || existing?.accent || '#7644B0',
  blurb,
  keywords: flag('keywords') ? flag('keywords').split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : existing?.keywords || [id],
  fallback: existing?.fallback || '',
  popular: existing?.popular || [],
  offers: existing?.offers || [],
  links: existing?.links || {},
  seo: {
    siteName: name,
    description: blurb,
    locale: 'en',
    ogLocale: 'en_GB',
    themeColor: '#0A0C0E',
    searchPlaceholder: 'What are you looking for?',
  },
};

const SITES = path.join(PROJECT, 'sites');
fs.mkdirSync(SITES, { recursive: true });
const dir = path.join(SITES, `shmor-${id}`);
if (fs.existsSync(dir)) { console.error(`sites/shmor-${id} already exists. Edit its files, then run: node tools/build.js (in the site) and node tools/sync-network.js (here)`); process.exit(1); }

const host = `${sub}.shmor.ai`;
const write = (rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const copy = (from, to) => { fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true }); fs.copyFileSync(path.join(KIT, from), path.join(dir, to)); };

/* ---------- Identity + hosting ---------- */
write('shmor-site.json', JSON.stringify(m, null, 2) + '\n');
write('CNAME', host + '\n');
write('.nojekyll', '');
write('.gitattributes', '* text=auto eol=lf\n*.webp binary\n*.png binary\n*.jpg binary\n');

/* ---------- Kit: build tools, default design ---------- */
copy('tools/build.js', 'tools/build.js');
copy('tools/serve.js', 'tools/serve.js');
copy('templates/layout.html', 'templates/layout.html');
copy('assets/site.css', 'assets/site.css');
copy('assets/site.js', 'assets/site.js');
fs.copyFileSync(path.join(ROOT, 'assets/img/favicon.svg'), path.join(dir, 'assets/favicon.svg'));

/* ---------- Starter content ---------- */
write('content/home.json', JSON.stringify({
  slug: '',
  title: `${name}: ${blurb.replace(/\.$/, '')}`.slice(0, 60),
  description: `${blurb} Free to use, part of the Shmor.ai network.`,
  eyebrow: 'Part of the Shmor.ai network',
  h1: name,
  intro: blurb,
  related: [],
  sections: [{ h2: `Why use ${name}?`, html: `<p>${blurb}</p>` }],
}, null, 2) + '\n');

write('README.md', `# ${name}  (${host})

Part of the Shmor.ai network: its own brand, design and SEO, listed on shmor.ai via \`shmor-site.json\`.

## Edit
| What | Where |
|---|---|
| Card on shmor.ai, search keywords, **referral links**, offers | \`shmor-site.json\` |
| Pages (one JSON file = one Google-indexable page) | \`content/\` (\`home.json\` is the homepage; \`content/guides/x.json\` → \`/guides/x/\`) |
| Design | \`templates/layout.html\`, \`assets/site.css\` |

## Page file fields
\`slug\`, \`title\` (30–60 chars, unique), \`description\` (120–158 chars, unique), \`h1\`, \`eyebrow\`, \`intro\`,
\`nav\` + \`navOrder\` (show in menu), \`chips\`, \`highlights\`, \`partners\` (link slugs), \`sections\` [{h2, html}],
\`faqs\` [{q, a}] (adds FAQ rich results), \`related\` [slugs], \`keywords\`, \`updated\`, \`noindex\`.

## Commands
\`\`\`bash
node tools/build.js         # build pages, sitemap.xml, robots.txt, structured data
node tools/serve.js 4001    # preview at http://localhost:4001
\`\`\`
After changing \`shmor-site.json\`, also run \`node tools/sync-network.js\` in \`Shmor/shmor-ai\`.

## Referral links in pages
List link slugs in a page's \`"partners"\`, or add \`"offers"\` in \`shmor-site.json\` (optional \`"pages": ["slug"]\`).
Links are written into the HTML as \`https://shmor.ai/go/?to=<slug>&src=${id}-<page>\` with \`rel="sponsored nofollow"\`.

## Deploy (only at launch; keep private until then)
GitHub repo \`Shmorai/shmor-${id}\` → Settings → Pages → branch \`main\`, root. Custom domain \`${host}\`.
DNS at GoDaddy: \`CNAME  ${sub}  shmorai.github.io\`
`);

/* ---------- Briefing for Claude chats opened in this folder ---------- */
write('CLAUDE.md', `# ${name} (${host})

A Shmor marketplace (shared rules in \`../../CLAUDE.md\`): its own brand, design and SEO. ${blurb} Repo: \`Shmorai/shmor-${id}\` (private until launch). Status: **building**.

## Where things are
| What | Where |
|---|---|
| Card on shmor.ai, search keywords, **referral links**, offers, SEO defaults | \`shmor-site.json\` |
| Pages (1 JSON file = 1 Google landing page) | \`content/\` (\`home.json\` = homepage) |
| Design: header, logo, footer | \`templates/layout.html\` |
| Design: styles | \`assets/site.css\` (kit defaults; add this site's theme block at the bottom) |
| Generated output (don't edit by hand) | \`index.html\`, \`*/index.html\`, \`sitemap.xml\`, \`robots.txt\`, \`404.html\`, \`search/\` |

## Design
Not designed yet: still the kit's default theme. Give it its own look (see \`../shmor-traveldeals/\` for a finished example) and record the palette here.

## Commands (run here)
\`\`\`bash
node tools/build.js           # rebuild after ANY change to content/, templates/ or shmor-site.json
node tools/serve.js <port>    # local preview (see the "${id}" preview config)
\`\`\`
After changing \`shmor-site.json\`, also run \`node tools/sync-network.js\` in \`../../shmor-ai\`.

## Referral links
Add to \`shmor-site.json\` → \`"links"\`, list slugs in a page's \`"partners"\` (or add \`"offers"\`), rebuild, sync the master, then commit both repos.
`);

/* ---------- Build, git, preview config ---------- */
execFileSync(process.execPath, [path.join(dir, 'tools/build.js')], { stdio: 'inherit' });
try {
  execFileSync('git', ['init', '-b', 'main', '-q'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=Shmor', '-c', 'user.email=wirelesspaisa@gmail.com', 'commit', '-q', '-m', `Scaffold ${name} (${host})`], { cwd: dir });
} catch (e) { console.warn('git init skipped:', e.message); }

const launchFile = path.join(WORKSPACE, '.claude', 'launch.json');
if (fs.existsSync(launchFile)) {
  const launch = JSON.parse(fs.readFileSync(launchFile, 'utf8'));
  const used = launch.configurations.map(c => c.port);
  let port = 4001; while (used.includes(port)) port++;
  if (!launch.configurations.some(c => c.name === id)) {
    launch.configurations.push({ name: id, runtimeExecutable: 'node', runtimeArgs: [`Shmor/sites/shmor-${id}/tools/serve.js`, String(port)], port });
    fs.writeFileSync(launchFile, JSON.stringify(launch, null, 2) + '\n');
    console.log(`✓ Preview config "${id}" added (http://localhost:${port})`);
  }
}

if (flag('from') && fromId !== id) { fs.unlinkSync(regFile); console.log(`✓ Replaced planned entry "${fromId}" with "${id}"`); }
console.log(`✓ Created Shmor/sites/shmor-${id}/ (${host}), status "building".`);
execFileSync(process.execPath, [path.join(__dirname, 'sync-network.js')], { stdio: 'inherit' });
