/* Create account page. */
(function () {
  var A = window.AC, LT = A.LT, el = A.el;
  var form = document.getElementById('rg_form'); if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var err = $('rg_err'), btn = $('rg_btn'), ts = A.turnstile($('ts')), invite = A.hashParam('i'), terms = '', aliasSel = null;
  LT.fillCountry($('rg_c'), $('rg_r'));
  A.wirePasswordToggle($('rg_show'), [$('rg_p'), $('rg_p2')]);
  LT.loadOptions().then(function (opts) {
    LT.renderChoices({ opts: opts, selServices: [], selInterests: [], servicesEl: $('rg_svc'), globeEl: $('rg_globe'), interestsEl: $('rg_int'), interestsWrap: $('rg_intwrap') });
  });
  function loadAliases() {
    var box = $('rg_aliases'); box.textContent = 'Loading…'; aliasSel = null;
    return A.fnPublic('alias_suggest', {}).then(function (r) {
      box.textContent = '';
      if (!r.ok) { box.appendChild(el('p', { 'class': 'err', text: A.say(r.error) })); return; }
      r.aliases.forEach(function (a, i) {
        var rb = el('input', { type: 'radio', name: 'alias', value: a.alias, id: 'al' + i });
        rb.addEventListener('change', function () { aliasSel = a; });
        box.appendChild(el('label', { 'class': 'chk', 'for': 'al' + i }, [rb, el('span', { text: ' ' + a.alias })]));
      });
    });
  }
  $('rg_more').addEventListener('click', function () { loadAliases(); });
  function closed() { $('rg_closed').hidden = false; btn.disabled = true; form.querySelectorAll('input,select,button').forEach(function (x) { if (x.id !== 'rg_btn') x.disabled = true; }); }
  A.settings().then(function (r) {
    if (!r.ok || !r.body || r.body.signup_open !== true) { closed(); return; }
    terms = r.body.terms_current; $('rg_terms_v').textContent = terms; loadAliases();
  });
  if (invite) {
    A.fnPublic('invite_peek', { invite: invite }).then(function (r) {
      if (r.ok && r.valid) { $('rg_e').value = r.email; $('rg_e').readOnly = true; $('rg_invite').hidden = false; $('rg_pwbox').hidden = false; $('rg_extra').hidden = false; $('rg_noextra').hidden = true; }
      else { invite = ''; $('rg_badinvite').hidden = false; }
    });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var email = $('rg_e').value.trim(), pw = $('rg_p').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = A.say('email'); return; }
    if (invite) {   // only an invited person chooses a password here; everyone else chooses theirs after opening the email link
      var hint = A.passwordHint(pw); if (hint) { err.textContent = A.say(hint); return; }
      if (pw !== $('rg_p2').value) { err.textContent = 'The two passwords are not the same.'; return; }
    }
    if (!aliasSel) { err.textContent = 'Please choose one of the aliases.'; return; }
    if (!$('rg_18').checked) { err.textContent = A.say('over18'); return; }
    if (!$('rg_agree').checked) { err.textContent = A.say('terms'); return; }
    if (!ts.token) { err.textContent = 'Please wait for the spam check to finish (a tick appears above the button).'; return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    var body = { email: email, alias: aliasSel, over18: true, terms: terms, turnstile: ts.token };
    // Only an invited person (whose invitation proves the mailbox) chooses a password and their other details here; everyone else does that after confirming.
    if (invite) { body.invite = invite; body.password = pw; body.country = $('rg_c').value || null; body.region = $('rg_r').value || null; body.services = LT.checked(form, 'svc'); body.interests = LT.checked(form, 'int'); }
    A.fnPublic('create_account', body).then(function (r) {
      if (r.ok) {
        $('rg_p').value = ''; $('rg_p2').value = '';
        form.hidden = true; $(r.state === 'active' ? 'rg_done_active' : 'rg_done').hidden = false; window.scrollTo(0, 0); return;
      }
      err.textContent = A.say(r.error); btn.disabled = false; btn.textContent = 'Create my account'; ts.reset();
      if (r.error === 'alias' || r.error === 'alias_taken') loadAliases();
    });
  });
})();
