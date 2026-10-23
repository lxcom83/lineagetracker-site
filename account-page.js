/* Account page: details, choices, two-step sign-in, password, download my data, delete my account. */
(function () {
  var A = window.AC, LT = A.LT, el = A.el, $ = function (id) { return document.getElementById(id); };
  if (!$('ac_main')) return;
  function say(node, text, ok) { node.textContent = text; node.className = ok ? 'okmsg' : 'err'; }
  // Supabase sends the QR code as raw SVG text after 'data:image/svg+xml;utf-8,'. Unencoded, a '#' in it ends the address and the
  // picture breaks, so re-encode it (base64 or already-encoded addresses pass through unchanged).
  function qrSrc(q) {
    var m = /^data:image\/svg\+xml(;[^,]*)?,([\s\S]*)$/.exec(String(q));
    if (!m || /;base64/i.test(m[1] || '')) return q;
    var svg = m[2]; if (!/^\s*</.test(svg)) { try { svg = decodeURIComponent(svg); } catch (e) { return q; } }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
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
        var t = r.body.totp || {}, img = $('ac_mfa_qr'), src = '';
        // Draw the QR ourselves from the otpauth link (qr.js, the same encoder the partners page uses); Supabase's own picture is the fallback.
        if (t.uri && typeof QR !== 'undefined') { try { src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(QR.svg(t.uri, { dark: '#000' })); } catch (e) { src = ''; } }
        if (!src && t.qr_code) src = qrSrc(t.qr_code);
        img.hidden = !src; if (src) img.src = src;
        $('ac_mfa_secret').textContent = (r.body.totp && r.body.totp.secret) || '';
        $('ac_mfa_form').onsubmit = function (e) {
          e.preventDefault(); msg.textContent = ''; var b = $('ac_mfa_btn'); b.disabled = true;
          A.challengeVerify(r.body.id, $('ac_mfa_code').value).then(function (v) { b.disabled = false; $('ac_mfa_code').value = ''; if (v.ok) drawMfa(); else say(msg, 'That code did not work. Check the time on your device and try the next code.'); });
        };
      });
    }
    drawMfa();
    // AI helper key: locked with the password on this device, saved to the account (the tools read the same one)
    var KB = window.KeyBox, aiRem = null;
    function aiSync() { $('ac_ai_row').hidden = !$('ac_ai_prov').value; }
    $('ac_ai_prov').addEventListener('change', aiSync);
    function aiLoad() {
      A.rpc('member_ai_key_get').then(function (r) {
        aiRem = r.ok && r.body && r.body.blob ? r.body : null;
        $('ac_ai_state').textContent = !r.ok ? 'We could not check your saved key right now.' : aiRem ? 'A key is saved (' + (aiRem.provider === 'gemini' ? 'Gemini' : 'Claude') + '), locked with your password. To replace it, paste a new one below. To remove it, choose Off and press Save.' : 'No key saved.';
        if (aiRem) { $('ac_ai_prov').value = aiRem.provider; $('ac_ai_model').value = aiRem.model || ''; } aiSync();
        aiShow(); aiStoreReady();
      });
    }
    aiLoad();
    // the locked code: the same text the copy button gives and the storage file holds
    function aiCode() { return aiRem ? 'LT-AIKEY1:' + btoa(JSON.stringify({ p: aiRem.provider, m: String(aiRem.model || '').replace(/[^\x20-\x7e]/g, ''), b: aiRem.blob })) : ''; }
    // send the locked key to the member's own Drive or Dropbox (KeyStore, keystore.js); only shown once this website is set up for them
    var KS = window.KeyStore, ksDone = false, ksOn = false;
    // with no key saved, the block stays only so a copy sent earlier can still be removed
    function aiShow() {
      $('ac_ai_share').hidden = !aiRem && !ksOn;
      $('ac_ai_store').hidden = !aiRem || !ksOn; $('ac_ai_rm').hidden = !ksOn;
      $('ac_ai_copy').hidden = !aiRem; $('ac_ai_sendp').hidden = !aiRem; $('ac_ai_other').open = !aiRem;
    }
    function aiStoreReady() {
      if (!KS || ksDone) return; ksDone = true;
      KS.ready().then(function (c) {
        $('ac_ai_gd').hidden = $('ac_ai_gdrm').hidden = !c.drive; $('ac_ai_db').hidden = $('ac_ai_dbrm').hidden = !c.dropbox;
        ksOn = c.drive || c.dropbox; aiShow();
        if (c.drive) KS.preloadGoogle();
        if (KS.dropboxPending()) aiStoreFinish();
      });
    }
    function storeSay(t, ok) { say($('ac_ai_storemsg'), t, ok); }
    function storeDone(where, action, n) { storeSay(action === 'remove' ? (n ? 'Removed the locked key from your ' + where + '.' : 'There was no key in your ' + where + ' to remove.') : 'Sent. In the app, tap Get it from my Google Drive (or Dropbox) and type this account\'s password.', true); }
    function aiStoreFinish() {
      var act = KS.action(); if (act === 'put' && !aiRem) { storeSay('No key saved.'); KS.dropboxFinish('').catch(function () {}); return; }
      storeSay(act === 'remove' ? 'Removing it from your Dropbox…' : 'Sending it to your Dropbox…', true);
      KS.dropboxFinish(act === 'remove' ? '' : aiCode()).then(function (r) { storeDone('Dropbox', r.action, r.n); }, function (e) { storeSay(e.message); });
    }
    function aiDrive(action, btn) {
      if (action === 'put' && !aiRem) { storeSay('No key saved.'); return; }
      btn.disabled = true; storeSay(action === 'remove' ? 'Removing…' : 'Sending…', true);
      KS.drive(action, aiCode()).then(function (n) { btn.disabled = false; storeDone('Google Drive', action, n); }, function (e) { btn.disabled = false; storeSay(e.message); });
    }
    $('ac_ai_gd').addEventListener('click', function () { aiDrive('put', this); });
    $('ac_ai_gdrm').addEventListener('click', function () { aiDrive('remove', this); });
    $('ac_ai_db').addEventListener('click', function () { if (!aiRem) { storeSay('No key saved.'); return; } KS.dropboxStart('put').catch(function (e) { storeSay(e.message); }); });
    $('ac_ai_dbrm').addEventListener('click', function () { KS.dropboxStart('remove').catch(function (e) { storeSay(e.message); }); });
    $('ac_ai_copy').addEventListener('click', function () {
      var m = $('ac_ai_copymsg'); m.textContent = ''; if (!aiRem) { m.textContent = 'No key saved.'; return; }
      var code = aiCode();
      var ok = function () { m.textContent = 'Copied. Paste it into the app with your password.'; };
      var fail = function () { var t = document.createElement('textarea'); t.value = code; t.readOnly = true; t.rows = 3; t.style.width = '100%'; m.textContent = 'Select and copy this code:'; m.appendChild(t); t.focus(); t.select(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, fail); else fail();
    });
    $('ac_ai_form').addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('ac_ai_msg'); m.textContent = ''; var p = $('ac_ai_prov').value, b = $('ac_ai_btn');
      if (!p) { b.disabled = true; A.rpc('member_ai_key_delete').then(function (r) { b.disabled = false; say(m, r.ok ? 'Saved. No key is kept. If you sent it to your Drive or Dropbox, that locked copy is still there: remove it under Use it in the app, Other ways.' : A.say('server'), r.ok); if (r.ok) aiLoad(); }); return; }
      var k = $('ac_ai_key').value.trim(), pw = $('ac_ai_pw').value;
      if (!k) { say(m, 'Paste your key first, or choose Off.'); return; }
      if (!pw) { say(m, 'Type your password to lock the key.'); return; }
      b.disabled = true; say(m, 'Locking and saving…', true);
      // the password must be the real one, or the tools could never unlock the key: check it with the password-change check first
      A.fnAuthed('account', { action: 'password_check', current: pw }).then(function (c) {
        var cj = c.body || {};
        if (!(c.ok && cj.ok)) { b.disabled = false; say(m, A.say(cj.error || 'current_wrong')); return null; }
        return KB.lockSecret(k, pw).then(function (blob) { return A.rpc('member_ai_key_set', { p_provider: p, p_model: $('ac_ai_model').value.trim(), p_blob: blob }); }).then(function (r) {
          b.disabled = false; var ok = r.ok && r.body === true; say(m, ok ? 'Saved. Every LT tool can now use it (it asks for your password once per visit).' : A.say('server'), ok);
          if (ok) { $('ac_ai_key').value = ''; $('ac_ai_pw').value = ''; aiLoad(); }
        });
      });
    });
    // password
    A.wirePasswordToggle($('ac_pw_show'), [$('ac_pw_cur'), $('ac_pw_new'), $('ac_pw_new2')]);
    $('ac_pw').addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('ac_pw_msg'); m.textContent = '';
      var cur = $('ac_pw_cur').value, nw = $('ac_pw_new').value, hint = A.passwordHint(nw);
      if (!cur) { say(m, A.say('current_wrong')); return; }
      if (hint) { say(m, A.say(hint)); return; }
      if (nw !== $('ac_pw_new2').value) { say(m, 'The two new passwords are not the same.'); return; }
      var b = $('ac_pw_btn'); b.disabled = true;
      // a saved AI key is locked with the password: open it with the old one now, lock it again with the new one once the change goes through
      var keep = A.rpc('member_ai_key_get').then(function (g) { return g.ok && g.body && g.body.blob ? KB.openSecret(g.body.blob, cur).then(function (k) { return k === null ? null : { k: k, p: g.body.provider, mo: g.body.model || '' }; }) : null; }, function () { return null; });
      keep.then(function (kept) {
        return A.fnAuthed('account', { action: 'password_change', current: cur, password: nw }).then(function (r) {
          var j = r.body || {};
          if (!(r.ok && j.ok)) { b.disabled = false; say(m, A.say(j.error || (r.status === 0 ? 'network' : 'server'))); return; }
          var done = function (note) { b.disabled = false; $('ac_pw_cur').value = ''; $('ac_pw_new').value = ''; $('ac_pw_new2').value = ''; say(m, 'Password changed. You have been signed out on other devices.' + note, true); };
          if (!kept) { done(''); return; }
          KB.lockSecret(kept.k, nw).then(function (blob) { return A.rpc('member_ai_key_set', { p_provider: kept.p, p_model: kept.mo, p_blob: blob }); }).then(function (s) { done(s.ok && s.body === true ? ' Your AI key was locked again with the new password. If you sent it to your Drive or Dropbox, send it again so the app gets the new lock.' : ' Your AI key could not be locked again: paste it again in the AI helper box.'); }, function () { done(' Your AI key could not be locked again: paste it again in the AI helper box.'); });
        });
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
        return A.rpc('member_blog_export').then(function (bx) { var out = r.body; if (bx.ok && bx.body) out.blog = bx.body; return out; }, function () { return r.body; }).then(function (out) {
          // the saved AI key, still locked with the password (we cannot open it)
          return A.rpc('member_ai_key_get').then(function (g) { if (g.ok && g.body && g.body.blob) out.ai_key = { provider: g.body.provider, model: g.body.model, updated_at: g.body.updated_at, locked_key: g.body.blob }; return out; }, function () { return out; });
        })
          .then(function (out) { return A.rpc('member_tools_export').then(function (tx) { if (tx.ok && tx.body) out.tools = tx.body; return out; }, function () { return out; }); })
          .then(function (out) { return A.rpc('member_partners_export').then(function (px) { if (px.ok && px.body && px.body.length) out.partner_versions = px.body; return out; }, function () { return out; }); });
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
