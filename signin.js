/* Sign in page (password, then the authenticator code if the account has one). */
(function () {
  var A = window.AC, form = document.getElementById('si_form'); if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var err = $('si_err'), btn = $('si_btn'), ts = A.turnstile($('ts')), next = A.cleanNext(A.qs('next'));
  A.wirePasswordToggle($('si_show'), [$('si_p')]);
  var why = A.qs('why');
  if (why === 'pending') { $('si_note').textContent = 'This account has not been confirmed yet. Open the link in the email we sent you, or ask for a new one.'; $('si_note').hidden = false; }
  if (why === 'idle') { $('si_note').textContent = A.say('idle'); $('si_note').hidden = false; }
  if (why === 'suspended') { $('si_note').textContent = 'This account is not able to sign in right now. Write to feedback@lineagetracker.org if you think this is a mistake.'; $('si_note').hidden = false; }
  var GOT = { invalid_credentials: 'That email and password do not match. Check them and try again, or reset your password.', email_not_confirmed: 'unconfirmed', user_banned: 'This account is not able to sign in right now. Write to feedback@lineagetracker.org if you think this is a mistake.', over_request_rate_limit: A.say('slow_down'), captcha_failed: A.say('turnstile'), over_email_send_rate_limit: A.say('slow_down') };
  function finish() {
    A.whoAmI().then(function (w) {
      if (w.state === 'active') { location.replace(next); return; }
      var m = w.state === 'pending' ? 'This account has not been confirmed yet. Open the link in the email we sent you, or ask for a new one.' : w.state === 'suspended' ? GOT.user_banned : w.state === 'none' ? 'We could not find a member account for this login.' : A.say('network');
      A.signOut().then(function () { err.textContent = m; busy(false); ts.reset(); });
    });
  }
  function busy(b) { btn.disabled = b; btn.textContent = b ? 'Signing in…' : 'Sign in'; }
  function codeStep(factor) {
    form.hidden = true; var box = $('si_code_box'); box.hidden = false; $('si_code').focus();
    $('si_code_form').onsubmit = function (e) {
      e.preventDefault(); $('si_code_err').textContent = ''; var b = $('si_code_btn'); b.disabled = true;
      A.challengeVerify(factor.id, $('si_code').value).then(function (v) {
        if (v.ok) { finish(); return; }
        b.disabled = false; $('si_code_err').textContent = v.status === 429 ? A.say('slow_down') : 'That code did not work. Check the time on your device and try the next code.'; $('si_code').value = ''; $('si_code').focus();
      });
    };
    $('si_code_cancel').onclick = function () { A.signOut().then(function () { location.reload(); }); };
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = ''; $('si_unconf').hidden = true;
    var email = $('si_e').value.trim(), pw = $('si_p').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !pw) { err.textContent = 'Please enter your email and password.'; return; }
    if (A.cfg.TURNSTILE_SITE_KEY && !ts.token) { err.textContent = 'Please wait for the spam check to finish (a tick appears above the button).'; return; }
    busy(true);
    A.signIn(email, pw, ts.token, $('si_stay').checked).then(function (r) {
      if (!r.ok) {
        var code = (r.body && (r.body.error_code || r.body.code)) || '';
        if (r.status === 0) err.textContent = A.say('network');
        else if (GOT[code] === 'unconfirmed') $('si_unconf').hidden = false;
        else err.textContent = GOT[code] || (r.status === 400 ? GOT.invalid_credentials : A.say('server'));
        busy(false); ts.reset(); return;
      }
      $('si_p').value = '';
      A.user().then(function (u) { var f = A.verifiedFactor(u.body); if (f) codeStep(f); else finish(); });
    });
  });
})();
