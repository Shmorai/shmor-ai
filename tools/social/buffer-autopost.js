#!/usr/bin/env node
/* =====================================================================
   Shmor social auto-poster via Buffer (Facebook Page, X, LinkedIn).

     node tools/social/buffer-autopost.js --dry-run         # show what would be scheduled (no key needed)
     node tools/social/buffer-autopost.js                   # schedule the next 48 h into Buffer
     node tools/social/buffer-autopost.js --test            # one post to every channel, ~10 minutes from now
     node tools/social/buffer-autopost.js --calendar-only   # just rewrite the calendar feed

   Env: BUFFER_API_KEY (personal key from Buffer → Settings → API; GitHub secret).
   Runs daily from .github/workflows/social-autopost.yml. Buffer publishes at the set times.

   Schedule (UTC): Facebook + X at SLOTS.fx, LinkedIn at SLOTS.li. Each slot gets one
   article (same article on every network posting in that slot), chosen by lib.choose()
   from the log in social/posted.json, so nothing repeats and sites take turns.
   Buffer's free plan holds 10 queued posts per channel; 48 h = 6 per channel at most.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { ROOT, items, bareUrl, hashtags, link, READ, choose, writeIcs } = require('./lib');

const API = 'https://api.buffer.com';
const SLOTS = { fx: [8, 12, 17], li: [12] };     // hours UTC (≈ 9am, 1pm, 6pm UK in summer; 8am, 12pm, 5pm in winter)
const HORIZON_H = 48;
const LOG = path.join(ROOT, 'social', 'posted.json');
const CAL = path.join(ROOT, 'social', 'facebook-calendar.ics');   // name kept: it's subscribed in Google Calendar
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const KEY = process.env.BUFFER_API_KEY;

const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : { posts: [] };
const saveLog = () => { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n'); };

async function gql(query, variables = {}) {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ query, variables }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) throw new Error(`Buffer API ${res.status}: ${(json.errors || []).map(e => e.message).join('; ') || res.statusText}`);
  return json.data;
}

async function channels() {
  const org = (await gql('query { account { organizations { id name } } }')).account.organizations[0];
  if (!org) throw new Error('No Buffer organization found for this key.');
  const list = (await gql('query($o: OrganizationId!) { channels(input: { organizationId: $o }) { id service name displayName isQueuePaused } }', { o: org.id })).channels;
  const pick = s => list.find(c => c.service === s && !c.isQueuePaused);
  return { facebook: pick('facebook'), twitter: pick('twitter'), linkedin: pick('linkedin') };
}

/* ---------- per-network text ---------- */
function forFacebook(it) {
  const url = link(it, 'facebook');
  const text = [it.title, it.text, `${READ[it.lang] || READ.en} ${it.siteName} 👇`, hashtags(it).join(' ')].filter(Boolean).join('\n\n');
  return { text, metadata: { facebook: { type: 'post', linkAttachment: card(it, url) } } };
}
function forLinkedIn(it) {
  const url = link(it, 'linkedin');
  const text = [it.title, it.text, `${READ[it.lang] || READ.en} ${it.siteName}: ${url}`, hashtags(it, { topics: 2, shmor: true }).join(' ')].filter(Boolean).join('\n\n');
  return { text, metadata: { linkedin: { linkAttachment: card(it, url) } } };
}
function forX(it) {
  const url = link(it, 'x');                       // X counts every link as 23 characters
  const tags = hashtags(it, { topics: 1, brand: true, shmor: false }).join(' ');
  const room = 280 - 23 - tags.length - 4;
  let head = it.title;
  if (it.text && head.length + 2 + it.text.length <= room) head += `\n\n${it.text}`;
  if (head.length > room) head = head.slice(0, room - 1).replace(/\s+\S*$/, '') + '…';
  return { text: `${head}\n\n${url}\n\n${tags}` };
}
const card = (it, url) => ({ url, title: it.title, ...(it.text ? { description: it.text } : {}), ...(it.image ? { thumbnail: { url: it.image } } : {}) });
const FORMAT = { facebook: forFacebook, twitter: forX, linkedin: forLinkedIn };
const LABEL = { facebook: 'Facebook', twitter: 'X', linkedin: 'LinkedIn' };

async function schedule(channel, service, it, dueAt) {
  const { text, metadata } = FORMAT[service](it);
  const input = { text, channelId: channel.id, schedulingType: 'automatic', mode: 'customScheduled', dueAt: dueAt.toISOString(), ...(metadata ? { metadata } : {}) };
  const r = (await gql(`mutation($i: CreatePostInput!) { createPost(input: $i) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`, { i: input })).createPost;
  if (!r.post) throw new Error(r.message || 'createPost failed');
  return r.post.id;
}

/* ---------- slots ---------- */
function upcomingSlots(now) {
  const out = [];
  for (let d = 0; d <= Math.ceil(HORIZON_H / 24); d++) {
    const hours = [...new Set([...SLOTS.fx, ...SLOTS.li])].sort((a, b) => a - b);
    for (const h of hours) {
      const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d, h));
      if (t - now < 15 * 60000 || t - now > HORIZON_H * 3600000) continue;   // need ≥15 min lead time
      out.push({ at: t, services: [...(SLOTS.fx.includes(h) ? ['facebook', 'twitter'] : []), ...(SLOTS.li.includes(h) ? ['linkedin'] : [])] });
    }
  }
  return out;
}
const history = () => log.posts.map(p => ({ url: p.url, title: p.title, time: p.at }));

/* ---------- calendar feed ----------
   ✅ published + 🗓 scheduled in Buffer (from the log) + 📝 planned forecast for the next
   PLAN_DAYS days (same rotation the scheduler will use; can shift if new articles appear).
   Every entry carries the time, networks, site, article, keywords, hashtags and the exact
   text for each network. Published at social/calendar.ics (and the old facebook-calendar.ics). */
const PLAN_DAYS = 14;
const CALS = [path.join(ROOT, 'social', 'calendar.ics'), CAL];
const ACCOUNT = { facebook: 'Facebook (Shmor.ai Page)', twitter: 'X (@Shmorai)', linkedin: 'LinkedIn (Alex F Morgan)' };
const ukTime = d => new Date(d).toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function slotsBetween(from, days) {
  const out = [];
  for (let d = 0; d <= days; d++) for (const h of [...new Set([...SLOTS.fx, ...SLOTS.li])].sort((a, b) => a - b)) {
    const t = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + d, h));
    if (t > from && t - from <= days * 86400000) out.push({ at: t, services: [...(SLOTS.fx.includes(h) ? ['facebook', 'twitter'] : []), ...(SLOTS.li.includes(h) ? ['linkedin'] : [])] });
  }
  return out;
}
function entry(it, at, services, status) {
  const tags = { facebook: hashtags(it).join(' '), twitter: hashtags(it, { topics: 1, shmor: false }).join(' '), linkedin: hashtags(it, { topics: 2 }).join(' ') };
  const host = new URL(it.url).host;
  const desc = [
    `Status: ${status}`,
    `When: ${ukTime(at)} (UK time)`,
    `Networks: ${services.map(s => ACCOUNT[s]).join(', ')}`,
    `Site: ${it.siteName} (${host})`,
    `Article: ${it.title}`,
    `Link: ${bareUrl(it.url)}`,
    `Keywords: ${(it.keywords || []).join(', ') || '(none)'}`,
    `Hashtags:\n${services.map(s => `  ${LABEL[s]}: ${tags[s]}`).join('\n')}`,
    ...services.map(s => `\n━━ ${LABEL[s]} post ━━\n${FORMAT[s](it).text}`),
  ].join('\n');
  const icon = status.startsWith('Published') ? '✅' : status.startsWith('Scheduled') ? '🗓' : '📝';
  return { uid: `shmor-${new Date(at).toISOString().replace(/[^0-9]/g, '')}@shmor.ai`, start: at, url: bareUrl(it.url),
    summary: `${icon} ${services.map(s => LABEL[s]).join(' + ')}: ${it.siteName}: ${it.title}`, desc };
}
function writeCalendar() {
  const now = new Date(), events = [], bySlot = {};
  for (const p of log.posts) (bySlot[p.at] = bySlot[p.at] || { ...p, services: [] }).services.push(p.service);
  for (const s of Object.values(bySlot)) {
    const it = items.find(i => bareUrl(i.url) === s.url) || { url: s.url, title: s.title, siteName: s.site, keywords: [], text: '', lang: 'en' };
    events.push(entry(it, s.at, s.services, new Date(s.at) <= now ? 'Published via Buffer' : 'Scheduled in Buffer'));
  }
  // forecast the remaining slots in the next PLAN_DAYS days
  const free = slotsBetween(now, PLAN_DAYS).filter(s => !bySlot[s.at.toISOString()]);
  choose(history(), free.length).forEach((it, k) => events.push(entry(it, free[k].at, free[k].services, 'Planned (forecast; scheduled into Buffer 48 h ahead, may change if newer articles are published)')));
  for (const f of CALS) writeIcs(f, 'Shmor.ai social posts', 'Shmor.ai posts on Facebook, X and LinkedIn: published, scheduled in Buffer, and planned for the next 2 weeks', events);
  console.log(`✓ Calendar: ${Object.keys(bySlot).length} published/scheduled + ${free.length} planned → social/calendar.ics`);
}

(async () => {
  if (args.includes('--calendar-only')) return writeCalendar();
  if (!DRY && !KEY) { console.error('Set BUFFER_API_KEY (or use --dry-run).'); process.exit(1); }
  const ch = KEY ? await channels() : { facebook: { id: '-' }, twitter: { id: '-' }, linkedin: { id: '-' } };
  for (const s of Object.keys(LABEL)) console.log(`${LABEL[s]}: ${ch[s] ? (ch[s].displayName || ch[s].name || ch[s].id) : '— not connected (skipped)'}`);

  const now = new Date();
  const slots = args.includes('--test') ? [{ at: new Date(Math.ceil((+now + 10 * 60000) / 60000) * 60000), services: ['facebook', 'twitter', 'linkedin'] }] : upcomingSlots(now);
  let made = 0, failed = 0;
  for (const slot of slots) {
    const iso = slot.at.toISOString();
    const already = log.posts.filter(p => p.at === iso);
    const todo = slot.services.filter(s => ch[s] && !already.some(p => p.service === s));
    if (!todo.length) continue;
    const it = already.length ? items.find(i => bareUrl(i.url) === already[0].url) || choose(history(), 1)[0] : choose(history(), 1)[0];
    if (!it) { console.log('Nothing left to post.'); break; }
    for (const s of todo) {
      if (DRY) { console.log(`\n── ${iso} ${LABEL[s]} [${it.siteName}]\n${FORMAT[s](it).text}`); log.posts.push({ at: iso, service: s, url: bareUrl(it.url), title: it.title, site: it.siteName }); continue; }
      try {
        const id = await schedule(ch[s], s, it, slot.at);
        log.posts.push({ at: iso, service: s, url: bareUrl(it.url), title: it.title, site: it.siteName, buffer: id });
        made++; console.log(`✓ ${iso} ${LABEL[s]}: ${it.siteName}: ${it.title}`);
      } catch (e) { failed++; console.log(`✗ ${iso} ${LABEL[s]}: ${e.message}`); }
    }
  }
  if (!DRY) { saveLog(); writeCalendar(); }
  console.log(`${DRY ? 'Dry run' : `Scheduled ${made} post(s)`}${failed ? `, ${failed} failed` : ''}.`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
