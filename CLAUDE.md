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

## Notes
- Theme is dark for all visitors (the `@media all` blocks in style.css hold the dark overrides).
- The newsletter and contact forms switch on when Formspree endpoints are set in `SITE.forms`. GA4 in `SITE.analytics` switches on the consent banner.
- Planned marketplaces still in `network/`: deals, energy, tech, style, home, experiences, motors.
