/* Make it yours: builds a partner link for Lineage Tracker. Everything goes into the link; nothing is uploaded. */
(function () {
  var f = document.getElementById('pk'); if (!f) return;
  var LIB = '', LIBN = 0;
  function v(n) { var e = f.elements[n]; return e ? String(e.value || '').trim() : ''; }
  function fnv(s) { var h = 0x811c9dc5; for (var ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
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

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('err'); err.hidden = true;
    function bad(m) { err.textContent = m; err.hidden = false; err.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    var c = cfg();
    if (!c.n) return bad('Give your version a name.');
    if (c.l && !/^https:\/\//i.test(c.l)) return bad('The logo address must start with https://');
    if (c.u && !/^https:\/\//i.test(c.u)) return bad('Your website address must start with https://');
    if (c.c && !/^https:\/\//i.test(c.c)) return bad('The variety list address must start with https://');
    if (!document.getElementById('agree').checked) return bad('Please agree to the relabelling terms first.');
    var link = 'https://app.lineagetracker.org/#/partner?c=' + b64url(new TextEncoder().encode(JSON.stringify(c)));
    document.getElementById('link').value = link; document.getElementById('open').href = link;
    document.getElementById('pid').textContent = fnv((c.n || '') + '|' + (c.o || '') + '|' + (c.u || ''));
    var qrBox = document.getElementById('qr'), dl = document.getElementById('dlqr');
    try { qrBox.innerHTML = QR.svg(link, { dark: '#000' }); dl.hidden = false; }
    catch (x) { qrBox.innerHTML = '<p class="small muted">' + (LIBN ? 'Your link carries your variety list, so it is too long for a QR code. Share the link itself, or make a second link without the list for flyers.' : 'This link is too long for a QR code. Shorten the welcome message to get one.') + '</p>'; dl.hidden = true; }
    var out = document.getElementById('out'); out.hidden = false; out.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('copy').addEventListener('click', function () {
    var i = document.getElementById('link'), b = this; i.select();
    (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(function () { b.textContent = 'Copied'; }, function () { document.execCommand('copy'); b.textContent = 'Copied'; });
  });
  document.getElementById('dlqr').addEventListener('click', function () {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([document.getElementById('qr').innerHTML], { type: 'image/svg+xml' })); a.download = 'lineage-tracker-qr.svg'; a.click();
  });
})();
