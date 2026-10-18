/* =====================================================================
   SHMOR.AI — SITE CONFIG
   This is the only file you need to edit day-to-day.
   ===================================================================== */

const SITE = {
  name: 'Shmor.ai',
  domain: 'shmor.ai',
  tagline: 'Search more. Do less.',

  // Shown in the legal pages and footer — fill these in before launch.
  company: {
    legalName: 'Shmor.ai',
    number: '',                 // add the Companies House number here once registered; it then shows in the footer
    address: '82 King Street, Manchester, Greater Manchester, M2 4WQ, United Kingdom',
    jurisdiction: 'England and Wales', // governing law in the terms of use
    founded: 2025,              // footer shows "© 2025–<this year>"
  },

  emails: {
    info: 'info@shmor.ai',          // main enquiries
    help: 'contactus@shmor.ai',     // help & support
    partners: 'partnership@shmor.ai', // brands, advertisers, affiliate partners
    privacy: 'contactus@shmor.ai',  // privacy & data requests
    hello: 'info@shmor.ai',         // older pages use data-mail="hello"
  },

  // Free form backends (GitHub Pages can't process forms itself).
  // Create a free form at https://formspree.io and paste its endpoint,
  // e.g. 'https://formspree.io/f/abcdwxyz'. Leave '' to hide the
  // newsletter / use an email link on the contact page instead.
  forms: {
    newsletter: '',
    contact: '',
  },

  // "Join the Shmor Weekly" sign-ups → Google Form "Shmor Weekly sign-ups (master)"
  // → Google Sheet "Shmor Network Sign-ups (MASTER)" (account youtube@shmor.ai).
  // Google adds the Timestamp column itself. Field codes come from the form;
  // if a question is added or renamed in the form, update its code here.
  signup: {
    formAction: 'https://docs.google.com/forms/d/e/1FAIpQLScWHB4EPv6PvuxRHpCWzoP9wYAHuEPoHyqERgS5oU8Qkh2phA/formResponse',
    fields: {
      name: 'entry.944173896',
      email: 'entry.1494422821',
      phone: 'entry.1469592634',
      country: 'entry.57901292',
      emailConsent: 'entry.604876',
      smsConsent: 'entry.366807439',
      ip: 'entry.596290519',
      source: 'entry.1939103685',
      region: 'entry.1587159683',
      browser: 'entry.707341773',
    },
    ipLookup: 'https://api.ipify.org?format=json', // free public-IP service; the browser asks it for its own IP
  },

  // Google Analytics 4 measurement ID, e.g. 'G-XXXXXXXXXX'.
  // When set, a cookie consent banner appears and GA only loads after "Accept".
  analytics: { ga4: '' },

  social: { x: '', instagram: '', linkedin: '', tiktok: '', facebook: 'https://www.facebook.com/profile.php?id=61595437111281' },

  // Markets we serve. Visitors are auto-detected (by time zone) and can
  // switch in the footer. Affects currency symbols and which referral URL
  // is used when a link has region-specific versions.
  regions: {
    default: 'us',
    list: {
      us: { label: 'United States', short: 'US', currency: '$' },
      uk: { label: 'United Kingdom', short: 'UK', currency: '£' },
      eu: { label: 'Europe', short: 'EU', currency: '€' },
    },
  },
};

/* ---------------------------------------------------------------------
   REFERRAL / AFFILIATE LINKS
   Network-wide links live here. Links for ONE marketplace belong in
   that site's manifest ("links") and are merged in by the sync script.
   Every outbound referral goes through  /go/?to=<slug>  so you can:
     - change a link in ONE place and every button updates
     - get automatic click tracking (sub-ID) in Awin / CJ / Impact reports
   Use a slug anywhere on the site:
     - in OFFERS below, or a site manifest (link: 'slug', fallback: 'slug')
     - in any HTML page:  <a data-aff="slug">Visit</a>

   network → which sub-ID parameter gets added automatically:
     awin: clickref | cj: sid | impact: subId1 | rakuten: u1
     partnerize: pubref | tradedoubler: epi | webgains: clickref

   url can be ONE link for everyone, or a different link per market:
     url: { us: 'https://...cj link...', uk: 'https://...awin link...', eu: 'https://...' }
   Visitors get the link for their region (falling back to the default
   region, then to whichever link exists).
   --------------------------------------------------------------------- */
const AFFILIATE_LINKS = {
  // 'example-travel': {
  //   merchant: 'Example Travel Co',
  //   network: 'awin',
  //   url: 'https://www.awin1.com/cread.php?awinmid=12345&awinaffid=67890',
  //   sector: 'travel',
  //   featured: true,        // show in the "Brands we compare" strip
  // },
  // 'example-hotels': {
  //   merchant: 'Example Hotels',
  //   network: 'cj',               // sub-ID param used for every region
  //   url: {
  //     us: 'https://www.anrdoezrs.net/click-1234567-11111111',
  //     uk: 'https://www.awin1.com/cread.php?awinmid=111&awinaffid=222',
  //     eu: 'https://www.awin1.com/cread.php?awinmid=333&awinaffid=222',
  //   },
  //   networks: { uk: 'awin', eu: 'awin' },   // optional per-region override
  //   sector: 'travel',
  // },
  // 'example-cj-deal': {
  //   merchant: 'Example Retailer',
  //   network: 'cj',
  //   url: 'https://www.anrdoezrs.net/click-1234567-12345678',
  //   sector: 'deals',
  // },
};

/* ---------------------------------------------------------------------
   MARKETPLACES are NOT edited here.
   Each marketplace has its own manifest: network/<id>.json (or, once the
   site exists, shmor-site.json inside its own folder/repo). Run
       node tools/sync-network.js
   to pull every site's card, keywords, popular searches, offers and
   referral links into assets/js/network.js (generated, don't edit).
   --------------------------------------------------------------------- */

/* Extra network-wide popular-search tiles (sector-specific ones live in
   each site's manifest). { label, q, sector } */
const POPULAR = [];

/* ---------------------------------------------------------------------
   FEATURED OFFERS — the "Top offers" section only appears when this
   list has entries. Each offer must point at an AFFILIATE_LINKS slug.
   --------------------------------------------------------------------- */
const OFFERS = [
  // { title: 'Up to 30% off summer holidays', merchant: 'Example Travel Co', sector: 'travel',
  //   link: 'example-travel', badge: 'Ends Sunday', terms: 'Selected departures. T&Cs apply.' },
];
