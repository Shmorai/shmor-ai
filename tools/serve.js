/* Local preview server that mimics GitHub Pages (folder/index.html, 404.html).
   Run from the repo root:  node tools/serve.js   then open http://localhost:4000

   It also serves EVERY marketplace in ../sites/ on its own preview port (from the
   workspace .claude/launch.json), so the cards on localhost:4000 always open.
   A port that's already in use (e.g. that site's own preview is running) is skipped. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 4000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function serveFolder(root, port, label) {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      const nf = path.join(root, '404.html');
      return fs.existsSync(nf) ? fs.createReadStream(nf).pipe(res) : res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  srv.on('error', e => console.log(e.code === 'EADDRINUSE' ? `  ${label}: port ${port} already in use (its own preview is probably running), skipped` : `  ${label}: ${e.message}`));
  srv.listen(port, () => console.log(`  ${label.padEnd(16)} http://localhost:${port}`));
}

console.log('Shmor preview:');
serveFolder(ROOT, PORT, 'shmor.ai');

// Marketplaces: ports from the workspace launch.json (config name = site id).
// Re-checked every 15 seconds, so a site created while the preview is running opens without a restart.
const SITES = path.resolve(ROOT, '..', 'sites');
const started = new Set();
function startSites() {
  let launch = { configurations: [] };
  try { launch = JSON.parse(fs.readFileSync(path.resolve(ROOT, '..', '..', '.claude', 'launch.json'), 'utf8')); } catch { /* no launch.json */ }
  for (const c of launch.configurations) {
    const dir = path.join(SITES, `shmor-${c.name}`);
    if (!c.port || c.port === PORT || started.has(c.port) || !fs.existsSync(path.join(dir, 'shmor-site.json'))) continue;
    started.add(c.port);
    serveFolder(dir, c.port, c.name);
  }
}
startSites();
setInterval(startSites, 15000);
