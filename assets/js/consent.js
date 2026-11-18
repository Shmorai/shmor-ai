/* Shmor network: cookie consent + Google Analytics 4, shared by shmor.ai and every *.shmor.ai site.
   Loaded on shmor.ai by assets/js/main.js, and on every marketplace page from https://shmor.ai/assets/js/consent.js
   (added to <head> by the site kit's tools/build.js), so changing this one file changes all 25 sites.

   - GA4_ID empty = no banner, no analytics anywhere.
   - Analytics only loads after the visitor clicks "Accept" (UK/EU rules). Global Privacy Control = treated as "Reject".
   - The choice is stored in a cookie on .shmor.ai, so one answer covers the whole network.
   - Clicks on referral links (shmor.ai/go/?to=…) are sent as the GA4 event "affiliate_click" (link_slug, link_src).
   - Your own visits: open any page with ?shmor_internal=1 to mark this browser as internal (traffic_type=internal,
     filtered out in GA4 once the "Internal traffic" data filter is active); ?shmor_internal=0 removes the mark.
   - window.shmorConsent.reset() asks again (used by the "Change cookie preferences" button on shmor.ai/cookies/). */
(function () {
  var GA4_ID = 'G-G08ZS5P052';

  if (window.__shmorConsent) return; window.__shmorConsent = true;
  var host = location.hostname;
  var DOMAIN = /(^|\.)shmor\.ai$/.test(host) ? '; domain=.shmor.ai' : '';
  var SECURE = location.protocol === 'https:' ? '; secure' : '';
  function getC(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
  function setC(n, v, days) { document.cookie = n + '=' + encodeURIComponent(v) + '; path=/; max-age=' + Math.round(days * 86400) + '; samesite=lax' + DOMAIN + SECURE; }
  function delC(n) { document.cookie = n + '=; path=/; max-age=0' + DOMAIN; }

  window.shmorConsent = {
    enabled: !!GA4_ID,
    get: function () { return getC('shmor_consent'); },
    reset: function () { delC('shmor_consent'); location.reload(); }
  };

  // Internal-traffic mark (works even before an ID is set, so it's ready)
  var q = new URLSearchParams(location.search).get('shmor_internal');
  if (q === '1') setC('shmor_internal', '1', 400);
  if (q === '0') delC('shmor_internal');

  if (!GA4_ID) return;

  var lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
  var T = {
    en: { text: 'We’d like to use optional analytics cookies (Google Analytics) to count visits and see which pages are useful. They’re only set if you accept.', policy: 'Cookie policy', no: 'Reject', yes: 'Accept', label: 'Cookie preferences' },
    fr: { text: 'Nous aimerions utiliser des cookies de mesure d’audience facultatifs (Google Analytics) pour compter les visites et savoir quelles pages sont utiles. Ils ne sont déposés que si vous acceptez.', policy: 'Politique cookies', no: 'Refuser', yes: 'Accepter', label: 'Préférences cookies' },
    de: { text: 'Wir möchten optionale Analyse-Cookies (Google Analytics) verwenden, um Besuche zu zählen und zu sehen, welche Seiten hilfreich sind. Sie werden nur gesetzt, wenn Sie zustimmen.', policy: 'Cookie-Richtlinie', no: 'Ablehnen', yes: 'Akzeptieren', label: 'Cookie-Einstellungen' }
  }[lang] || null;
  if (!T) T = { text: 'We’d like to use optional analytics cookies (Google Analytics) to count visits and see which pages are useful. They’re only set if you accept.', policy: 'Cookie policy', no: 'Reject', yes: 'Accept', label: 'Cookie preferences' };

  function loadGA() {
    if (window.__gaLoaded) return; window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    var cfg = { site_name: host.replace(/\.shmor\.ai$/, '') || 'shmor.ai' };
    if (getC('shmor_internal') === '1') cfg.traffic_type = 'internal';
    window.gtag('config', GA4_ID, cfg);
    // Referral-link clicks: sent as soon as the link is clicked (gtag uses a beacon, so it survives the page change)
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="/go/?"]'); if (!a) return;
      try {
        var u = new URL(a.href, location.href);
        if (u.pathname.replace(/\/$/, '') !== '/go') return;
        window.gtag('event', 'affiliate_click', { link_slug: u.searchParams.get('to') || '', link_src: u.searchParams.get('src') || '', link_region: u.searchParams.get('r') || '' });
      } catch (err) { /* ignore bad URLs */ }
    }, true);
  }

  function banner() {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', T.label);
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;background:#14171B;color:#F3F4F5;border:1px solid #2A2F35;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:14px 16px;font:14px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center';
    var policy = 'https://shmor.ai/cookies/';
    bar.innerHTML = '<p style="margin:0;flex:1 1 280px">' + T.text + ' <a href="' + policy + '" style="color:#C9B6F0;text-decoration:underline">' + T.policy + '</a></p>' +
      '<div style="display:flex;gap:8px;flex:0 0 auto">' +
      '<button type="button" data-c="no" style="font:600 14px Inter,system-ui,sans-serif;padding:9px 18px;border-radius:999px;border:1px solid #4A5058;background:transparent;color:#F3F4F5;cursor:pointer">' + T.no + '</button>' +
      '<button type="button" data-c="yes" style="font:600 14px Inter,system-ui,sans-serif;padding:9px 18px;border-radius:999px;border:1px solid #7644B0;background:#7644B0;color:#fff;cursor:pointer">' + T.yes + '</button></div>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var c = e.target.getAttribute && e.target.getAttribute('data-c'); if (!c) return;
      setC('shmor_consent', c, c === 'yes' ? 395 : 180);
      bar.remove();
      if (c === 'yes') loadGA(); else clearGA();
    });
  }

  // Remove Google Analytics cookies (after "Reject", a withdrawn choice, or GPC)
  function clearGA() {
    document.cookie.split('; ').forEach(function (c) {
      var n = c.split('=')[0];
      if (/^_ga(_|$)/.test(n)) {
        document.cookie = n + '=; path=/; max-age=0';
        document.cookie = n + '=; path=/; max-age=0' + DOMAIN;
      }
    });
  }

  function start() {
    var v = getC('shmor_consent');
    if (navigator.globalPrivacyControl === true || v === 'no') return clearGA();
    if (v === 'yes') return loadGA();
    clearGA();
    banner();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
