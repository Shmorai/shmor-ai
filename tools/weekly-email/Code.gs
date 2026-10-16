/**
 * Shmor Weekly: emails the weekly digest to everyone in this sheet who
 * ticked "Weekly email consent". Sends through Brevo (authenticated for shmor.ai)
 * once a Brevo API key is connected (menu → Connect Brevo); otherwise through
 * the Google account that owns the sheet.
 *
 *   • Every Monday ~9am (sheet time zone) sendWeekly() runs automatically.
 *   • It only sends when "Sending enabled" = YES on the "Weekly email settings" tab
 *     and the company postal address has been filled in.
 *   • Each email has a one-click unsubscribe link that marks the person's row.
 *   • Every send is recorded on the "Send log" tab; an issue is never sent twice.
 *
 * Menu in the sheet: Shmor Weekly → Send a test to me / Send this week's email now / Set up or repair.
 * Source of truth: Shmor/shmor-ai/tools/weekly-email/Code.gs (paste updates here).
 */

const SETTINGS_SHEET = 'Weekly email settings';
const LOG_SHEET = 'Send log';
const UNSUB_HEADER = 'Unsubscribed';

/* ---------------- Menu & setup ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Shmor Weekly')
    .addItem('Send a test to me', 'sendTestToMe')
    .addItem("Send this week's email now", 'sendWeeklyNow')
    .addSeparator()
    .addItem('Connect Brevo (paste API key)', 'connectBrevo')
    .addItem('Set up or repair', 'setup')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let st = ss.getSheetByName(SETTINGS_SHEET);
  if (!st) {
    st = ss.insertSheet(SETTINGS_SHEET);
    st.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'Notes']]).setFontWeight('bold');
    st.getRange(2, 1, 6, 3).setValues([
      ['Sending enabled', 'NO', 'Set to YES at launch. While NO, the Monday run sends nothing (tests still work).'],
      ['Digest URL', 'https://shmor.ai/weekly/latest.json', "This week's stories, published with shmor.ai every week."],
      ['From name', 'Shmor Weekly', 'Shown as the sender name.'],
      ['Reply-to email', 'info@shmor.ai', 'Where replies go.'],
      ['Test recipient', Session.getEffectiveUser().getEmail(), 'Where "Send a test to me" goes.'],
      ['Company postal address', 'Shmor.ai, 82 King Street, Manchester, Greater Manchester, M2 4WQ, United Kingdom', 'Shown in every email footer (required for US subscribers). Real sends are blocked until this is filled in.'],
    ]);
    st.setColumnWidth(1, 190); st.setColumnWidth(2, 360); st.setColumnWidth(3, 520);
  }
  if (!('From email' in settings_())) st.appendRow(['From email', 'weekly@shmor.ai', 'Sender address when sending through Brevo (must be @shmor.ai, the domain authenticated in Brevo).']);
  let log = ss.getSheetByName(LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(LOG_SHEET);
    log.getRange(1, 1, 1, 5).setValues([['When', 'Issue', 'Action', 'Recipients', 'Details']]).setFontWeight('bold');
    log.setColumnWidth(5, 520);
  }
  const rs = responsesSheet_();
  const headers = rs.getRange(1, 1, 1, rs.getLastColumn()).getValues()[0];
  if (headers.indexOf(UNSUB_HEADER) === -1) rs.getRange(1, headers.length + 1).setValue(UNSUB_HEADER);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());

  ScriptApp.getProjectTriggers().filter(t => ['sendWeekly', 'resumeWeekly'].indexOf(t.getHandlerFunction()) > -1)
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendWeekly').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
  log_('setup', '', 0, 'Weekly trigger set for Mondays ~9am (' + ss.getSpreadsheetTimeZone() + '). Unsubscribe link: ' + (webAppUrl_() || 'not deployed yet'));
  return 'Shmor Weekly is set up.';
}

/* ---------------- Sending ---------------- */
function sendWeekly() { return send_(false); }          // weekly trigger
function sendWeeklyNow() { const r = send_(true); toast_(r); return r; }
function resumeWeekly() { return send_(false, true); }  // continues a send that hit the daily quota

function send_(manual, resuming) {
  const s = settings_();
  if (String(s['Sending enabled']).toUpperCase() !== 'YES') return log_('skipped', '', 0, 'Sending is switched off (Sending enabled = NO).');
  if (!s['Company postal address'] || /\[/.test(s['Company postal address'])) return log_('blocked', '', 0, 'Fill in "Company postal address" on the settings tab first.');
  const d = fetchDigest_(s['Digest URL']);
  if (!d.ok) return log_('error', '', 0, 'Could not load the digest: ' + d.error);
  const issue = d.digest.issue;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('LAST_ISSUE') === issue && !resuming) return log_('skipped', issue, 0, 'This issue was already sent. Publish a new digest first.');

  const list = subscribers_();
  let start = resuming && props.getProperty('PENDING_ISSUE') === issue ? Number(props.getProperty('PENDING_INDEX') || 0) : 0;
  let sent = 0, failed = 0;
  for (let i = start; i < list.length; i++) {
    let limited = !brevoKey_() && MailApp.getRemainingDailyQuota() < 1;
    if (!limited) {
      try { deliver_(list[i], d.digest, s, false); sent++; }
      catch (e) { if (e.dailyLimit) limited = true; else failed++; }
    }
    if (limited) {
      props.setProperties({ PENDING_ISSUE: issue, PENDING_INDEX: String(i) });
      ScriptApp.newTrigger('resumeWeekly').timeBased().after(24 * 60 * 60 * 1000).create();
      return log_('paused', issue, sent, 'Daily email limit (' + (brevoKey_() ? 'Brevo' : 'Google') + ') reached at ' + i + '/' + list.length + '. Resumes automatically in 24 hours.');
    }
  }
  props.setProperty('LAST_ISSUE', issue);
  props.deleteProperty('PENDING_ISSUE'); props.deleteProperty('PENDING_INDEX');
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'resumeWeekly').forEach(t => ScriptApp.deleteTrigger(t));
  return log_(manual ? 'sent (manual)' : 'sent', issue, sent, (failed ? failed + ' failed' : 'All handed over for sending') + ' via ' + (brevoKey_() ? 'Brevo.' : 'Google.'));
}

function sendTestToMe() {
  const s = settings_();
  const d = fetchDigest_(s['Digest URL']);
  const digest = d.ok ? d.digest : SAMPLE_ISSUE;
  const to = s['Test recipient'] || Session.getEffectiveUser().getEmail();
  deliver_({ email: to, first: 'there' }, digest, s, true);
  const msg = 'Test sent to ' + to + (d.ok ? '' : ' (sample content: the live digest URL isn\'t reachable yet, which is expected before launch)');
  log_('test', digest.issue, 1, msg);
  toast_(msg);
  return msg;
}

function deliver_(sub, digest, s, isTest) {
  const unsub = unsubUrl_(sub.email, s);
  const key = brevoKey_();
  if (key) return brevoSend_(key, sub, digest, s, isTest, unsub);
  MailApp.sendEmail({
    to: sub.email,
    subject: (isTest ? '[TEST] ' : '') + digest.subject,
    htmlBody: render_(digest, sub.first, unsub, s, isTest),
    body: plain_(digest, sub.first, unsub, s),
    name: s['From name'] || 'Shmor Weekly',
    replyTo: s['Reply-to email'] || undefined,
  });
}

/* ---------------- Brevo ---------------- */
// The API key is kept in Script Properties (never in the sheet). Remove it there to fall back to Google sending.
function brevoKey_() { return PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY'); }

function connectBrevo() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Connect Brevo', 'Paste your Brevo API key (Brevo → SMTP & API → API keys). It is stored privately in this script, not in the sheet.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return;
  const key = r.getResponseText().trim();
  const res = UrlFetchApp.fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': key, accept: 'application/json' }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) { ui.alert('Brevo did not accept that key (HTTP ' + res.getResponseCode() + '). Nothing was saved.'); return; }
  PropertiesService.getScriptProperties().setProperty('BREVO_API_KEY', key);
  log_('setup', '', 0, 'Brevo connected (' + (JSON.parse(res.getContentText()).email || 'account') + '). Emails now send through Brevo.');
  ui.alert('Brevo connected. Use "Send a test to me" to check it.');
}

function brevoSend_(key, sub, digest, s, isTest, unsub) {
  const from = String(s['From email'] || 'weekly@shmor.ai').trim();
  const payload = {
    sender: { name: s['From name'] || 'Shmor Weekly', email: from },
    to: [{ email: sub.email }],
    subject: (isTest ? '[TEST] ' : '') + digest.subject,
    htmlContent: render_(digest, sub.first, unsub, s, isTest),
    textContent: plain_(digest, sub.first, unsub, s),
    headers: { 'List-Unsubscribe': '<' + unsub + '>' },
    tags: ['shmor-weekly'],
  };
  if (s['Reply-to email']) payload.replyTo = { email: s['Reply-to email'] };
  const res = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload),
    headers: { 'api-key': key, accept: 'application/json' }, muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code >= 200 && code < 300) return;
  const err = new Error('Brevo HTTP ' + code + ': ' + res.getContentText().slice(0, 300));
  if (code === 429 || /limit|quota|credit/i.test(res.getContentText())) err.dailyLimit = true;
  throw err;
}

/* ---------------- Subscribers ---------------- */
function responsesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheets().find(x => { const h = x.getRange(1, 1, 1, Math.max(1, x.getLastColumn())).getValues()[0]; return h[0] === 'Timestamp' && h.indexOf('Email') > -1; });
  if (!sh) throw new Error('Could not find the sign-ups tab (needs Timestamp and Email columns).');
  return sh;
}
function cols_(sh) {
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const c = n => h.indexOf(n);
  return { name: c('Full name'), email: c('Email'), consent: c('Weekly email consent'), unsub: c(UNSUB_HEADER) };
}
function subscribers_() {
  const sh = responsesSheet_(), c = cols_(sh);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
  const out = new Map(), gone = new Set();
  rows.forEach(r => {
    const email = String(r[c.email] || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (c.unsub > -1 && r[c.unsub]) { gone.add(email); return; }
    if (String(r[c.consent]).trim().toLowerCase() !== 'yes') return;
    out.set(email, { email: email, first: String(r[c.name] || '').trim().split(/\s+/)[0] || 'there' });
  });
  gone.forEach(e => out.delete(e));
  return Array.from(out.values()).sort((a, b) => a.email < b.email ? -1 : 1);
}

/* ---------------- Unsubscribe (web app) ---------------- */
function token_(email) {
  const sig = Utilities.computeHmacSha256Signature(email.toLowerCase(), PropertiesService.getScriptProperties().getProperty('SECRET'));
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '').slice(0, 24);
}
function webAppUrl_() { try { return ScriptApp.getService().getUrl(); } catch (e) { return null; } }
function unsubUrl_(email, s) {
  const base = webAppUrl_();
  if (!base) return 'mailto:' + (s['Reply-to email'] || Session.getEffectiveUser().getEmail()) + '?subject=Unsubscribe%20me%20from%20the%20Shmor%20Weekly';
  return base + '?e=' + encodeURIComponent(email) + '&t=' + token_(email);
}
function doGet(e) {
  const email = String((e.parameter || {}).e || '').trim().toLowerCase();
  const ok = email && e.parameter.t === token_(email);
  let found = 0;
  if (ok) {
    const sh = responsesSheet_(), c = cols_(sh);
    if (c.unsub > -1 && sh.getLastRow() > 1) {
      const emails = sh.getRange(2, c.email + 1, sh.getLastRow() - 1, 1).getValues();
      emails.forEach((r, i) => { if (String(r[0]).trim().toLowerCase() === email) { sh.getRange(i + 2, c.unsub + 1).setValue(new Date()); found++; } });
    }
    log_('unsubscribed', '', found, email);
  }
  const msg = ok
    ? '<h1>You\'re unsubscribed</h1><p>We\'ve taken <b>' + email.replace(/</g, '&lt;') + '</b> off the Shmor Weekly. Sorry to see you go, and thanks for reading.</p><p><a href="https://shmor.ai/">Back to Shmor.ai</a></p>'
    : '<h1>That link didn\'t work</h1><p>Please reply to any Shmor Weekly email with "unsubscribe" and we\'ll take you off the list straight away.</p>';
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#0E1214">' + msg + '</div>')
    .setTitle('Shmor Weekly');
}

/* ---------------- Email layout ---------------- */
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function render_(d, first, unsub, s, isTest) {
  const items = d.items.map(i => '<tr><td style="padding:0 0 24px"><a href="' + esc_(i.url) + '" style="text-decoration:none;color:#F3F4F5">' +
    (i.image ? '<img src="' + esc_(i.image) + '" alt="' + esc_(i.imageAlt) + '" width="560" style="width:100%;max-width:560px;height:auto;border-radius:14px;display:block;border:0">' : '') +
    '<div style="font:600 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:' + esc_(i.accent) + ';margin:14px 0 6px">' + esc_(i.site) + '</div>' +
    '<div style="font:700 20px/1.3 Arial,sans-serif;color:#F3F4F5">' + esc_(i.title) + '</div>' +
    '<div style="font:15px/1.55 Arial,sans-serif;color:#B4BABE;margin-top:6px">' + esc_(i.blurb) + '</div>' +
    '<div style="font:700 14px Arial,sans-serif;color:#B48BE6;margin-top:10px">Read more &rarr;</div></a></td></tr>').join('');
  return '<!doctype html><html><body style="margin:0;background:#0A0C0E">' +
    '<div style="display:none;max-height:0;overflow:hidden">' + esc_(d.preheader) + '</div>' +
    '<table role="presentation" width="100%" style="background:#0A0C0E"><tr><td align="center" style="padding:28px 12px">' +
    '<table role="presentation" width="600" style="max-width:600px;width:100%;background:#121518;border-radius:20px"><tr><td style="padding:28px 20px">' +
    (isTest ? '<div style="font:700 12px Arial,sans-serif;color:#0E1214;background:#FFC15E;display:inline-block;padding:4px 10px;border-radius:999px;margin-bottom:14px">TEST EMAIL</div>' : '') +
    '<div style="font:700 26px Arial,sans-serif;color:#ffffff">Shmor<span style="color:#B48BE6">.ai</span> <span style="font-weight:400;color:#868D92;font-size:16px">Weekly</span></div>' +
    '<p style="font:16px/1.6 Arial,sans-serif;color:#B4BABE;margin:16px 0 24px">Hi ' + esc_(first) + ',<br><br>' + esc_(d.intro) + '</p>' +
    '<table role="presentation" width="100%">' + items + '</table>' +
    '<a href="' + esc_(d.cta.url) + '" style="display:inline-block;background:#613284;color:#ffffff;font:700 15px Arial,sans-serif;padding:13px 22px;border-radius:999px;text-decoration:none">' + esc_(d.cta.text) + '</a>' +
    '<p style="font:12px/1.6 Arial,sans-serif;color:#868D92;margin-top:28px">You\'re getting this because you signed up for the Shmor Weekly at shmor.ai. ' +
    'Some links may be affiliate links: we may earn a commission at no extra cost to you. ' +
    '<a href="' + esc_(unsub) + '" style="color:#B48BE6">Unsubscribe</a> &middot; <a href="https://shmor.ai/privacy/" style="color:#B48BE6">Privacy</a><br>' + esc_(s['Company postal address'] || '') + '</p>' +
    '</td></tr></table></td></tr></table></body></html>';
}
function plain_(d, first, unsub, s) {
  return 'Hi ' + first + ',\n\n' + d.intro + '\n\n' + d.items.map(i => i.site.toUpperCase() + ': ' + i.title + '\n' + i.blurb + '\n' + i.url).join('\n\n') +
    '\n\n' + d.cta.text + ': ' + d.cta.url + '\n\nUnsubscribe: ' + unsub + '\n' + (s['Company postal address'] || '');
}

/* ---------------- Helpers ---------------- */
function settings_() {
  const st = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET);
  if (!st) { setup(); return settings_(); }
  const out = {};
  st.getRange(2, 1, Math.max(1, st.getLastRow() - 1), 2).getValues().forEach(r => { if (r[0]) out[r[0]] = String(r[1]).trim(); });
  return out;
}
function fetchDigest_(url) {
  try {
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (r.getResponseCode() !== 200) return { ok: false, error: 'HTTP ' + r.getResponseCode() };
    const d = JSON.parse(r.getContentText());
    if (!d.issue || !d.items || !d.items.length) return { ok: false, error: 'digest has no stories' };
    return { ok: true, digest: d };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}
function log_(action, issue, n, details) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_SHEET);
  if (sh) sh.appendRow([new Date(), issue, action, n, details]);
  return action + ': ' + details;
}
function toast_(msg) { try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Shmor Weekly', 8); } catch (e) { /* run from trigger */ } }
