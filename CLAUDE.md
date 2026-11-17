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
- **Sends through Brevo** (2026-10-17): shmor.ai is authenticated in Brevo (DNS at 123 Reg: TXT brevo-code, CNAMEs brevo1/brevo2._domainkey; existing DMARC passes). Sender = "From email" setting (weekly@shmor.ai), replies to info@shmor.ai. The Brevo API key is stored in the script's Script Properties (BREVO_API_KEY) via the Sheet menu Shmor Weekly → Connect Brevo, which the user does themselves. With no key it falls back to Google (MailApp, ~100/day, likely spam). Brevo free plan = 300 emails/day; the script pauses and resumes next day on limit errors.

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

## Facebook Page auto-posting
- Page: **Shmor.ai** (https://www.facebook.com/profile.php?id=61596510427365), run from the user's personal profile. Linked in `SITE.social.facebook` and the homepage Organization JSON-LD `sameAs`.
- `tools/social/facebook-autopost.js` posts the next network article (title + description + link with UTM + 2–5 hashtags from the page's own `keywords`, plus the site brand tag and #ShmorAI). It rotates sites (least recently posted first), prefers newest blog posts/reviews, and uses the Page's last 100 posts as its log so nothing repeats. `--dry-run --count N` previews without a token.
- Runs from GitHub Actions `.github/workflows/facebook-autopost.yml` at 08:00, 12:00, 17:00 UTC. Needs repo secret `FB_PAGE_TOKEN` + variable `FB_PAGE_ID`, set by the user running `node tools/social/facebook-connect.js` (never handle the token yourself). Pause: repo variable `FB_AUTOPOST=off`.
- Hashtags come from `network-index.json` `keywords` (article) with the site's `keywords` as fallback; content keywords therefore double as social tags, so keep them clean.
- Connected 2026-10-17: Graph Page ID **1314102815127597** (Meta app "Shmor autopost", ID 1151491003883107, Live). First 5 posts made by hand that day. `--backdate` exists but Facebook refuses dates before the Page's creation (17 Oct 2026). Manual runs: `gh workflow run facebook-autopost.yml -f count=N [-f dry_run=true] [-f backdate=true]`.
- On the user's PC, Node needs `--use-system-ca` to reach https APIs (antivirus intercepts TLS → UNABLE_TO_VERIFY_LEAF_SIGNATURE). Re-connect after a token problem: `node --use-system-ca tools/social/facebook-connect.js --web` → form at http://localhost:4799.
- Calendar feed: each workflow run rewrites and commits `social/facebook-calendar.ics` (✅ posted with links + 🗓 planned for the next 7 days; slots in `SLOTS_UTC` must match the cron). Live at https://shmor.ai/social/facebook-calendar.ics and subscribed in the user's Google Calendar (Shmor account) as "Shmor.ai Facebook posts". Refresh it without posting: `gh workflow run facebook-autopost.yml -f calendar_only=true`. Because the workflow commits to main 3× a day, always `git pull --rebase` before pushing shmor-ai.

## Google Search Console (set up 2026-10-17, account youtube@shmor.ai)
- Domain property `sc-domain:shmor.ai`, verified by DNS TXT `google-site-verification=dfLRKC7Q9lt8MrzOZJRT4AGzJAJ_qdjzK4EZywjqp2I` at 123 Reg (never remove it). Submitted: https://shmor.ai/sitemap-network.xml (index of every site).
- Plus 25 URL-prefix properties (https://shmor.ai/ and https://<sub>.shmor.ai/ for all 24 sites), auto-verified via the domain property, each with its own `sitemap.xml` submitted. 26 sitemaps total, all "Success" on day one.
- New marketplace later: open https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2F<sub>.shmor.ai%2F → "Verify your ownership" (auto-verifies) → submit `sitemap.xml`.
- Each marketplace's homepage JSON-LD has its own Organization (name, logo, `<sub>@shmor.ai` contact, parentOrganization Shmor.ai). Google Business Profile is NOT used: online-only brands aren't eligible.
- Bing Webmaster Tools (2026-10-18, signed in with Google as youtube@shmor.ai): all 25 sites imported from Search Console, verified, sitemaps included (shmor.ai has sitemap.xml + sitemap-network.xml). Also feeds DuckDuckGo, Yahoo, Ecosia. New site later: Bing → Add site → Import from GSC, or add it manually with its sitemap.
- IndexNow (2026-10-18): key `c48b0266cdbb4a604b84b26058a21c14`, key file `/<key>.txt` on every site (rebuild-all re-creates it via `indexnow.js --setup`). `node --use-system-ca tools/indexnow.js` (after pushing) submits new/changed sitemap URLs to api.indexnow.org (Bing, Yandex, Seznam, Naver); `tools/indexnow-state.json` remembers what was sent. First run: 897 URLs, all accepted. The daily scheduled task runs it after pushing.
- **Status 2026-11-16 (paused, resume later):** the original Page (id 61595437111281) and its admin profile "Searchmore Doless" were lost (profile locked: "not a confirmed user", Graph error 190/464, auto-posts failing since 31 Oct). New Page **Shmor.ai** created 2026-11-16 at https://www.facebook.com/profile.php?id=61596510427365, managed by the profile "Alex F Morgan" (logo, cover, bio, shmor.ai, info@shmor.ai, 82 King St Manchester M2 4WQ). Site links updated. Workflow paused with repo variable `FB_AUTOPOST=off`; the old secret/Page ID (1314102815127597, app 1151491003883107) are dead. Alex couldn't finish Meta developer registration (Facebook won't confirm his phone numbers). Next: either finish dev registration → new app → facebook-connect.js, or switch to an RSS-to-social service (dlvr.it/Make/Buffer) fed by a Shmor social feed, which would also cover the user's personal X and LinkedIn (both requested, not started). Advise adding a second Page admin.

## Social posting via Buffer (live 2026-11-17; replaces the direct Facebook poster)
- Buffer free plan (account email info@shmor.ai), channels: Facebook Page **Shmor.ai** (new Page, admin Alex F Morgan), X **Shmorai** (user's personal X), LinkedIn **Alex F Morgan** (personal profile). Free plan = 3 channels, 10 queued posts per channel.
- `tools/social/buffer-autopost.js` (shared logic in `tools/social/lib.js`): schedules the next 48 h into Buffer via its GraphQL API (`https://api.buffer.com`, createPost customScheduled + metadata.{facebook,linkedin}.linkAttachment). Slots UTC: Facebook + X 08/12/17, LinkedIn 12 only. One article per slot (same on every network), rotation by `lib.choose()` over the log `social/posted.json`. X text ≤280 (link = 23), 2 tags; FB 3–5 tags + link card; LinkedIn link card + "Read it on…".
- GitHub Actions `.github/workflows/social-autopost.yml` daily 06:30 UTC (+ manual: mode=schedule|test|dry-run|calendar-only); commits `social/posted.json` + `social/facebook-calendar.ics` (Google Calendar feed, now "Shmor.ai social posts"). Secret `BUFFER_API_KEY` set by the user via `node --use-system-ca tools/social/buffer-connect.js --web` (form on localhost:4799). Pause: repo variable `SOCIAL_AUTOPOST=off`.
- Test 2026-11-17 18:45 London: one post to each network, all published, no errors. First schedule run: 14 posts. Old `facebook-autopost.yml` stays paused (`FB_AUTOPOST=off`); its token is dead.
- Calendar (2026-11-17): feed is now https://shmor.ai/social/calendar.ics (old facebook-calendar.ics kept in sync), subscribed in Google Calendar (youtube@shmor.ai) as **"Shmor.ai social posts"**; the old "Shmor.ai Facebook posts" subscription was removed. Entries: ✅ published / 🗓 scheduled in Buffer / 📝 planned forecast 14 days ahead (`PLAN_DAYS`), each with UK time, networks, site, article + link, keywords, per-network hashtags and the exact Facebook/X/LinkedIn text. Also removed 24 recurring "<Site> – Social Post | Shmor AutoBot" series from the user's own "Shmor" calendar (unknown origin, contained unverified figures); if they reappear, find what creates them.

## Blog writing: Claude cloud routines (set up 2026-11-17)
- Goal: every site gets 3 new posts a week (trending + evergreen mix, search keywords in titles/headings, official sources only, in-site backlinks via `related`). Prompt template: `tools/blog-routine/PROMPT.md` (`{{SITES}}` = the group's site list). Manage at https://claude.ai/code/routines (environment "Default", model claude-sonnet-5-5, connectors cleared).
- 6 routines, 4 sites each (times UTC):
  1. Travel: traveldeals, cruisedeals, hotelhero, carhiredeals, Mon/Wed/Fri 06:00 (trig_01LoXPH8kTKwdGB1TK17Yu8R)
  2. Money & home: energysavers, fullbars, storagesavings, vouchervault, Mon/Wed/Fri 06:20 (trig_011aerzTWkr96hynQqCbVNsq)
  3. Cover & care: domcominsure, carecompass, petsavings, bestvpns, Mon/Wed/Fri 06:40 (trig_01HLz8GjRuiL4wVxyhyAD6rm)
  4. Trades & makers: tradesstation, localplumbers, profinders, uksew, Tue/Thu/Sat 06:00 (trig_011pPpUBFGsJXBzq5AJ9v46E)
  5. Business & law: buildlaw, onbuslaw, prosourced, taptill, Tue/Thu/Sat 06:20 (trig_01Y9Uaegr8mCv2BAaKAhMrub)
  6. Leisure, tech & EU: happydaysout, viralgadgets, devisartisans, handwerkerfinder, Tue/Thu/Sat 06:40 (trig_01TCPhQtonUVUb2znWrWJgt5)
- First test (routine 1, 2026-11-17): cloning worked, but the environment's network allowlist blocked official sites (gov.uk, caa.co.uk, edinburgh.gov.uk → ENOTFOUND), so the run correctly published nothing. The "Default" environment needs Network access = Full (claude.ai/code → environment settings) before the routines can verify facts.
- Each routine's message is just its site list plus "follow shmor-ai/tools/blog-routine/PROMPT.md", so changing PROMPT.md (commit + push shmor-ai) changes all six routines; no routine edits needed.
- 2nd test (2026-11-17 19:40): research and builds fine, but `git push` from the cloud still returned 403 "Claude doesn't have GitHub access to Shmorai/…" → the Claude GitHub App must be installed on the Shmorai account with access to all shmor-* repos, then GitHub reconnected at claude.ai.
- **Working since 2026-11-17 20:14** (3rd test): Claude GitHub App installed on Shmorai (all repos) → all 4 Travel posts pushed to main and live (images from Wikimedia Commons; Unsplash napi is bot-blocked). Old local tasks traveldeals-weekly-blog / cruisedeals-weekly-blog disabled (replaced by routine 1). Check runs: claude.ai/code/routines → routine → runs; posts appear as "Blog: <title>" commits.
