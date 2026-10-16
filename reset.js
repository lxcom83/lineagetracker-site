/* Forgot password: ask for a link, then choose a new password from the link. */
(function () {
  var A = window.AC, $ = function (id) { return document.getElementById(id); };
  if (!$('rs_req')) return;
  var token = A.hashParam('t'), ts = null;
  if (token) {
    $('rs_set').hidden = false; A.wirePasswordToggle($('rs_show'), [$('rs_p'), $('rs_p2')]);
    $('rs_set_form').addEventListener('submit', function (e) {
      e.preventDefault(); var err = $('rs_set_err'); err.textContent = '';
      var pw = $('rs_p').value, hint = A.passwordHint(pw);
      if (hint) { err.textContent = A.say(hint); return; }
      if (pw !== $('rs_p2').value) { err.textContent = 'The two passwords are not the same.'; return; }
      var b = $('rs_set_btn'); b.disabled = true;
      A.fnPublic('password_reset', { action: 'complete', token: token, password: pw }).then(function (r) {
        b.disabled = false;
        if (r.ok) { $('rs_p').value = ''; $('rs_p2').value = ''; A.clearTokenFromUrl(); A.setSession(null); $('rs_set').hidden = true; $('rs_ok').hidden = false; return; }
        if (r.error === 'bad_link') { $('rs_set').hidden = true; $('rs_bad').hidden = false; $('rs_req').hidden = false; ts = A.turnstile($('ts')); return; }
        err.textContent = A.say(r.error);
      });
    });
    return;
  }
  $('rs_req').hidden = false; ts = A.turnstile($('ts'));
  $('rs_req_form').addEventListener('submit', function (e) {
    e.preventDefault(); var err = $('rs_req_err'), em = $('rs_e').value.trim(); err.textContent = '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { err.textContent = A.say('email'); return; }
    if (!ts.token) { err.textContent = 'Please wait for the spam check to finish (a tick appears above the button).'; return; }
    var b = $('rs_req_btn'); b.disabled = true;
    A.fnPublic('password_reset', { action: 'request', email: em, turnstile: ts.token }).then(function (r) {
      b.disabled = false; ts.reset();
      if (r.ok) { $('rs_req_form').hidden = true; $('rs_req_done').hidden = false; } else err.textContent = A.say(r.error);
    });
  });
})();
