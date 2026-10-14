(function () {
  var form = document.getElementById('suf'); if (!form) return;
  var err = document.getElementById('su_err'), btn = document.getElementById('su_btn'), tsBox = document.getElementById('ts');
  var tsToken = '', tsWidget = null;
  LT.fillCountry(document.getElementById('su_c'), document.getElementById('su_r'));
  LT.loadOptions().then(function (opts) {
    LT.renderChoices({ opts: opts, selServices: ['app_versions', 'community_open'], selInterests: [], servicesEl: document.getElementById('su_svc'), globeEl: document.getElementById('su_globe'), interestsEl: document.getElementById('su_int'), interestsWrap: document.getElementById('su_intwrap') });
  });
  function showNotOpen() { document.getElementById('su_notopen').hidden = false; btn.disabled = true; }
  if (!LT.cfg.TURNSTILE_SITE_KEY) showNotOpen();
  else {
    window.ltTsReady = function () {
      tsWidget = turnstile.render(tsBox, { sitekey: LT.cfg.TURNSTILE_SITE_KEY, callback: function (t) { tsToken = t; }, 'expired-callback': function () { tsToken = ''; }, 'error-callback': function () { tsToken = ''; } });
    };
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=ltTsReady'; s.async = true; s.defer = true; document.head.appendChild(s);
  }
  var MSG = {
    email: 'Please enter a valid email address.', consent: 'Please tick the box to confirm you are 18 or over and agree.',
    services: 'Please tick at least one thing you want to hear about (the globe box on its own is not enough).',
    turnstile: 'The spam check did not pass. Please try again.', network: 'We could not reach the server. Check your connection and try again.',
    server: 'Something went wrong on our side. Please try again in a few minutes, or email feedback@lineagetracker.org.'
  };
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var email = document.getElementById('su_e').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = MSG.email; return; }
    if (!document.getElementById('su_ok').checked) { err.textContent = MSG.consent; return; }
    var svcs = LT.checked(form, 'svc');
    if (!svcs.some(function (x) { return x !== 'globe'; })) { err.textContent = MSG.services; return; }
    if (!tsToken) { err.textContent = 'Please wait for the spam check to finish (a tick appears above the button).'; return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    LT.fn('join', { email: email, country: document.getElementById('su_c').value || null, region: document.getElementById('su_r').value || null, interests: LT.checked(form, 'int'), services: svcs, over18: true, consent: true, turnstile: tsToken })
      .then(function (r) {
        if (r.ok) { form.hidden = true; document.getElementById('su_done').hidden = false; window.scrollTo(0, 0); return; }
        err.textContent = MSG[r.error] || MSG.server; btn.disabled = false; btn.textContent = 'Send me a confirmation email';
        if (window.turnstile && tsWidget !== null) { turnstile.reset(tsWidget); tsToken = ''; }
      });
  });
})();
