/* Public blog pages: the list (blog.html) and one post (post.html).  Only approved posts ever come back from the server.
   Everything a member wrote is put on the page as text (LTBlocks.render), never as HTML. */
(function () {
  var A = window.AC, B = window.LTBlocks, el = A.el, cfg = A.cfg, $ = function (id) { return document.getElementById(id); };
  var LEVELS = A.LEVELS || {};
  var pubUrl = function (path) { return path ? cfg.SUPABASE_URL + '/storage/v1/object/public/blog-public/' + path.split('/').map(encodeURIComponent).join('/') : null; };
  var fmt = function (t) { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
  // Signed-in readers send their sign-in token so the server can say whether they liked a post; everyone else reads anonymously.
  function readRpc(name, args) {
    return A.accessTokenMaybe().then(function (tok) {
      return A.raw('/rest/v1/rpc/' + name, 'POST', args, tok || undefined).then(function (r) {
        return r.status === 401 && tok ? A.raw('/rest/v1/rpc/' + name, 'POST', args) : r;   // a stale sign-in must not stop anyone reading
      });
    }, function () { return A.raw('/rest/v1/rpc/' + name, 'POST', args); });
  }
  var kindsMap = {};
  function kindsLoad() {
    return A.raw('/rest/v1/rpc/blog_public_kinds', 'POST', {}).then(function (r) { (r.ok && Array.isArray(r.body) ? r.body : []).forEach(function (k) { kindsMap[k.key] = k.label; }); return r.ok ? r.body : []; });
  }
  function byline(p) {
    var w = el('p', { 'class': 'blog-by' }, [document.createTextNode('By ')]);
    if (p.byline_is_alias) w.appendChild(el('a', { href: 'blog.html?author=' + encodeURIComponent(p.byline), text: p.byline })); else w.appendChild(document.createTextNode(p.byline));
    if (p.level) w.appendChild(el('span', { 'class': 'chip lvl', text: LEVELS[p.level] || p.level }));
    w.appendChild(document.createTextNode(' · ' + fmt(p.published_at)));
    return w;
  }

  /* ---------- blog.html ---------- */
  if ($('bl_list')) {
    try { localStorage.setItem('ltBlogSeen', String(Date.now())); } catch (e) { /* optional */ }
    var state = { kind: A.qs('kind'), topic: A.qs('topic'), author: A.qs('author'), q: A.qs('q'), offset: 0 };
    var draw = function (reset) {
      if (reset) { state.offset = 0; $('bl_list').textContent = ''; }
      $('bl_more').hidden = true; $('bl_msg').textContent = 'Loading…';
      readRpc('blog_public_list', { p_kind: state.kind || '', p_interest: state.topic || '', p_author: state.author || '', p_q: state.q || '', p_offset: state.offset, p_limit: 12 }).then(function (r) {
        $('bl_msg').textContent = '';
        if (r.status === 404) r = { ok: true, body: { open: false } };   // the blog is not installed yet: same as closed
        if (!r.ok) { $('bl_msg').textContent = A.say(r.status === 0 ? 'network' : 'server'); return; }
        var j = r.body || {};
        if (j.open === false) { $('bl_closed').hidden = false; $('bl_tools').hidden = true; return; }
        if (!j.rows.length && !state.offset) { $('bl_msg').textContent = state.kind || state.topic || state.author || state.q ? 'No posts match. Try fewer filters.' : 'No posts yet. Be the first to write one.'; }
        j.rows.forEach(function (p) {
          var href = 'post.html?p=' + encodeURIComponent(p.slug);
          var card = el('article', { 'class': 'bl-card' });
          if (p.cover) card.appendChild(el('a', { href: href, 'class': 'bl-cov', tabindex: '-1', 'aria-hidden': 'true' }, [(function () { var im = el('img', { src: pubUrl(p.cover), alt: '', loading: 'lazy' }); im.onerror = function () { var a = im.parentNode; if (a && a.parentNode) a.parentNode.removeChild(a); }; return im; })()]));
          var body = el('div', { 'class': 'bl-cb' });
          body.appendChild(el('h2', {}, [el('a', { href: href, text: p.title })]));
          body.appendChild(byline(p));
          if (p.excerpt) body.appendChild(el('p', { 'class': 'bl-ex', text: p.excerpt + (p.excerpt.length >= 240 ? '…' : '') }));
          var meta = el('p', { 'class': 'small muted' });
          (p.kinds || []).forEach(function (k) { meta.appendChild(el('a', { 'class': 'chip', href: 'blog.html?kind=' + encodeURIComponent(k), text: kindsMap[k] || k })); });
          if (p.likes) meta.appendChild(document.createTextNode(' ♥ ' + p.likes));
          body.appendChild(meta); card.appendChild(body);
          $('bl_list').appendChild(card);
        });
        state.offset += j.rows.length;
        $('bl_more').hidden = state.offset >= j.total;
        $('bl_count').textContent = j.total + ' post' + (j.total === 1 ? '' : 's');
      });
    };
    var sync = function () {
      var p = []; ['kind', 'topic', 'author', 'q'].forEach(function (k) { if (state[k]) p.push(k + '=' + encodeURIComponent(state[k])); });
      try { history.replaceState(null, '', 'blog.html' + (p.length ? '?' + p.join('&') : '')); } catch (e) { /* ignore */ }
      $('bl_author_box').hidden = !state.author; $('bl_author').textContent = state.author || '';
      draw(true);
    };
    kindsLoad().then(function (ks) {
      var s = $('bl_kind'); s.appendChild(el('option', { value: '', text: 'All kinds' }));
      (ks || []).forEach(function (k) { s.appendChild(el('option', { value: k.key, text: k.label })); }); s.value = state.kind || '';
    }).then(function () { return A.LT.loadOptions(); }).then(function (o) {
      var s = $('bl_topic'); s.appendChild(el('option', { value: '', text: 'Any plant or animal' }));
      (o.interests || []).forEach(function (x) { s.appendChild(el('option', { value: x.key, text: x.label })); }); s.value = state.topic || '';
    }).catch(function () {}).then(function () { $('bl_q').value = state.q || ''; sync(); });
    $('bl_kind').onchange = function () { state.kind = this.value; sync(); };
    $('bl_topic').onchange = function () { state.topic = this.value; sync(); };
    $('bl_search').onsubmit = function (e) { e.preventDefault(); state.q = $('bl_q').value.trim().slice(0, 100); sync(); };
    // find an author: suggestions come from aliases that already appear as a byline on a public post
    var whoTimer = null;
    $('bl_who').addEventListener('input', function () {
      var v = this.value.replace(/[^A-Za-z0-9]/g, ''); clearTimeout(whoTimer); $('bl_who_msg').textContent = '';
      if (v.length < 2) { $('bl_who_list').textContent = ''; return; }
      whoTimer = setTimeout(function () {
        readRpc('blog_public_authors', { p_prefix: v }).then(function (r) {
          var box = $('bl_who_list'); box.textContent = '';
          (r.ok && Array.isArray(r.body) ? r.body : []).forEach(function (a) { box.appendChild(el('option', { value: a })); });
        });
      }, 250);
    });
    $('bl_find').onsubmit = function (e) {
      e.preventDefault(); var v = $('bl_who').value.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 30);
      if (v.length < 2) { $('bl_who_msg').textContent = 'Type at least two letters of an alias.'; return; }
      readRpc('blog_public_authors', { p_prefix: v }).then(function (r) {
        var list = r.ok && Array.isArray(r.body) ? r.body : [];
        var exact = list.filter(function (a) { return a.toLowerCase() === v.toLowerCase(); })[0] || (list.length === 1 ? list[0] : '');
        if (!exact) { $('bl_who_msg').textContent = list.length ? 'Pick one of the suggestions: ' + list.join(', ') : 'No author with that alias has a post here.'; return; }
        state.author = exact; $('bl_who').value = ''; $('bl_who_list').textContent = ''; sync();
      });
    };
    $('bl_author_clear').onclick = function () { state.author = ''; sync(); };
    $('bl_more').onclick = function () { draw(false); };
  }

  /* ---------- post.html ---------- */
  if ($('po_post')) {
    var slug = A.qs('p'), share = A.qs('s');
    if (share) { A.raw('/rest/v1/rpc/blog_share_visit', 'POST', { p_code: share.slice(0, 20) }); try { history.replaceState(null, '', 'post.html?p=' + encodeURIComponent(slug)); } catch (e) { /* ignore */ } }
    if (!/^[a-z0-9-]{3,90}$/.test(slug)) { $('po_msg').textContent = 'That post could not be found.'; return; }
    kindsLoad().then(function () { return readRpc('blog_public_get', { p_slug: slug }); }).then(function (r) {
      if (r.status === 404) { $('po_msg').textContent = 'The blog is not open yet.'; return; }
      if (!r.ok) { $('po_msg').textContent = A.say(r.status === 0 ? 'network' : 'server'); return; }
      var p = r.body;
      if (p && p.open === false) { $('po_msg').textContent = 'The blog is not open yet.'; return; }
      if (!p) { $('po_msg').textContent = 'That post could not be found. It may have been taken down by its author.'; return; }
      $('po_msg').textContent = ''; $('po_msg').hidden = true;
      // one rough page-load count per post per tab: the post address only, nothing about the reader is sent or kept
      try { var vk = 'ltview:' + slug; if (!sessionStorage.getItem(vk)) { sessionStorage.setItem(vk, '1'); readRpc('blog_view', { p_slug: slug }); } } catch (e) { /* counting is optional */ }
      document.title = p.title + ' | Lineage Tracker';
      var md = document.querySelector('meta[name=description]'); if (md) md.setAttribute('content', B.plainText(p.body).slice(0, 155));
      var art = $('po_post'); art.textContent = '';
      art.appendChild(el('h1', { text: p.title }));
      art.appendChild(byline(p));
      var tags = el('p', { 'class': 'small' });
      (p.kinds || []).forEach(function (k) { tags.appendChild(el('a', { 'class': 'chip', href: 'blog.html?kind=' + encodeURIComponent(k), text: kindsMap[k] || k })); });
      art.appendChild(tags);
      var imgs = p.images || {};
      art.appendChild(B.render(p.body, { image: function (id) { var i = imgs[id]; return i ? { url: pubUrl(i.path), w: i.w, h: i.h } : null; } }));
      if (p.updated_at && p.published_at && new Date(p.updated_at) - new Date(p.published_at) > 86400000) art.appendChild(el('p', { 'class': 'small muted', text: 'Updated ' + fmt(p.updated_at) }));
      // like and share
      var bar = $('po_bar'); bar.hidden = false;
      var likeBtn = $('po_like'), likes = p.likes;
      var showLikes = function (on) { likeBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); likeBtn.textContent = (on ? '♥ Liked' : '♡ Like') + (likes ? ' · ' + likes : ''); };
      showLikes(!!p.liked);
      likeBtn.onclick = function () {
        if (p.liked === null || p.liked === undefined) { location.href = 'signin.html?next=blog.html'; return; }
        if (p.mine) { $('po_bar_msg').textContent = 'You cannot like your own post.'; return; }
        likeBtn.disabled = true;
        A.rpc('member_blog_like', { p_post: p.id, p_on: !p.liked }).then(function (x) {
          likeBtn.disabled = false;
          if (!x.ok) { $('po_bar_msg').textContent = x.status === 401 ? 'Please sign in to like posts.' : A.say('server'); return; }
          p.liked = x.body.liked; likes = x.body.likes; showLikes(p.liked); loadReact();
        });
      };
      // reactions and thanks: counts for everyone, choices for signed-in members, no free text
      var KINDS_R = [['helpful', 'Helpful'], ['grew', 'I grew this too'], ['photo', 'Great photo']];
      var THANKS = ['Thanks for sharing', 'This helped me', 'I\'ll try this', 'Lovely photos'];
      var rs = null;
      function renderReact() {
        var row = $('po_react_row'), trow = $('po_thanks_row'); row.textContent = ''; trow.textContent = '';
        if (!rs) return; $('po_react').hidden = false;
        var signed = !(p.liked === null || p.liked === undefined);
        KINDS_R.forEach(function (k) {
          var n = rs[k[0]] || 0, on = rs.mine === k[0];
          var b = el('button', { 'class': 'btn', type: 'button', 'aria-pressed': on ? 'true' : 'false', text: k[1] + (n ? ' · ' + n : '') });
          b.addEventListener('click', function () { send(on ? '' : k[0]); });
          row.appendChild(b);
        });
        var tn = rs.thanks || 0, tb = el('button', { 'class': 'btn', type: 'button', 'aria-expanded': trow.hidden ? 'false' : 'true', text: (rs.my_thanks ? 'Thanked' : 'Say thanks') + (tn ? ' · ' + tn : '') });
        tb.addEventListener('click', function () { if (!signed) { location.href = 'signin.html?next=blog.html'; return; } if (p.mine) { $('po_react_note').textContent = 'You cannot react to your own post.'; return; } trow.hidden = !trow.hidden; tb.setAttribute('aria-expanded', trow.hidden ? 'false' : 'true'); });
        row.appendChild(tb);
        THANKS.forEach(function (t, i) {
          var on = rs.my_thanks === i + 1;
          var b = el('button', { 'class': 'btn', type: 'button', 'aria-pressed': on ? 'true' : 'false', text: t });
          b.addEventListener('click', function () { thank(on ? null : i + 1); });
          trow.appendChild(b);
        });
        $('po_react_note').textContent = signed && !p.mine ? 'The author can see your alias when you react or say thanks.' : (signed ? '' : 'Sign in to react or say thanks.');
      }
      function loadReact() { readRpc('blog_react_summary', { p_slug: p.slug }).then(function (r) { rs = r.ok ? r.body : null; renderReact(); }); }
      function send(kind) {
        if (p.liked === null || p.liked === undefined) { location.href = 'signin.html?next=blog.html'; return; }
        if (p.mine) { $('po_react_note').textContent = 'You cannot react to your own post.'; return; }
        A.rpc('member_blog_react', { p_post: p.id, p_kind: kind }).then(function (x) {
          if (!x.ok) { $('po_react_note').textContent = x.status === 401 ? 'Please sign in to react.' : A.say('server'); return; }
          p.liked = x.body.mine === 'like'; likes = x.body.like; showLikes(p.liked); rs = Object.assign(rs || {}, x.body); renderReact();
        });
      }
      function thank(line) {
        A.rpc('member_blog_thank', { p_post: p.id, p_line: line }).then(function (x) {
          if (!x.ok) { $('po_react_note').textContent = x.status === 401 ? 'Please sign in to say thanks.' : A.say('server'); return; }
          rs = Object.assign(rs || {}, x.body); renderReact();
        });
      }
      loadReact();
      $('po_share').onclick = function () {
        var base = location.origin + location.pathname + '?p=' + encodeURIComponent(p.slug);
        var go = function (url) {
          if (navigator.share) navigator.share({ title: p.title, url: url }).catch(function () {});
          else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { $('po_bar_msg').textContent = 'Link copied.'; }, function () { window.prompt('Copy this link', url); });
          else window.prompt('Copy this link', url);
        };
        if (p.liked === null || p.liked === undefined || p.mine) { go(base); return; }
        A.rpc('member_blog_share_code', { p_post: p.id }).then(function (x) { go(x.ok && typeof x.body === 'string' ? base + '&s=' + encodeURIComponent(x.body) : base); });
      };
    });
  }
})();
