(function () {
  var m = /(?:^|[#&])t=([A-Za-z0-9_-]{43})(?:&|$)/.exec(location.hash || '');
  var ask = document.getElementById('cf_ask'), bad = document.getElementById('cf_bad'), ok = document.getElementById('cf_ok'), btn = document.getElementById('cf_btn'), msg = document.getElementById('cf_msg');
  if (!m) { bad.hidden = false; return; }
  ask.hidden = false;
  btn.addEventListener('click', function () {
    btn.disabled = true; btn.textContent = 'Confirming…'; msg.textContent = '';
    LT.fn('confirm', { token: m[1] }).then(function (r) {
      if (r.ok) {
        history.replaceState(null, '', location.pathname);
        ask.hidden = true; ok.hidden = false;
        if (r.manage) document.getElementById('cf_manage').href = 'manage.html#m=' + r.manage;
      } else if (r.error === 'invalid') { ask.hidden = true; bad.hidden = false; }
      else { msg.textContent = 'We could not reach the server. Please try again.'; btn.disabled = false; btn.textContent = 'Confirm my sign-up'; }
    });
  });
})();
