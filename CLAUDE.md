# Shmor.ai: master site (shmor.ai)

The hub of the Shmor network (see `../CLAUDE.md` for the shared rules). Static site, GitHub repo **Shmorai/shmor-ai** (private until launch; GitHub Pages from `main` / root, custom domain shmor.ai via `CNAME`).

## Where things are
| What | Where |
|---|---|
| Homepage | `index.html` |
| Site settings, company details, network-wide referral links, global offers | `assets/js/config.js` |
| Marketplace manifests (planned sites) | `network/<id>.json` |
| Generated marketplace data | `assets/js/network.js` (**never hand-edit**; produced by `tools/sync-network.js`) |
| Inner pages (about, partners, contact, privacy, cookies, terms, affiliate-disclosure, 404) | edit `tools/pages/*.html`, then `node tools/build-pages.js` |
| Styles / behaviour | `assets/css/style.css` / `assets/js/main.js` (icons in `ICONS`) |
| US/UK/EU region + per-region referral URLs | `assets/js/region.js` |
| Referral redirect | `go/index.html` (`/go/?to=<slug>&src=…&r=us|uk|eu`) |
| SEO site kit for marketplace sites | `tools/site-kit/` |

## Commands (run here)
```bash
node tools/sync-network.js          # pull every ../sites/*/shmor-site.json in, validate, regenerate network.js
node tools/new-site.js <brand> --name "Brand" --sub <brand> [--from <plannedId>] ...   # new marketplace in ../sites/
node tools/build-pages.js           # rebuild inner pages + sitemap.xml
node tools/serve.js                 # preview http://localhost:4000 AND every marketplace on its own port (4001+), so all cards/searches open (preview config "shmor")
node tools/test-network.js          # crawl & check EVERY site (pages, SEO tags, links, referral slugs, sitemaps); --external also checks images
```

## Shmor Weekly sign-up (homepage #updates)
- Form on index.html collects full name, email, phone, country, email consent (required), SMS consent (optional), plus a spam trap.
- Submits to Google Form "Shmor Weekly sign-ups (master) - website form" → Google Sheet **"Shmor Network Sign-ups (MASTER)"** in the youtube@shmor.ai Google account (Timestamp added by Google). Also records IP (via api.ipify.org), source page, region, browser.
- Sheet: https://docs.google.com/spreadsheets/d/1lKFmDNVIz-fWw2qxkO-bUE8UMPAWOl0zbLEmuF8br_U/edit · Form editor: https://docs.google.com/forms/d/126muk4rb9IvPVMNCVIbLVdWYP3VdsPun8Or1tO02nYg/edit
- Field codes live in `assets/js/config.js` → `SITE.signup.fields`. If a form question is added or renamed, re-read the codes (FB_PUBLIC_LOAD_DATA_ on the form's viewform page) and update them.
- Privacy policy covers it (tools/pages/privacy.html). Don't claim subscriber numbers we don't have.

## Shmor Weekly email (sending)
- `node tools/build-weekly.js` builds this week's digest → `weekly/latest.json` (+ `weekly/preview.html`): newest English articles from the last 7 days, max 1 per site, 8 stories. Run it weekly (e.g. Sunday) and publish with the site. `/weekly/` is excluded in robots.txt.
- Apps Script **"Shmor Weekly sender"** is bound to the sign-up Sheet (source: `tools/weekly-email/Code.gs`; when changing it, re-paste the file + a `SAMPLE_ISSUE` const into the editor). Project: https://script.google.com/home/projects/1EhKJ898fTr6J1OJrwJzolEXSVWNgw6lLtuwntjHLO_RIqDIevFcqRDIK/edit
- Every Monday ~9am it fetches https://shmor.ai/weekly/latest.json and emails everyone with Weekly email consent = Yes and no "Unsubscribed" date. It never sends the same issue twice. It logs to the "Send log" tab. Sheet menu: Shmor Weekly → test / send now / set up.
- Unsubscribe web app (HMAC-signed links): https://script.google.com/macros/s/AKfycbx_NGOKCsxuD9LdWoi_YLwNfm_L6vwzu9xqS2uZXMge9TOJFJG76vy_YtL7w14TB1HF/exec
- **Off until launch**: "Weekly email settings" tab → Sending enabled = NO; real sends are also blocked until "Company postal address" is filled in.
- Caveats: youtube@shmor.ai is a Google account WITHOUT Gmail (mail is hosted at GoDaddy), so Google's send limit is about 100 emails/day (the script pauses and resumes the next day). shmor.ai's SPF record only authorises GoDaddy, so emails sent by Google from @shmor.ai may land in spam. Before launch, either add include:_spf.google.com to the SPF record or move sending to an email service (Brevo/Mailchimp) with domain authentication.

## Shmor Daily + network SEO
- `node tools/rebuild-all.js` (add `--kit` after changing the site kit): network index → every site → master sync → Shmor Daily → weekly digest. Run it before committing network-wide changes.
- `tools/build-network-index.js` → `network-index.json` (every indexable page + topic words). Each site's build adds a **"From across the Shmor network"** box: up to 3 related pages on OTHER sites, same language, rarity-weighted topic match (≥2 shared distinctive words, score ≥ 4.2). Precision matters more than count; don't loosen it to add links.
- `tools/build-daily.js` → `/daily/` (indexable hub, rebuilt daily), `/daily/YYYY-MM-DD/` (noindex,follow), `/daily/feed.xml`, `/marketplaces/` directory, `sitemap-network.xml` (sitemap index of every site; submit once in Search Console via the shmor.ai Domain property), and the "Today on the Shmor network" strip in index.html (between DAILY:START/END markers).
- Partner offers & referral picks on Shmor Daily appear automatically once OFFERS / featured AFFILIATE_LINKS exist.
- `tools/audit-seo.js [--detail]`: thin pages, orphans, sitemap coverage, alt text, lang, cross-network links. Thin = < 300 words. Don't pad; expand with genuinely useful content only.
- SEO rules: no keyword stuffing, no bulk/sitewide cross-links, no fake backlinks. Real backlinks come from outreach, PR and partners.

## Notes
- Theme is dark for all visitors (the `@media all` blocks in style.css hold the dark overrides).
- The newsletter and contact forms switch on when Formspree endpoints are set in `SITE.forms`. GA4 in `SITE.analytics` switches on the consent banner.
- Planned marketplaces still in `network/`: deals, energy, tech, style, home, experiences, motors.
