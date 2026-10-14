/* Stay in touch: shared helpers for signup.html, confirm.html and manage.html.
   Nothing secret lives here. The Supabase "publishable" key is designed to be public; the people tables are locked
   so that key cannot read them. Only the server-side functions (join, confirm, manage) can touch them. */
window.LT = (function () {
  var cfg = {
    SUPABASE_URL: 'https://zlekqqzvkstdcrrupzfs.supabase.co',
    PUBLISHABLE_KEY: 'sb_publishable_rkMTn3vFh8y77G9Lj5peAA_pN1tS_Fs',
    // Paste your Cloudflare Turnstile SITE key between the quotes (it is public). While empty, the form says sign-up is not open yet.
    TURNSTILE_SITE_KEY: '0x4AAAAAAAFVX_SnEoyXnA85N'
  };
  var COUNTRIES = [['AU', 'Australia'], ['NZ', 'New Zealand'], ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['DE', 'Germany'], ['FR', 'France'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['ES', 'Spain'], ['PT', 'Portugal'], ['IT', 'Italy'], ['CH', 'Switzerland'], ['AT', 'Austria'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['IS', 'Iceland'], ['PL', 'Poland'], ['CZ', 'Czechia'], ['SK', 'Slovakia'], ['HU', 'Hungary'], ['RO', 'Romania'], ['BG', 'Bulgaria'], ['GR', 'Greece'], ['HR', 'Croatia'], ['SI', 'Slovenia'], ['RS', 'Serbia'], ['UA', 'Ukraine'], ['EE', 'Estonia'], ['LV', 'Latvia'], ['LT', 'Lithuania'], ['TR', 'Turkey'], ['IL', 'Israel'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'], ['EG', 'Egypt'], ['MA', 'Morocco'], ['KE', 'Kenya'], ['NG', 'Nigeria'], ['GH', 'Ghana'], ['ZA', 'South Africa'], ['ZW', 'Zimbabwe'], ['IN', 'India'], ['PK', 'Pakistan'], ['BD', 'Bangladesh'], ['LK', 'Sri Lanka'], ['NP', 'Nepal'], ['CN', 'China'], ['JP', 'Japan'], ['KR', 'South Korea'], ['TW', 'Taiwan'], ['HK', 'Hong Kong'], ['TH', 'Thailand'], ['VN', 'Vietnam'], ['MY', 'Malaysia'], ['SG', 'Singapore'], ['ID', 'Indonesia'], ['PH', 'Philippines'], ['FJ', 'Fiji'], ['PG', 'Papua New Guinea'], ['MX', 'Mexico'], ['GT', 'Guatemala'], ['CR', 'Costa Rica'], ['PA', 'Panama'], ['CU', 'Cuba'], ['JM', 'Jamaica'], ['CO', 'Colombia'], ['VE', 'Venezuela'], ['EC', 'Ecuador'], ['PE', 'Peru'], ['BO', 'Bolivia'], ['CL', 'Chile'], ['AR', 'Argentina'], ['UY', 'Uruguay'], ['PY', 'Paraguay'], ['BR', 'Brazil']];
  var REGIONS = {
    AU: [['NSW', 'New South Wales'], ['VIC', 'Victoria'], ['QLD', 'Queensland'], ['WA', 'Western Australia'], ['SA', 'South Australia'], ['TAS', 'Tasmania'], ['ACT', 'Australian Capital Territory'], ['NT', 'Northern Territory']],
    US: [['PACIFIC', 'Pacific'], ['MOUNTAIN', 'Mountain'], ['MIDWEST', 'Midwest'], ['SOUTH', 'South'], ['NORTHEAST', 'Northeast']]
  };
  var FALLBACK_SERVICES = [
    { key: 'app_versions', label: 'New app versions' },
    { key: 'community_open', label: 'The community pages opening' },
    { key: 'news', label: 'Occasional news (a few a year)' },
    { key: 'globe', label: 'Show me on the globe' }
  ];
  var GLOBE_TEXT = 'Optional: include my country and picks in anonymous totals on the community globe (no name or email is ever shown). I can change my mind any time.';
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'checked' || k === 'disabled') { e[k] = !!attrs[k]; } else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function rest(table, select, order) {
    var u = cfg.SUPABASE_URL + '/rest/v1/' + table + '?select=' + select + '&active=eq.true&order=' + order;
    return fetch(u, { headers: { apikey: cfg.PUBLISHABLE_KEY } }).then(function (r) { if (!r.ok) throw new Error('options ' + r.status); return r.json(); });
  }
  function fn(name, body) {
    return fetch(cfg.SUPABASE_URL + '/functions/v1/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.PUBLISHABLE_KEY }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'server' }; }).then(function (j) { j.status = r.status; return j; }); })
      .catch(function () { return { ok: false, error: 'network', status: 0 }; });
  }
  function loadOptions() {
    return Promise.all([
      rest('service_options', 'key,label,description,sort', 'sort').catch(function () { return FALLBACK_SERVICES; }),
      rest('interest_options', 'key,kind,grp,label,sort', 'sort').catch(function () { return []; })
    ]).then(function (a) { return { services: a[0], interests: a[1] }; });
  }
  function fillCountry(selC, selR, curC, curR) {
    selC.innerHTML = ''; selC.appendChild(el('option', { value: '', text: 'Prefer not to say' }));
    COUNTRIES.forEach(function (c) { selC.appendChild(el('option', { value: c[0], text: c[1] })); });
    function regions() {
      selR.innerHTML = ''; selR.appendChild(el('option', { value: '', text: 'Prefer not to say' }));
      (REGIONS[selC.value] || []).forEach(function (r) { selR.appendChild(el('option', { value: r[0], text: r[1] })); });
      selR.disabled = !(REGIONS[selC.value] || []).length;
    }
    selC.onchange = regions; selC.value = curC || ''; regions(); if (curR) selR.value = curR;
  }
  /* Draws the "Tell me about" tick boxes, the optional globe box and the pick-list into the given containers. */
  function renderChoices(o) {
    var svc = o.opts.services, selS = o.selServices;
    o.servicesEl.innerHTML = '';
    svc.filter(function (s) { return s.key !== 'globe'; }).forEach(function (s) {
      var cb = el('input', { type: 'checkbox', name: 'svc', value: s.key, checked: selS.indexOf(s.key) >= 0 });
      o.servicesEl.appendChild(el('label', { 'class': 'chk' }, [cb, el('span', { text: ' ' + s.label })]));
    });
    o.globeEl.innerHTML = '';
    if (svc.some(function (s) { return s.key === 'globe'; })) {
      var g = el('input', { type: 'checkbox', name: 'svc', value: 'globe', checked: selS.indexOf('globe') >= 0 });
      o.globeEl.appendChild(el('label', { 'class': 'chk' }, [g, el('span', { text: ' ' + GLOBE_TEXT })]));
    }
    o.interestsEl.innerHTML = '';
    var groups = [], seen = {};
    o.opts.interests.forEach(function (i) { var k = i.kind + '|' + i.grp; if (!seen[k]) { seen[k] = { grp: i.grp, items: [] }; groups.push(seen[k]); } seen[k].items.push(i); });
    groups.forEach(function (g) {
      var grid = el('div', { 'class': 'chkgrid' });
      g.items.forEach(function (i) {
        grid.appendChild(el('label', { 'class': 'chk' }, [el('input', { type: 'checkbox', name: 'int', value: i.key, checked: o.selInterests.indexOf(i.key) >= 0 }), el('span', { text: ' ' + i.label })]));
      });
      var d = el('details', {}, [el('summary', { text: g.grp }), grid]);
      if (grid.querySelector('input:checked')) d.open = true;
      o.interestsEl.appendChild(d);
    });
    o.interestsWrap.hidden = !groups.length;
  }
  function checked(form, name) { return [].slice.call(form.querySelectorAll('input[name=' + name + ']:checked')).map(function (x) { return x.value; }); }
  return { cfg: cfg, el: el, fn: fn, loadOptions: loadOptions, fillCountry: fillCountry, renderChoices: renderChoices, checked: checked };
})();
