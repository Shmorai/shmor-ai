// Shmor traffic report: Chrome extractor for the saved GA4 exploration
// "Shmor traffic report" (rows Town/City, Hostname, Country; values Active
// users, Views, Sessions; 500 rows):
// https://analytics.google.com/analytics/web/#/analysis/a416809601p564942838/edit/2wFGxwZ7RTCs4DmB3CLD3w
//
// Paste into Claude in Chrome's javascript_tool on that page (top-level await
// works; wrapped in an async function so it can be pasted more than once). It switches the date range to "Today", reads the table, then
// "Yesterday", and returns JSON: { today: {range, rows}, yesterday: {...} }.
// Each row: { city, host, country, users, views, sessions }.
await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const overlay = () => document.querySelector('.cdk-overlay-container') || document;
  async function setRange(preset) {
    const opener = document.querySelector('[aria-label="Open date range picker"]');
    if (!opener) throw new Error('date picker not found (page not loaded or not signed in?)');
    opener.click();
    await sleep(1000);
    const opt = [...overlay().querySelectorAll('*')]
      .find(e => e.children.length === 0 && e.textContent.trim() === preset);
    if (!opt) throw new Error(`preset ${preset} not found`);
    opt.click();
    await sleep(500);
    const apply = [...overlay().querySelectorAll('button')].find(b => b.textContent.trim() === 'Apply');
    if (!apply) throw new Error('Apply button not found');
    apply.click();
    // wait for the table to refresh
    for (let i = 0; i < 20; i++) {
      await sleep(750);
      if (!document.querySelector('[role=progressbar], .loading-indicator')) break;
    }
    await sleep(1500);
  }
  function readTable() {
    const t = document.querySelector('table[aria-label="Table of data"]');
    if (!t) throw new Error('data table not found');
    const head = [...t.querySelectorAll('tr')][0];
    const cols = [...head.querySelectorAll('th,td')].map(c => c.innerText.trim());
    const num = s => Number((String(s).trim().split(/\s+/)[0] || '0').replace(/[,  ]/g, '')) || 0;
    const rows = [];
    for (const tr of [...t.querySelectorAll('tr')].slice(1)) {
      const cells = [...tr.querySelectorAll('th,td')].map(c => c.innerText.trim().replace(/\s+/g, ' '));
      if (cells.length !== cols.length || !/^\d+$/.test(cells[0])) continue; // skip totals / "No data"
      const o = Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
      rows.push({
        city: o['Town/City'], host: o['Hostname'], country: o['Country'],
        users: num(o['Active users']), views: num(o['Views']), sessions: num(o['Sessions']),
      });
    }
    return rows;
  }
  const rangeLabel = () => (document.body.innerText.match(/(Today|Yesterday)\n([^\n]+)/) || [])[2] || '';
  const out = {};
  for (const [key, preset] of [['today', 'Today'], ['yesterday', 'Yesterday']]) {
    await setRange(preset);
    out[key] = { range: rangeLabel(), rows: readTable() };
  }
  return JSON.stringify(out);
})();
