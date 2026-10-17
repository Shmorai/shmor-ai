#!/usr/bin/env node
/* =====================================================================
   One-time: connect the Shmor.ai Facebook Page to the auto-poster.
   Run it yourself in a terminal (it asks for secrets; nothing is printed or saved locally):

       node tools/social/facebook-connect.js

   It asks for your Meta app's App ID + App secret and a short-lived User token
   from the Graph API Explorer, swaps them for a Page token that doesn't expire,
   and stores it in GitHub (secret FB_PAGE_TOKEN, variable FB_PAGE_ID) via the gh CLI.
   ===================================================================== */
const { execFileSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const GRAPH = 'https://graph.facebook.com/v24.0';
const REPO = 'Shmorai/shmor-ai';
const PAGE_NAME = 'Shmor.ai';
const APP_ID = '1151491003883107'; // "Shmor autopost" Meta app (not secret)
const GH = fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe') ? 'C:\\Program Files\\GitHub CLI\\gh.exe' : 'gh';

function ask(question, hidden) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (s.includes(question)) process.stdout.write(question); };
    rl.question(question, a => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });
}
async function get(path, params) {
  const r = await fetch(GRAPH + path + '?' + new URLSearchParams(params));
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

async function connect(appSecret, userToken) {
  const long = await get('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: appSecret.trim(), fb_exchange_token: userToken.trim() });
  const pages = await get('/me/accounts', { access_token: long.access_token, fields: 'id,name,access_token,tasks', limit: '100' });
  const page = (pages.data || []).find(p => p.name === PAGE_NAME) || (pages.data || [])[0];
  if (!page) throw new Error('No Pages found. In Graph API Explorer, tick the Shmor.ai Page when Facebook asks which Pages to allow.');
  execFileSync(GH, ['secret', 'set', 'FB_PAGE_TOKEN', '--repo', REPO], { input: page.access_token });
  execFileSync(GH, ['variable', 'set', 'FB_PAGE_ID', '--repo', REPO, '--body', page.id]);
  const warn = (page.tasks || []).includes('CREATE_CONTENT') ? '' : ' (Facebook did not report posting rights for this Page; check the permissions you ticked.)';
  return `Connected "${page.name}" (Page ID ${page.id}). Saved to GitHub for ${REPO}.${warn}`;
}

// --web: a tiny form on http://localhost:4799 (this computer only) to paste the two values in the browser
function web() {
  const http = require('http');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const page = (body) => `<!doctype html><meta charset="utf-8"><title>Connect Facebook</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:620px;margin:40px auto;padding:0 16px;background:#0E1214;color:#FAFAF8}input{width:100%;padding:12px;font:15px monospace;border-radius:8px;border:1px solid #613284;background:#171c1f;color:#fff;box-sizing:border-box}label{display:block;margin:22px 0 6px;font-weight:600}small{color:#9aa}button{margin-top:26px;padding:14px 26px;border:0;border-radius:999px;background:#613284;color:#fff;font-size:16px;font-weight:700;cursor:pointer}.ok{color:#2FAF82}.bad{color:#ff8a80}</style>${body}`;
  const form = (msg = '') => page(`<h1>Connect the Shmor.ai Page</h1>${msg}<form method="post" autocomplete="off">
<label>1) App secret</label><small>Meta app → App settings → Basic → click Show next to App secret, copy, paste here.</small><input name="secret" type="password" required>
<label>2) Access token</label><small>Graph API Explorer → click the copy icon next to the Access Token box, paste here.</small><input name="token" type="password" required>
<button>Connect</button></form>`);
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.method !== 'POST') return res.end(form());
    let data = '';
    req.on('data', c => { data += c; if (data.length > 20000) req.destroy(); });
    req.on('end', async () => {
      const f = new URLSearchParams(data);
      try {
        const msg = await connect(f.get('secret') || '', f.get('token') || '');
        console.log('✓ ' + msg);
        res.end(page(`<h1 class="ok">✓ Connected</h1><p>${esc(msg)}</p><p>You can close this tab and tell Claude "done".</p>`));
        setTimeout(() => process.exit(0), 500);
      } catch (e) {
        console.log('✗ ' + e.message);
        res.end(form(`<p class="bad">✗ ${esc(e.message)}</p><p>Check both values and try again (the token expires after about an hour; generate a fresh one if needed).</p>`));
      }
    });
  });
  server.listen(4799, '127.0.0.1', () => console.log('Open http://localhost:4799 in your browser to connect Facebook.'));
}

if (process.argv.includes('--web')) web();
else (async () => {
  console.log('Connect the Shmor.ai Facebook Page to the auto-poster\n');
  console.log('Paste each item, then press Enter. Nothing shows on screen while you paste; that is normal.\n');
  const appSecret = await ask('1) App secret (App settings > Basic > Show): ', true);
  const userToken = await ask('2) Access token (Graph API Explorer, copy icon): ', true);
  console.log('\n✓ ' + await connect(appSecret, userToken));
  console.log('  Auto-posting starts at the next scheduled run (3× a day). Pause it any time: gh variable set FB_AUTOPOST --body off --repo ' + REPO);
})().catch(e => { console.error('\n✗ ' + e.message); process.exit(1); });
