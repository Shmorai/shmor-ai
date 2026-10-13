# Shmor.ai: master site

**Search more. Do less.** This is the hub of the Shmor marketplace network. It serves the **US, UK and Europe**. It's a static site, so it hosts free on **GitHub Pages**: no build step, no server and no monthly cost.

Each marketplace (`travel.shmor.ai`, `pros.shmor.ai`, …) is a **separate site with its own design**, in its own repo. This hub links to them and sends each search to the right one.

---

## Brand
Source files are in `assets/img/brand/` (logo and style pack). The website uses:

| Role | Hex |
|---|---|
| Shmor Black (text, logo) | `#0E1214` |
| Shmor Purple (".ai", buttons) | `#613284` |
| Node Purple | `#7644B0` |
| Deep Purple (node link, gradients) | `#2E1F5E` |
| Node Green (highlights, "live") | `#2FAF82` |
| Soft White (background) | `#FAFAF8` |
| Cool Gray (lines) | `#E6E9EA` |

Fonts: **Outfit** (headings and wordmark; geometric, in the Product Sans style) and **Inter** (body), both free from Google Fonts.
The logo is drawn in code (`MARK` in `assets/js/main.js`), so it's sharp at every size and has a white version for dark backgrounds. A standalone vector of the icon is at `assets/img/logo-mark.svg`.

## 1. Deploy for free on GitHub Pages

1. Create a free account at <https://github.com> if you don't have one.
2. Click **New repository** and name it `shmor-ai`. Make it **Public**; Pages is free for public repos. Don't add a README.
3. Push this folder. From inside `shmor-ai/`, run:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/shmor-ai.git
   git push -u origin main
   ```
   (Or use **GitHub Desktop**: *File → Add local repository*, choose this folder, then *Publish repository*.)
4. In the repo, open **Settings → Pages**. Set **Source** to *Deploy from a branch*, **Branch** to `main` and the folder to `/ (root)`, then **Save**.
5. After about a minute the site is live at `https://YOUR-USERNAME.github.io/shmor-ai/`.

### Connect the shmor.ai domain
1. In **Settings → Pages → Custom domain**, enter `shmor.ai` and save. The `CNAME` file is already in this repo.
2. At your domain registrar, add these DNS records:

   | Type | Name | Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | YOUR-USERNAME.github.io |

3. Once the DNS check passes (minutes to a few hours), tick **Enforce HTTPS**.

> `.ai` domains are registered through the Anguilla registry. Most registrars (Namecheap, Porkbun, Cloudflare and others) sell them, and DNS works the same way.

### Adding a marketplace subdomain later
Each marketplace is its own repo with its own design:
1. Create a repo such as `shmor-travel` with a `CNAME` file containing `travel.shmor.ai`, and enable Pages the same way.
2. Add a DNS record: **CNAME**, name `travel`, value `YOUR-USERNAME.github.io`.
3. In this repo, set `live: true` for that sector in `assets/js/config.js`. Cards and searches will then go to it.
   Searches arrive at `https://travel.shmor.ai/search?q=…`, so build a `/search/` page there that reads `q`.

---

## 2. Day-to-day editing: `assets/js/config.js`

Almost everything is controlled from this one file:

| Setting | What it does |
|---|---|
| `SITE.company` | Your legal company name, number and address. **Fill this in before launch**; it appears in the footer and legal pages. |
| `SITE.emails` | Contact addresses used across the site. |
| `SITE.forms` | Paste free [Formspree](https://formspree.io) endpoints to switch on the newsletter and contact forms. While empty, the newsletter is hidden and the contact page shows an email button. |
| `SITE.analytics.ga4` | Optional Google Analytics ID. Setting it turns on the cookie consent banner automatically. |
| `SITE.regions` | US / UK / EU markets and currency symbols. Visitors are auto-detected and can switch in the footer. |
| `AFFILIATE_LINKS` | **Your referral links**; see below. |
| `SECTORS` | The marketplaces: name, subdomain, colour, search keywords, `live`, `fallback`. |
| `POPULAR` | The "What people are searching for" tiles. |
| `OFFERS` | Featured deals. The section only appears once you add some. |

### Adding referral links (Awin, CJ, Impact, …)

Add each link **once** under a short name (a "slug"):

```js
const AFFILIATE_LINKS = {
  'acme-hotels': {
    merchant: 'Acme Hotels',
    network: 'awin',
    url: 'https://www.awin1.com/cread.php?awinmid=12345&awinaffid=67890',
    sector: 'travel',
    featured: true,          // optional: show in "Brands we compare"
  },
};
```

**Different link per market?** Most brands run separate programmes in each region, for example CJ in the US and Awin in the UK and EU:

```js
  'acme-hotels': {
    merchant: 'Acme Hotels',
    network: 'cj',                          // default network
    networks: { uk: 'awin', eu: 'awin' },   // per-region override
    url: {
      us: 'https://www.anrdoezrs.net/click-1234567-11111111',
      uk: 'https://www.awin1.com/cread.php?awinmid=111&awinaffid=222',
      eu: 'https://www.awin1.com/cread.php?awinmid=333&awinaffid=222',
    },
  },
```

Visitors get their region's link. If a region has no link, they get the default region's link (`SITE.regions.default`).

Then use the slug anywhere:
- **Featured offer:** `OFFERS: [{ title: '20% off city breaks', sector: 'travel', link: 'acme-hotels', badge: 'Ends Sunday' }]`
- **Earn before a marketplace launches:** set `fallback: 'acme-hotels'` on a sector. Its card and its searches then go to that partner until you set `live: true`.
- **In any page's HTML:** `<a data-aff="acme-hotels">Visit Acme</a>`

Every referral goes through `shmor.ai/go/?to=acme-hotels`, which:
- automatically adds a **sub-ID** (e.g. `clickref=shmor-uk-offer`), so network reports show which region and which part of the site earned the click;
- marks links `rel="sponsored nofollow"`, which keeps you in line with Google's rules;
- shows a friendly "link expired" page if a slug is removed, instead of a broken link;
- is blocked from search engines in `robots.txt`.

Supported sub-ID parameters: Awin `clickref`, CJ `sid`, Impact `subId1`, Rakuten `u1`, Partnerize `pubref`, Tradedoubler `epi`, Webgains `clickref`.

---

## 3. Editing pages

- **Homepage:** `index.html`
- **About, Partners, Contact, Privacy, Cookies, Terms, How we make money, 404:** edit the copy in `tools/pages/*.html`, then rebuild:
  ```bash
  node tools/build-pages.js
  ```
  This regenerates those pages and `sitemap.xml` with the shared header, footer and SEO tags.
- **Styles:** `assets/css/style.css` · **Behaviour:** `assets/js/main.js`

### Preview locally
```bash
node tools/serve.js
```
Then open <http://localhost:4000>.

---

## 4. Before launch checklist

- [ ] Fill in `SITE.company` (legal name, number, address, jurisdiction)
- [ ] Set up the email addresses in `SITE.emails` (Zoho Mail and Cloudflare Email Routing both have free options)
- [ ] Create Formspree forms and paste the endpoints into `SITE.forms`
- [ ] Have a solicitor or attorney review the Privacy, Cookies and Terms pages. They're thorough templates covering UK GDPR, EU GDPR, US state privacy laws (California etc.) and FTC/ASA disclosure rules, but they aren't legal advice
- [ ] If you're based outside the EU and actively target EU users, you may need an **EU GDPR representative** (Art. 27)
- [ ] Regulated sectors: comparing **insurance, loans, credit cards or energy switching** can be regulated (FCA/Ofgem in the UK, state licensing in the US, national regulators in the EU). Use a licensed partner's white-label or get advice first
- [ ] Add a social share image (`assets/img/og-image.png`, 1200×630) and an `og:image` tag
- [ ] Submit `https://shmor.ai/sitemap.xml` in Google Search Console and Bing Webmaster Tools
- [ ] Apply to affiliate networks: CJ, Impact and Rakuten are strongest in the US; Awin is strongest in the UK and EU. The live site itself helps your applications get approved

## Structure
```
index.html              Homepage
go/                     Referral redirect (shmor.ai/go/?to=slug)
about/ partners/ contact/ privacy/ cookies/ terms/ affiliate-disclosure/
404.html                Not-found page
assets/css/style.css    Brand styles (light + dark mode)
assets/js/config.js     ← edit this: links, sectors, offers, company details
assets/js/region.js     US/UK/EU detection + per-region link resolution
assets/js/main.js       Layout, search routing, referral links, consent
assets/img/favicon.svg
tools/build-pages.js    Rebuilds inner pages + sitemap
tools/serve.js          Local preview server
CNAME .nojekyll robots.txt sitemap.xml   GitHub Pages / SEO files
```
