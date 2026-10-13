/* =====================================================================
   Create a new Shmor marketplace site next to this repo, then sync it
   into the master site.

     node tools/new-site.js <id> [--name "Shmor Pets"] [--sub pets]
                                 [--icon search] [--accent "#7644B0"]
                                 [--blurb "One sentence for the card."]
                                 [--keywords "dog,cat,pet insurance"]

   If network/<id>.json already exists (e.g. "travel"), its details are
   used and only missing values are filled from the flags.
   Creates:  ../shmor-<id>/   (its own git repo, deployable to GitHub Pages)
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const id = (args[0] || '').toLowerCase();
const flag = k => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : undefined; };

if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
  console.error('Usage: node tools/new-site.js <id> [--name "Shmor X"] [--sub x] [--icon name] [--accent "#hex"] [--blurb "..."] [--keywords "a,b,c"]');
  process.exit(1);
}

const regFile = path.join(ROOT, 'network', `${id}.json`);
const existing = fs.existsSync(regFile) ? JSON.parse(fs.readFileSync(regFile, 'utf8')) : null;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const m = {
  $schema: 'shmor-site/1',
  id,
  name: flag('name') || existing?.name || `Shmor ${cap(id)}`,
  subdomain: flag('sub') || existing?.subdomain || id,
  order: existing?.order ?? 100 + fs.readdirSync(path.join(ROOT, 'network')).length * 10,
  status: 'building',
  icon: flag('icon') || existing?.icon || 'search',
  accent: flag('accent') || existing?.accent || '#7644B0',
  blurb: flag('blurb') || existing?.blurb || `${cap(id)} options compared in one place.`,
  keywords: flag('keywords') ? flag('keywords').split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : existing?.keywords || [id],
  fallback: existing?.fallback || '',
  popular: existing?.popular || [],
  offers: existing?.offers || [],
  links: existing?.links || {},
};

const dir = path.join(path.dirname(ROOT), `shmor-${id}`);
if (fs.existsSync(dir)) { console.error(`../shmor-${id} already exists. Edit its shmor-site.json and run: node tools/sync-network.js`); process.exit(1); }

const host = `${m.subdomain}.shmor.ai`;
const write = (rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };

/* ---------- Manifest: the ONE file the master site reads ---------- */
write('shmor-site.json', JSON.stringify(m, null, 2) + '\n');

/* ---------- GitHub Pages plumbing ---------- */
write('CNAME', host + '\n');
write('.nojekyll', '');
write('robots.txt', `User-agent: *\nAllow: /\n`);
fs.copyFileSync(path.join(ROOT, 'assets/img/favicon.svg'), (fs.mkdirSync(path.join(dir, 'assets'), { recursive: true }), path.join(dir, 'assets/favicon.svg')));

/* ---------- Referral helper: <a data-aff="slug"> → shmor.ai/go/ ---------- */
write('assets/shmor-links.js', `/* Turns <a data-aff="slug"> into a tracked referral link via https://shmor.ai/go/.
   Slugs come from this site's shmor-site.json "links". Optional data-src labels where the click came from. */
(function () {
  var SITE = '${id}';
  document.querySelectorAll('a[data-aff]').forEach(function (a) {
    a.href = 'https://shmor.ai/go/?to=' + encodeURIComponent(a.dataset.aff) +
      '&src=' + encodeURIComponent(SITE + '-' + (a.dataset.src || 'page'));
    a.rel = 'sponsored nofollow noopener';
    a.target = '_blank';
  });
})();
`);

/* ---------- Starter pages (replace with this site's own design) ---------- */
const head = (title, depth) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${m.blurb.replace(/"/g, '&quot;')}">
<meta name="theme-color" content="#0A0C0E">
<link rel="icon" href="${depth}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark; --accent: ${m.accent}; --bg: #0A0C0E; --surface: #121518; --line: #23282C; --ink: #F3F4F5; --ink-2: #B4BABE; }
  * { box-sizing: border-box; }
  body { margin: 0; background: radial-gradient(700px 400px at 80% -10%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%), var(--bg); color: var(--ink); font-family: Inter, system-ui, sans-serif; min-height: 100vh; }
  a { color: inherit; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
  header { display: flex; justify-content: space-between; align-items: center; height: 72px; border-bottom: 1px solid var(--line); }
  .brand { font-family: Outfit, sans-serif; font-weight: 700; font-size: 24px; text-decoration: none; letter-spacing: -.02em; }
  .brand span { color: var(--accent); }
  .net { font-size: 14px; color: var(--ink-2); text-decoration: none; }
  h1 { font-family: Outfit, sans-serif; font-size: clamp(40px, 7vw, 72px); letter-spacing: -.04em; line-height: 1.05; margin: 80px 0 16px; }
  p.sub { color: var(--ink-2); font-size: 19px; max-width: 620px; }
  form { display: flex; gap: 10px; max-width: 680px; margin-top: 32px; background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 8px; }
  input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink); font: inherit; font-size: 17px; padding: 12px; }
  button { font: 600 16px Outfit, sans-serif; background: var(--accent); color: #fff; border: 0; border-radius: 999px; padding: 12px 26px; cursor: pointer; }
  footer { margin-top: 120px; padding: 30px 0; border-top: 1px solid var(--line); color: #868D92; font-size: 13px; }
</style>
</head>`;
const brand = m.name.replace(/^Shmor\s+/, '');
const header = depth => `<header class="wrap"><a class="brand" href="${depth}">Shmor <span>${brand}</span></a><a class="net" href="https://shmor.ai/">Part of the Shmor.ai network →</a></header>`;
const footer = `<footer class="wrap">${m.name} is part of <a href="https://shmor.ai/">Shmor.ai</a>. Some links are affiliate links: we may earn a commission at no extra cost to you. <a href="https://shmor.ai/affiliate-disclosure/">How we make money</a> · <a href="https://shmor.ai/privacy/">Privacy</a> · <a href="https://shmor.ai/terms/">Terms</a></footer>`;

write('index.html', `${head(`${m.name} | Shmor.ai`, '')}
<body>
${header('./')}
<main class="wrap">
  <h1>${m.name}</h1>
  <p class="sub">${m.blurb}</p>
  <form action="search/"><input name="q" placeholder="What are you looking for?" aria-label="Search"><button>Search</button></form>
</main>
${footer}
<script src="assets/shmor-links.js"></script>
</body>
</html>
`);

write('search/index.html', `${head(`Search | ${m.name}`, '../')}
<body>
${header('../')}
<main class="wrap">
  <h1 id="h">Results</h1>
  <p class="sub">Search results for this marketplace go here. The master site sends searches to <code>/search/?q=...</code>.</p>
  <!-- Example referral button: slug must exist in shmor-site.json "links" -->
  <!-- <a data-aff="example-slug" data-src="search">View deal</a> -->
</main>
${footer}
<script>var q = new URLSearchParams(location.search).get('q'); if (q) document.getElementById('h').textContent = 'Results for “' + q + '”';</script>
<script src="../assets/shmor-links.js"></script>
</body>
</html>
`);

write('README.md', `# ${m.name}  (${host})

Part of the Shmor.ai network. This site has its own design; the master site (shmor.ai) reads **\`shmor-site.json\`** to build this site's card, search routing and referral links.

## shmor-site.json
| Field | Meaning |
|---|---|
| \`status\` | \`planned\` → \`building\` → \`live\`. Only \`live\` sends shmor.ai visitors here. |
| \`name\`, \`blurb\`, \`icon\`, \`accent\` | The card on shmor.ai |
| \`keywords\` | Searches on shmor.ai containing these words are routed here |
| \`popular\` | \`[{ "label": "...", "q": "..." }]\`: tiles on shmor.ai |
| \`links\` | Referral links: \`"slug": { "merchant", "network", "url" }\`. \`url\` can be \`{ "us", "uk", "eu" }\` |
| \`offers\` | \`[{ "title", "link": "slug", "badge", "terms" }]\`: featured on shmor.ai |
| \`fallback\` | Link slug to use for this card/searches until \`live\` |

After editing it, run \`node tools/sync-network.js\` in the **shmor-ai** repo, then commit and push both repos.

## Referral links on this site
\`\`\`html
<a data-aff="slug" data-src="hero">Visit</a>
<script src="/assets/shmor-links.js"></script>
\`\`\`
Clicks go through https://shmor.ai/go/, which picks the visitor's US/UK/EU link and adds a sub-ID.

## Deploy
GitHub repo \`shmor-${id}\` → Settings → Pages → branch \`main\`, root. Custom domain: \`${host}\`.
DNS: \`CNAME  ${m.subdomain}  <your-username>.github.io\`
`);

/* ---------- git init ---------- */
try {
  execFileSync('git', ['init', '-b', 'main', '-q'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=Shmor', '-c', 'user.email=wirelesspaisa@gmail.com', 'commit', '-q', '-m', `Scaffold ${m.name}`], { cwd: dir });
} catch (e) { console.warn('git init skipped:', e.message); }

console.log(`✓ Created ../shmor-${id}/ (${host}), status "building".`);
execFileSync(process.execPath, [path.join(__dirname, 'sync-network.js')], { stdio: 'inherit' });
