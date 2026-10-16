/* Confirm an account from the emailed link, or ask for a new link. */
(function () {
  var A = window.AC, $ = function (id) { return document.getElementById(id); };
  if (!$('cf_ask')) return;
  var token = A.hashParam('t'), ts = null, terms = '';
  A.settings().then(function (r) { if (r.ok && r.body && r.body.terms_current) { terms = r.body.terms_current; $('cf_terms_v').textContent = terms; } });
  function showResend(msg) {
    $('cf_ask').hidden = true; $('cf_bad_msg').textContent = msg || ''; $('cf_resend').hidden = false;
    if (!ts) ts = A.turnstile($('ts'));
  }
  if (A.qs('resend') === '1' || !token) showResend('');
  else $('cf_ask').hidden = false;
  A.wirePasswordToggle($('cf_show'), [$('cf_p'), $('cf_p2')]);
  $('cf_form').addEventListener('submit', function (e) {
    e.preventDefault(); var m = $('cf_msg'); m.textContent = '';
    var pw = $('cf_p').value, hint = A.passwordHint(pw);
    if (hint) { m.textContent = A.say(hint); return; }
    if (pw !== $('cf_p2').value) { m.textContent = 'The two passwords are not the same.'; return; }
    if (!$('cf_18').checked) { m.textContent = A.say('over18'); return; }
    if (!$('cf_agree').checked || !terms) { m.textContent = A.say('terms'); return; }
    var b = $('cf_btn'); b.disabled = true;
    A.fnPublic('account_confirm', { action: 'confirm', token: token, password: pw, over18: true, terms: terms }).then(function (r) {
      if (r.ok) { $('cf_p').value = ''; $('cf_p2').value = ''; $('cf_ask').hidden = true; $('cf_ok').hidden = false; return; }
      b.disabled = false;
      if (r.error === 'bad_link') showResend('This link has already been used, or has expired. If you have not confirmed yet, ask for a new link below. If you already did, you can sign in.');
      else m.textContent = A.say(r.error);
    });
  });
  $('cf_resend_form').addEventListener('submit', function (e) {
    e.preventDefault(); var em = $('cf_e').value.trim(), err = $('cf_err'); err.textContent = '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { err.textContent = A.say('email'); return; }
    if (!ts.token) { err.textContent = 'Please wait for the spam check to finish (a tick appears above the button).'; return; }
    var b = $('cf_resend_btn'); b.disabled = true;
    A.fnPublic('account_confirm', { action: 'resend', email: em, turnstile: ts.token }).then(function (r) {
      b.disabled = false; ts.reset();
      if (r.ok) { $('cf_resend_form').hidden = true; $('cf_resend_done').hidden = false; } else err.textContent = A.say(r.error);
    });
  });
})();
