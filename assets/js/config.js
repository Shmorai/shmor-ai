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
    legalName: '[Your Company Name Ltd]',
    number: '[Company number]',
    address: '[Registered office address]',
    jurisdiction: 'England and Wales',
  },

  emails: {
    hello: 'hello@shmor.ai',
    partners: 'partners@shmor.ai',
    privacy: 'privacy@shmor.ai',
  },

  // Free form backends (GitHub Pages can't process forms itself).
  // Create a free form at https://formspree.io and paste its endpoint,
  // e.g. 'https://formspree.io/f/abcdwxyz'. Leave '' to hide the
  // newsletter / use an email link on the contact page instead.
  forms: {
    newsletter: '',
    contact: '',
  },

  // Google Analytics 4 measurement ID, e.g. 'G-XXXXXXXXXX'.
  // When set, a cookie consent banner appears and GA only loads after "Accept".
  analytics: { ga4: '' },

  social: { x: '', instagram: '', linkedin: '', tiktok: '', facebook: '' },

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
   Every outbound referral goes through  /go/?to=<slug>  so you can:
     - change a link in ONE place and every button updates
     - get automatic click tracking (sub-ID) in Awin / CJ / Impact reports
   Use a slug anywhere on the site:
     - in OFFERS / SECTORS below (link: 'slug', fallback: 'slug')
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
   MARKETPLACES (each lives on its own subdomain with its own design)
   live: true      → cards & searches go to https://<sub>.shmor.ai
   live: false     → shown as "Launching soon"
   fallback: slug  → while not live, send searches/clicks to this
                     referral link instead (earn from day one)
   --------------------------------------------------------------------- */
const SECTORS = [
  { id: 'travel', name: 'Shmor Travel', sub: 'travel', icon: 'plane', accent: '#5B4BF5', live: false, fallback: '',
    blurb: 'Package holidays, hotels, city breaks and flights compared across leading travel brands.',
    keywords: ['holiday', 'holidays', 'vacation', 'vacations', 'hotel', 'hotels', 'flight', 'flights', 'trip', 'city break', 'resort', 'all-inclusive', 'all inclusive', 'beach', 'cruise', 'villa', 'tenerife', 'spain', 'greece', 'dubai', 'lanzarote', 'paris', 'cancun', 'florida', 'orlando', 'las vegas', 'new york', 'hawaii', 'italy', 'portugal', 'travel', 'airport', 'car hire', 'getaway'] },
  { id: 'pros', name: 'Shmor Pros', sub: 'pros', icon: 'wrench', accent: '#EA580C', live: false, fallback: '',
    blurb: 'Find and compare local tradespeople and professionals: plumbers, cleaners, builders, tutors and more.',
    keywords: ['plumber', 'electrician', 'builder', 'cleaner', 'cleaning', 'cleaners', 'contractor', 'hvac', 'mover', 'movers', 'gardener', 'roofer', 'painter', 'decorator', 'handyman', 'tutor', 'photographer', 'removals', 'locksmith', 'near me', 'quote', 'quotes', 'landscaper', 'boiler', 'trades'] },
  { id: 'deals', name: 'Shmor Deals', sub: 'deals', icon: 'tag', accent: '#DB2777', live: false, fallback: '',
    blurb: 'Hand-picked discounts, voucher codes and flash sales from trusted online retailers.',
    keywords: ['deal', 'deals', 'discount', 'voucher', 'code', 'codes', 'sale', 'offer', 'offers', 'cheap', 'coupon', 'black friday', 'cashback'] },
  { id: 'connect', name: 'Shmor Connect', sub: 'connect', icon: 'wifi', accent: '#0284C7', live: false, fallback: '',
    blurb: 'Internet, mobile plans and TV packages compared by speed, price and contract length.',
    keywords: ['broadband', 'wifi', 'wi-fi', 'internet', 'fibre', 'fiber', 'cell phone', 'cellphone', 'phone plan', 'mobile', 'sim', 'sim only', 'phone contract', 'tv package', '5g'] },
  { id: 'energy', name: 'Shmor Energy', sub: 'energy', icon: 'sun', accent: '#059669', live: false, fallback: '',
    blurb: 'Solar panels, heat pumps, EV chargers and home upgrades. Get matched with approved installers.',
    keywords: ['solar', 'solar panels', 'heat pump', 'ev charger', 'insulation', 'energy', 'battery', 'renewable'] },
  { id: 'tech', name: 'Shmor Tech', sub: 'tech', icon: 'laptop', accent: '#4F46E5', live: false, fallback: '',
    blurb: 'Laptops, phones, TVs and gadgets with price comparison across major retailers.',
    keywords: ['laptop', 'phone', 'iphone', 'tv', 'television', 'headphones', 'tablet', 'camera', 'console', 'gadget', 'smartwatch'] },
  { id: 'style', name: 'Shmor Style', sub: 'style', icon: 'shirt', accent: '#BE185D', live: false, fallback: '',
    blurb: 'Fashion, beauty and lifestyle brands in one place. Filter by size, price and delivery.',
    keywords: ['dress', 'shoes', 'trainers', 'sneakers', 'fashion', 'clothes', 'jacket', 'beauty', 'makeup', 'skincare', 'perfume', 'jewellery'] },
  { id: 'home', name: 'Shmor Home', sub: 'home', icon: 'sofa', accent: '#B45309', live: false, fallback: '',
    blurb: 'Furniture, homeware, appliances and garden. Compare retailers before you buy.',
    keywords: ['sofa', 'couch', 'furniture', 'bed', 'mattress', 'kitchen', 'appliance', 'garden', 'homeware', 'rug', 'fridge', 'washing machine'] },
  { id: 'experiences', name: 'Shmor Experiences', sub: 'experiences', icon: 'ticket', accent: '#7C3AED', live: false, fallback: '',
    blurb: 'Days out, gift experiences, events and tickets. Find something to do this weekend.',
    keywords: ['experience', 'tickets', 'gig', 'concert', 'theatre', 'spa day', 'day out', 'days out', 'gift', 'event', 'festival', 'weekend'] },
  { id: 'motors', name: 'Shmor Motors', sub: 'motors', icon: 'car', accent: '#DC2626', live: false, fallback: '',
    blurb: 'Car leasing, servicing, tyres and parts. Compare local garages and online deals.',
    keywords: ['car', 'lease', 'leasing', 'tyres', 'tires', 'mot', 'servicing', 'oil change', 'auto insurance', 'garage', 'van', 'electric car'] },
];

/* ---------------------------------------------------------------------
   POPULAR SEARCHES — tiles on the homepage that run a search.
   --------------------------------------------------------------------- */
const POPULAR = [
  { label: 'All-inclusive holidays', q: 'all-inclusive holidays', sector: 'travel' },
  { label: 'Last-minute city breaks', q: 'city break', sector: 'travel' },
  { label: 'Plumbers near you', q: 'plumber near me', sector: 'pros' },
  { label: 'Move-out cleaning', q: 'move out cleaning', sector: 'pros' },
  { label: 'Fast home internet', q: 'fiber internet', sector: 'connect' },
  { label: 'Solar panel quotes', q: 'solar panels', sector: 'energy' },
  { label: "Today's voucher codes", q: 'voucher codes', sector: 'deals' },
  { label: 'Days out this weekend', q: 'days out', sector: 'experiences' },
];

/* ---------------------------------------------------------------------
   FEATURED OFFERS — the "Top offers" section only appears when this
   list has entries. Each offer must point at an AFFILIATE_LINKS slug.
   --------------------------------------------------------------------- */
const OFFERS = [
  // { title: 'Up to 30% off summer holidays', merchant: 'Example Travel Co', sector: 'travel',
  //   link: 'example-travel', badge: 'Ends Sunday', terms: 'Selected departures. T&Cs apply.' },
];
