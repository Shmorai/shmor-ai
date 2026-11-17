/* Shared helpers for the Shmor social posters (Buffer: Facebook Page + X + LinkedIn).
   Articles come from network-index.json; text is always the article's own title and
   description (facts only), plus hashtags built from its SEO keywords. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
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

// Topic tags (max `topics`) from the article's keywords, falling back to the site's, then the brand and #ShmorAI
function hashtags(item, { topics = 3, brand = true, shmor = true } = {}) {
  const topic = [];
  const pool = (item.keywords || []).map(kw => [kw, 3]).concat((siteKeywords[item.site] || []).map(kw => [kw, 2]));
  for (const [kw, max] of pool) {
    if (topic.length >= topics) break;
    if (max === 2 && (topic.some(x => x.own) || topic.length >= 2)) break;
    if (kw.split(/\s+/).length > 3 || /\d{4}/.test(kw)) continue;
    const t = camel(kw);
    if (t.length < 5 || t.length > 24) continue;
    const k = stem(kw);
    if (topic.some(x => x.stem === k || x.tag.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(x.tag.toLowerCase()))) continue;
    topic.push({ tag: t, stem: k, own: max === 3 });
  }
  const b = camel(item.siteName);
  return [...topic.map(x => x.tag).filter(t => t.toLowerCase() !== b.toLowerCase()), ...(brand ? [b] : []), ...(shmor ? ['ShmorAI'] : [])]
    .map(t => '#' + t);
}
const link = (item, source) => `${bareUrl(item.url)}?utm_source=${source}&utm_medium=social&utm_campaign=autopost`;
const READ = { en: 'Read it on', fr: 'À lire sur', de: 'Jetzt lesen auf' };

/* ---------- choose: next articles, rotating sites ----------
   history: [{ url, title, time }]. Never-posted sites first, then least recently posted;
   within a site, newest blog post/review first, then guide pages. */
function choose(history, n) {
  const urls = new Set(history.map(p => bareUrl(p.url)));
  const titles = new Set(history.map(p => p.title));
  const lastSeen = {};
  for (const p of history) { const it = items.find(i => bareUrl(i.url) === bareUrl(p.url) || i.title === p.title); if (it && !(lastSeen[it.site] > p.time)) lastSeen[it.site] = p.time; }
  const bySite = {};
  for (const i of items) if (!urls.has(bareUrl(i.url)) && !titles.has(i.title)) (bySite[i.site] = bySite[i.site] || []).push(i);
  const rank = i => (i.type === 'post' || i.type === 'review' ? 0 : 1);
  for (const list of Object.values(bySite)) list.sort((a, b) => rank(a) - rank(b) || String(b.date).localeCompare(String(a.date)));
  const order = Object.keys(bySite).sort((a, b) => String(lastSeen[a] || '').localeCompare(String(lastSeen[b] || '')) || a.localeCompare(b));
  const picks = [];
  for (let k = 0; picks.length < n && k < order.length * 20; k++) {
    const next = bySite[order[k % order.length]].shift();
    if (next) picks.push(next);
  }
  return picks;
}

/* ---------- iCalendar ---------- */
const icsText = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFold(line) {
  const out = []; let cur = '';
  for (const ch of line) { if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }
  return out.concat(cur).join('\r\n');
}
const icsTime = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function writeIcs(file, name, desc, events) {
  const stamp = icsTime(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shmor.ai//Social auto-post//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${name}`, `X-WR-CALDESC:${desc}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H'];
  for (const e of events) {
    const start = new Date(e.start);
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`, `DTSTART:${icsTime(start)}`, `DTEND:${icsTime(new Date(+start + 15 * 60000))}`,
      `SUMMARY:${icsText(e.summary)}`, `DESCRIPTION:${icsText(e.desc)}`, e.url ? `URL:${e.url}` : '', 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.filter(Boolean).map(icsFold).join('\r\n') + '\r\n');
}

module.exports = { ROOT, index, items, bareUrl, hashtags, link, READ, choose, writeIcs };
