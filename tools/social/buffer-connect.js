#!/usr/bin/env node
/* One-time: save the Buffer API key to GitHub (secret BUFFER_API_KEY) for the social auto-poster.
   The user runs it and pastes the key into the form; nothing is printed or saved locally.

     node --use-system-ca tools/social/buffer-connect.js --web     # form at http://localhost:4799
*/
const http = require('http');
const fs = require('fs');
const { execFileSync } = require('child_process');

const REPO = 'Shmorai/shmor-ai';
const GH = fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe') ? 'C:\\Program Files\\GitHub CLI\\gh.exe' : 'gh';

async function connect(key) {
  key = key.trim();
  const res = await fetch('https://api.buffer.com', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: 'query { account { organizations { id name } } }' }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.errors) throw new Error(`Buffer didn't accept that key (${res.status}${j.errors ? ': ' + j.errors.map(e => e.message).join('; ') : ''}).`);
  execFileSync(GH, ['secret', 'set', 'BUFFER_API_KEY', '--repo', REPO], { input: key });
  const org = (j.data.account.organizations[0] || {}).name || 'your Buffer organisation';
  return `Connected to ${org}. The key is saved privately in GitHub for ${REPO}.`;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const page = body => `<!doctype html><meta charset="utf-8"><title>Connect Buffer</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:620px;margin:40px auto;padding:0 16px;background:#0E1214;color:#FAFAF8}input{width:100%;padding:12px;font:15px monospace;border-radius:8px;border:1px solid #613284;background:#171c1f;color:#fff;box-sizing:border-box}label{display:block;margin:22px 0 6px;font-weight:600}small{color:#9aa}button{margin-top:26px;padding:14px 26px;border:0;border-radius:999px;background:#613284;color:#fff;font-size:16px;font-weight:700;cursor:pointer}.ok{color:#2FAF82}.bad{color:#ff8a80}</style>${body}`;
const form = (msg = '') => page(`<h1>Connect Buffer to the Shmor auto-poster</h1>${msg}<form method="post" autocomplete="off">
<label>Buffer API key</label><small>Buffer → Settings → API → + New Key, copy it, paste here.</small><input name="key" type="password" required>
<button>Connect</button></form>`);

http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.method !== 'POST') return res.end(form());
  let data = '';
  req.on('data', c => { data += c; if (data.length > 10000) req.destroy(); });
  req.on('end', async () => {
    try {
      const msg = await connect(new URLSearchParams(data).get('key') || '');
      console.log('✓ ' + msg);
      res.end(page(`<h1 class="ok">✓ Connected</h1><p>${esc(msg)}</p><p>You can close this tab and tell Claude "done".</p>`));
      setTimeout(() => process.exit(0), 500);
    } catch (e) { console.log('✗ ' + e.message); res.end(form(`<p class="bad">✗ ${esc(e.message)}</p>`)); }
  });
}).listen(4799, '127.0.0.1', () => console.log('Open http://localhost:4799 in your browser to connect Buffer.'));
