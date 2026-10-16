/* Account page: details, choices, two-step sign-in, password, download my data, delete my account. */
(function () {
  var A = window.AC, LT = A.LT, el = A.el, $ = function (id) { return document.getElementById(id); };
  if (!$('ac_main')) return;
  function say(node, text, ok) { node.textContent = text; node.className = ok ? 'okmsg' : 'err'; }
  A.requireSignIn('account.html').then(function (w) {
    if (!w) return;
    if (w.state === 'error') { $('ac_load').textContent = A.say('network') + ' Reload the page to try again.'; return; }
    $('ac_load').hidden = true; $('ac_main').hidden = false; init(w.me);
  });
  function init(me) {
    $('ac_alias').textContent = me.alias; $('ac_level').textContent = A.LEVELS[me.level] || me.level; $('ac_email').textContent = me.email;
    try { $('ac_since').textContent = new Date(me.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { $('ac_since').textContent = ''; }
    if (me.role) { $('ac_staff').hidden = false; $('ac_staff_role').textContent = me.role === 'admin' ? 'administrator' : 'moderator'; }
    if (me.needs_terms) {
      $('ac_terms').hidden = false; $('ac_terms_v').textContent = me.terms_current;
      $('ac_terms_btn').addEventListener('click', function () {
        A.rpc('member_accept_terms', { p_version: me.terms_current }).then(function (r) { if (r.ok && r.body === true) $('ac_terms').hidden = true; else say($('ac_terms_err'), A.say('server')); });
      });
    }
    // LT tools box: only once a tool is open to members (or for staff, who can try it early)
    A.settings().then(function (r) { var t = r.ok && r.body && r.body.tools; if ((t && t.print) || me.role) $('ac_tools').hidden = false; });
    // choices
    LT.fillCountry($('ac_c'), $('ac_r'), me.country, me.region);
    LT.loadOptions().then(function (opts) {
      LT.renderChoices({ opts: opts, selServices: me.services, selInterests: me.interests, servicesEl: $('ac_svc'), globeEl: $('ac_globe'), interestsEl: $('ac_int'), interestsWrap: $('ac_intwrap') });
    });
    $('ac_prof').addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('ac_prof_msg'); m.textContent = ''; var b = $('ac_prof_btn'); b.disabled = true;
      A.rpc('member_update_profile', { p_country: $('ac_c').value || '', p_region: $('ac_r').value || '', p_services: LT.checked($('ac_prof'), 'svc'), p_interests: LT.checked($('ac_prof'), 'int') }).then(function (r) {
        b.disabled = false; say(m, r.ok && r.body === true ? 'Saved.' : A.say('server'), r.ok && r.body === true);
      });
    });
    // two-step sign-in
    function drawMfa() {
      var box = $('ac_mfa_state'); box.textContent = 'Checking…';
      A.user().then(function (u) {
        box.textContent = ''; var f = A.verifiedFactor(u.body); $('ac_mfa_setup').hidden = true;
        if (f) {
          box.appendChild(el('p', { text: 'Two-step sign-in is ON. Signing in asks for a code from your authenticator app.' }));
          var rm = el('button', { type: 'button', 'class': 'btn', text: 'Turn off two-step sign-in' });
          if (me.role) rm.disabled = true;
          rm.addEventListener('click', function () {
            if (!confirm('Turn off two-step sign-in?')) return;
            A.unenrol(f.id).then(function (r) { if (r.ok) drawMfa(); else box.appendChild(el('p', { 'class': 'err', text: 'We could not turn it off. Sign out, sign in again using your code, and try again.' })); });
          });
          box.appendChild(rm);
        } else {
          box.appendChild(el('p', { text: me.role ? 'Two-step sign-in is OFF. It is required before you can use the staff page.' : 'Two-step sign-in is OFF. It is optional, and a good idea: it protects your account even if your password leaks.' }));
          var on = el('button', { type: 'button', 'class': 'btn primary', text: 'Set up two-step sign-in' });
          on.addEventListener('click', startEnrol); box.appendChild(on);
        }
      });
    }
    function startEnrol() {
      var setup = $('ac_mfa_setup'), msg = $('ac_mfa_err'); msg.textContent = ''; setup.hidden = false;
      A.enrolStart().then(function (r) {
        if (!r.ok) { say(msg, 'We could not start the setup. Please try again in a moment.'); return; }
        var qr = r.body.totp && r.body.totp.qr_code; var img = $('ac_mfa_qr'); img.hidden = !qr; if (qr) img.src = qr;
        $('ac_mfa_secret').textContent = (r.body.totp && r.body.totp.secret) || '';
        $('ac_mfa_form').onsubmit = function (e) {
          e.preventDefault(); msg.textContent = ''; var b = $('ac_mfa_btn'); b.disabled = true;
          A.challengeVerify(r.body.id, $('ac_mfa_code').value).then(function (v) { b.disabled = false; $('ac_mfa_code').value = ''; if (v.ok) drawMfa(); else say(msg, 'That code did not work. Check the time on your device and try the next code.'); });
        };
      });
    }
    drawMfa();
    // password
    A.wirePasswordToggle($('ac_pw_show'), [$('ac_pw_cur'), $('ac_pw_new'), $('ac_pw_new2')]);
    $('ac_pw').addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('ac_pw_msg'); m.textContent = '';
      var cur = $('ac_pw_cur').value, nw = $('ac_pw_new').value, hint = A.passwordHint(nw);
      if (!cur) { say(m, A.say('current_wrong')); return; }
      if (hint) { say(m, A.say(hint)); return; }
      if (nw !== $('ac_pw_new2').value) { say(m, 'The two new passwords are not the same.'); return; }
      var b = $('ac_pw_btn'); b.disabled = true;
      A.fnAuthed('account', { action: 'password_change', current: cur, password: nw }).then(function (r) {
        b.disabled = false; var j = r.body || {};
        if (r.ok && j.ok) { $('ac_pw_cur').value = ''; $('ac_pw_new').value = ''; $('ac_pw_new2').value = ''; say(m, 'Password changed. You have been signed out on other devices.', true); }
        else say(m, A.say(j.error || (r.status === 0 ? 'network' : 'server')));
      });
    });
    // sign out
    $('ac_out').addEventListener('click', function () { A.signOut().then(function () { location.href = 'signin.html'; }); });
    $('ac_out_all').addEventListener('click', function () {
      if (!confirm('Sign out on every device, including this one?')) return;
      A.fnAuthed('account', { action: 'signout_all' }).then(function () { A.signOut().then(function () { location.href = 'signin.html'; }); });
    });
    // download
    $('ac_dl').addEventListener('click', function () {
      var m = $('ac_dl_msg'); m.textContent = '';
      A.rpc('member_export').then(function (r) {
        if (!r.ok || !r.body) { say(m, A.say('server')); return null; }
        // blog posts too, once the blog is installed (no blog yet = nothing to add)
        return A.rpc('member_blog_export').then(function (bx) { var out = r.body; if (bx.ok && bx.body) out.blog = bx.body; return out; }, function () { return r.body; })
          .then(function (out) { return A.rpc('member_tools_export').then(function (tx) { if (tx.ok && tx.body) out.tools = tx.body; return out; }, function () { return out; }); });
      }).then(function (data) {
        if (!data) return;
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'lineage-tracker-my-data.json'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      });
    });
    // delete
    $('ac_del').addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('ac_del_msg'); m.textContent = '';
      if ($('ac_del_word').value !== 'DELETE') { say(m, A.say('confirm')); return; }
      if (!$('ac_del_pw').value) { say(m, A.say('current_wrong')); return; }
      if (!confirm('Delete your account for good? This cannot be undone.')) return;
      var b = $('ac_del_btn'); b.disabled = true;
      A.fnAuthed('account', { action: 'delete', current: $('ac_del_pw').value, confirm: 'DELETE', also_waitlist: $('ac_del_wl').checked }).then(function (r) {
        b.disabled = false; var j = r.body || {};
        if (r.ok && j.ok) { A.setSession(null); $('ac_main').hidden = true; $('ac_gone').hidden = false; window.scrollTo(0, 0); }
        else say(m, A.say(j.error || (r.status === 0 ? 'network' : 'server')));
      });
    });
  }
})();
