#!/usr/bin/env node
/* =====================================================================
   Shmor.ai → Facebook Page auto-poster
   Posts the next article from the Shmor network to the Shmor.ai Page,
   rotating through every marketplace, with relevant hashtags.

     node tools/social/facebook-autopost.js --dry-run [--count 5]   # preview, no token needed
     node tools/social/facebook-autopost.js                         # post 1 (needs env below)

   Env: FB_PAGE_ID, FB_PAGE_TOKEN (a Page access token with pages_manage_posts).
   Runs from GitHub Actions (.github/workflows/facebook-autopost.yml), 3× a day.

   How it picks (no state file needed: the Page's own post history is the log):
     1. Reads network-index.json (every indexable page on every live site).
     2. Reads the Page's last 100 posts → which links were already posted and
        when each site last appeared.
     3. Picks the site posted least recently (never-posted sites first), then
        that site's newest article (blog post or review) not yet posted; if a site
        has run out of articles it falls back to its guide pages.
   Facts only: the post text is the article's own title and description.
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const GRAPH = 'https://graph.facebook.com/v24.0';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const COUNT = Number((args[args.indexOf('--count') + 1]) || 0) || 1;

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'network-index.json'), 'utf8'));
const live = new Set(index.sites.filter(s => s.status === 'live').map(s => s.id));
const items = index.items.filter(i => live.has(i.site));
const bareUrl = u => String(u || '').split(/[?#]/)[0].replace(/\/?$/, '/');

/* ---------- hashtags ---------- */
const ACRONYMS = new Set(['vpn', 'vpns', 'dns', 'ip', 'ipv6', 'uk', 'us', 'usa', 'eu', 'ev', 'evs', 'tv', 'diy', 'vat', 'isp', 'nhs', 'hmrc', 'ai', 'seo', 'pos', 'epos', 'rv', 'suv', 'fca', 'eor', 'peo', 'pstn', 'dxb', 'lhr', 'jfk', 'lax']);
const camel = s => s.normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  .map(w => { const l = w.toLowerCase(); if (!ACRONYMS.has(l)) return w[0].toUpperCase() + w.slice(1);
    return /^(vpns|evs)$/.test(l) ? l.slice(0, -1).toUpperCase() + 's' : l.toUpperCase(); }).join('');
const stem = kw => kw.toLowerCase().split(/[^\p{L}\p{N}]+/u).map(w => w.replace(/(es|s)$/, '')).join('');
const siteKeywords = Object.fromEntries(index.sites.map(s => [s.id, s.keywords || []]));
function hashtags(item) {
  const topic = [];
  // the article's own keywords; only if it has none usable, up to 2 of the marketplace's keywords
  const pool = (item.keywords || []).map(kw => [kw, 3]).concat((siteKeywords[item.site] || []).map(kw => [kw, 2]));
  for (const [kw, max] of pool) {
    if (max === 2 && (topic.some(x => x.own) || topic.length >= 2)) break;
    if (kw.split(/\s+/).length > 3 || /\d{4}/.test(kw)) continue;     // short, timeless phrases only
    const t = camel(kw);
    if (t.length < 5 || t.length > 24) continue;
    const k = stem(kw);
    // skip near-duplicates (plural/singular) and tags contained in one already chosen
    if (topic.some(x => x.stem === k || x.tag.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(x.tag.toLowerCase()))) continue;
    topic.push({ tag: t, stem: k, own: max === 3 });
    if (topic.length === 3) break;
  }
  const brand = camel(item.siteName);
  return [...topic.map(x => x.tag).filter(t => t.toLowerCase() !== brand.toLowerCase()), brand, 'ShmorAI'].map(t => '#' + t).join(' ');
}

/* ---------- post text ---------- */
const READ = { en: 'Read it on', fr: 'À lire sur', de: 'Jetzt lesen auf' };
function compose(item) {
  const link = bareUrl(item.url) + '?utm_source=facebook&utm_medium=social&utm_campaign=autopost';
  const message = [item.title, item.text, `${READ[item.lang] || READ.en} ${item.siteName} 👇`, hashtags(item)]
    .filter(Boolean).join('\n\n');
  return { link, message };
}

/* ---------- Graph API ---------- */
async function graph(pathname, params = {}, method = 'GET') {
  const token = process.env.FB_PAGE_TOKEN;
  const url = new URL(GRAPH + pathname);
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = method === 'GET'
    ? await fetch(url + '?' + body)
    : await fetch(url, { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Graph ${method} ${pathname}: ${(json.error && json.error.message) || res.status}`);
  return json;
}

async function history() {
  if (DRY && !process.env.FB_PAGE_TOKEN) return [];
  const r = await graph(`/${process.env.FB_PAGE_ID}/posts`, { fields: 'created_time,message,attachments{unshimmed_url,url}', limit: '100' });
  return (r.data || []).map(p => {
    const a = p.attachments && p.attachments.data && p.attachments.data[0];
    let u = a && (a.unshimmed_url || a.url) || '';
    try { const x = new URL(u); if (x.hostname.endsWith('facebook.com') && x.searchParams.get('u')) u = x.searchParams.get('u'); } catch { /* not a URL */ }
    return { time: p.created_time, url: u ? bareUrl(u) : '', title: String(p.message || '').split('\n')[0].trim() };
  });
}

/* ---------- choose ---------- */
function choose(posted, n) {
  const urls = new Set(posted.map(p => p.url).filter(Boolean));
  const titles = new Set(posted.map(p => p.title));
  const lastSeen = {};
  for (const p of posted) { const it = items.find(i => bareUrl(i.url) === p.url || i.title === p.title); if (it && !(lastSeen[it.site] > p.time)) lastSeen[it.site] = p.time; }
  const fresh = i => !urls.has(bareUrl(i.url)) && !titles.has(i.title);
  const bySite = {};
  for (const i of items) if (fresh(i)) (bySite[i.site] = bySite[i.site] || []).push(i);
  const rank = i => (i.type === 'post' || i.type === 'review' ? 0 : 1);
  for (const list of Object.values(bySite)) list.sort((a, b) => rank(a) - rank(b) || String(b.date).localeCompare(String(a.date)));
  const order = Object.keys(bySite).sort((a, b) => String(lastSeen[a] || '').localeCompare(String(lastSeen[b] || '')) || a.localeCompare(b));
  // Never-posted sites first, then least recently posted; on a fresh Page, newest articles lead.
  const picks = [];
  for (let k = 0; picks.length < n && k < order.length * 3; k++) {
    const site = order[k % order.length], next = bySite[site].shift();
    if (next) picks.push(next);
  }
  return picks;
}

(async () => {
  if (!DRY && (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_TOKEN)) {
    console.error('Set FB_PAGE_ID and FB_PAGE_TOKEN (or use --dry-run).'); process.exit(1);
  }
  const posted = await history();
  const picks = choose(posted, COUNT);
  if (!picks.length) { console.log('Nothing new to post.'); return; }
  for (const item of picks) {
    const { link, message } = compose(item);
    if (DRY) { console.log('─'.repeat(60) + `\n[${item.siteName}] ${link}\n\n${message}\n`); continue; }
    const r = await graph(`/${process.env.FB_PAGE_ID}/feed`, { message, link }, 'POST');
    console.log(`✓ Posted ${item.siteName}: ${item.title} (${r.id})`);
  }
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
