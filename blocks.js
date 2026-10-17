/* Lineage Tracker block engine: a document is a list of blocks (JSON), never HTML.
   LTBlocks.render(blocks, opts) builds what readers see, using text only (no HTML from members ever reaches the page).
   LTBlocks.editor(root, opts) is the drag-and-drop editor used by the blog, and later by the label and pedigree tools.
   Block types: h (heading), p (text), quote, ul / ol (lists), img (photo), gallery (2 to 4 photos), hr (line), video (YouTube link). */
window.LTBlocks = (function () {
  'use strict';
  var LINK_RE = /^https?:\/\/[^\s<>"']{3,490}$/i;
  var YT_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#].*)?$/;
  var LIMITS = { blocks: 150, p: 4000, quote: 2000, li: 600, items: 50, h: 120, caption: 200, alt: 200 };
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v === null || v === undefined || v === false) return;
      if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var uid = function () { return 'b' + Math.random().toString(36).slice(2, 10); };

  /* ---------- reading ---------- */
  function runsNode(runs, into) {
    (runs || []).forEach(function (r) {
      if (!r || typeof r.text !== 'string') return;
      var n = document.createTextNode(r.text);
      if (r.b) { var b = el('strong'); b.appendChild(n); n = b; }
      if (r.i) { var i = el('em'); i.appendChild(n); n = i; }
      if (r.href && LINK_RE.test(r.href)) { var a = el('a', { href: r.href, rel: 'nofollow ugc noopener noreferrer', target: '_blank' }); a.appendChild(n); n = a; }
      into.appendChild(n);
    });
    return into;
  }
  function figure(url, caption, alt, w, h) {
    var f = el('figure', { class: 'blk-fig' });
    if (url) {
      var im = el('img', { src: url, alt: alt || '', loading: 'lazy', width: w || null, height: h || null });
      im.onerror = function () { im.onerror = null; var m = el('div', { class: 'blk-missing', text: 'Photo not available' }); if (im.parentNode) im.parentNode.replaceChild(m, im); };
      f.appendChild(im);
    }
    else f.appendChild(el('div', { class: 'blk-missing', text: 'Photo not available' }));
    if (caption) f.appendChild(el('figcaption', { text: caption }));
    return f;
  }
  /* opts.image(id) -> { url, w, h } or null */
  function render(blocks, opts) {
    opts = opts || {}; var img = opts.image || function () { return null; };
    var frag = document.createDocumentFragment();
    (Array.isArray(blocks) ? blocks : []).forEach(function (b) {
      if (!b || typeof b !== 'object') return;
      switch (b.t) {
        case 'h': frag.appendChild(el('h2', { class: 'blk-h', text: b.text || '' })); break;
        case 'p': frag.appendChild(runsNode(b.runs, el('p', { class: 'blk-p' }))); break;
        case 'quote': { var q = el('blockquote', { class: 'blk-q' }); q.appendChild(runsNode(b.runs, el('p'))); if (b.cite) q.appendChild(el('cite', { text: b.cite })); frag.appendChild(q); break; }
        case 'ul': case 'ol': { var l = el(b.t, { class: 'blk-list' }); (b.items || []).forEach(function (it) { l.appendChild(runsNode(it, el('li'))); }); frag.appendChild(l); break; }
        case 'img': { var i = img(b.image) || {}; frag.appendChild(figure(i.url, b.caption, b.alt || b.caption, i.w, i.h)); break; }
        case 'gallery': { var g = el('div', { class: 'blk-gal n' + (b.images || []).length }); (b.images || []).forEach(function (x) { var i2 = img(x.image) || {}; g.appendChild(figure(i2.url, x.caption, x.caption, i2.w, i2.h)); }); frag.appendChild(g); break; }
        case 'hr': frag.appendChild(el('hr', { class: 'blk-hr' })); break;
        case 'video': {
          var id = b.id || ((YT_RE.exec(b.url || '') || [])[1]); if (!id) break;
          // Nothing from YouTube loads on our page: a plain link that opens the video there.
          var a = el('a', { class: 'blk-video', href: 'https://www.youtube.com/watch?v=' + id, target: '_blank', rel: 'nofollow noopener noreferrer' },
            [el('span', { class: 'blk-play', 'aria-hidden': 'true', text: '▶' }), el('span', { text: b.caption || 'Watch the video on YouTube' })]);
          frag.appendChild(a); break;
        }
      }
    });
    return frag;
  }
  function plainText(blocks) {
    var t = function (rs) { return (rs || []).map(function (r) { return r.text || ''; }).join(''); };
    return (blocks || []).map(function (b) { return b.t === 'h' ? b.text : b.t === 'p' || b.t === 'quote' ? t(b.runs) : b.t === 'ul' || b.t === 'ol' ? (b.items || []).map(t).join('\n') : b.caption || ''; }).filter(Boolean).join('\n\n');
  }

  /* ---------- rich text inside a block: bold, italic, links only ---------- */
  function domToRuns(node) {
    var out = [];
    (function walk(n, st) {
      if (n.nodeType === 3) { if (n.nodeValue) out.push({ text: n.nodeValue.replace(/ /g, ' '), b: st.b, i: st.i, href: st.href }); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName, s = { b: st.b, i: st.i, href: st.href };
      if (tag === 'B' || tag === 'STRONG') s.b = true;
      if (tag === 'I' || tag === 'EM') s.i = true;
      if (tag === 'SPAN' && n.style) { if (/bold|[6-9]00/.test(n.style.fontWeight)) s.b = true; if (n.style.fontStyle === 'italic') s.i = true; }
      if (tag === 'A') { var h = (n.getAttribute('href') || '').trim(); s.href = LINK_RE.test(h) ? h : undefined; }
      if (tag === 'BR') { out.push({ text: ' ' }); return; }
      if ((tag === 'DIV' || tag === 'P') && out.length) out.push({ text: ' ' });
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c, s);
    })(node, {});
    var merged = [];
    out.forEach(function (r) {
      var o = { text: r.text }; if (r.b) o.b = true; if (r.i) o.i = true; if (r.href) o.href = r.href;
      var last = merged[merged.length - 1];
      if (last && !!last.b === !!o.b && !!last.i === !!o.i && last.href === o.href) last.text += o.text; else merged.push(o);
    });
    if (merged.length) { merged[0].text = merged[0].text.replace(/^\s+/, ''); merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, ''); }
    return merged.filter(function (r) { return r.text; });
  }
  function runsLength(runs) { return (runs || []).reduce(function (n, r) { return n + r.text.length; }, 0); }
  function richField(runs, placeholder, max, onInput) {
    var d = el('div', { class: 'be-rich', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'data-ph': placeholder, spellcheck: 'true' });
    runsNode(runs, d);
    d.addEventListener('input', function () { onInput(domToRuns(d)); });
    // Paste as plain text only (no fonts, colours or hidden code from other sites).
    d.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = ((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\r/g, '');
      var room = max - runsLength(domToRuns(d)); if (room <= 0) return;
      document.execCommand('insertText', false, t.slice(0, room));
    });
    d.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'b' || e.key === 'i')) { e.preventDefault(); document.execCommand(e.key === 'b' ? 'bold' : 'italic'); onInput(domToRuns(d)); }
    });
    return d;
  }

  /* ---------- the editor ---------- */
  var KINDS = [
    ['p', 'Text', '¶'], ['h', 'Heading', 'H'], ['img', 'Photo', '▣'], ['gallery', '2 to 4 photos', '▦'], ['ul', 'List', '•'],
    ['ol', 'Numbered list', '1.'], ['quote', 'Quote', '❝'], ['video', 'YouTube video', '▶'], ['hr', 'Line', '—']];
  var NAMES = {}; KINDS.forEach(function (k) { NAMES[k[0]] = k[1]; });
  function fresh(t) {
    switch (t) {
      case 'h': return { t: 'h', text: '' };
      case 'p': return { t: 'p', runs: [] };
      case 'quote': return { t: 'quote', runs: [], cite: '' };
      case 'ul': case 'ol': return { t: t, items: [[]] };
      case 'img': return { t: 'img', image: null, caption: '', alt: '' };
      case 'gallery': return { t: 'gallery', images: [{ image: null, caption: '' }, { image: null, caption: '' }] };
      case 'video': return { t: 'video', url: '', caption: '' };
      default: return { t: 'hr' };
    }
  }
  /* opts: blocks, image(id) -> {url,w,h}, upload(file) -> Promise<{id,url,w,h}>, onChange(), say(msg) */
  function editor(root, opts) {
    opts = opts || {};
    var items = [], undo = null;
    var images = {};   // id -> {url,w,h} for photos uploaded in this session
    var imgOf = function (id) { return images[id] || (opts.image ? opts.image(id) : null); };
    var say = opts.say || function (m) { window.alert(m); };
    function changed() { if (opts.onChange) opts.onChange(); }
    function set(blocks) { items = (Array.isArray(blocks) ? blocks : []).map(function (b) { return { key: uid(), b: JSON.parse(JSON.stringify(b)) }; }); items.forEach(function (it) { if (it.b.t === 'video' && it.b.id && !it.b.url) it.b.url = 'https://youtu.be/' + it.b.id; }); draw(); }
    function get() {
      return items.map(function (it) { return it.b; }).filter(function (b) {
        if (b.t === 'p' || b.t === 'quote') return runsLength(b.runs) > 0;
        if (b.t === 'h') return b.text.trim().length > 0;
        if (b.t === 'ul' || b.t === 'ol') return b.items.some(function (x) { return runsLength(x) > 0; });
        if (b.t === 'img') return !!b.image;
        if (b.t === 'gallery') return b.images.filter(function (x) { return x.image; }).length >= 2;
        if (b.t === 'video') return YT_RE.test(b.url || '');
        return true;
      }).map(function (b) {
        if (b.t === 'ul' || b.t === 'ol') return { t: b.t, items: b.items.filter(function (x) { return runsLength(x) > 0; }) };
        if (b.t === 'gallery') return { t: 'gallery', images: b.images.filter(function (x) { return x.image; }) };
        if (b.t === 'video') return { t: 'video', url: b.url.trim(), caption: b.caption || '' };
        return b;
      });
    }
    function insert(at, t) {
      if (items.length >= LIMITS.blocks) { say('A post can have at most ' + LIMITS.blocks + ' blocks.'); return; }
      items.splice(at, 0, { key: uid(), b: fresh(t) }); draw(); changed();
      var n = root.querySelector('[data-key="' + items[at].key + '"] .be-rich, [data-key="' + items[at].key + '"] input'); if (n) n.focus();
      if (t === 'img') { var pick = root.querySelector('[data-key="' + items[at].key + '"] input[type=file]'); if (pick) pick.click(); }
    }
    function move(i, to) { if (to < 0 || to >= items.length || to === i) return; var it = items.splice(i, 1)[0]; items.splice(to, 0, it); draw(); changed(); var h = root.querySelector('[data-key="' + it.key + '"] .be-handle'); if (h) h.focus(); }
    function remove(i) {
      undo = { at: i, it: items[i] }; items.splice(i, 1); draw(); changed();
      var bar = el('div', { class: 'be-undo', role: 'status' }, ['Block removed. ', el('button', { type: 'button', class: 'linkish', text: 'Undo' })]);
      bar.querySelector('button').onclick = function () { if (!undo) return; items.splice(undo.at, 0, undo.it); undo = null; draw(); changed(); };
      root.appendChild(bar); setTimeout(function () { if (bar.parentNode) bar.remove(); }, 8000);
    }
    function palette(at) {
      var p = el('div', { class: 'be-pal', role: 'group', 'aria-label': 'Add a block' });
      KINDS.forEach(function (k) {
        var b = el('button', { type: 'button', class: 'be-pk' }, [el('span', { class: 'be-pi', 'aria-hidden': 'true', text: k[2] }), el('span', { text: k[1] })]);
        b.onclick = function () { insert(at, k[0]); }; p.appendChild(b);
      });
      return p;
    }
    function adder(at) {
      var wrap = el('div', { class: 'be-add' });
      var btn = el('button', { type: 'button', class: 'be-plus', 'aria-label': 'Add a block here', title: 'Add a block here', text: '+' });
      btn.onclick = function () { var open = wrap.querySelector('.be-pal'); root.querySelectorAll('.be-pal').forEach(function (x) { x.remove(); }); if (!open) wrap.appendChild(palette(at)); };
      wrap.appendChild(btn); return wrap;
    }
    function photoPicker(cur, onPicked, label) {
      var box = el('div', { class: 'be-photo' });
      var input = el('input', { type: 'file', accept: 'image/*', hidden: true });
      var i = cur ? imgOf(cur) : null;
      if (i && i.url) box.appendChild(el('img', { src: i.url, alt: '' }));
      var b = el('button', { type: 'button', class: 'btn', text: cur ? 'Change photo' : (label || 'Choose a photo') });
      b.onclick = function () { input.click(); };
      input.onchange = function () {
        var f = input.files && input.files[0]; if (!f) return;
        if (!opts.upload) return;
        b.disabled = true; b.textContent = 'Uploading…';
        opts.upload(f).then(function (r) { images[r.id] = r; onPicked(r.id); }, function (e) { say(e && e.message ? e.message : 'That photo could not be added.'); b.disabled = false; b.textContent = cur ? 'Change photo' : (label || 'Choose a photo'); });
      };
      box.appendChild(b); box.appendChild(input); return box;
    }
    function field(label, value, max, on, multi) {
      var w = el('label', { class: 'be-fld' }, [el('span', { text: label })]);
      var inp = multi ? el('textarea', { rows: 2, maxlength: max }) : el('input', { type: 'text', maxlength: max });
      inp.value = value || ''; inp.addEventListener('input', function () { on(inp.value); changed(); });
      w.appendChild(inp); return w;
    }
    function body(it) {
      var b = it.b, box = el('div', { class: 'be-body' });
      switch (b.t) {
        case 'h': { var h = el('input', { type: 'text', class: 'be-h', maxlength: LIMITS.h, placeholder: 'Heading', 'aria-label': 'Heading' }); h.value = b.text; h.oninput = function () { b.text = h.value; changed(); }; box.appendChild(h); break; }
        case 'p': box.appendChild(richField(b.runs, 'Write here…', LIMITS.p, function (r) { b.runs = r; changed(); })); break;
        case 'quote':
          box.appendChild(richField(b.runs, 'The quote…', LIMITS.quote, function (r) { b.runs = r; changed(); }));
          box.appendChild(field('Who said it (optional)', b.cite, 120, function (v) { b.cite = v; })); break;
        case 'ul': case 'ol': {
          var list = el(b.t, { class: 'be-list' });
          b.items.forEach(function (runs, n) {
            var li = el('li'); var r = richField(runs, 'List item', LIMITS.li, function (x) { b.items[n] = x; changed(); });
            r.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (b.items.length >= LIMITS.items) return; b.items.splice(n + 1, 0, []); draw(); changed(); var nx = root.querySelectorAll('[data-key="' + it.key + '"] .be-rich')[n + 1]; if (nx) nx.focus(); }
              if (e.key === 'Backspace' && !r.textContent && b.items.length > 1) { e.preventDefault(); b.items.splice(n, 1); draw(); changed(); var pv = root.querySelectorAll('[data-key="' + it.key + '"] .be-rich')[Math.max(0, n - 1)]; if (pv) pv.focus(); }
            });
            li.appendChild(r); list.appendChild(li);
          });
          box.appendChild(list); box.appendChild(el('p', { class: 'small muted', text: 'Press Enter for a new item.' })); break;
        }
        case 'img':
          box.appendChild(photoPicker(b.image, function (id) { b.image = id; draw(); changed(); }));
          box.appendChild(field('Caption (optional)', b.caption, LIMITS.caption, function (v) { b.caption = v; }));
          box.appendChild(field('Describe the photo for people who cannot see it', b.alt, LIMITS.alt, function (v) { b.alt = v; })); break;
        case 'gallery': {
          var g = el('div', { class: 'be-gal' });
          b.images.forEach(function (x, n) {
            var cell = el('div', { class: 'be-gcell' });
            cell.appendChild(photoPicker(x.image, function (id) { x.image = id; draw(); changed(); }, 'Photo ' + (n + 1)));
            cell.appendChild(field('Caption', x.caption, 120, function (v) { x.caption = v; }));
            if (b.images.length > 2) { var rm = el('button', { type: 'button', class: 'linkish', text: 'Remove this photo' }); rm.onclick = function () { b.images.splice(n, 1); draw(); changed(); }; cell.appendChild(rm); }
            g.appendChild(cell);
          });
          box.appendChild(g);
          if (b.images.length < 4) { var more = el('button', { type: 'button', class: 'btn', text: 'Add another photo' }); more.onclick = function () { b.images.push({ image: null, caption: '' }); draw(); changed(); }; box.appendChild(more); }
          break;
        }
        case 'video': {
          var f = field('YouTube link', b.url, 200, function (v) { b.url = v; msg.textContent = !v || YT_RE.test(v.trim()) ? '' : 'That does not look like a YouTube link.'; });
          var msg = el('p', { class: 'err small', role: 'alert' });
          box.appendChild(f); box.appendChild(msg); box.appendChild(field('Caption (optional)', b.caption, LIMITS.caption, function (v) { b.caption = v; }));
          box.appendChild(el('p', { class: 'small muted', text: 'Readers see a link that opens the video on YouTube. Nothing from YouTube loads on our page.' })); break;
        }
        default: box.appendChild(el('hr'));
      }
      return box;
    }
    function draw() {
      var focusKey = document.activeElement && document.activeElement.closest && document.activeElement.closest('.be-block') ? document.activeElement.closest('.be-block').getAttribute('data-key') : null;
      root.textContent = '';
      root.classList.add('be');
      items.forEach(function (it, i) {
        root.appendChild(adder(i));
        var blk = el('section', { class: 'be-block t-' + it.b.t, 'data-key': it.key, 'aria-label': NAMES[it.b.t] });
        var bar = el('div', { class: 'be-bar' });
        var handle = el('button', { type: 'button', class: 'be-handle', 'aria-label': 'Drag to move, or use the arrow keys', title: 'Drag to move', text: '⠿' });
        handle.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); } });
        drag(handle, blk, i);
        var up = el('button', { type: 'button', class: 'be-mini', 'aria-label': 'Move up', title: 'Move up', text: '↑', disabled: i === 0 }); up.onclick = function () { move(i, i - 1); };
        var dn = el('button', { type: 'button', class: 'be-mini', 'aria-label': 'Move down', title: 'Move down', text: '↓', disabled: i === items.length - 1 }); dn.onclick = function () { move(i, i + 1); };
        var del = el('button', { type: 'button', class: 'be-mini be-del', 'aria-label': 'Remove this block', title: 'Remove', text: '✕' }); del.onclick = function () { remove(i); };
        bar.appendChild(handle); bar.appendChild(el('span', { class: 'be-name', text: NAMES[it.b.t] }));
        if (it.b.t === 'p' || it.b.t === 'quote' || it.b.t === 'ul' || it.b.t === 'ol') bar.appendChild(fmtBar(blk));
        bar.appendChild(up); bar.appendChild(dn); bar.appendChild(del);
        blk.appendChild(bar); blk.appendChild(body(it));
        root.appendChild(blk);
      });
      var end = adder(items.length); end.classList.add('be-end');
      if (!items.length) end.appendChild(palette(0)); else end.querySelector('.be-plus').textContent = '+ Add a block';
      root.appendChild(end);
      if (focusKey) { var f = root.querySelector('[data-key="' + focusKey + '"] .be-handle'); if (f && document.activeElement === document.body) f.focus(); }
    }
    function fmtBar(blk) {
      var w = el('span', { class: 'be-fmt' });
      [['bold', 'B', 'Bold'], ['italic', 'I', 'Italic'], ['link', '🔗', 'Link']].forEach(function (x) {
        var b = el('button', { type: 'button', class: 'be-mini fmt-' + x[0], 'aria-label': x[2], title: x[2], text: x[1] });
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });   // keep the text selection
        b.onclick = function () {
          var sel = window.getSelection(); var rich = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode).closest('.be-rich');
          if (!rich || !blk.contains(rich)) { say('Select some text in this block first.'); return; }
          if (x[0] === 'link') {
            if (sel.isCollapsed) { say('Select the words you want to turn into a link first.'); return; }
            var url = window.prompt('Link address (starting with https://). Leave empty to remove the link.', 'https://');
            if (url === null) return;
            url = url.trim();
            if (!url || url === 'https://') document.execCommand('unlink');
            else if (!LINK_RE.test(url)) { say('Links must start with https:// or http://'); return; }
            else document.execCommand('createLink', false, url);
          } else document.execCommand(x[0]);
          rich.dispatchEvent(new Event('input'));
        };
        w.appendChild(b);
      });
      return w;
    }
    // Drag a block by its handle (mouse, pen or finger).  A ghost line shows where it will land.
    function drag(handle, blk, from) {
      handle.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        var startY = e.clientY, moved = false, target = from, line = null;
        handle.setPointerCapture(e.pointerId);
        function blocks() { return Array.prototype.slice.call(root.querySelectorAll('.be-block')); }
        function onMove(ev) {
          if (!moved && Math.abs(ev.clientY - startY) < 6) return;
          moved = true; blk.classList.add('dragging'); blk.style.transform = 'translateY(' + (ev.clientY - startY) + 'px)';
          var bs = blocks(); target = bs.length;
          for (var k = 0; k < bs.length; k++) { var r = bs[k].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { target = k; break; } }
          if (!line) { line = el('div', { class: 'be-dropline' }); }
          var ref = bs[target]; if (ref) root.insertBefore(line, ref); else root.insertBefore(line, root.querySelector('.be-end'));
          var vh = window.innerHeight; if (ev.clientY < 60) window.scrollBy(0, -12); else if (ev.clientY > vh - 60) window.scrollBy(0, 12);
        }
        function onUp() {
          handle.removeEventListener('pointermove', onMove); handle.removeEventListener('pointerup', onUp); handle.removeEventListener('pointercancel', onUp);
          blk.classList.remove('dragging'); blk.style.transform = ''; if (line) line.remove();
          if (moved) { var to = target > from ? target - 1 : target; move(from, to); }
        }
        handle.addEventListener('pointermove', onMove); handle.addEventListener('pointerup', onUp); handle.addEventListener('pointercancel', onUp);
      });
    }
    set(opts.blocks || []);
    return { get: get, set: set, addImage: function (r) { images[r.id] = r; }, images: function () { return images; } };
  }

  /* ---------- photos: shrink and re-encode in the browser (this also removes location and camera data) ---------- */
  function preparePhoto(file, maxSide) {
    maxSide = maxSide || 1600;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || 'image/')) { reject(new Error('Please choose a photo.')); return; }
      if (file.size > 40 * 1024 * 1024) { reject(new Error('That photo is too large.')); return; }
      var done = function (src) {
        var w = src.width, h = src.height, s = Math.min(1, maxSide / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height);
        var q = 0.85;
        (function attempt() {
          c.toBlob(function (blob) {
            if (!blob) { reject(new Error('That photo could not be read.')); return; }
            if (blob.size > 1900000 && q > 0.5) { q -= 0.1; attempt(); return; }
            resolve({ blob: blob, w: c.width, h: c.height });
          }, 'image/jpeg', q);
        })();
      };
      if (window.createImageBitmap) {
        createImageBitmap(file, { imageOrientation: 'from-image' }).then(done, function () { viaImg(); });
      } else viaImg();
      function viaImg() {
        var url = URL.createObjectURL(file), im = new Image();
        im.onload = function () { URL.revokeObjectURL(url); done(im); };
        im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('This kind of photo cannot be read here. Try a JPEG, or take a screenshot of it.')); };
        im.src = url;
      }
    });
  }
  function blobToBase64(blob) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(blob); });
  }
  return { render: render, editor: editor, plainText: plainText, preparePhoto: preparePhoto, blobToBase64: blobToBase64, domToRuns: domToRuns, YT_RE: YT_RE, LINK_RE: LINK_RE };
})();
