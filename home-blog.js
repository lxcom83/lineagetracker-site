/* Home page: the three newest approved blog posts.  Reads the same public list as blog.html; shows plain text only.
   If the blog is not open yet, or there are no posts, a short friendly line is shown instead. */
(function () {
  var URL = 'https://zlekqqzvkstdcrrupzfs.supabase.co', KEY = 'sb_publishable_rkMTn3vFh8y77G9Lj5peAA_pN1tS_Fs';
  var list = document.getElementById('hb_list'), msg = document.getElementById('hb_msg');
  if (!list) return;
  function say(t) { msg.textContent = t; }
  function fmt(t) { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
  fetch(URL + '/rest/v1/rpc/blog_public_list', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_kind: '', p_interest: '', p_author: '', p_q: '', p_offset: 0, p_limit: 3 }) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || j.open === false || !j.rows || !j.rows.length) { say('Member stories are coming soon. Have something to share? You can write the first one.'); return; }
      // a small "New" dot on the Blog menu link when the newest post is newer than your last visit to the blog.
      // The "last seen" time lives only in this browser; nothing is sent anywhere.
      try {
        var seen = +localStorage.getItem('ltBlogSeen') || 0, newest = new Date(j.rows[0].published_at).getTime();
        if (newest > seen) { document.querySelectorAll('nav a[href="blog.html"]').forEach(function (a) { if (a.querySelector('.nb')) return; var b = document.createElement('span'); b.className = 'nb'; b.textContent = 'New'; b.style.cssText = 'margin-left:4px;padding:1px 6px;border-radius:9px;background:var(--copper,#b8693d);color:#fff;font-size:.7em;font-weight:700;vertical-align:middle'; b.setAttribute('aria-label', '(new posts)'); a.appendChild(b); }); }
      } catch (e) { /* the dot is optional */ }
      list.textContent = '';
      j.rows.forEach(function (p) {
        var d = document.createElement('p'), a = document.createElement('a'), s = document.createElement('span');
        a.href = 'post.html?p=' + encodeURIComponent(p.slug); a.textContent = p.title; a.style.fontWeight = '700';
        s.className = 'small'; s.style.fontWeight = '400'; s.style.color = 'var(--muted)'; s.textContent = ' · ' + p.byline + ', ' + fmt(p.published_at);
        d.appendChild(a); d.appendChild(s); list.appendChild(d);
      });
    })
    .catch(function () { say('Member stories are coming soon.'); });
})();
