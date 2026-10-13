/* Shmor.ai — visitor region (US / UK / EU) and referral URL resolution.
   Shared by the main site and the /go/ redirect page. Needs config.js first. */
(function () {
  'use strict';
  var KEY = 'shmor-region';
  var R = SITE.regions;

  function detect() {
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
    if (/^Europe\/(London|Belfast|Guernsey|Isle_of_Man|Jersey)$/.test(tz)) return 'uk';
    if (/^Europe\//.test(tz) || tz === 'Atlantic/Canary' || tz === 'Atlantic/Madeira' || tz === 'Atlantic/Azores') return 'eu';
    if (/^(America|US|Pacific\/Honolulu)/.test(tz)) return 'us';
    var lang = (navigator.language || '').toLowerCase();
    if (lang === 'en-gb') return 'uk';
    if (lang === 'en-us') return 'us';
    if (/^(de|fr|es|it|nl|pt|pl|sv|da|fi|el|cs|ro|hu|sk|sl|hr|bg|lt|lv|et|ga|mt)\b/.test(lang)) return 'eu';
    return R.default;
  }

  function get() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
    return v && R.list[v] ? v : detect();
  }

  function set(code) {
    if (!R.list[code]) return;
    try { localStorage.setItem(KEY, code); } catch (e) { /* storage blocked */ }
  }

  // Resolve an AFFILIATE_LINKS entry to { url, network } for a region.
  function resolve(link, region) {
    if (!link) return null;
    var url = link.url, net = link.network || '';
    if (url && typeof url === 'object') {
      var pick = url[region] ? region : url[R.default] ? R.default : Object.keys(url)[0];
      url = url[pick];
      if (link.networks && link.networks[pick]) net = link.networks[pick];
    }
    return url ? { url: url, network: net } : null;
  }

  window.shmorRegion = { get: get, set: set, detect: detect, resolve: resolve, info: function (c) { return R.list[c || get()]; } };
})();
