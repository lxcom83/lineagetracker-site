/* Make it yours: members make a partner version of Lineage Tracker here.  It needs a free website account.  A new version waits for staff
   approval; approval signs the link on the server, and the app checks the signature on the device.  Nothing about the people who use a
   version is sent here. */
(function () {
  var f = document.getElementById('pk'); if (!f) return;
  var A = window.AC, el = A.el, $ = function (id) { return document.getElementById(id); }, editing = null;
  var LIB = '', LIBN = 0;
  function v(n) { var e = f.elements[n]; return e ? String(e.value || '').trim() : ''; }
  function fnv0(s) { var h = 0x811c9dc5; for (var ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function b64url(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function cfg() {
    var h = [].slice.call(f.querySelectorAll('input[name=h]:checked')).map(function (x) { return x.value; });
    var c = { v: 1, n: v('n'), o: v('o'), l: v('l'), p: v('p'), a: v('a'), w: v('w'), u: v('u'), k: v('k'), m: v('m'), h: h, c: v('c'), L: LIB };
    Object.keys(c).forEach(function (k) { if (c[k] === '' || (Array.isArray(c[k]) && !c[k].length)) delete c[k]; });
    return c;
  }
  function prev() {
    var c = cfg();
    var name = document.getElementById('pvName'); name.textContent = c.n || 'Your app name'; name.style.color = c.p || '#1F3557';
    document.getElementById('pvWelcome').textContent = c.w || '';
    document.getElementById('pvBtn').style.background = c.a || '#D9915F';
    var m = document.getElementById('pvMark'); m.innerHTML = '';
    var img = document.createElement('img'); img.alt = ''; img.src = c.l || 'favicon.svg'; img.onerror = function () { img.src = 'favicon.svg'; }; m.appendChild(img);
  }
  f.addEventListener('input', prev); f.addEventListener('change', prev); prev();

  function parseCSV(t) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }
  function fromCSV(t) {
    var rows = parseCSV(t); if (rows.length < 2) return [];
    var hd = rows[0].map(function (x) { return x.trim().toLowerCase(); });
    function col(names) { for (var i = 0; i < hd.length; i++) if (names.indexOf(hd[i]) >= 0) return i; return -1; }
    var cn = col(['name', 'variety', 'variety name', 'cultivar', 'breed']), cs = col(['species', 'latin name', 'botanical name', 'scientific name']),
      cg = col(['group', 'type', 'crop', 'category']), cd = col(['description', 'notes', 'details']), co = col(['source', 'origin', 'supplier', 'from']), ch = col(['f1', 'hybrid', 'f1 hybrid']);
    if (cn < 0) cn = 0;
    return rows.slice(1).map(function (r) {
      var g = function (i) { return i >= 0 && r[i] ? r[i].trim() : ''; };
      return { name: g(cn), kind: 'plant', group: g(cg), species: g(cs), hybrid: /^(y|yes|true|1|f1)$/i.test(g(ch)), source: g(co), description: g(cd).slice(0, 500) };
    }).filter(function (x) { return x.name; });
  }
  async function pack(list) {
    var data = { app: 'lineage', format: 'friendly', version: 1, varieties: list };
    var bytes = new TextEncoder().encode(JSON.stringify(data));
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  document.getElementById('libFile').addEventListener('change', async function () {
    var info = document.getElementById('libInfo'), file = this.files[0];
    LIB = ''; LIBN = 0; if (!file) { info.textContent = ''; return; }
    try {
      var t = await file.text(), list = [];
      if (/\.json$/i.test(file.name)) {
        var d = JSON.parse(t);
        list = (d.varieties || []).map(function (x) { return { name: String(x.name || '').trim(), kind: x.kind || 'plant', group: x.group || '', species: x.species || '', speciesConfirmed: !!x.speciesConfirmed, hybrid: !!x.hybrid, source: x.source || '', description: String(x.description || '').slice(0, 500) }; }).filter(function (x) { return x.name; });
      } else list = fromCSV(t);
      if (!list.length) { info.textContent = 'No varieties found in that file. Check it has a Name column.'; return; }
      var packed = await pack(list);
      if (packed.length > 60000) { info.textContent = 'That list is too large to pack into a link (' + list.length + ' varieties). Host it on your website instead, using the option below.'; return; }
      LIB = packed; LIBN = list.length;
      info.textContent = list.length + ' varieties ready. They will be packed into your link.';
    } catch (e) { info.textContent = 'That file could not be read. Save the spreadsheet as CSV and try again.'; }
  });


  var ERR = { partners_closed: 'Making new versions is not open yet.', need_name: 'Give your version a name.', too_big: 'That is too large. Use a smaller variety list.', too_many: 'You can have up to 5 versions at a time. Withdraw one first.',
    weekly_limit: 'You can make up to 10 a week. Please try again in a few days.', not_editable: 'A live version cannot be edited. Make a new one instead.', not_approved: 'That version is not live.', partners_off: 'Partner versions are paused for now.',
    not_found: 'That version no longer exists.', slow_down: 'Too many changes in a short time. Please wait a moment.', bad_request: 'Something in the form could not be used.' };
  var STATUS = { pending: 'Waiting for review', changes: 'Changes asked for', rejected: 'Not accepted', approved: 'Live', disabled: 'Switched off' };
  var REASONS = { impersonation: 'It looks like it speaks for an organisation that has not asked for it.', selling: 'It reads as an advert.', contact_details: 'Please take out phone numbers, email or home addresses.',
    offensive: 'Some of the wording is not suitable.', not_clear: 'It is not clear what the version is for.', logo_problem: 'The logo does not load or is not suitable.', link_problem: 'A web address in it does not work.',
    misuse: 'It was reported or misused.', expired: 'It has expired.', other: 'See the note from the reviewer.' };
  var msg = function (j) { return ERR[j.error] || A.say(j.error); };
  var call = function (body) { return A.fnAuthed('partners', body).then(function (r) { var j = r.body || {}; return j.ok ? j : { ok: false, error: j.error || (r.status === 0 ? 'network' : 'server') }; }); };
  var fmt = function (t) { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  function showErr(m) { var e = $('err'); e.textContent = m; e.hidden = false; e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  function fill(c) {
    ['n', 'o', 'l', 'w', 'u', 'k', 'm', 'c'].forEach(function (k) { if (f.elements[k]) f.elements[k].value = c[k] || (k === 'k' ? 'plants' : ''); });
    if (f.elements.p) f.elements.p.value = c.p || '#1F3557'; if (f.elements.a) f.elements.a.value = c.a || '#D9915F';
    [].slice.call(f.querySelectorAll('input[name=h]')).forEach(function (x) { x.checked = (c.h || []).indexOf(x.value) >= 0; });
    LIB = c.L || ''; $('libInfo').textContent = LIB ? 'The variety list you sent before is kept. Choose a file to replace it.' : ''; prev();
  }
  function reset() { editing = null; f.reset(); LIB = ''; LIBN = 0; $('libInfo').textContent = ''; $('agree').checked = false; $('pk_title').textContent = 'Build your version'; $('pk_cancel').hidden = true; prev(); }
  $('pk_cancel').addEventListener('click', reset);

  f.addEventListener('submit', function (e) {
    e.preventDefault(); $('err').hidden = true;
    var c = cfg();
    if (!c.n) return showErr('Give your version a name.');
    if (c.l && !/^https:\/\//i.test(c.l)) return showErr('The logo address must start with https://');
    if (c.u && !/^https:\/\//i.test(c.u)) return showErr('Your website address must start with https://');
    if (c.c && !/^https:\/\//i.test(c.c)) return showErr('The variety list address must start with https://');
    if (!$('agree').checked) return showErr('Please agree to the relabelling terms first.');
    var b = $('pk_send'); b.disabled = true;
    call({ action: 'save', id: editing, cfg: c }).then(function (j) {
      b.disabled = false;
      if (!j.ok) return showErr(msg(j));
      reset(); $('pk_sent').hidden = false; $('pk_sent').scrollIntoView({ behavior: 'smooth' }); loadMine();
    });
  });

  /* ---------- your versions ---------- */
  function linkBox(it) {
    var box = el('div', { 'class': 'linkbox' }), inp = el('input', { readonly: 'readonly', value: it.link, 'aria-label': 'Your link' });
    var cp = el('button', { 'class': 'btn primary', type: 'button', text: 'Copy link' });
    cp.addEventListener('click', function () { inp.select(); (navigator.clipboard ? navigator.clipboard.writeText(inp.value) : Promise.reject()).then(function () { cp.textContent = 'Copied'; }, function () { document.execCommand('copy'); cp.textContent = 'Copied'; }); });
    var op = el('a', { 'class': 'btn', href: it.link, target: '_blank', rel: 'noopener', text: 'Open it' });
    var wrap = el('div', {}, [box, el('div', { 'class': 'actions' }, [cp, op])]); box.appendChild(inp);
    var q = el('div', { 'class': 'qrbox' }); try { q.innerHTML = QR.svg(it.link, { dark: '#000' }); var dl = el('button', { 'class': 'btn', type: 'button', text: 'Download QR code' }); dl.onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([q.innerHTML], { type: 'image/svg+xml' })); a.download = 'lineage-tracker-qr.svg'; a.click(); }; wrap.lastChild.appendChild(dl); wrap.appendChild(q); } catch (x) { wrap.appendChild(el('p', { 'class': 'small muted', text: 'Your link carries your variety list, so it is too long for a QR code. Share the link itself.' })); }
    return wrap;
  }
  function loadMine() {
    var box = $('pk_mine'); box.textContent = 'Loading…';
    call({ action: 'mine' }).then(function (j) {
      box.textContent = '';
      if (!j.ok) { box.appendChild(el('p', { 'class': 'err', text: msg(j) })); return; }
      $('pk_closed').hidden = j.open; f.hidden = !j.open; if (!j.open) $('pk_buildhead').hidden = true; else $('pk_buildhead').hidden = false;
      $('pk_off').hidden = j.live;
      if (!j.items.length) { box.appendChild(el('p', { 'class': 'muted', text: 'You have not made one yet.' })); return; }
      j.items.forEach(function (it) {
        var chip = el('span', { 'class': 'chip' + (it.status === 'approved' ? ' ok' : it.status === 'changes' || it.status === 'rejected' || it.status === 'disabled' ? ' warn' : ''), text: STATUS[it.status] || it.status });
        var card = el('div', { 'class': 'notice' }, [el('p', {}, [el('b', { text: it.name + ' ' }), chip]), el('p', { 'class': 'small muted', text: 'Made ' + fmt(it.created_at) + (it.exp && it.status === 'approved' ? ' · link good until ' + fmt(it.exp) : '') })]);
        if (it.reason && (it.status === 'changes' || it.status === 'rejected' || it.status === 'disabled')) {
          var rb = el('div', { 'class': 'notice warn small' }, [el('b', { text: 'From the reviewer: ' }), document.createTextNode(REASONS[it.reason] || '')]); if (it.note) rb.appendChild(el('p', { text: it.note })); card.appendChild(rb);
        }
        var acts = el('div', { 'class': 'actions tight' });
        if (it.status === 'approved' && it.link) {
          card.appendChild(el('p', { text: 'Share this with your members, on your website, in newsletters or on flyers.' })); card.appendChild(linkBox(it));
          var rn = el('button', { 'class': 'btn', type: 'button', text: 'Renew for another 12 months' });
          rn.onclick = function () { rn.disabled = true; call({ action: 'renew', id: it.id }).then(function (r) { if (!r.ok) { rn.disabled = false; return showErr(msg(r)); } loadMine(); }); };
          acts.appendChild(rn);
          card.appendChild(el('p', { 'class': 'small muted', text: 'When you renew, the link changes. Share the new link: people using the old one go back to plain Lineage Tracker when it runs out, and keep all their records.' }));
        }
        if (['pending', 'changes', 'rejected'].indexOf(it.status) >= 0) {
          var ed = el('button', { 'class': 'btn primary', type: 'button', text: it.status === 'pending' ? 'Change it' : 'Change it and send again' });
          ed.onclick = function () { call({ action: 'get', id: it.id }).then(function (r) { if (!r.ok) return showErr(msg(r)); var c = {}; try { c = JSON.parse(r.partner.cfg); } catch (x) { /* empty */ } editing = it.id; fill(c); $('pk_title').textContent = 'Change your version'; $('pk_cancel').hidden = false; $('pk_build').scrollIntoView({ behavior: 'smooth' }); }); };
          acts.appendChild(ed);
        }
        var wd = el('button', { 'class': 'btn danger', type: 'button', text: it.status === 'approved' ? 'Switch it off for good' : 'Delete it' });
        wd.onclick = function () { if (!confirm(it.status === 'approved' ? 'Switch this version off for good? People using it go back to plain Lineage Tracker, and keep their records.' : 'Delete this version?')) return; call({ action: 'withdraw', id: it.id }).then(function (r) { if (!r.ok) return showErr(msg(r)); loadMine(); }); };
        acts.appendChild(wd); card.appendChild(acts); box.appendChild(card);
      });
    });
  }

  /* ---------- sign-in gate ---------- */
  if (!A.getSession()) { $('pk_gate').hidden = false; f.hidden = true; $('pk_buildhead').hidden = true; $('pk_account').hidden = true; return; }
  A.whoAmI().then(function (w) {
    if (w.state !== 'active') { $('pk_gate').hidden = false; f.hidden = true; $('pk_buildhead').hidden = true; $('pk_account').hidden = true; return; }
    $('pk_account').hidden = false; loadMine();
  });
})();
