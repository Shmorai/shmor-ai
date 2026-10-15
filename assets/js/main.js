/* Shmor.ai — shared site script (layout, search routing, referral links, consent) */
(function () {
  'use strict';

  const ROOT = document.body.dataset.root || './';
  const PAGE = document.body.dataset.page || '';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };

  /* ---------------- Icons (Lucide, ISC licence) ---------------- */
  const ICONS = {
    scale: ['m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z', 'm2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z', 'M7 21h10', 'M12 3v18', 'M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2'],
    search: ['c:11,11,8', 'm21 21-4.3-4.3'],
    ship: ['M12 10.189V14', 'M12 2v3', 'M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6', 'M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76', 'M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'],
    plane: ['M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'],
    droplet: ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'],
    wrench: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
    briefcase: ['M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', 'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
    tag: ['M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z', 'c:7.5,7.5,1'],
    wifi: ['M12 20h.01', 'M2 8.82a15 15 0 0 1 20 0', 'M5 12.859a10 10 0 0 1 14 0', 'M8.5 16.429a5 5 0 0 1 7 0'],
    sun: ['c:12,12,4', 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
    laptop: ['M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16'],
    shirt: ['M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z'],
    scissors: ['c:6,6,3', 'M8.12 8.12 12 12', 'M20 4 8.12 15.88', 'c:6,18,3', 'M14.8 14.8 20 20'],
    sofa: ['M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3', 'M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z', 'M4 18v2', 'M20 18v2', 'M12 4v9'],
    ticket: ['M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z', 'M13 5v2', 'M13 17v2', 'M13 11v2'],
    car: ['M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2', 'c:7,17,2', 'M9 17h6', 'c:17,17,2'],
    shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
    layers: ['M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'],
    wallet: ['M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1', 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'],
    sliders: ['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3', 'M14 2v4', 'M8 10v4', 'M16 18v4'],
    target: ['c:12,12,10', 'c:12,12,6', 'c:12,12,2'],
    globe: ['c:12,12,10', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
    chart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
    link: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
    mail: ['M22 7v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2Z', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
    arrow: ['M5 12h14', 'm12 5 7 7-7 7'],
    external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
    check: ['M20 6 9 17l-5-5'],
    menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
    close: ['M18 6 6 18', 'm6 6 12 12'],
    bell: ['M10.268 21a2 2 0 0 0 3.464 0', 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'],
    paw: ['c:11,4,2', 'c:18,8,2', 'c:20,16,2', 'M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z', 'c:4,8,2'],
    warehouse: ['M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11', 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 1.132-1.803l7.95-3.974a2 2 0 0 1 1.837 0l7.95 3.974A2 2 0 0 1 22 8z', 'M6 13h12', 'M6 17h12'],
  };
  function icon(name, size = 20, sw = 2) {
    const parts = (ICONS[name] || []).map(p => {
      if (p.startsWith('c:')) { const [cx, cy, r] = p.slice(2).split(','); return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`; }
      return `<path d="${p}"/>`;
    }).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${parts}</svg>`;
  }
  window.shmorIcon = icon;

  // Brand mark: magnifier "o" with two connected nodes (purple → green)
  const MARK = `<svg class="logo-o" viewBox="0 0 100 100" fill="none" aria-hidden="true"><circle class="ring" cx="57" cy="43" r="29" stroke-width="14"/><path class="handle" d="M34 66 12 88" stroke-width="14" stroke-linecap="round"/><path class="link" d="M46 54 67 33" stroke-width="5.5"/><circle cx="46" cy="54" r="9.5" fill="#613284"/><circle cx="67.5" cy="32.5" r="11" fill="#2FAF82"/></svg>`;
  const LOGO = `<span class="logo-word">Shm${MARK}r<span class="logo-ai">.ai</span></span>`;

  /* ---------------- Referral link helpers ---------------- */
  const SUBID = { awin: 'clickref', cj: 'sid', impact: 'subId1', rakuten: 'u1', partnerize: 'pubref', tradedoubler: 'epi', webgains: 'clickref' };
  const REGION = shmorRegion.get();
  const goHref = (slug, src) => `${ROOT}go/?to=${encodeURIComponent(slug)}&r=${REGION}${src ? '&src=' + encodeURIComponent(src) : ''}`;
  const hasAff = slug => !!(slug && typeof AFFILIATE_LINKS !== 'undefined' && AFFILIATE_LINKS[slug]);
  window.shmorAffiliate = { SUBID, goHref };

  function wireAffLinks(scope = document) {
    $$('a[data-aff]', scope).forEach(a => {
      const slug = a.dataset.aff;
      if (!hasAff(slug)) { console.warn('[Shmor] Unknown affiliate slug:', slug); return; }
      a.href = goHref(slug, a.dataset.src || PAGE || 'page');
      a.rel = 'sponsored nofollow noopener';
      a.target = '_blank';
    });
  }

  /* ---------------- Sector routing ---------------- */
  // On a local preview (localhost:4000), sites with a dev server open that instead of the real subdomain
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const local = s => LOCAL && s.devPort;
  const siteRoot = s => local(s) ? `http://${location.hostname}:${s.devPort}/` : `https://${s.sub}.${SITE.domain}/`;
  const urlFor = (s, q) => `${siteRoot(s)}${q ? 'search/?q=' + encodeURIComponent(q) : ''}`;
  function routeQuery(q) {
    const t = ' ' + q.toLowerCase() + ' ';
    let best = null, score = 0;
    for (const s of SECTORS) {
      let sc = 0;
      for (const k of s.keywords) if (t.includes(k)) sc += k.length;
      if (sc > score) { score = sc; best = s; }
    }
    return best;
  }
  // Where should a click / search for this sector go right now?
  function destination(s, q, src) {
    if (s.live || local(s)) return { href: urlFor(s, q), external: false };
    if (hasAff(s.fallback)) return { href: goHref(s.fallback, src || 'sector-' + s.id), external: true };
    return null;
  }

  /* ---------------- Header & footer ---------------- */
  function renderLayout() {
    const head = $('#site-header');
    if (head) {
      const links = [
        ['Marketplaces', `${ROOT}#network`],
        ['How it works', `${ROOT}#how`],
        ['About', `${ROOT}about/`],
        ['For brands', `${ROOT}partners/`],
      ];
      head.className = 'nav';
      head.innerHTML = `<div class="wrap">
        <a href="${ROOT}" class="logo" aria-label="${esc(SITE.name)} home">${LOGO}</a>
        <nav class="nav-links" id="navLinks" aria-label="Main">
          ${links.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}
          <a href="${ROOT}#search" class="btn btn-primary btn-sm">Start searching</a>
        </nav>
        <button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">${icon('menu', 24)}</button>
      </div>`;
      const btn = $('#menuBtn'), nav = $('#navLinks');
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
        btn.innerHTML = icon(open ? 'close' : 'menu', 24);
      });
      $$('a', nav).forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); btn.innerHTML = icon('menu', 24); }));
    }

    const foot = $('#site-footer');
    if (foot) {
      const social = Object.entries(SITE.social).filter(([, u]) => u)
        .map(([k, u]) => `<a href="${esc(u)}" rel="noopener" target="_blank">${k[0].toUpperCase() + k.slice(1)}</a>`).join(' · ');
      foot.innerHTML = `<div class="wrap">
        <div class="foot-grid">
          <div>
            <a href="${ROOT}" class="logo on-dark" aria-label="${esc(SITE.name)} home">${LOGO}</a>
            <p class="foot-tag">${esc(SITE.tagline)} One place to compare holidays, local services, deals and more.</p>
            ${social ? `<p class="foot-social">${social}</p>` : ''}
            <label class="region-pick">${icon('globe', 16)}<span class="sr">Region</span>
              <select id="regionSelect" aria-label="Choose your region">${Object.entries(SITE.regions.list).map(([k, v]) => `<option value="${k}"${k === REGION ? ' selected' : ''}>${esc(v.label)} (${v.currency})</option>`).join('')}</select>
            </label>
          </div>
          <div><h5>Marketplaces</h5><ul>${[...SECTORS].sort((a, b) => (b.live - a.live) || ((b.status !== "planned") - (a.status !== "planned"))).slice(0, 6).map(s => `<li><a href="${s.live || local(s) ? siteRoot(s) : ROOT + "#network"}">${esc(s.name)}</a></li>`).join('')}</ul></div>
          <div><h5>Company</h5><ul>
            <li><a href="${ROOT}about/">About us</a></li>
            <li><a href="${ROOT}partners/">Partner with us</a></li>
            <li><a href="${ROOT}affiliate-disclosure/">How we make money</a></li>
            <li><a href="${ROOT}contact/">Contact</a></li>
          </ul></div>
          <div><h5>Legal</h5><ul>
            <li><a href="${ROOT}privacy/">Privacy policy</a></li>
            <li><a href="${ROOT}cookies/">Cookie policy</a></li>
            <li><a href="${ROOT}terms/">Terms of use</a></li>
            <li><a href="${ROOT}affiliate-disclosure/">Affiliate disclosure</a></li>
          </ul></div>
        </div>
        <div class="disclosure">
          <p><strong>Affiliate disclosure:</strong> ${esc(SITE.name)} is free to use. Some links on our sites are affiliate links. If you click through and buy or enquire, we may earn a commission from the provider at no extra cost to you. <a href="${ROOT}affiliate-disclosure/">Learn more</a>.</p>
          <p>© ${new Date().getFullYear()} ${esc(SITE.company.legalName)}. ${esc(SITE.name)} is a trading name of ${esc(SITE.company.legalName)}, registered in ${esc(SITE.company.jurisdiction)} (${esc(SITE.company.number)}).</p>
        </div>
      </div>`;
    }

    const rs = $('#regionSelect');
    if (rs) rs.addEventListener('change', () => { shmorRegion.set(rs.value); location.reload(); });

    // Currency symbols and region names for the visitor's market
    const reg = SITE.regions.list[REGION];
    $$('[data-cur]').forEach(el => { el.textContent = reg.currency; });
    $$('[data-region-name]').forEach(el => { el.textContent = reg.label; });

    // Fill [data-site="company.legalName"] placeholders in page copy
    $$('[data-site]').forEach(el => {
      const v = el.dataset.site.split('.').reduce((o, k) => (o ? o[k] : undefined), SITE);
      if (v != null) el.textContent = v;
    });
    $$('[data-mail]').forEach(el => {
      const m = SITE.emails[el.dataset.mail];
      if (m) { el.href = 'mailto:' + m; if (!el.textContent.trim()) el.textContent = m; }
    });
  }

  /* ---------------- Toast ---------------- */
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function go(s, q, src) {
    const d = destination(s, q, src);
    if (d) {
      if (d.external) window.open(d.href, '_blank', 'noopener');
      else { toast(`Taking you to ${s.name}…`); setTimeout(() => { location.href = d.href; }, 500); }
      return;
    }
    toast(`${s.name} is launching soon. Join the list to hear first.`);
    const n = $('#updates');
    if (n && !n.hidden) n.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------------- Homepage ---------------- */
  // Resize Unsplash photos through their CDN; other URLs are used as-is
  const photo = (src, w, h) => /^https:\/\/images\.unsplash\.com\//.test(src) && !src.includes('?')
    ? `${src}?w=${w}&h=${h}&fit=crop&auto=format&q=70` : src;
  // "Travel" + coloured "Deals" when the card defines a wordmark split, else the plain name
  const wordmark = s => {
    const w = s.card && s.card.wordmark;
    return w && w.length === 2
      ? `${esc(w[0])}<b style="color:${esc(s.card.wordmarkColor || 'var(--accent)')}">${esc(w[1])}</b>`
      : esc(s.name);
  };

  function renderHome() {
    const grid = $('#sectorGrid');
    if (!grid) return;

    grid.innerHTML = SECTORS.map(s => {
      const d = destination(s, '', 'card-' + s.id);
      const href = d ? d.href : '#updates';
      const ext = d && d.external ? ' target="_blank" rel="sponsored nofollow noopener"' : '';
      const status = s.live ? '<span class="badge live">Live</span>'
        : local(s) ? '<span class="badge partner">Local preview</span>'
        : d ? '<span class="badge partner">Partner offers</span>' : '<span class="badge soon">Launching soon</span>';
      const c = s.card;
      if (c && c.image) {
        // Brand card: the marketplace's own photo, logo, wordmark and colour (from its shmor-site.json "card")
        return `<a class="sector has-img" href="${href}"${ext} data-id="${s.id}" style="--accent:${c.accent || s.accent}">
        <div class="sector-photo">
          <img src="${esc(photo(c.image.src, 800, 440))}" alt="${esc(c.image.alt || '')}" loading="lazy" width="800" height="440">
          ${status}
          ${c.logo ? `<span class="sector-logo">${c.logo}</span>` : ''}
        </div>
        <h3 class="sector-name">${wordmark(s)}</h3>
        <p>${esc(s.blurb)}</p>
        <div class="sector-foot"><span class="domain">${s.sub}.${SITE.domain}</span><span class="arrow">${icon('arrow', 16)}</span></div>
      </a>`;
      }
      return `<a class="sector" href="${href}"${ext} data-id="${s.id}" style="--accent:${s.accent}">
        <div class="sector-top"><div class="ico">${icon(s.icon, 24)}</div>${status}</div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.blurb)}</p>
        <div class="sector-foot"><span class="domain">${s.sub}.${SITE.domain}</span><span class="arrow">${icon('arrow', 16)}</span></div>
      </a>`;
    }).join('');
    grid.addEventListener('click', e => {
      const a = e.target.closest('.sector'); if (!a) return;
      const s = SECTORS.find(x => x.id === a.dataset.id);
      if (!destination(s)) { e.preventDefault(); go(s); }
    });

    const n = $('#statSectors'); if (n) n.textContent = SECTORS.length;

    // Quick chips
    const quick = $('#quick');
    quick.innerHTML = POPULAR.slice(0, 6).map(p => `<button type="button" data-q="${esc(p.q)}">${esc(p.label)}</button>`).join('');
    quick.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $('#q').value = b.dataset.q; updateHint(); $('#q').focus();
    });

    // Popular tiles
    const pop = $('#popularGrid');
    const sec = id => SECTORS.find(s => s.id === id);
    pop.innerHTML = POPULAR.map((p, i) => {
      const s = sec(p.sector);
      return `<button type="button" class="pop" data-i="${i}" style="--accent:${(s.card && s.card.accent) || s.accent}">
        <span class="pop-ico${s.card && s.card.logo ? ' is-logo' : ''}">${s.card && s.card.logo ? s.card.logo : icon(s.icon, 20)}</span>
        <span class="pop-txt"><strong>${esc(p.label)}</strong><small>${esc(s.name)}</small></span>
        <span class="pop-arrow">${icon('arrow', 16)}</span></button>`;
    }).join('');
    pop.addEventListener('click', e => {
      const b = e.target.closest('.pop'); if (!b) return;
      const p = POPULAR[+b.dataset.i]; go(sec(p.sector), p.q, 'popular');
    });

    // Offers (only when configured)
    const offers = OFFERS.filter(o => hasAff(o.link));
    if (offers.length) {
      $('#offers').hidden = false;
      $('#offerGrid').innerHTML = offers.map(o => {
        const s = sec(o.sector) || SECTORS[0];
        return `<a class="offer" href="${goHref(o.link, 'offer')}" target="_blank" rel="sponsored nofollow noopener" style="--accent:${s.accent}">
          <div class="offer-top"><span class="offer-ico">${icon(s.icon, 22)}</span>${o.badge ? `<span class="offer-badge">${esc(o.badge)}</span>` : ''}</div>
          <span class="offer-merchant">${esc(o.merchant || AFFILIATE_LINKS[o.link].merchant)}</span>
          <h3>${esc(o.title)}</h3>
          ${o.terms ? `<small>${esc(o.terms)}</small>` : ''}
          <span class="offer-cta">Get this deal ${icon('external', 14)}</span>
        </a>`;
      }).join('');
    }

    // Featured brands (only when configured)
    const brands = Object.entries(AFFILIATE_LINKS).filter(([, v]) => v.featured);
    if (brands.length) {
      $('#brands').hidden = false;
      $('#brandRow').innerHTML = brands.map(([slug, v]) =>
        `<a class="brand" href="${goHref(slug, 'brand-strip')}" target="_blank" rel="sponsored nofollow noopener">${v.logo ? `<img src="${esc(v.logo)}" alt="${esc(v.merchant)}" loading="lazy">` : esc(v.merchant)}</a>`).join('');
    }

    // Search
    const input = $('#q'), hint = $('#routeHint');
    function updateHint() {
      const q = input.value.trim();
      if (!q) { hint.innerHTML = `${icon('sliders', 15)} Type anything. We'll route you to the right Shmor marketplace.`; return; }
      const s = routeQuery(q);
      hint.innerHTML = s
        ? `${icon('search', 15)} Searching in <span class="chip-mini" style="--accent:${s.accent}">${icon(s.icon, 14)} ${esc(s.name)}</span>`
        : `${icon('search', 15)} Searching across <strong>Shmor Deals</strong>`;
    }
    if (matchMedia('(max-width: 580px)').matches) input.placeholder = 'Trips, local pros, deals…';
    input.addEventListener('input', updateHint);
    updateHint();
    $('#searchForm').addEventListener('submit', e => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) { input.focus(); return; }
      go(routeQuery(q) || SECTORS.find(x => x.id === 'deals'), q, 'search');
    });
    const pq = new URLSearchParams(location.search).get('q');
    if (pq) { input.value = pq; updateHint(); }
  }

  /* ---------------- Forms (Formspree-compatible) ---------------- */
  function wireForms() {
    const news = $('#updates');
    if (news) {
      if (!SITE.forms.newsletter) news.hidden = true;
      else {
        const f = $('form', news);
        f.addEventListener('submit', e => submitForm(e, SITE.forms.newsletter, $('#newsOk')));
      }
    }
    const cf = $('#contactForm');
    if (cf) {
      if (!SITE.forms.contact) { cf.hidden = true; $('#contactFallback').hidden = false; }
      else cf.addEventListener('submit', e => submitForm(e, SITE.forms.contact, $('#contactOk')));
    }
  }
  async function submitForm(e, endpoint, okEl) {
    e.preventDefault();
    const f = e.target, btn = $('button[type=submit]', f);
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending…';
    try {
      const r = await fetch(endpoint, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      f.hidden = true; okEl.hidden = false;
    } catch (err) {
      toast('Sorry, that didn\'t send. Please try again or email us.');
      btn.disabled = false; btn.textContent = label;
    }
  }

  /* ---------------- Cookie consent (only when analytics configured) ---------------- */
  function loadGA(id) {
    if (window.__gaLoaded) return; window.__gaLoaded = true;
    const s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', id, { anonymize_ip: true });
  }
  function consent() {
    const id = SITE.analytics && SITE.analytics.ga4;
    window.shmorConsent = {
      reset() { store.del('shmor-consent'); location.reload(); },
      enabled: !!id,
    };
    if (!id) return;
    // Global Privacy Control = opt-out (US state laws); no banner, no analytics
    if (navigator.globalPrivacyControl === true) return;
    const v = store.get('shmor-consent');
    if (v === 'yes') return loadGA(id);
    if (v === 'no') return;
    const bar = document.createElement('div');
    bar.className = 'consent';
    bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Cookie preferences');
    bar.innerHTML = `<p>We use optional analytics cookies to understand how Shmor is used and improve it. See our <a href="${ROOT}cookies/">cookie policy</a>.</p>
      <div class="consent-btns"><button class="btn btn-quiet" data-c="no">Reject</button><button class="btn btn-primary" data-c="yes">Accept</button></div>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', e => {
      const c = e.target.dataset.c; if (!c) return;
      store.set('shmor-consent', c); bar.remove();
      if (c === 'yes') loadGA(id);
    });
  }

  /* ---------------- Boot ---------------- */
  renderLayout();
  renderHome();
  wireAffLinks();
  wireForms();
  consent();
})();
