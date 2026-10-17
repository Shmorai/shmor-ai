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

(async () => {
  console.log('Connect the Shmor.ai Facebook Page to the auto-poster\n');
  const appId = await ask('App ID: ');
  const appSecret = await ask('App secret (hidden): ', true);
  const userToken = await ask('User token from Graph API Explorer (hidden): ', true);

  const long = await get('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: userToken });
  const pages = await get('/me/accounts', { access_token: long.access_token, fields: 'id,name,access_token,tasks', limit: '100' });
  const page = (pages.data || []).find(p => p.name === PAGE_NAME) || (pages.data || [])[0];
  if (!page) throw new Error('No Pages found. In Graph API Explorer, tick the Shmor.ai Page when Facebook asks which Pages to allow.');
  if (!(page.tasks || []).includes('CREATE_CONTENT')) console.log('! Facebook did not report posting rights for this Page; check the permissions you ticked.');

  execFileSync(GH, ['secret', 'set', 'FB_PAGE_TOKEN', '--repo', REPO], { input: page.access_token });
  execFileSync(GH, ['variable', 'set', 'FB_PAGE_ID', '--repo', REPO, '--body', page.id]);
  console.log(`\n✓ Connected "${page.name}" (Page ID ${page.id}). Saved to GitHub for ${REPO}.`);
  console.log('  Auto-posting starts at the next scheduled run (3× a day). Pause it any time: gh variable set FB_AUTOPOST --body off --repo ' + REPO);
})().catch(e => { console.error('\n✗ ' + e.message); process.exit(1); });
