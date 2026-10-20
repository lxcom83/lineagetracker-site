/* Member accounts: shared helpers for register, sign-in, reset, account and staff pages.
   Nothing secret lives here. The Supabase "publishable" key is public by design: the tables are locked, and every
   action goes through server functions that check who is asking. Needs waitlist.js (LT) loaded first.
   Passwords are only ever typed into the page and sent over HTTPS to Supabase Auth or our functions: they are never stored,
   logged or kept in the address bar. The sign-in token is kept in this browser TAB's session storage by default (gone when the tab
   closes), or in local storage only if the person ticks "keep me signed in" (see privacy page). Staff are always tab-only. */
/* These pages must not be shown inside another website's frame (a meta policy cannot forbid that, so we do it here). */
if (window.top !== window.self) { try { document.documentElement.style.display = 'none'; window.top.location = window.self.location.href; } catch (e) { /* ignore */ } }
window.AC = (function () {
  var LT = window.LT, cfg = LT.cfg, el = LT.el, KEY = 'lt_session', mem = null, inflight = null, where = '';
  var NEXT_OK = ['account.html', 'staff.html', 'write.html', 'blog.html', 'partners.html'];
  function now() { return Math.floor(Date.now() / 1000); }
  function ses() { try { return window.sessionStorage; } catch (e) { return null; } }
  function loc() { try { return window.localStorage; } catch (e) { return null; } }
  function read(st) { try { var j = st && st.getItem(KEY); if (j) { var o = JSON.parse(j); if (o && o.access_token) return o; } } catch (e) { /* ignore */ } return null; }
  /* Tab storage first, then the "keep me signed in" storage, then plain memory (if the browser blocks storage). */
  function getSession() {
    var s = read(ses()); if (s) { where = 'session'; return s; }
    s = read(loc()); if (s) { where = 'local'; return s; }
    where = ''; return mem;
  }
  /* persist: true = keep on this device, false = this tab only, undefined = wherever it already was (tab only if new). */
  function setSession(x, persist) {
    if (x) x = { access_token: x.access_token, refresh_token: x.refresh_token, expires_at: x.expires_at || (now() + (x.expires_in || 3600)) };
    if (x && persist === undefined) { getSession(); persist = where === 'local'; }
    mem = x;
    [ses(), loc()].forEach(function (st) { try { if (st) st.removeItem(KEY); } catch (e) { /* ignore */ } });
    where = '';
    if (x) { var st = persist ? loc() : ses(); try { if (st) { st.setItem(KEY, JSON.stringify(x)); where = persist ? 'local' : 'session'; } } catch (e) { /* ignore */ } }
  }
  /* Staff pages never use the "keep me signed in" storage: move the session into this tab only. */
  function keepInTab() { var s = getSession(); if (s && where === 'local') setSession(s, false); }
  function parse(r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); }
  function net(p) { return p.catch(function () { return { ok: false, status: 0, body: { error: 'network' } }; }); }
  function raw(path, method, body, token) {
    var h = { apikey: cfg.PUBLISHABLE_KEY, 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
    return net(fetch(cfg.SUPABASE_URL + path, { method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }).then(parse));
  }
  function refresh() {
    if (inflight) return inflight;
    var s = getSession(); if (!s || !s.refresh_token) return Promise.resolve(false);
    inflight = raw('/auth/v1/token?grant_type=refresh_token', 'POST', { refresh_token: s.refresh_token }).then(function (r) {
      inflight = null;
      if (r.ok && r.body.access_token) { setSession(r.body); return true; }
      if (r.status >= 400 && r.status < 500) setSession(null);
      return false;
    });
    return inflight;
  }
  function accessToken() {
    var s = getSession(); if (!s) return Promise.resolve(null);
    if (s.expires_at - now() > 60) return Promise.resolve(s.access_token);
    return refresh().then(function (ok) { return ok ? getSession().access_token : null; });
  }
  /* A call that needs the signed-in person. Tries a refresh once if the token was refused. */
  function authed(path, method, body) {
    function go(tok) { return raw(path, method, body, tok); }
    return accessToken().then(function (t) {
      if (!t) return { ok: false, status: 401, body: { error: 'signed_out' } };
      return go(t).then(function (r) {
        if (r.status !== 401) return r;
        return refresh().then(function (ok) { return ok ? go(getSession().access_token) : r; });
      });
    });
  }
  var rpc = function (name, args) { return authed('/rest/v1/rpc/' + name, 'POST', args || {}); };
  var fnAuthed = function (name, body) { return authed('/functions/v1/' + name, 'POST', body || {}); };
  var fnPublic = function (name, body) { return LT.fn(name, body); };
  var settings = function () { return raw('/rest/v1/rpc/public_settings', 'POST', {}); };

  /* The same password can be typed in different Unicode forms on different devices; the server and the page both use one form. */
  function np(s) { try { return String(s).normalize('NFKC'); } catch (e) { return s; } }
  function signIn(email, password, captcha, stay) {
    return raw('/auth/v1/token?grant_type=password', 'POST', { email: email, password: np(password), gotrue_meta_security: { captcha_token: captcha || '' } }).then(function (r) {
      if (r.ok && r.body.access_token) setSession(r.body, !!stay); return r;
    });
  }
  function signOut() {
    var s = getSession(); setSession(null);
    if (s) return raw('/auth/v1/logout?scope=local', 'POST', {}, s.access_token).then(function () { return true; });
    return Promise.resolve(true);
  }
  var user = function () { return authed('/auth/v1/user', 'GET'); };
  /* Who am I as a member?  Resolves {state:'out'|'pending'|'suspended'|'active'|'none'|'error', me} */
  function whoAmI() {
    return rpc('member_me').then(function (r) {
      if (r.status === 401) return { state: 'out' };
      if (!r.ok) return { state: 'error' };
      if (r.body === null) return { state: 'none' };
      if (r.body.status && r.body.status !== 'active') return { state: r.body.status };
      if (r.body.role) keepInTab();   // anyone with a staff role is tab-only on every page, never in the "keep me signed in" storage
      return { state: 'active', me: r.body };
    });
  }
  function requireSignIn(page) {
    if (!getSession()) { location.replace('signin.html?next=' + encodeURIComponent(page)); return Promise.resolve(null); }
    return whoAmI().then(function (w) {
      if (w.state === 'error') return w;
      if (w.state === 'out' || w.state === 'none' || w.state === 'pending' || w.state === 'suspended') {
        var why = w.state === 'out' ? '' : '&why=' + w.state;
        return signOut().then(function () { location.replace('signin.html?next=' + encodeURIComponent(page) + why); return null; });
      }
      return w;
    });
  }

  /* ---- two-step sign-in (authenticator app) ---- */
  function verifiedFactor(u) { var f = (u && u.factors) || []; for (var i = 0; i < f.length; i++) if (f[i].factor_type === 'totp' && f[i].status === 'verified') return f[i]; return null; }
  function enrolStart() {
    return user().then(function (u) {
      var stale = ((u.body && u.body.factors) || []).filter(function (f) { return f.status !== 'verified'; });
      return Promise.all(stale.map(function (f) { return authed('/auth/v1/factors/' + f.id, 'DELETE'); }));
    }).then(function () { return authed('/auth/v1/factors', 'POST', { factor_type: 'totp', friendly_name: 'Lineage Tracker ' + now(), issuer: 'Lineage Tracker' }); });
  }
  function challengeVerify(factorId, code) {
    return authed('/auth/v1/factors/' + factorId + '/challenge', 'POST', {}).then(function (c) {
      if (!c.ok) return c;
      return authed('/auth/v1/factors/' + factorId + '/verify', 'POST', { challenge_id: c.body.id, code: String(code).replace(/\s+/g, '') }).then(function (v) {
        if (v.ok && v.body.access_token) setSession(v.body); return v;
      });
    });
  }
  var unenrol = function (factorId) { return authed('/auth/v1/factors/' + factorId, 'DELETE'); };

  /* ---- Turnstile (spam check) ---- */
  var tsLoaded = false, tsQueue = [];
  function turnstile(box) {
    var h = { token: '', widget: null, reset: function () { h.token = ''; if (window.turnstile && h.widget !== null) window.turnstile.reset(h.widget); } };
    if (!cfg.TURNSTILE_SITE_KEY || !box) return h;
    function draw() {
      h.widget = window.turnstile.render(box, { sitekey: cfg.TURNSTILE_SITE_KEY, callback: function (t) { h.token = t; }, 'expired-callback': function () { h.token = ''; }, 'error-callback': function () { h.token = ''; } });
    }
    if (window.turnstile) draw();
    else {
      tsQueue.push(draw);
      if (!tsLoaded) {
        tsLoaded = true; window.ltTsReady = function () { tsQueue.splice(0).forEach(function (f) { f(); }); };
        var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=ltTsReady'; s.async = true; s.defer = true; document.head.appendChild(s);
      }
    }
    return h;
  }

  /* ---- words ---- */
  var MSG = {
    email: 'Please enter a valid email address.', over18: 'Please tick the box to confirm you are 18 or over.', terms: 'Please tick the box to agree to the terms.',
    turnstile: 'The spam check did not pass. Please wait for the tick to appear, then try again.', network: 'We could not reach the server. Check your connection and try again.',
    server: 'Something went wrong on our side. Please try again in a few minutes, or email feedback@lineagetracker.org.', slow_down: 'That was a few too many tries. Please wait a little and try again.',
    closed: 'Accounts are not open yet. Please check back soon.', terms_changed: 'The terms were updated while you were filling this in. Please reload the page and read them again.',
    alias: 'That alias offer has expired. Please choose from the new list.', alias_taken: 'Someone just took that alias. Please choose from the new list.',
    mail: 'We could not send the email just now. Please try again in a few minutes.', country: 'Please choose a country from the list.', region: 'Please choose a region from the list.',
    password_short: 'Your password needs at least 10 characters.', password_long: 'Your password is too long (the limit is 72 characters).',
    password_common: 'That password is too easy to guess. Try a few unrelated words, with spaces or dashes between them.', password_simple: 'That password is too simple. Try a few unrelated words, with spaces or dashes between them.',
    password_personal: 'Please do not use your email name or alias inside your password.', password_pwned: 'That password has appeared in a known data breach, so it is not safe to use. Please choose another.',
    password_same: 'Your new password must be different from the current one.', current_wrong: 'That is not your current password.', confirm: 'Please type DELETE in capitals to confirm.',
    bad_link: 'This link has already been used, or has expired.', invite_invalid: 'This invitation link has already been used, or has expired.', invite_email: 'This invitation is for a different email address.',
    not_active: 'This account cannot do that right now.', idle: 'You were signed out because the page was left alone for a while. Please sign in again.', staff_remove_role_first: 'Staff accounts cannot be deleted here. Ask the site owner to remove the staff role first.', signed_out: 'You have been signed out. Please sign in again.'
  };
  var say = function (code) { return MSG[code] || MSG.server; };
  /* Same first checks the server makes, so people get help before pressing the button. */
  function passwordHint(pw) {
    if ([].slice.call(pw).length < 10) return 'password_short';
    if (new TextEncoder().encode(pw).length > 72) return 'password_long';
    if (new Set(pw.toLowerCase().split('')).size <= 3) return 'password_simple';
    return null;
  }
  function cleanNext(n) { return NEXT_OK.indexOf(n) >= 0 ? n : 'account.html'; }
  function qs(name) { var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search || ''); if (!m) return ''; try { return decodeURIComponent(m[1]); } catch (e) { return ''; } }
  /* Reads a one-time link value from the address (#t=...) and removes it from the address bar and history at once, so it is not left lying around.
     Call it once and keep the value in a variable. */
  function hashParam(k) { var m = new RegExp('(?:^|[#&])' + k + '=([A-Za-z0-9_-]{20,100})(?:&|$)').exec(location.hash || ''); if (location.hash) clearTokenFromUrl(); return m ? m[1] : ''; }
  function wirePasswordToggle(btn, inputs) {
    btn.addEventListener('click', function () { var show = inputs[0].type === 'password'; inputs.forEach(function (i) { i.type = show ? 'text' : 'password'; }); btn.textContent = show ? 'Hide password' : 'Show password'; btn.setAttribute('aria-pressed', show ? 'true' : 'false'); });
  }
  function clearTokenFromUrl() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
  var LEVELS = { 'new': 'New', member: 'Member', trusted: 'Trusted', steward: 'Steward' };
  return { LT: LT, el: el, cfg: cfg, raw: raw, rpc: rpc, fnAuthed: fnAuthed, fnPublic: fnPublic, settings: settings, signIn: signIn, signOut: signOut, user: user, whoAmI: whoAmI,
    requireSignIn: requireSignIn, getSession: getSession, setSession: setSession, verifiedFactor: verifiedFactor, enrolStart: enrolStart, challengeVerify: challengeVerify, unenrol: unenrol,
    turnstile: turnstile, np: np, keepInTab: keepInTab, say: say, passwordHint: passwordHint, cleanNext: cleanNext, qs: qs, hashParam: hashParam, wirePasswordToggle: wirePasswordToggle, clearTokenFromUrl: clearTokenFromUrl, LEVELS: LEVELS, authed: authed, accessTokenMaybe: accessToken };
})();
