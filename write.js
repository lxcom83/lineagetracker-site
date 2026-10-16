/* Write a blog post: your posts, the block editor, and sending a post for review.  Everything goes through the "blog" server
   function, which checks the sign-in and every block.  Posts are kept as blocks (JSON), never as HTML. */
(function () {
  var A = window.AC, B = window.LTBlocks, el = A.el, $ = function (id) { return document.getElementById(id); };
  if (!$('wr_main')) return;
  var me = null, mine = null, post = null, ed = null, dirty = false, saving = null, saveTimer = null, kinds = [], interests = [];
  var STATUS = { draft: 'Draft', submitted: 'Waiting for review', changes: 'Changes asked for', rejected: 'Not accepted' };
  var REASONS = { needs_photo: 'A photo would help readers.', too_short: 'It needs a little more to it.', off_topic: 'It is not about growing, breeding or keeping.',
    selling: 'It reads as an advert. The blog cannot be used to sell.', contact_details: 'Please take out phone numbers, email or home addresses.',
    not_yours: 'Please only use photos and words that are your own.', unsafe_advice: 'Some advice in it could be unsafe.', rude: 'Please keep it friendly and respectful.',
    impersonation: 'The name used does not look like your own.', spam: 'It looks like spam.', complaint: 'It was taken down after a report.', other: 'See the note from the reviewer.' };
  var ERR = { blog_closed: 'Writing is not open yet.', too_many_drafts: 'You have 20 posts that are not published. Delete one to start another.',
    need_title: 'Please give the post a title (at least 3 letters).', need_body: 'Please write something first.', need_kind: 'Please choose at least one kind (Progress update, How-to and so on).',
    need_name: 'Please write the name to show, or choose your alias.', weekly_limit: 'You can send up to 3 posts for review a week. Please try again in a few days.',
    too_many_images: 'A post can have up to 12 photos.', image_in_use: 'That photo is still used in the post.', bad_image: 'That photo could not be used. Please try another.',
    image_too_big: 'That photo is too large even after shrinking. Please try another.', bad_body: 'Something in the post could not be saved. Check links start with https://.',
    too_many_kinds: 'Choose up to 3 kinds.', not_found: 'That post no longer exists.', slow_down: 'Too many changes in a short time. Please wait a moment.' };
  var msg = function (j) { return ERR[j.error] || A.say(j.error); };
  var call = function (body) { return A.fnAuthed('blog', body).then(function (r) { var j = r.body || {}; if (r.status === 404 && body.action === 'mine') return { ok: true, open: false, posts: [], agreement_current: '', agreement_mine: '' }; if (r.status === 401) location.replace('signin.html?next=write.html'); return j.ok ? j : { ok: false, error: j.error || (r.status === 0 ? 'network' : 'server'), detail: j.detail }; }); };
  var fmt = function (t) { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  function show(id) { ['wr_list', 'wr_edit'].forEach(function (x) { $(x).hidden = x !== id; }); window.scrollTo(0, 0); }

  /* ---------- your posts ---------- */
  function loadList() {
    show('wr_list'); $('wr_posts').textContent = 'Loading…';
    return call({ action: 'mine' }).then(function (j) {
      $('wr_posts').textContent = '';
      if (!j.ok) { $('wr_posts').appendChild(el('p', { 'class': 'err', text: msg(j) })); return; }
      mine = j;
      $('wr_closed').hidden = j.open; $('wr_new').disabled = !j.open;
      if (!j.posts.length) { $('wr_posts').appendChild(el('p', { 'class': 'muted', text: j.open ? 'You have not written anything yet. Press New post to start.' : 'Nothing here yet.' })); return; }
      var ul = el('ul', { 'class': 'wr-posts' });
      j.posts.forEach(function (p) {
        var chips = [];
        if (p.live) chips.push(el('span', { 'class': 'chip ok', text: 'Published' }));
        if (!p.live || p.status !== 'draft') chips.push(el('span', { 'class': 'chip' + (p.status === 'changes' || p.status === 'rejected' ? ' warn' : ''), text: p.live && p.status === 'draft' ? 'Draft of an update' : (p.live ? 'Update: ' : '') + STATUS[p.status] }));
        var li = el('li', {}, [el('div', { 'class': 'wr-pt' }, [el('b', { text: p.title || 'Untitled' })].concat(chips))]);
        var sub = 'Last changed ' + fmt(p.updated_at) + (p.live ? ' · ' + p.likes + ' like' + (p.likes === 1 ? '' : 's') : '');
        li.appendChild(el('p', { 'class': 'small muted', text: sub }));
        if (p.review_reason && (p.status === 'changes' || p.status === 'rejected')) {
          var box = el('div', { 'class': 'notice warn small' }, [el('b', { text: 'From the reviewer: ' }), document.createTextNode(REASONS[p.review_reason] || '')]);
          if (p.review_note) box.appendChild(el('p', { text: p.review_note }));
          li.appendChild(box);
        }
        var acts = el('div', { 'class': 'actions tight' });
        var open = el('button', { 'class': 'btn primary', type: 'button', text: 'Open' }); open.onclick = function () { openPost(p.id); }; acts.appendChild(open);
        if (p.live && p.slug) acts.appendChild(el('a', { 'class': 'btn', href: 'post.html?p=' + encodeURIComponent(p.slug), text: 'View' }));
        li.appendChild(acts); ul.appendChild(li);
      });
      $('wr_posts').appendChild(ul);
    });
  }

  /* ---------- the editor ---------- */
  function imageMap() { var m = {}; ((post && post.images) || []).forEach(function (i) { m[i.id] = { url: i.url, w: i.w, h: i.h }; }); return m; }
  function chipsInto(box, list, selected, max, onChange, name) {
    box.textContent = '';
    list.forEach(function (o) {
      var cb = el('input', { type: 'checkbox', value: o.key, name: name }); cb.checked = selected.indexOf(o.key) >= 0;
      cb.addEventListener('change', function () {
        var on = [].slice.call(box.querySelectorAll('input:checked')).map(function (x) { return x.value; });
        if (on.length > max) { cb.checked = false; $('wr_msg').textContent = 'Choose up to ' + max + '.'; return; }
        onChange(on); markDirty();
      });
      box.appendChild(el('label', { 'class': 'chip-in' }, [cb, el('span', { text: o.label })]));
    });
  }
  function openPost(id) {
    $('wr_msg').textContent = ''; $('wr_state').textContent = '';
    var go = function (p) {
      post = p; dirty = false;
      $('wr_title').value = p.title || '';
      var imgs = imageMap();
      ed = B.editor($('wr_editor'), { blocks: p.body || [], image: function (iid) { return imgs[iid] || null; }, upload: upload, onChange: markDirty, say: function (m) { $('wr_msg').textContent = m; } });
      chipsInto($('wr_kinds'), kinds, p.kinds || [], 3, function (v) { post.kinds = v; }, 'kind');
      chipsInto($('wr_topics'), interests, p.interests || [], 10, function (v) { post.interests = v; }, 'topic');
      $('wr_by_alias_name').textContent = me.alias;
      (p.byline_mode === 'name' ? $('wr_by_name') : $('wr_by_alias')).checked = true;
      $('wr_name').value = p.byline_name || ''; $('wr_name_box').hidden = p.byline_mode !== 'name';
      var st = p.live ? (p.status === 'draft' ? 'Published. Changes you save are not public until you send them for review again.' : 'Published. Your update is ' + STATUS[p.status].toLowerCase() + '.') : STATUS[p.status] + '.';
      $('wr_status').textContent = st;
      $('wr_withdraw').hidden = !p.live;
      $('wr_submit').disabled = p.status === 'submitted' || !mine.open;
      if (p.status === 'submitted') $('wr_state').textContent = 'Waiting for review. You can still make changes; saving takes it out of the queue until you send it again.';
      show('wr_edit');
    };
    if (!id) { go({ id: null, title: '', body: [], kinds: [], interests: [], byline_mode: 'alias', byline_name: '', status: 'draft', live: false, images: [] }); return; }
    call({ action: 'get', id: id }).then(function (j) { if (!j.ok) { $('wr_list_msg').textContent = msg(j); return; } go(j.post); });
  }
  function markDirty() { dirty = true; $('wr_state').textContent = 'Not saved yet'; clearTimeout(saveTimer); saveTimer = setTimeout(function () { save(false); }, 4000); }
  function payload() {
    return { action: 'save', id: post.id, title: $('wr_title').value.trim(), body: ed.get(), kinds: post.kinds || [], interests: post.interests || [],
      byline_mode: $('wr_by_name').checked ? 'name' : 'alias', byline_name: $('wr_name').value.trim(), cover: null };
  }
  function save(loud) {
    if (!post || !mine || !mine.open) return Promise.resolve({ ok: false, error: 'blog_closed' });
    if (saving) return saving.then(function () { return dirty ? save(loud) : { ok: true }; });
    clearTimeout(saveTimer);
    var body = payload(); dirty = false; $('wr_state').textContent = 'Saving…';
    saving = call(body).then(function (j) {
      saving = null;
      if (!j.ok) { dirty = true; $('wr_state').textContent = ''; $('wr_msg').textContent = msg(j); return j; }
      var wasNew = !post.id; post.id = j.id; post.status = 'draft';
      $('wr_state').textContent = 'Saved'; if (loud) $('wr_msg').textContent = '';
      $('wr_submit').disabled = false;
      if (wasNew) $('wr_status').textContent = 'Draft.';
      return j;
    });
    return saving;
  }
  // A photo needs the post to exist first (photos are kept under the post).
  function upload(file) {
    var ensure = post.id ? Promise.resolve({ ok: true }) : save(false);
    return ensure.then(function (j) {
      if (!post.id) throw new Error(msg(j));
      return B.preparePhoto(file, 1600);
    }).then(function (ph) { return B.blobToBase64(ph.blob); }).then(function (data) {
      return call({ action: 'image', id: post.id, data: data });
    }).then(function (j) {
      if (!j.ok) throw new Error(msg(j));
      post.images = (post.images || []).concat([{ id: j.image.id, url: j.image.url, w: j.image.w, h: j.image.h }]);
      return { id: j.image.id, url: j.image.url, w: j.image.w, h: j.image.h };
    });
  }
  function preview() {
    var box = $('wr_preview_body'); box.textContent = '';
    var all = imageMap(); var extra = ed.images(); Object.keys(extra).forEach(function (k) { all[k] = extra[k]; });
    box.appendChild(el('h1', { text: $('wr_title').value.trim() || 'Untitled' }));
    box.appendChild(el('p', { 'class': 'blog-by', text: 'By ' + ($('wr_by_name').checked && $('wr_name').value.trim() ? $('wr_name').value.trim() : me.alias) }));
    box.appendChild(B.render(ed.get(), { image: function (id) { return all[id] || null; } }));
    $('wr_preview').hidden = false; $('wr_preview_close').focus();
  }
  function submit() {
    $('wr_msg').textContent = '';
    // the same first checks the server makes, so the author is told before the agreement box appears
    var miss = $('wr_title').value.trim().length < 3 ? 'need_title' : !ed.get().length ? 'need_body' : !(post.kinds || []).length ? 'need_kind' : $('wr_by_name').checked && $('wr_name').value.trim().length < 2 ? 'need_name' : '';
    if (miss) { $('wr_msg').textContent = ERR[miss]; return; }
    save(false).then(function (j) {
      if (!j.ok) return;
      var needAgree = mine.agreement_mine !== mine.agreement_current;
      if (needAgree) { $('wr_agree').hidden = false; $('wr_agree_ok').checked = false; $('wr_agree_v').textContent = mine.agreement_current; $('wr_agree_ok').focus(); return; }
      send(null);
    });
  }
  function send(agreement) {
    var b = $('wr_submit'); b.disabled = true;
    call({ action: 'submit', id: post.id, agreement: agreement }).then(function (j) {
      if (!j.ok) { b.disabled = false; $('wr_msg').textContent = msg(j); return; }
      if (agreement) mine.agreement_mine = agreement;
      $('wr_agree').hidden = true;
      $('wr_state').textContent = 'Sent for review. The answer will show on this page, under Your posts.';
      $('wr_status').textContent = post.live ? 'Published. Your update is waiting for review.' : 'Waiting for review.';
      post.status = 'submitted';
    });
  }

  /* ---------- wiring ---------- */
  $('wr_new').onclick = function () { openPost(null); };
  $('wr_back').onclick = function () { (dirty ? save(false) : Promise.resolve()).then(loadList); };
  $('wr_title').addEventListener('input', markDirty);
  $('wr_save').onclick = function () { save(true); };
  $('wr_preview_btn').onclick = preview;
  $('wr_preview_close').onclick = function () { $('wr_preview').hidden = true; };
  $('wr_submit').onclick = submit;
  $('wr_agree_send').onclick = function () { if (!$('wr_agree_ok').checked) { $('wr_agree_err').textContent = 'Please tick the box to agree.'; return; } $('wr_agree_err').textContent = ''; send(mine.agreement_current); };
  $('wr_agree_cancel').onclick = function () { $('wr_agree').hidden = true; };
  [$('wr_by_alias'), $('wr_by_name')].forEach(function (r) { r.addEventListener('change', function () { $('wr_name_box').hidden = !$('wr_by_name').checked; markDirty(); }); });
  $('wr_name').addEventListener('input', markDirty);
  $('wr_withdraw').onclick = function () {
    if (!window.confirm('Take this post off the blog now? You can send it for review again later.')) return;
    call({ action: 'withdraw', id: post.id }).then(function (j) { if (!j.ok) { $('wr_msg').textContent = msg(j); return; } post.live = false; $('wr_withdraw').hidden = true; $('wr_status').textContent = 'Taken off the blog. It is a draft again.'; });
  };
  $('wr_delete').onclick = function () {
    if (!post.id) { loadList(); return; }
    if (!window.confirm('Delete this post and its photos for good? This cannot be undone.')) return;
    call({ action: 'delete', id: post.id, confirm: true }).then(function (j) { if (!j.ok) { $('wr_msg').textContent = msg(j); return; } post = null; dirty = false; loadList(); });
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('wr_preview').hidden) $('wr_preview').hidden = true; else if (!$('wr_agree').hidden) $('wr_agree').hidden = true; } });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  A.requireSignIn('write.html').then(function (w) {
    if (!w) return;
    if (w.state === 'error') { $('wr_list_msg').textContent = A.say('network'); return; }
    me = w.me; $('wr_main').hidden = false;
    Promise.all([
      A.raw('/rest/v1/rpc/blog_public_kinds', 'POST', {}).then(function (r) { kinds = r.ok && Array.isArray(r.body) ? r.body : []; }),
      A.LT.loadOptions().then(function (o) { interests = (o.interests || []).map(function (x) { return { key: x.key, label: x.label }; }); })
    ]).then(loadList, loadList);
  });
})();
