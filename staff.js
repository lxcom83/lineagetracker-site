/* Staff page: members, invitations, audit log, switches. Everything shown here comes from the "admin" server function,
   which checks the sign-in, the staff role and the two-step code on every request. Text is always added with textContent. */
(function () {
  var A = window.AC, el = A.el, $ = function (id) { return document.getElementById(id); };
  if (!$('st_main')) return;
  var role = '', PAGE = 25, AUDIT_PAGE = 50, IDLE_MINUTES = 30;
  A.keepInTab();   // staff sessions live in this tab only (never the "keep me signed in" storage)
  // Signed out after 30 minutes with nothing touched. The time of the last touch is kept in this tab, so a tab that was asleep
  // (phone locked, laptop closed, timers paused) is still signed out the moment it wakes, before anything is shown.
  var idleOut = (function () {
    var t = null, K = 'lt_staff_active', LIMIT = IDLE_MINUTES * 60 * 1000;
    function last() { try { return Number(window.sessionStorage.getItem(K)) || 0; } catch (e) { return 0; } }
    function stamp() { try { window.sessionStorage.setItem(K, String(Date.now())); } catch (e) { /* ignore */ } }
    function out() { try { window.sessionStorage.removeItem(K); } catch (e) { /* ignore */ } A.signOut().then(function () { location.replace('signin.html?why=idle'); }); }
    function stale() { var l = last(); return l && Date.now() - l > LIMIT; }
    function check() { if (stale()) { out(); return true; } return false; }
    function bump() { if (check()) return; stamp(); clearTimeout(t); t = setTimeout(out, LIMIT); }
    if (check()) return true;
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, bump, { passive: true }); });
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    stamp(); clearTimeout(t); t = setTimeout(out, LIMIT);
    return false;
  })();
  var ACTIONS = ['member_created', 'member_created_invited', 'member_confirmed', 'password_reset', 'password_changed', 'account_deleted', 'terms_accepted', 'member_viewed', 'member_suspended', 'member_unsuspended', 'member_search_email', 'role_changed', 'alias_changed', 'flag_set', 'invite_created', 'member_deleted_by_staff', 'mail_cap_reached', 'blog_submitted', 'blog_viewed', 'blog_approved', 'blog_changes_asked', 'blog_rejected', 'blog_unpublished', 'blog_withdrawn', 'blog_deleted', 'blog_kind_set', 'partner_submitted', 'partner_resubmitted', 'partner_withdrawn', 'partner_renewed', 'partner_approved', 'partner_changes_asked', 'partner_rejected', 'partner_disabled', 'partner_enabled', 'partner_flags_set', 'partner_resigned'];
  var ERR = { bad_date: 'That date is not allowed. Pick a day within the next four months.', not_scheduled: 'That post has already appeared, so it cannot be moved.', not_approved: 'That version is not live.', not_disabled: 'That version is not switched off.', expired: 'That link has expired. Use Sign it again once it is live, or ask the owner to renew.', not_waiting: 'That one is no longer waiting.', bad_reason: 'Choose a reason first.', not_staff: 'This account is not staff.', not_allowed: 'Your role does not allow that.', not_yourself: 'You cannot do that to your own account.', not_found: 'That member no longer exists.', remove_role_first: 'Remove the staff role first.', suspend_admin_first_remove_role: 'Remove the administrator role first.', not_active: 'The member must be active.', pending_member: 'The member has not confirmed their email yet.', alias_taken: 'That alias is taken.', sql_only: 'This switch can only be changed in the database, on purpose.', signup_closed: 'Sign-up is closed. Open it in Switches first, or invitations lead nowhere.', auth_update_failed: 'The database change was made, but the sign-in service did not answer. Press the same button again.', slow_down: 'Too many requests. Wait a moment.', network: 'We could not reach the server.', server: 'Something went wrong on the server.', mfa_required: 'Two-step sign-in is required for staff.', mfa_not_enrolled: 'That person has not set up two-step sign-in yet. Ask them to set it up on their own account page first, then give the role.', bad_audience: 'That group is not available.', not_waiting: 'That post is no longer waiting for review (the author may have changed or withdrawn it).', bad_reason: 'Choose a reason from the list.' };
  var call = function (action, extra) { return A.fnAuthed('admin', Object.assign({ action: action }, extra || {})).then(function (r) { var j = r.body || {}; if (r.status === 401) { location.replace('signin.html?next=staff.html'); } return j.ok ? j : { ok: false, error: j.error || (r.status === 0 ? 'network' : 'server') }; }); };
  var errText = function (j) { return ERR[j.error] || 'Something went wrong (' + j.error + ').'; };
  var fmt = function (t) { try { return new Date(t).toLocaleString(); } catch (e) { return String(t); } };
  function table(head, rows) {
    var t = el('table', { 'class': 'tbl' }), tr = el('tr'); head.forEach(function (h) { tr.appendChild(el('th', { text: h })); }); t.appendChild(el('thead', {}, [tr]));
    var tb = el('tbody'); rows.forEach(function (r) { var x = el('tr'); r.forEach(function (c) { x.appendChild(el('td', {}, [typeof c === 'string' ? document.createTextNode(c) : c])); }); tb.appendChild(x); }); t.appendChild(tb);
    return el('div', { 'class': 'tblwrap' }, [t]);
  }
  var TABS = ['overview', 'members', 'blog', 'partners', 'invites', 'audit', 'settings', 'health'];
  function show(name) {
    TABS.forEach(function (n) { $('st_p_' + n).hidden = n !== name; $('st_t_' + n).setAttribute('aria-selected', n === name ? 'true' : 'false'); });
    if (name === 'overview') { loadAttention(); loadSignups(); loadStats(); } if (name === 'members') loadMembers(0); if (name === 'settings') loadFlags(); if (name === 'audit') loadAudit(0); if (name === 'health') loadHealth(); if (name === 'partners') loadPartners(); if (name === 'blog') loadBlog();
  }
  // an idle tab is on its way to the sign-in page: do not start anything else (it would race to a different page)
  if (!idleOut) A.requireSignIn('staff.html').then(function (w) {
    if (!w) return;
    if (w.state === 'error') { $('st_load').textContent = A.say('network'); return; }
    call('whoami').then(function (j) {
      if (!j.ok) { $('st_load').hidden = true; $('st_block').hidden = false; $('st_block_msg').textContent = j.error === 'mfa_required' ? 'Staff pages need two-step sign-in. Set it up on your account page, then sign out, sign in with your code and come back.' : j.error === 'not_staff' ? 'This account is not staff.' : errText(j); return; }
      role = j.role; $('st_load').hidden = true; $('st_main').hidden = false; $('st_who').textContent = j.alias + ' (' + (role === 'admin' ? 'administrator' : 'moderator') + ')';
      if (role !== 'admin') document.body.classList.add('is-mod');
      TABS.forEach(function (n) { $('st_t_' + n).addEventListener('click', function () { show(n); }); });
      show('overview');
    });
  });
  // overview: what is waiting for a person, and what is coming up (counts and dates only)
  function ago(t) { var d = Math.floor((Date.now() - new Date(t).getTime()) / 86400000); return d <= 0 ? 'today' : d === 1 ? '1 day' : d + ' days'; }
  function dayOf(t) { try { return new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function loadAttention() {
    var box = $('st_attention'); box.textContent = 'Loading…';
    call('attention').then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      var a = j.attention || {}, ul = el('ul', { 'class': 'list att' });
      function item(text, tab, warn) {
        var b = el('button', { type: 'button', 'class': 'linkish', text: text }); b.addEventListener('click', function () { show(tab); });
        ul.appendChild(el('li', { 'class': warn ? 'warn' : '' }, [b]));
      }
      if (a.blog_waiting) item(a.blog_waiting + ' blog post' + (a.blog_waiting === 1 ? '' : 's') + ' waiting for review (oldest ' + ago(a.blog_oldest) + ')', 'blog', (Date.now() - new Date(a.blog_oldest).getTime()) > 3 * 86400000);
      if (a.partners_waiting) item(a.partners_waiting + ' partner version' + (a.partners_waiting === 1 ? '' : 's') + ' waiting for review (oldest ' + ago(a.partners_oldest) + ')', 'partners', (Date.now() - new Date(a.partners_oldest).getTime()) > 3 * 86400000);
      if (a.partners_expired) item(a.partners_expired + ' partner link' + (a.partners_expired === 1 ? ' has' : 's have') + ' expired. The link goes back to plain Lineage Tracker until it is signed again.', 'partners', true);
      if (a.partners_expiring) item(a.partners_expiring + ' partner link' + (a.partners_expiring === 1 ? '' : 's') + ' will expire within 30 days', 'partners', false);
      if (a.blog_scheduled) item('Next scheduled post appears ' + dayOf(a.blog_next_at) + ' (' + a.blog_scheduled + ' scheduled)', 'blog', false);
      else if (a.blog_live && a.blog_public_on) item('Nothing is scheduled. The last post went up ' + dayOf(a.blog_last_at) + '.', 'blog', false);
      if (!a.blog_write_on && (a.blog_live || a.blog_waiting)) item('Blog writing is switched off (members cannot send posts)', 'settings', false);
      if (!a.blog_public_on && (a.blog_live || a.blog_scheduled)) item('Blog reading is switched off (nobody can read posts)', 'settings', true);
      if (!ul.children.length) { box.appendChild(el('p', { 'class': 'muted', text: 'Nothing needs attention.' })); return; }
      box.appendChild(ul);
    });
  }
  // overview: who joined recently (alias, country and dates only; never an email address)
  function loadSignups() {
    var box = $('st_signups'); box.textContent = 'Loading…';
    call('signups').then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      var a = j.signups || {};
      box.appendChild(el('p', { 'class': a.signup_open ? '' : 'warn', text: a.signup_open ? 'Sign-up is open.' : 'Sign-up is closed, so nobody can join. Open it under Switches.' }));
      var stats = el('div', { 'class': 'stats' });
      [['Last 24 hours', a.today], ['Last 7 days', a.week], ['Last 30 days', a.month], ['All time', a.total]].forEach(function (x) {
        stats.appendChild(el('div', { 'class': 'stat' }, [el('b', { text: String(x[1] || 0) }), el('span', { text: x[0] })]));
      });
      box.appendChild(stats);
      if (a.unfinished) box.appendChild(el('p', { 'class': 'muted', text: a.unfinished + ' account' + (a.unfinished === 1 ? ' has' : 's have') + ' not confirmed the email yet (oldest ' + ago(a.unfinished_oldest) + ').' }));
      var cs = a.countries || [];
      if (cs.length) box.appendChild(el('p', { 'class': 'muted', text: 'Countries, last 30 days: ' + cs.map(function (c) { return c.country + ' ' + c.n; }).join(', ') }));
      var rec = a.recent || [];
      if (!rec.length) { box.appendChild(el('p', { 'class': 'muted', text: 'Nobody has joined yet.' })); return; }
      var ul = el('ul', { 'class': 'list' });
      rec.forEach(function (m) { ul.appendChild(el('li', { text: m.alias + (m.country ? ' (' + m.country + ')' : '') + ', ' + dayOf(m.created_at) + (m.status === 'pending' ? ', not confirmed yet' : m.status === 'suspended' ? ', suspended' : '') })); });
      box.appendChild(ul);
    });
  }
  // overview
  function loadStats() {
    var box = $('st_stats'); box.textContent = 'Loading…';
    call('stats').then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      var s = j.stats, items = [['Members', s.members], ['Active', s.active], ['Waiting to confirm', s.pending], ['Suspended', s.suspended], ['On Stay in touch list (confirmed)', s.waitlist_confirmed], ['…of whom have an account', s.waitlist_linked], ['Invitations sent', s.invites_sent], ['Invitations used', s.invites_used]];
      var TN = { print: 'LT-Print', planner: 'LT-Planner' };
      Object.keys(j.tools || {}).sort().forEach(function (k) { var t = j.tools[k]; items.push([(TN[k] || k) + ': members who used it', t.members], [(TN[k] || k) + ': used in the last 30 days', t.last_30_days]); });
      items.forEach(function (i) { box.appendChild(el('div', { 'class': 'stat' }, [el('b', { text: String(i[1]) }), el('span', { text: i[0] })])); });
    });
  }
  // members
  var mOffset = 0;
  function loadMembers(off) {
    mOffset = off; var box = $('st_mlist'); box.textContent = 'Loading…';
    call('members_list', { q: $('st_q').value, status: $('st_status').value, limit: PAGE, offset: off }).then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      if (!j.rows.length) { box.textContent = 'No members match.'; $('st_mpager').textContent = ''; return; }
      box.appendChild(table(['Alias', 'Status', 'Level', 'Staff', 'Country', 'Joined', ''], j.rows.map(function (m) {
        var b = el('button', { type: 'button', 'class': 'btn', text: 'Open' }); b.addEventListener('click', function () { openMember(m.id); });
        return [m.alias, m.status, m.level, m.role || '', m.country || '', fmt(m.created_at).split(',')[0], b];
      })));
      var pg = $('st_mpager'); pg.textContent = ''; pg.appendChild(el('span', { text: (off + 1) + '–' + (off + j.rows.length) + ' of ' + j.total + ' ' }));
      if (off > 0) { var p = el('button', { type: 'button', 'class': 'btn', text: 'Previous' }); p.addEventListener('click', function () { loadMembers(off - PAGE); }); pg.appendChild(p); }
      if (off + PAGE < j.total) { var n = el('button', { type: 'button', 'class': 'btn', text: 'Next' }); n.addEventListener('click', function () { loadMembers(off + PAGE); }); pg.appendChild(n); }
    });
  }
  $('st_search').addEventListener('submit', function (e) { e.preventDefault(); $('st_detail').hidden = true; loadMembers(0); });
  function openMember(id) {
    var d = $('st_detail'); d.hidden = false; d.textContent = 'Loading…'; d.scrollIntoView();
    call('member_get', { id: id }).then(function (j) {
      d.textContent = ''; if (!j.ok) { d.textContent = errText(j); return; }
      var m = j.member, msg = el('p', { 'class': 'err', role: 'alert' });
      d.appendChild(el('h3', { text: m.alias }));
      d.appendChild(el('p', { 'class': 'small muted', text: 'Opening this page was recorded in the audit log.' }));
      d.appendChild(table(['Field', 'Value'], [['Email', m.email], ['Status', m.status + (m.suspended_reason ? ' (' + m.suspended_reason + ')' : '')], ['Level', m.level], ['Staff role', m.role || 'none'], ['Country / region', (m.country || '') + (m.region ? ' / ' + m.region : '')], ['Joined', fmt(m.created_at)], ['Confirmed', m.confirmed_at ? fmt(m.confirmed_at) : 'not yet'], ['Last sign-in', m.last_sign_in_at ? fmt(m.last_sign_in_at) : 'never'], ['Terms', m.terms_version], ['Switched on', (m.services || []).join(', ') || 'nothing'],
        ['Tools used', (j.tools || []).map(function (t) { return ({ print: 'LT-Print', planner: 'LT-Planner' }[t.tool] || t.tool) + ' (last ' + fmt(t.last_at).split(',')[0] + ', about ' + t.opens + ' time' + (t.opens === 1 ? '' : 's') + ')'; }).join('; ') || 'none']]));
      var acts = el('div', { 'class': 'actions' });
      function act(label, cls, fn) { var b = el('button', { type: 'button', 'class': 'btn ' + cls, text: label }); b.addEventListener('click', function () { msg.textContent = ''; fn(b); }); acts.appendChild(b); return b; }
      function done(j2, ok) { if (!j2.ok) { msg.textContent = errText(j2); } else { ok(); } }
      if (m.status === 'active') act('Suspend', 'danger', function () { var why = prompt('Reason (kept internally, up to 500 characters):', ''); if (why === null) return; call('member_status', { id: m.id, status: 'suspended', reason: why }).then(function (r) { done(r, function () { openMember(m.id); loadMembers(mOffset); }); }); });
      if (m.status === 'suspended') act('Unsuspend', '', function () { call('member_status', { id: m.id, status: 'active' }).then(function (r) { done(r, function () { openMember(m.id); loadMembers(mOffset); }); }); });
      if (role === 'admin') {
        var sel = el('select', { 'aria-label': 'Staff role' }, ['none', 'moderator', 'admin'].map(function (r) { var o = el('option', { value: r, text: r === 'none' ? 'No staff role' : r }); if ((m.role || 'none') === r) o.selected = true; return o; }));
        var save = el('button', { type: 'button', 'class': 'btn', text: 'Set role' }); save.addEventListener('click', function () { msg.textContent = ''; if (!confirm('Change the staff role of ' + m.alias + ' to "' + (sel.value === 'none' ? 'no staff role' : sel.value) + '"?')) return; call('member_role', { id: m.id, role: sel.value === 'none' ? null : sel.value }).then(function (r) { done(r, function () { openMember(m.id); loadMembers(mOffset); }); }); });
        acts.appendChild(sel); acts.appendChild(save);
        act('New generated alias', '', function () { if (!confirm('Replace this alias with a new generated one?')) return; call('member_alias', { id: m.id }).then(function (r) { done(r, function () { openMember(m.id); loadMembers(mOffset); }); }); });
        act('Delete account', 'danger', function () { var w = prompt('This deletes the account and everything it holds. Type DELETE to confirm:', ''); if (w !== 'DELETE') return; call('member_delete', { id: m.id, confirm: 'DELETE' }).then(function (r) { done(r, function () { d.hidden = true; loadMembers(mOffset); }); }); });
      }
      d.appendChild(acts); d.appendChild(msg);
    });
  }
  // blog review
  var REASONS = [['needs_photo', 'Needs a photo'], ['too_short', 'Too short'], ['off_topic', 'Off topic'], ['selling', 'Selling or advertising'], ['contact_details', 'Contact details in it'],
    ['not_yours', 'Photos or words not theirs'], ['unsafe_advice', 'Unsafe advice'], ['rude', 'Rude or unkind'], ['impersonation', 'Name is not theirs'], ['spam', 'Spam'], ['complaint', 'After a complaint'], ['other', 'Other (say why in the note)']];
  function reasonPicker() { return el('select', { 'aria-label': 'Reason' }, [el('option', { value: '', text: 'Choose a reason' })].concat(REASONS.map(function (r) { return el('option', { value: r[0], text: r[1] }); }))); }
  function screenText(s) {
    s = s || {}; var bits = [];
    if ((s.links || []).length) bits.push(s.links.length + ' link' + (s.links.length === 1 ? '' : 's') + ': ' + s.links.join(' '));
    if (s.emails) bits.push(s.emails + ' email address' + (s.emails === 1 ? '' : 'es'));
    if (s.phones) bits.push(s.phones + ' phone number' + (s.phones === 1 ? '' : 's'));
    if ((s.words || []).length) bits.push('words to look at: ' + s.words.join(', '));
    if (s.videos) bits.push(s.videos + ' video link' + (s.videos === 1 ? '' : 's'));
    return bits.length ? bits.join(' · ') : 'Nothing flagged.';
  }
  function loadBlog() {
    var box = $('st_bqueue'); box.textContent = 'Loading…'; $('st_bpost').hidden = true;
    call('blog_queue').then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      $('st_blive_n').textContent = j.live_count;
      if (!j.waiting.length) { box.appendChild(el('p', { 'class': 'muted', text: 'Nothing is waiting for review.' })); }
      else box.appendChild(table(['Waiting since', 'Title', 'Author', 'Flags', ''], j.waiting.map(function (p) {
        var b = el('button', { type: 'button', 'class': 'btn primary', text: 'Review' }); b.addEventListener('click', function () { openPost(p.id); });
        var flags = screenText(p.screen); return [fmt(p.submitted_at), (p.live ? '(update) ' : '') + (p.title || 'Untitled'), p.author_alias + ' (' + (A.LEVELS[p.author_level] || p.author_level) + ')', flags === 'Nothing flagged.' ? '' : flags, b];
      })));
    });
    loadScheduled(); loadLive(0);
    if (role === 'admin') loadKinds();
  }
  function openPost(id) {
    var d = $('st_bpost'); d.hidden = false; d.textContent = 'Loading…'; d.scrollIntoView();
    call('blog_get', { id: id }).then(function (j) {
      d.textContent = ''; if (!j.ok) { d.textContent = errText(j); return; }
      var p = j.post, imgs = {}; (p.images || []).forEach(function (i) { imgs[i.id] = { url: i.url, w: i.w, h: i.h }; });
      d.appendChild(el('p', { 'class': 'small muted', text: 'Opening this post was recorded in the audit log. Author: ' + p.author_alias + ' (' + (A.LEVELS[p.author_level] || p.author_level) + '), ' + p.author_posts_live + ' published, ' + p.author_rejected + ' not accepted before.' }));
      d.appendChild(el('div', { 'class': 'notice' + (screenText(p.screen) === 'Nothing flagged.' ? '' : ' warn') }, [el('b', { text: 'Machine check: ' }), document.createTextNode(screenText(p.screen))]));
      if (p.byline_mode === 'name') d.appendChild(el('div', { 'class': 'notice warn' }, [el('b', { text: 'Name byline: ' }), document.createTextNode('"' + p.byline_name + '" instead of the alias. Check it is not someone else (a known person, a club or a business).')]));
      var art = el('article', { 'class': 'blog-post st-preview' });
      art.appendChild(el('h1', { text: p.title || 'Untitled' })); art.appendChild(el('p', { 'class': 'blog-by', text: 'By ' + p.byline }));
      art.appendChild(window.LTBlocks.render(p.body, { image: function (iid) { return imgs[iid] || null; } }));
      d.appendChild(art);
      var msg = el('p', { 'class': 'err', role: 'alert' }), acts = el('div', { 'class': 'actions' });
      if (p.status === 'submitted') {
        var when = el('input', { type: 'date', 'aria-label': 'Publish on', value: p.wanted_date ? String(p.wanted_date).slice(0, 10) : '' });
        if (!p.live) d.appendChild(el('p', { 'class': 'small' }, [document.createTextNode((p.wanted_date ? 'The author asked for ' + String(p.wanted_date).slice(0, 10) + '. ' : '') + 'Publish on (empty means now): '), when]));
        var ap = el('button', { type: 'button', 'class': 'btn primary', text: p.live ? 'Approve the update' : 'Approve and publish' });
        ap.addEventListener('click', function () { msg.textContent = ''; ap.disabled = true; call('blog_decide', { id: p.id, decision: 'approve', publish_at: atDate(when.value) }).then(function (r) { ap.disabled = false; if (!r.ok) { msg.textContent = errText(r); return; } d.textContent = 'Published.'; loadBlog(); }); });
        acts.appendChild(ap);
        var rs = reasonPicker(), note = el('textarea', { rows: 2, maxlength: 1000, placeholder: 'Note to the author (optional, they will see it)', 'aria-label': 'Note to the author' });
        var ch = el('button', { type: 'button', 'class': 'btn', text: 'Ask for changes' }), rj = el('button', { type: 'button', 'class': 'btn danger', text: 'Reject' });
        [[ch, 'changes'], [rj, 'reject']].forEach(function (x) { x[0].addEventListener('click', function () {
          msg.textContent = ''; if (!rs.value) { msg.textContent = 'Choose a reason first.'; return; }
          call('blog_decide', { id: p.id, decision: x[1], reason: rs.value, note: note.value }).then(function (r) { if (!r.ok) { msg.textContent = errText(r); return; } d.textContent = x[1] === 'changes' ? 'Sent back to the author.' : 'Rejected.'; loadBlog(); });
        }); });
        d.appendChild(acts); d.appendChild(el('div', { 'class': 'actions' }, [rs, ch, rj])); d.appendChild(note);
      } else d.appendChild(el('p', { 'class': 'muted', text: 'This post is not waiting for review (status: ' + p.status + (p.live ? ', published' : '') + ').' }));
      if (p.live && !p.scheduled) {
        var rbox = el('p', { 'class': 'small muted', text: 'Loading reactions…' }); d.appendChild(rbox);
        call('blog_reactors', { id: p.id }).then(function (r) {
          if (!r.ok) { rbox.textContent = ''; return; }
          rbox.textContent = r.like + ' likes · ' + r.helpful + ' helpful · ' + r.grew + ' grew it too · ' + r.photo + ' great photo · ' + r.thanks + ' thanks' + ((r.who || []).length ? '. Reacted: ' + r.who.slice(0, 20).map(function (w) { return w.alias + ' (' + w.kind + ')'; }).join(', ') + (r.who.length > 20 ? ' …' : '') : '.');
        });
      }
      if (p.live && !p.scheduled && p.slug) d.appendChild(substackBox(p, imgs));
      if (p.live && p.scheduled) d.appendChild(el('p', { 'class': 'notice' }, [document.createTextNode('Scheduled: appears on ' + fmt(p.published_at) + '. Move or cancel it from the Scheduled list above.')]));
      if (p.live) {
        var urs = reasonPicker(), un = el('button', { type: 'button', 'class': 'btn danger', text: 'Take the published post down' });
        un.addEventListener('click', function () { msg.textContent = ''; if (!urs.value) { msg.textContent = 'Choose a reason first.'; return; } if (!confirm('Take this post off the blog now?')) return; call('blog_unpublish', { id: p.id, reason: urs.value }).then(function (r) { if (!r.ok) { msg.textContent = errText(r); return; } d.textContent = 'Taken down.'; loadBlog(); }); });
        if (p.slug) d.appendChild(el('p', {}, [el('a', { href: 'post.html?p=' + encodeURIComponent(p.slug), target: '_blank', rel: 'noopener', text: 'See the published post' })]));
        d.appendChild(el('div', { 'class': 'actions' }, [urs, un]));
      }
      d.appendChild(msg);
    });
  }
  // "Copy for Substack": only for the signed-in staff member's OWN published posts. Member posts are never copied out.
  function myId() { try { var t = A.getSession().access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(t + '==='.slice((t.length + 3) % 4))).sub || ''; } catch (e) { return ''; } }
  function substackBox(p, imgs) {
    var box = el('div', { 'class': 'wr-set' });
    if (!p.author_id || p.author_id !== myId()) { box.appendChild(el('p', { 'class': 'small muted', text: 'Copy for Substack is only for posts you wrote yourself. Member posts are never copied out.' })); return box; }
    var post = location.origin + '/post.html?p=' + encodeURIComponent(p.slug);
    var r = window.LTBlocks.toHTML(p.body, { image: function (iid) { return imgs[iid] || null; } });
    var closing = 'First published on Lineage Tracker: ' + post + '\nTrack your own breeding for free: https://app.lineagetracker.org/';
    var html = '<h1>' + (p.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</h1>\n' + r.html + '\n<hr>\n<p>First published on Lineage Tracker: <a href="' + post + '">' + post + '</a></p>\n<p>Track your own breeding for free: <a href="https://app.lineagetracker.org/">app.lineagetracker.org</a></p>';
    var text = (p.title || '') + '\n\n' + r.text + '\n\n---\n' + closing;
    var say = el('p', { 'class': 'small muted', role: 'status' });
    var btn = el('button', { type: 'button', 'class': 'btn', text: 'Copy for Substack' });
    btn.addEventListener('click', function () {
      var done = function () { say.textContent = 'Copied. In Substack, start a new post and paste. Add the photos where the [Photo] lines are.'; };
      var fallback = function () { var ta = el('textarea', { rows: 6, readonly: true }); ta.value = text; box.appendChild(ta); ta.select(); say.textContent = 'Press copy on your keyboard, then paste into Substack.'; };
      try {
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(done, fallback);
        else navigator.clipboard.writeText(text).then(done, fallback);
      } catch (e) { fallback(); }
    });
    box.appendChild(el('p', {}, [el('b', { text: 'Share on Substack. ' }), el('span', { 'class': 'small muted', text: 'Copies the whole post as clean text with one closing link back to this post and the app.' })]));
    box.appendChild(btn); box.appendChild(say);
    if (r.photos.length) {
      box.appendChild(el('p', { 'class': 'small', text: 'Photos to save and add yourself (links open the picture; these links stop working after a short while, so save them now):' }));
      var ul = el('ul', { 'class': 'small' });
      r.photos.forEach(function (x) { ul.appendChild(el('li', {}, [x.url ? el('a', { href: x.url, target: '_blank', rel: 'noopener', text: 'Photo ' + x.n }) : document.createTextNode('Photo ' + x.n), document.createTextNode(x.caption ? ' (' + x.caption + ')' : '')])); });
      box.appendChild(ul);
    }
    return box;
  }
  // a day picked on this page, as a time at 9am in this browser (empty, today or earlier means "now")
  function atDate(v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null; var t = new Date(v + 'T09:00:00'); return t.getTime() > Date.now() ? t.toISOString() : null; }
  function loadScheduled() {
    var box = $('st_bsched'); box.textContent = '';
    call('blog_scheduled').then(function (j) {
      if (!j.ok) { box.textContent = errText(j); return; }
      $('st_bsched_n').textContent = j.rows.length;
      if (!j.rows.length) { box.appendChild(el('p', { 'class': 'muted', text: 'Nothing is scheduled.' })); return; }
      box.appendChild(table(['Appears', 'Title', 'Author', 'Move to', ''], j.rows.map(function (p) {
        var inp = el('input', { type: 'date', 'aria-label': 'New day', value: String(p.published_at).slice(0, 10) });
        var b = el('button', { type: 'button', 'class': 'btn', text: 'Move' });
        b.addEventListener('click', function () { b.disabled = true; call('blog_reschedule', { id: p.id, publish_at: atDate(inp.value) || new Date().toISOString() }).then(function (r) { b.disabled = false; if (!r.ok) { alert(errText(r)); return; } loadBlog(); }); });
        var o = el('button', { type: 'button', 'class': 'btn', text: 'Open' }); o.addEventListener('click', function () { openPost(p.id); });
        return [fmt(p.published_at), p.title, p.author_alias, inp, el('span', {}, [b, document.createTextNode(' '), o])];
      })));
    });
  }
  function loadLive(off) {
    var box = $('st_blive'); box.textContent = '';
    call('blog_live', { limit: PAGE, offset: off }).then(function (j) {
      if (!j.ok) { box.textContent = errText(j); return; }
      if (!j.rows.length) { $('st_bviews').textContent = ''; box.appendChild(el('p', { 'class': 'muted', text: 'Nothing published yet.' })); return; }
      $('st_bviews').textContent = 'Page loads: ' + j.views_total + ' in all, ' + j.views7_total + ' in the last 7 days. These are rough counts of page loads (no address, cookie or visitor id is kept), not readers.';
      box.appendChild(table(['Published', 'Title', 'Author', 'Likes', 'Page loads', 'Last 7 days', ''], j.rows.map(function (p) {
        var b = el('button', { type: 'button', 'class': 'btn', text: 'Open' }); b.addEventListener('click', function () { openPost(p.id); });
        return [fmt(p.published_at).split(',')[0], (p.pending_edit ? '(update waiting) ' : '') + p.title, p.author_alias, String(p.likes), String(p.views), String(p.views7), b];
      })));
      var pg = el('p'); if (off > 0) { var pv = el('button', { type: 'button', 'class': 'btn', text: 'Newer' }); pv.onclick = function () { loadLive(off - PAGE); }; pg.appendChild(pv); }
      if (off + PAGE < j.total) { var nx = el('button', { type: 'button', 'class': 'btn', text: 'Older' }); nx.onclick = function () { loadLive(off + PAGE); }; pg.appendChild(nx); }
      box.appendChild(pg);
    });
  }
  function loadKinds() {
    var box = $('st_bkinds'); box.hidden = false; var list = $('st_bkind_list'); list.textContent = '';
    call('blog_kinds').then(function (j) {
      if (!j.ok) { list.textContent = errText(j); return; }
      j.kinds.forEach(function (k) {
        var cb = el('input', { type: 'checkbox' }); cb.checked = k.active;
        cb.addEventListener('change', function () { call('blog_kind_set', { key: k.key, label: k.label, active: cb.checked }).then(function (r) { if (!r.ok) { cb.checked = !cb.checked; alert(errText(r)); } }); });
        list.appendChild(el('label', { 'class': 'chip-in' }, [cb, el('span', { text: k.label })]));
      });
    });
  }
  $('st_bkind_add').addEventListener('submit', function (e) {
    e.preventDefault(); var label = $('st_bkind_label').value.trim(), key = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    if (!key) return;
    call('blog_kind_set', { key: key, label: label.slice(0, 40), active: true }).then(function (r) { if (!r.ok) { alert(errText(r)); return; } $('st_bkind_label').value = ''; loadKinds(); });
  });
  // partner versions
  var PREASONS = [['impersonation', 'Speaks for an organisation that has not asked for it'], ['selling', 'Reads as an advert'], ['contact_details', 'Contact details in it'], ['offensive', 'Wording not suitable'],
    ['not_clear', 'Not clear what it is for'], ['logo_problem', 'Logo problem'], ['link_problem', 'A web address does not work'], ['misuse', 'Reported or misused'], ['other', 'Other (say why in the note)']];
  function preasonPicker() { return el('select', { 'aria-label': 'Reason' }, [el('option', { value: '', text: 'Choose a reason' })].concat(PREASONS.map(function (r) { return el('option', { value: r[0], text: r[1] }); }))); }
  var PSTATUS = { approved: 'Live', disabled: 'Switched off', rejected: 'Rejected', changes: 'Changes asked for', withdrawn: 'Withdrawn', pending: 'Waiting' };
  function varietyNames(L) {
    if (!L || !window.DecompressionStream) return Promise.resolve(null);
    try {
      var b = L.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      var bin = atob(b), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate'))).text().then(function (t) { return JSON.parse(t).varieties || []; }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function loadPartners() {
    var box = $('st_pqueue'); box.textContent = 'Loading…'; $('st_ppost').hidden = true;
    call('partner_queue').then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      if (!j.items.length) box.appendChild(el('p', { 'class': 'muted', text: 'Nothing is waiting for review.' }));
      else box.appendChild(table(['Waiting since', 'Name', 'Member', ''], j.items.map(function (p) {
        var b = el('button', { type: 'button', 'class': 'btn primary', text: 'Review' }); b.addEventListener('click', function () { openPartner(p.id); });
        return [fmt(p.created_at), p.name, p.owner || '(deleted)', b];
      })));
    });
    var lb = $('st_plist'); lb.textContent = '';
    call('partner_list', { limit: 50, offset: 0 }).then(function (j) {
      if (!j.ok) { lb.textContent = errText(j); return; }
      if (!j.items.length) { lb.appendChild(el('p', { 'class': 'muted', text: 'Nothing decided yet.' })); return; }
      lb.appendChild(table(['Updated', 'Name', 'Member', 'Status', 'Expires', ''], j.items.map(function (p) {
        var b = el('button', { type: 'button', 'class': 'btn', text: 'Open' }); b.addEventListener('click', function () { openPartner(p.id); });
        return [fmt(p.updated_at), p.name || '(emptied)', p.owner || '(deleted)', PSTATUS[p.status] || p.status, p.exp ? fmt(p.exp).split(',')[0] : '', b];
      })));
    });
  }
  function openPartner(id) {
    var d = $('st_ppost'); d.hidden = false; d.textContent = 'Loading…'; d.scrollIntoView();
    call('partner_get', { id: id }).then(function (j) {
      d.textContent = ''; if (!j.ok) { d.textContent = errText(j); return; }
      var p = j.partner, c = {}; try { c = JSON.parse(p.cfg); } catch (e) { /* shown as empty */ }
      d.appendChild(el('p', { 'class': 'small muted', text: 'Made by ' + (p.owner || '(deleted member)') + ' on ' + fmt(p.created_at) + '. Status: ' + (PSTATUS[p.status] || p.status) + (p.exp ? ', expires ' + fmt(p.exp).split(',')[0] : '') + (p.flags ? ', flags: ' + p.flags : '') + '.' }));
      var rows = [['Name', c.n], ['Organisation', c.o], ['Welcome message', c.w], ['Website', c.u], ['Logo address', c.l], ['Variety list address', c.c], ['For', c.k], ['Most detailed mode', c.m], ['Hidden features', (c.h || []).join(', ')], ['Colours', (c.p || '(default)') + ' and ' + (c.a || '(default)')]];
      d.appendChild(table(['Field', 'What it says'], rows.map(function (r) { return [r[0], r[1] || '(none)']; })));
      if (c.l) d.appendChild(el('p', { 'class': 'small muted' }, [document.createTextNode('The staff page never loads pictures from other websites. To look at the logo, open it in its own tab: '), el('a', { href: c.l, target: '_blank', rel: 'noopener noreferrer', text: 'open the logo' }), document.createTextNode('.')]));
      if (c.L) {
        var vl = el('p', { 'class': 'small', text: 'A variety list is packed into the link. Reading it…' }); d.appendChild(vl);
        varietyNames(c.L).then(function (list) {
          if (!list) { vl.textContent = 'A variety list is packed into the link, but it could not be read here. Do not approve until it can be.'; return; }
          vl.textContent = list.length + ' varieties in the list. First ' + Math.min(40, list.length) + ': ' + list.slice(0, 40).map(function (x) { return String(x.name || '') + (x.description ? ' (' + String(x.description).slice(0, 80) + ')' : ''); }).join('; ');
        });
      }
      var msg = el('p', { 'class': 'err', role: 'alert' }), acts = el('div', { 'class': 'actions' });
      if (p.status === 'pending') {
        var ap = el('button', { type: 'button', 'class': 'btn primary', text: 'Approve and sign the link' });
        ap.addEventListener('click', function () { msg.textContent = ''; ap.disabled = true; call('partner_decide', { id: p.id, decision: 'approve' }).then(function (r) { ap.disabled = false; if (!r.ok) { msg.textContent = errText(r); return; } d.textContent = 'Approved. The owner has been emailed.'; loadPartners(); }); });
        acts.appendChild(ap);
        var rs = preasonPicker(), note = el('textarea', { rows: 2, maxlength: 1000, placeholder: 'Note to the owner (optional, they will see it)', 'aria-label': 'Note to the owner' });
        var ch = el('button', { type: 'button', 'class': 'btn', text: 'Ask for changes' }), rj = el('button', { type: 'button', 'class': 'btn danger', text: 'Reject' });
        [[ch, 'changes'], [rj, 'reject']].forEach(function (x) { x[0].addEventListener('click', function () {
          msg.textContent = ''; if (!rs.value) { msg.textContent = 'Choose a reason first.'; return; }
          call('partner_decide', { id: p.id, decision: x[1], reason: rs.value, note: note.value }).then(function (r) { if (!r.ok) { msg.textContent = errText(r); return; } d.textContent = x[1] === 'changes' ? 'Sent back to the owner.' : 'Rejected.'; loadPartners(); });
        }); });
        d.appendChild(acts); d.appendChild(el('div', { 'class': 'actions' }, [rs, ch, rj])); d.appendChild(note);
      } else if (p.status === 'approved') {
        var urs = preasonPicker(), un = el('button', { type: 'button', 'class': 'btn danger', text: 'Switch this version off' });
        un.addEventListener('click', function () { msg.textContent = ''; if (!urs.value) { msg.textContent = 'Choose a reason first.'; return; } if (!confirm('Switch this version off? Devices go back to plain Lineage Tracker the next time they check.')) return; call('partner_status', { id: p.id, status: 'disabled', reason: urs.value }).then(function (r) { if (!r.ok) { msg.textContent = errText(r); return; } d.textContent = 'Switched off.'; loadPartners(); }); });
        var rg = el('button', { type: 'button', 'class': 'btn', text: 'Sign it again (new 12 months)' });
        rg.addEventListener('click', function () { msg.textContent = ''; call('partner_resign', { id: p.id }).then(function (r) { msg.textContent = r.ok ? 'Signed again. The owner finds the new link on their page.' : errText(r); }); });
        d.appendChild(el('div', { 'class': 'actions' }, [urs, un, rg]));
      } else if (p.status === 'disabled') {
        var on = el('button', { type: 'button', 'class': 'btn primary', text: 'Switch it back on' });
        on.addEventListener('click', function () { msg.textContent = ''; call('partner_status', { id: p.id, status: 'approved' }).then(function (r) { if (!r.ok) { msg.textContent = errText(r); return; } d.textContent = 'Switched back on.'; loadPartners(); }); });
        d.appendChild(el('div', { 'class': 'actions' }, [on]));
      } else d.appendChild(el('p', { 'class': 'muted', text: 'Nothing to do with this one (status: ' + (PSTATUS[p.status] || p.status) + ').' }));
      d.appendChild(msg);
    });
  }
  // invitations
  $('st_inv_check').addEventListener('click', function () {
    var out = $('st_inv_out'); out.textContent = '';
    call('invite_preview', { audience: $('st_inv_aud').value }).then(function (j) { out.textContent = j.ok ? j.eligible + ' people could be invited now.' : errText(j); });
  });
  $('st_inv_form').addEventListener('submit', function (e) {
    e.preventDefault(); var out = $('st_inv_out'), n = Math.min(50, Math.max(1, parseInt($('st_inv_n').value, 10) || 1)), aud = $('st_inv_aud').value;
    if (!confirm('Send up to ' + n + ' invitation emails now to people who ticked the community pages or the globe? Each person is only invited once.')) return;
    var b = $('st_inv_send'); b.disabled = true; out.textContent = 'Sending (about a second each)…';
    call('invite_send', { audience: aud, max: n }).then(function (j) { b.disabled = false; out.textContent = j.ok ? 'Sent ' + j.sent + (j.failed ? ', ' + j.failed + ' could not be sent' : '') + '. ' + j.remaining + ' still eligible.' : errText(j); });
  });
  // audit
  ACTIONS.forEach(function (a) { $('st_afilter').appendChild(el('option', { value: a, text: a.replace(/_/g, ' ') })); });
  $('st_afilter').addEventListener('change', function () { loadAudit(0); });
  function loadAudit(off) {
    var box = $('st_alist'); box.textContent = 'Loading…';
    call('audit_list', { filter: $('st_afilter').value, limit: AUDIT_PAGE, offset: off }).then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      box.appendChild(table(['When', 'What', 'Who', 'About', 'Detail'], j.rows.map(function (r) { return [fmt(r.at), r.action.replace(/_/g, ' '), r.actor_alias || (r.actor ? 'deleted member' : 'system'), r.target_alias || (r.target ? 'deleted member' : ''), r.detail && Object.keys(r.detail).length ? JSON.stringify(r.detail) : '']; })));
      var pg = $('st_apager'); pg.textContent = ''; pg.appendChild(el('span', { text: j.total + ' entries ' }));
      if (off > 0) { var p = el('button', { type: 'button', 'class': 'btn', text: 'Newer' }); p.addEventListener('click', function () { loadAudit(off - AUDIT_PAGE); }); pg.appendChild(p); }
      if (off + AUDIT_PAGE < j.total) { var n = el('button', { type: 'button', 'class': 'btn', text: 'Older' }); n.addEventListener('click', function () { loadAudit(off + AUDIT_PAGE); }); pg.appendChild(n); }
    });
  }
  // setup check: facts that must be true for the account system to be safe
  function loadHealth() {
    var box = $('st_health'); box.textContent = 'Checking…';
    call('health').then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      var h = j.health, a = j.auth || {}, rows = [];
      function add(state, title, detail) { rows.push([state === 'ok' ? 'OK' : state === 'bad' ? 'FIX' : state === 'warn' ? 'CHECK' : 'UNKNOWN', title, detail]); }
      var tri = function (v, want) { return v === undefined || v === null ? 'unknown' : (v === want ? 'ok' : 'bad'); };
      add(tri(a.disable_signup, true), 'Public sign-up at Supabase Auth is switched off', a.disable_signup === true ? 'Good. Logins can only be created by our server.' : a.disable_signup === false ? 'It is ON. Anyone could create logins that skip our checks. Supabase dashboard > Authentication > Sign In / Providers: turn off "Allow new users to sign up".' : 'Could not be read from here. Check it in the Supabase dashboard.');
      add(tri(a.mailer_autoconfirm, false), 'Email confirmation is required at Supabase Auth', a.mailer_autoconfirm === false ? 'Good.' : a.mailer_autoconfirm === true ? 'It is OFF (auto-confirm). Turn "Confirm email" back on.' : 'Could not be read from here. Check "Confirm email" in the Supabase dashboard.');
      add(tri(a.anonymous_users, false), 'Anonymous sign-ins are off', a.anonymous_users === false ? 'Good.' : a.anonymous_users === true ? 'They are ON. Turn them off in Authentication > Sign In / Providers.' : 'Could not be read from here.');
      add(tri(a.phone_enabled, false), 'Phone sign-in is off', a.phone_enabled === false ? 'Good.' : a.phone_enabled === true ? 'It is ON. Turn it off.' : 'Could not be read from here.');
      add(h.admins >= 1 ? 'ok' : 'bad', 'At least one administrator', h.admins + ' administrator' + (h.admins === 1 ? '' : 's') + '.' + (h.admins === 1 ? ' Consider a second one, so you cannot be locked out.' : ''));
      add(h.mfa_required ? 'ok' : 'bad', 'Staff need two-step sign-in', h.mfa_required ? 'Required.' : 'The requirement is OFF in the database. Turn it back on (SQL editor: update feature_flags set enabled = true where key = \'admin_require_mfa\').');
      add(h.staff_without_authenticator === 0 ? 'ok' : 'warn', 'Every staff member has an authenticator app set up', h.staff_without_authenticator === 0 ? 'Yes.' : h.staff_without_authenticator + ' staff member(s) have none yet and cannot use this page until they set one up on their account page.');
      add(h.open_functions.length === 0 ? 'ok' : 'bad', 'Staff-only database functions are closed to the public', h.open_functions.length === 0 ? 'Yes.' : 'These are open by mistake: ' + h.open_functions.join(', ') + '. Re-run the last section of 10_accounts.sql.');
      add(h.cleanup_scheduled === true ? 'ok' : 'warn', 'Daily tidy-up is scheduled', h.cleanup_scheduled === true ? 'Yes.' : h.cleanup_scheduled === false ? 'pg_cron is on but the job is missing. Run 11_accounts_cleanup_schedule.sql.' : 'pg_cron is not enabled. Unconfirmed accounts and old counters are then not removed automatically (optional step 11 in the guide).');
      add('ok', 'Sign-up is ' + (h.signup_open ? 'OPEN' : 'closed'), 'Change it under Switches. Terms version in force: ' + h.terms_current + '.');
      box.appendChild(table(['', 'Check', 'Detail'], rows));
      box.appendChild(el('p', { 'class': 'small muted', text: 'Not visible from here, so check them by hand in the Supabase dashboard (the go-live guide lists each one): CAPTCHA protection turned on with the Turnstile secret; "Secure password change" on; no custom email (SMTP) set up for Auth unless you have thought about it; minimum password length 10.' }));
    });
  }
  // switches
  function loadFlags() {
    var box = $('st_flags'); box.textContent = 'Loading…';
    call('flags_list').then(function (j) {
      box.textContent = ''; if (!j.ok) { box.textContent = errText(j); return; }
      j.flags.forEach(function (f) {
        var cb = el('input', { type: 'checkbox', id: 'fl_' + f.key }); cb.checked = f.enabled; cb.disabled = role !== 'admin' || f.key === 'admin_require_mfa';
        var msg = el('span', { 'class': 'err' });
        cb.addEventListener('change', function () { msg.textContent = ''; call('flag_set', { key: f.key, enabled: cb.checked }).then(function (r) { if (!r.ok) { cb.checked = !cb.checked; msg.textContent = errText(r); } }); });
        box.appendChild(el('div', { 'class': 'flagrow' }, [el('label', { 'for': 'fl_' + f.key }, [cb, el('b', { text: ' ' + f.key })]), el('p', { 'class': 'small muted', text: f.note + (f.key === 'admin_require_mfa' ? ' (Change this one in the database only.)' : '') }), msg]));
      });
    });
  }
  $('st_out').addEventListener('click', function () { A.signOut().then(function () { location.href = 'signin.html'; }); });
})();
