(function () {
  var m = /(?:^|[#&])m=([0-9a-fA-F-]{36})(?:&|$)/.exec(location.hash || '');
  var bad = document.getElementById('mg_bad'), main = document.getElementById('mg_main'), gone = document.getElementById('mg_gone'), saved = document.getElementById('mg_saved'), err = document.getElementById('mg_err');
  if (!m) { bad.hidden = false; return; }
  var token = m[1].toLowerCase();
  Promise.all([LT.fn('manage', { action: 'get', token: token }), LT.loadOptions()]).then(function (a) {
    var r = a[0], opts = a[1];
    if (!r.ok) { bad.hidden = false; if (r.error === 'network' || r.error === 'server') bad.querySelector('p').textContent = 'We could not load your choices right now. Please try again in a few minutes.'; return; }
    var p = r.prefs || {};
    LT.fillCountry(document.getElementById('mg_c'), document.getElementById('mg_r'), p.country, p.region);
    LT.renderChoices({ opts: opts, selServices: p.services || [], selInterests: p.interests || [], servicesEl: document.getElementById('mg_svc'), globeEl: document.getElementById('mg_globe'), interestsEl: document.getElementById('mg_int'), interestsWrap: document.getElementById('mg_intwrap') });
    main.hidden = false;
  });
  var form = document.getElementById('mg_form');
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = ''; saved.hidden = true;
    var b = document.getElementById('mg_save'); b.disabled = true;
    LT.fn('manage', { action: 'save', token: token, country: document.getElementById('mg_c').value || null, region: document.getElementById('mg_r').value || null, interests: LT.checked(form, 'int'), services: LT.checked(form, 'svc') })
      .then(function (r) { b.disabled = false; if (r.ok) { saved.hidden = false; } else err.textContent = 'We could not save that. Please try again.'; });
  });
  document.getElementById('mg_unsub').addEventListener('click', function () {
    if (!confirm('Remove your email and all your choices from the list? This cannot be undone.')) return;
    LT.fn('manage', { action: 'unsubscribe', token: token }).then(function (r) {
      if (r.ok) { history.replaceState(null, '', location.pathname); main.hidden = true; gone.hidden = false; window.scrollTo(0, 0); } else err.textContent = 'We could not remove you just now. Please try again, or email feedback@lineagetracker.org.';
    });
  });
})();
