/* Put the member's LOCKED AI key into their own Google Drive or Dropbox, so the app can fetch it there.
   - Only the locked copy is ever written (the same one we keep: it cannot be read without the member's password).
   - Uses the SAME Google client ID and Dropbox app key as the app and tools (from this site's config.json), so the
     app sees the file: Drive's narrow "drive.file" permission, and Dropbox's own app folder.
   - Nothing is kept: the Google token lives in memory for this page only; the Dropbox token is revoked straight after use.
   - Before this works, lineagetracker.org must be added once in each developer console (see HANDOVER.md).
   window.KeyStore: ready(), drive(action, text), dropboxStart(action), dropboxPending(), dropboxFinish(text). action = 'put' | 'remove'. */
(function () {
  var CFG = { googleClientId: '', dropboxAppKey: '' }, loaded = null;
  var FILE = 'ai-key.ltkey', DRIVE = 'https://www.googleapis.com/drive/v3/files', DRIVE_UP = 'https://www.googleapis.com/upload/drive/v3/files';
  var DBX_API = 'https://api.dropboxapi.com/2/', DBX_CONTENT = 'https://content.dropboxapi.com/2/', DBX_TOKEN = 'https://api.dropboxapi.com/oauth2/token';
  var PK = 'lt_keystore_dbx', gTok = null, gExp = 0, gis = null, pending = null;
  function err(m) { return new Error(m); }
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }

  function ready() {
    if (!loaded) loaded = fetch('config.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) {
      ['googleClientId', 'dropboxAppKey'].forEach(function (k) { if (j && typeof j[k] === 'string' && j[k].trim() && !/PASTE/i.test(j[k])) CFG[k] = j[k].trim(); });
      return { drive: !!CFG.googleClientId, dropbox: !!CFG.dropboxAppKey };
    }, function () { return { drive: false, dropbox: false }; });
    return loaded;
  }

  /* ---------- Google Drive ---------- */
  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (gis) return gis;
    gis = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { if (window.google && google.accounts && google.accounts.oauth2) res(); else rej(err('Google sign-in did not load.')); };
      s.onerror = function () { gis = null; rej(err('Google sign-in could not load. Check your internet connection.')); };
      document.head.appendChild(s);
    });
    return gis;
  }
  /* Call from a button press (the sign-in opens a pop-up). Preload with preloadGoogle() so the pop-up is not blocked. */
  function gToken() {
    if (gTok && gExp > Date.now() + 60000) return Promise.resolve(gTok);
    return loadGis().then(function () {
      return new Promise(function (res, rej) {
        var c = google.accounts.oauth2.initTokenClient({
          client_id: CFG.googleClientId, scope: 'https://www.googleapis.com/auth/drive.file',
          callback: function (r) { if (r.error || !r.access_token) { rej(err('Google sign-in was cancelled.')); return; } gTok = r.access_token; gExp = Date.now() + (+r.expires_in || 3600) * 1000; res(gTok); },
          error_callback: function (e) { rej(err(e && e.type === 'popup_closed' ? 'Google sign-in was closed before finishing.' : 'Google sign-in could not open. Allow pop-ups for this site and try again.')); }
        });
        c.requestAccessToken({ prompt: '' });
      });
    });
  }
  function gApi(method, url, body, headers) {
    return fetch(url, { method: method, body: body, headers: Object.assign({ Authorization: 'Bearer ' + gTok }, headers || {}) }).then(function (r) {
      if (r.status === 401) { gTok = null; throw err('Your Google sign-in expired. Try again.'); }
      if (!r.ok) throw err('Google Drive returned an error (' + r.status + ').');
      return r.status === 204 ? null : r.json();
    }, function () { throw err('No connection to Google Drive.'); });
  }
  function gFind(q) { return gApi('GET', DRIVE + '?q=' + encodeURIComponent(q + ' and trashed = false') + '&spaces=drive&pageSize=10&fields=files(id)').then(function (j) { return (j && j.files) || []; }); }
  var role = function (r) { return "appProperties has { key='lineageRole' and value='" + r + "' }"; };
  /* The app's own sync folder ("Lineage Tracker sync"), found the same way the app finds it; made if missing. */
  function gRoot() {
    return gFind(role('root')).then(function (f) {
      if (f.length) return f[0].id;
      return gApi('POST', DRIVE + '?fields=id', JSON.stringify({ name: 'Lineage Tracker sync', mimeType: 'application/vnd.google-apps.folder', appProperties: { lineageRole: 'root' } }), { 'Content-Type': 'application/json' }).then(function (j) { return j.id; });
    });
  }
  function drive(action, text) {
    if (!CFG.googleClientId) return Promise.reject(err('Google Drive is not set up for this website yet.'));
    return gToken().then(function () { return gFind(role('aikey')); }).then(function (found) {
      if (action === 'remove') return Promise.all(found.map(function (f) { return gApi('DELETE', DRIVE + '/' + f.id); })).then(function () { return found.length; });
      return gRoot().then(function (root) {
        var id = found.length ? found[0].id : null, b = 'ltkey' + Math.random().toString(36).slice(2);
        var meta = id ? {} : { name: FILE, parents: [root], mimeType: 'text/plain', appProperties: { lineageRole: 'aikey' } };
        var body = new Blob(['--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + b + '\r\nContent-Type: text/plain\r\n\r\n' + text + '\r\n--' + b + '--']);
        return gApi(id ? 'PATCH' : 'POST', DRIVE_UP + (id ? '/' + id : '') + '?uploadType=multipart&fields=id', body, { 'Content-Type': 'multipart/related; boundary=' + b }).then(function () { return 1; });
      });
    });
  }

  /* ---------- Dropbox (sign-in leaves the page and comes back here) ---------- */
  function rand(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function b64u(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function redirect() { return location.origin + location.pathname; }
  function dropboxStart(action) {
    if (!CFG.dropboxAppKey) return Promise.reject(err('Dropbox is not set up for this website yet.'));
    var st = ss(); if (!st) return Promise.reject(err('This browser blocks the storage the Dropbox sign-in needs. Use the copy button instead.'));
    var verifier = rand(48), state = rand(16);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (d) {
      st.setItem(PK, JSON.stringify({ verifier: verifier, state: state, action: action === 'remove' ? 'remove' : 'put', at: Date.now() }));
      location.href = 'https://www.dropbox.com/oauth2/authorize?client_id=' + encodeURIComponent(CFG.dropboxAppKey) + '&response_type=code&code_challenge=' + b64u(new Uint8Array(d)) +
        '&code_challenge_method=S256&token_access_type=online&redirect_uri=' + encodeURIComponent(redirect()) + '&state=' + state;
    });
  }
  /* Runs as soon as this script loads: takes the Dropbox reply out of the address bar before anything else can see it. */
  (function capture() {
    var q = new URLSearchParams(location.search), code = q.get('code'), state = q.get('state');
    if (!code && !q.get('error')) return;
    var st = ss(), pk = null; try { pk = JSON.parse((st && st.getItem(PK)) || 'null'); } catch (e) { /* ignore */ }
    if (!pk) return;   // not ours: leave the address alone
    st.removeItem(PK);
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ }
    if (!code || pk.state !== state || Date.now() - pk.at > 15 * 60000) { pending = { action: pk.action, error: 'Dropbox sign-in did not finish. Please try again.' }; return; }
    pending = { action: pk.action, code: code, verifier: pk.verifier };
  })();
  function dropboxPending() { return pending; }
  function dropboxFinish(text) {
    var p = pending; pending = null;
    if (!p) return Promise.reject(err('Nothing to finish.'));
    if (p.error) return Promise.reject(err(p.error));
    var tok;
    return ready().then(function () {
      return fetch(DBX_TOKEN, { method: 'POST', body: new URLSearchParams({ code: p.code, grant_type: 'authorization_code', code_verifier: p.verifier, client_id: CFG.dropboxAppKey, redirect_uri: redirect() }) });
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.access_token) throw err('Dropbox sign-in did not finish. Please try again.'); tok = j.access_token; }); }, function (e) { throw e.message ? e : err('No connection to Dropbox.'); }).then(function () {
      var h = { Authorization: 'Bearer ' + tok };
      if (p.action === 'remove') return fetch(DBX_API + 'files/delete_v2', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, h), body: JSON.stringify({ path: '/' + FILE }) }).then(function (r) { if (!r.ok && r.status !== 409) throw err('Dropbox returned an error (' + r.status + ').'); return r.ok ? 1 : 0; });
      if (!text) throw err('No saved key to send.');
      return fetch(DBX_CONTENT + 'files/upload', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify({ path: '/' + FILE, mode: 'overwrite', mute: true }) }, h), body: new Blob([text]) }).then(function (r) { if (!r.ok) throw err('Dropbox returned an error (' + r.status + ').'); return 1; });
    }).then(function (n) {
      // the token is not needed again: hand it back to Dropbox
      return fetch(DBX_API + 'auth/token/revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + tok } }).then(function () { return { action: p.action, n: n }; }, function () { return { action: p.action, n: n }; });
    });
  }
  window.KeyStore = { ready: ready, preloadGoogle: function () { return CFG.googleClientId ? loadGis().catch(function () {}) : Promise.resolve(); }, drive: drive, dropboxStart: dropboxStart, dropboxPending: dropboxPending, dropboxFinish: dropboxFinish, action: function () { return pending && pending.action; } };
})();
