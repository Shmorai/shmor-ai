#!/usr/bin/env node
/*
  Shmor.ai network traffic report (Google Analytics 4 Data API).

  Prints a plain-English Markdown report for "today so far" and "yesterday":
    - views, visitors and visits per website (all 25 Shmor sites, by hostname)
    - top countries and top cities per website
    - affiliate_click counts by site / referral link (if any)

  Usage (on this PC Node needs the Windows certificate store):
    node --use-system-ca tools/analytics/traffic-report.js
    node --use-system-ca tools/analytics/traffic-report.js --json   (raw data)

  Credentials: a Google Cloud service-account JSON key with Viewer access on
  the GA4 property. It must live OUTSIDE every git repo. Default location:
    C:\Users\Interent Income\.shmor-secrets\ga-service-account.json
  Override with env GA_KEY_FILE. The key contents are never printed.

  No npm packages needed: the OAuth JWT is signed with Node's crypto.
*/
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PROPERTY_ID = process.env.GA_PROPERTY_ID || '564942838'; // "Shmor.ai network"
const KEY_FILE = process.env.GA_KEY_FILE ||
  path.join(os.homedir(), '.shmor-secrets', 'ga-service-account.json');
const TOP_PLACES = 5;

const ROOT = path.resolve(__dirname, '..', '..');            // shmor-ai/
const SITES_DIR = path.join(path.dirname(ROOT), 'sites');    // Shmor/sites/

// ---- list of network hostnames (hub + every marketplace manifest) ----
function networkHosts() {
  const hosts = new Map([['shmor.ai', 'Shmor.ai (hub)']]);
  try {
    for (const dir of fs.readdirSync(SITES_DIR).sort()) {
      const f = path.join(SITES_DIR, dir, 'shmor-site.json');
      if (!fs.existsSync(f)) continue;
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const sub = j.subdomain || j.id;
      if (sub) hosts.set(`${sub}.shmor.ai`, j.name || sub);
    }
  } catch (e) { /* sites folder missing: fall back to hosts seen in data */ }
  return hosts;
}

// ---- auth: service-account JWT -> access token ----
function b64url(x) {
  return Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
async function accessToken() {
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`Service-account key not found at ${KEY_FILE} (set GA_KEY_FILE to override).`);
  }
  const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${claim}.${b64url(sig)}`,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${j.error_description || j.error || res.status}`);
  return { token: j.access_token, email: key.client_email };
}

// ---- GA4 Data API ----
async function batch(token, requests) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:batchRunReports`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
  const j = await res.json();
  if (!res.ok) throw new Error(`GA Data API error ${res.status}: ${(j.error && j.error.message) || JSON.stringify(j)}`);
  return j.reports;
}
function rows(report) {
  const dn = (report.dimensionHeaders || []).map(h => h.name);
  const mn = (report.metricHeaders || []).map(h => h.name);
  return (report.rows || []).map(r => {
    const o = {};
    dn.forEach((n, i) => { o[n] = r.dimensionValues[i].value; });
    mn.forEach((n, i) => { o[n] = Number(r.metricValues[i].value); });
    return o;
  });
}

async function fetchDay(token, date) {
  const dateRanges = [{ startDate: date, endDate: date }];
  const reports = await batch(token, [
    { dateRanges, dimensions: [{ name: 'hostName' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }],
      limit: 1000 },
    { dateRanges, dimensions: [{ name: 'hostName' }, { name: 'country' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 5000 },
    { dateRanges, dimensions: [{ name: 'hostName' }, { name: 'city' }, { name: 'country' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 5000 },
    { dateRanges,
      dimensions: [{ name: 'customEvent:site_name' }, { name: 'customEvent:link_slug' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'affiliate_click' } } },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 1000 },
  ]);
  return {
    sites: rows(reports[0]), countries: rows(reports[1]),
    cities: rows(reports[2]), clicks: rows(reports[3]),
  };
}

// ---- formatting ----
const fmt = n => Number(n || 0).toLocaleString('en-GB');
function topList(list, label, n = TOP_PLACES) {
  const items = list.filter(x => x.screenPageViews > 0 || x.activeUsers > 0).slice(0, n);
  return items.length ? items.map(x => `${label(x)} (${fmt(x.screenPageViews)})`).join(', ') : '–';
}

function renderDay(title, date, data, hosts) {
  const out = [];
  const byHost = new Map(data.sites.map(r => [r.hostName, r]));
  const allHosts = new Map(hosts);
  for (const h of byHost.keys()) if (!allHosts.has(h)) allHosts.set(h, `${h} (not a Shmor site)`);

  const list = [...allHosts].map(([h, name]) => ({ h, name, ...(byHost.get(h) || {}) }))
    .sort((a, b) => (b.screenPageViews || 0) - (a.screenPageViews || 0) || a.h.localeCompare(b.h));
  const tot = list.reduce((t, r) => ({
    v: t.v + (r.screenPageViews || 0), u: t.u + (r.activeUsers || 0), s: t.s + (r.sessions || 0),
  }), { v: 0, u: 0, s: 0 });

  out.push(`## ${title} (${date})`);
  out.push('');
  out.push(`**Network total: ${fmt(tot.v)} page views, ${fmt(tot.u)} visitors, ${fmt(tot.s)} visits.**`);
  out.push('');

  const active = list.filter(r => r.screenPageViews || r.activeUsers || r.sessions);
  const silent = list.filter(r => !(r.screenPageViews || r.activeUsers || r.sessions));
  if (active.length) {
    out.push('| Website | Page views | Visitors | Visits | Top countries | Top cities |');
    out.push('|---|---:|---:|---:|---|---|');
    for (const r of active) {
      const c = data.countries.filter(x => x.hostName === r.h);
      const ci = data.cities.filter(x => x.hostName === r.h && x.city !== '(not set)');
      out.push(`| ${r.h} | ${fmt(r.screenPageViews)} | ${fmt(r.activeUsers)} | ${fmt(r.sessions)} | ` +
        `${topList(c, x => x.country)} | ${topList(ci, x => x.city)} |`);
    }
    out.push('');
  }
  if (silent.length) {
    out.push(`No views yet (${silent.length}): ${silent.map(r => r.h.replace('.shmor.ai', '')).join(', ')}.`);
    out.push('');
  }

  // network-wide places
  const agg = (arr, key) => {
    const m = new Map();
    for (const x of arr) {
      const k = key(x);
      const o = m.get(k) || { k, screenPageViews: 0, activeUsers: 0 };
      o.screenPageViews += x.screenPageViews; o.activeUsers += x.activeUsers; m.set(k, o);
    }
    return [...m.values()].sort((a, b) => b.screenPageViews - a.screenPageViews);
  };
  if (tot.v) {
    out.push(`Top countries (whole network): ${topList(agg(data.countries, x => x.country), x => x.k, 8)}`);
    out.push('');
    const cities = agg(data.cities.filter(x => x.city !== '(not set)'), x => `${x.city}, ${x.country}`);
    out.push(`Top cities (whole network): ${topList(cities, x => x.k, 8)}`);
    out.push('');
  }

  const clicks = data.clicks.filter(x => x.eventCount > 0);
  if (clicks.length) {
    out.push('**Referral-link clicks**');
    out.push('');
    out.push('| Site | Referral link | Clicks |');
    out.push('|---|---|---:|');
    for (const x of clicks) {
      out.push(`| ${x['customEvent:site_name']} | ${x['customEvent:link_slug']} | ${fmt(x.eventCount)} |`);
    }
  } else {
    out.push('Referral-link clicks: none.');
  }
  out.push('');
  return out.join('\n');
}

(async () => {
  try {
    const hosts = networkHosts();
    const { token } = await accessToken();
    const today = await fetchDay(token, 'today');
    const yesterday = await fetchDay(token, 'yesterday');
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify({ today, yesterday }, null, 2));
      return;
    }
    const stamp = new Date().toLocaleString('en-GB', {
      timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short',
    });
    const iso = d => new Date(Date.now() - d * 864e5).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    console.log(`# Shmor.ai traffic report: ${stamp} (UK time)\n`);
    console.log(renderDay('Today so far', iso(0), today, hosts));
    console.log(renderDay('Yesterday', iso(1), yesterday, hosts));
    console.log('_Only visitors who click "Accept" on the cookie banner are counted. Data can lag GA by a few hours._');
  } catch (e) {
    console.error(`REPORT FAILED: ${e.message}`);
    process.exit(1);
  }
})();
