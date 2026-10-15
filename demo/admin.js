(function(){
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const M=DEMO.members,MB=Object.fromEntries(M.map(m=>[m.id,m])),RG=Object.fromEntries(DEMO.regions.map(r=>[r.id,r])),CO=Object.fromEntries(DEMO.countries.map(c=>[c.id,c.name])),SN=Object.fromEntries(DEMO.states.map(s=>[s.id,s.name]));
const rn=id=>RG[id].name+', '+CO[RG[id].country];
const K='lt_demo_admin_v1';let S={role:'mod',tab:'over',audit:null,reports:null,cands:null,reqs:null,photos:null,sel:null,wl:null};
try{Object.assign(S,JSON.parse(localStorage.getItem(K)||'{}'));}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S));}catch(e){}};
const NOW=new Date('2026-10-11T12:40:00+11:00');
const fmt=d=>new Date(d).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
function seed(){
  if(!S.audit)S.audit=[{t:'2026-10-11T09:05:00+11:00',who:'Admin A1',what:'Approved group candidate C-0412 as "Added by Lineage Tracker"'},{t:'2026-10-10T16:22:00+11:00',who:'Moderator M2',what:'Resolved report R-0097: not upheld'},{t:'2026-10-10T08:48:00+11:00',who:'Admin A1',what:'Viewed identity of Member '+M[7].id+' (report R-0097)'}];
  if(!S.reports)S.reports=[
   {id:'R-0101',reporter:M[4].id,reported:M[22].id,reason:'Asking for something illegal or restricted',line:'I would love to buy some seed of your Blue Pumpkin.',shares:['handle','email'],weight:'Trusted, full weight',at:'2026-10-11T07:30:00+11:00',status:'open'},
   {id:'R-0102',reporter:M[60].id,reported:M[31].id,reason:'Looks like a scam',line:'Is your Black Futsu seed still available?',shares:['handle'],weight:'New account, low weight',at:'2026-10-10T21:10:00+11:00',status:'open'},
   {id:'R-0103',reporter:M[12].id,reported:M[90].id,reason:'Abusive or threatening',line:'Really like your Rhode Island Red. How can I get some hatching eggs?',shares:['handle','site'],weight:'Member, normal weight',at:'2026-10-09T18:02:00+11:00',status:'open'}];
  if(!S.cands)S.cands=[
   {id:'C-0412',url:'facebook.com/groups/sample-heirloom-growers',platform:'Facebook group',n:6,type:'Social media group',claim:'Local',admin:'syd',base:'syd',checks:{loads:1,short:0,safe:1,dup:0},status:'open'},
   {id:'C-0413',url:'sample-seedsavers-forum.example.org',platform:'Forum (phpBB)',n:4,type:'Online forum',claim:'Global',admin:'mel',base:'u_nyc',checks:{loads:1,short:0,safe:1,dup:0},status:'open',flag:'Admin region (Melbourne) differs from where most members are (New York City Area).'},
   {id:'C-0414',url:'bit.ly/3xampl3',platform:'Unknown',n:1,type:'Online forum',claim:'National',admin:'bne',base:'bne',checks:{loads:1,short:1,safe:1,dup:0},status:'open',flag:'Link shortener. Ask for the real address.'},
   {id:'C-0415',url:'discord.gg/sample-poultry',platform:'Discord server',n:3,type:'Discord server',claim:'Global',admin:null,base:'u_dfw',checks:{loads:1,short:0,safe:1,dup:0},status:'open',flag:'Claims global but no admin location given. Required before approval.'},
   {id:'C-0416',url:'reddit.com/r/sampleseedsaving',platform:'Reddit',n:9,type:'Online forum',claim:'Global',admin:'u_pdx',base:'u_pdx',checks:{loads:1,short:0,safe:1,dup:1},status:'open',flag:'Looks like a duplicate of an approved group.'}];
  if(!S.reqs)S.reqs=[{id:'V-0031',name:'Blue Pumpkin',crop:'Pumpkin and squash',by:M[9].id,n:3,status:'open'},{id:'V-0032',name:'Rosa Bianca Eggplant',crop:'(no crop yet)',by:M[40].id,n:1,status:'open'},{id:'V-0033',name:'Waltham Butternut (AU line)',crop:'Pumpkin and squash',by:M[3].id,n:2,status:'open'}];
  if(!S.photos)S.photos=[{id:'P-0201',label:'Fruit',item:'Cherokee Purple Tomato',by:M[15].id,status:'open'},{id:'P-0202',label:'Seedling',item:'Rainbow Chard',by:M[27].id,status:'open'},{id:'P-0203',label:'Flock',item:'Black Australorp',by:M[50].id,status:'open'}];
}
function audit(what){S.audit.unshift({t:new Date().toISOString(),who:S.role==='admin'?'Admin A1':'Moderator M2',what});save();}
const TABS=[['over','Overview'],['rep','Reports'],['grp','Groups and links'],['var','Variety requests'],['pho','Photos'],['mem','Members'],['upd','Update list','admin'],['aud','Audit log','admin']];
const open=a=>a.filter(x=>x.status==='open').length;
function tabs(){return '<div class="subnav tabs" id="atabs">'+TABS.filter(t=>!t[2]||S.role==='admin').map(t=>{let n='';if(t[0]==='rep')n=open(S.reports);if(t[0]==='grp')n=open(S.cands);if(t[0]==='var')n=open(S.reqs);if(t[0]==='pho')n=open(S.photos);return '<button data-t="'+t[0]+'" aria-pressed="'+(S.tab===t[0])+'">'+t[1]+(n?' <span class="pill">'+n+'</span>':'')+'</button>';}).join('')+'</div>';}
function over(){return '<div class="stats"><div><b>'+open(S.reports)+'</b>reports to review</div><div><b>'+open(S.cands)+'</b>groups waiting</div><div><b>'+open(S.reqs)+'</b>variety requests</div><div><b>'+open(S.photos)+'</b>photos waiting</div>'+(S.role==='admin'?'<div><b>128</b>on the update list</div>':'')+'</div>'
  +'<div class="note-box"><b>'+(S.role==='admin'?'You are an Admin.':'You are a Moderator.')+'</b> '+(S.role==='admin'?'You can see names and emails when a case needs it, change karma, suspend or ban, and see the audit log. Every time you open private details it is logged.':'You work from member IDs. You can review reports, groups, varieties and photos, add notes and suspend for up to 7 days. Names and emails are hidden. Anything bigger goes to an Admin.')+'</div>'
  +'<h3>Oldest first</h3><div class="cards one">'+S.reports.filter(r=>r.status==='open').map(r=>'<div class="dcard wide"><b>Report '+r.id+'</b> · '+esc(r.reason)+' <span class="sub">'+fmt(r.at)+'</span></div>').join('')+'</div>';}
function rep(){return '<div class="cards one">'+S.reports.map(r=>{const a=MB[r.reporter],b=MB[r.reported];
  const res=r.status==='open'?'<div class="actions"><select data-o="'+r.id+'"><option>Upheld: warning to member</option><option>Upheld: listing removed</option><option>Upheld: suspended 7 days</option><option>Not upheld</option><option>Not upheld: reporter warned (bad faith)</option></select><button class="dbtn primary" data-a="resolve" data-id="'+r.id+'">Apply decision</button><button class="dbtn" data-a="escalate" data-id="'+r.id+'">Escalate to Admin</button>'
    +(S.role==='admin'?'<button class="dbtn" data-a="reveal" data-id="'+r.id+'">Reveal identity (logged)</button>':'<button class="dbtn" disabled>Identity: Admins only</button>')+'</div>':'<p class="chipline">'+esc(r.status==='escalated'?'Escalated to Admin.':'Decision: '+r.outcome)+(r.revealed?'<br>Identity revealed and logged: '+esc(r.revealed):'')+'</p>';
  return '<div class="dcard wide"><span class="tag-demo">DEMO</span><h3>Report '+r.id+'</h3><div class="sub">'+fmt(r.at)+' · reason: '+esc(r.reason)+'</div>'
   +'<div class="cols2"><div><h4>Reported</h4><p class="idcode">Member '+b.id+'</p><div class="badgerow"><span class="karma k-'+b.level.toLowerCase()+'">Karma: '+b.level+'</span><span class="pill">'+b.swaps+' swaps</span></div></div><div><h4>Reported by</h4><p class="idcode">Member '+a.id+'</p><p class="sub">Report weight: '+esc(r.weight)+'</p></div></div>'
   +'<blockquote>“'+esc(r.line)+'”</blockquote><p class="sub">Details the reported member offered to share: '+r.shares.join(', ')+'. Nothing moves karma until a decision is applied.</p>'+res+'</div>';}).join('')+'</div>';}
const TYPES=['Online forum','Social media group','Local club','Seed library','Society','Discord server'];
function grp(){return '<div class="cards one">'+S.cands.map(c=>{
  const ok=x=>x?'<span class="okc">✓</span>':'<span class="badc">✗</span>';
  const sel=(n,arr,v)=>'<select data-f="'+n+'" data-id="'+c.id+'">'+arr.map(x=>'<option value="'+esc(x[0])+'"'+(x[0]===v?' selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select>';
  const regs=[['','(none)']].concat(DEMO.regions.map(r=>[r.id,r.name+', '+CO[r.country]]));
  const form=c.status==='open'?'<div class="formgrid"><label>Type'+sel('type',TYPES.map(x=>[x,x]),c.type)+'</label><label>Reach they claim'+sel('claim',[['Local','Local'],['National','National'],['Global','Global']],c.claim)+'</label><label>Admin is based in'+sel('admin',regs,c.admin||'')+'</label><label>Most members are in (computed)<select disabled><option>'+esc(rn(c.base))+'</option></select></label></div>'
    +'<div class="actions"><button class="dbtn primary" data-a="approve" data-id="'+c.id+'">Approve as “Added by Lineage Tracker”</button><select data-rj="'+c.id+'"><option>Unsafe site</option><option>Off topic</option><option>Link shortener or redirect</option><option>Does not load</option><option>Duplicate</option><option>Commercial link not allowed</option></select><button class="dbtn" data-a="reject" data-id="'+c.id+'">Reject with reason</button></div>':'<p class="chipline">'+esc(c.outcome)+'</p>';
  return '<div class="dcard wide"><span class="tag-demo">DEMO</span><h3 class="idcode">'+esc(c.url)+'</h3><div class="sub">'+esc(c.platform)+' · suggested by '+c.n+' member'+(c.n===1?'':'s')+' · '+c.id+'</div>'
   +'<p class="checks">Loads '+ok(c.checks.loads)+' · Not a shortener '+ok(!c.checks.short)+' · Safe browsing '+ok(c.checks.safe)+' · Not a duplicate '+ok(!c.checks.dup)+'</p>'+(c.flag?'<div class="warnbox">'+esc(c.flag)+'</div>':'')+form+'</div>';}).join('')+'</div>';}
function varq(){return '<div class="cards one">'+S.reqs.map(v=>{const act=v.status==='open'?'<div class="actions"><button class="dbtn primary" data-a="vadd" data-id="'+v.id+'">Add to the list</button><select data-vm="'+v.id+'"><option>Map to existing: Waltham Butternut</option><option>Map to existing: Long Island Cheese Pumpkin</option><option>Map to existing: Jarrahdale Pumpkin</option></select><button class="dbtn" data-a="vmap" data-id="'+v.id+'">Map as alias</button><button class="dbtn" data-a="vrej" data-id="'+v.id+'">Reject</button></div>':'<p class="chipline">'+esc(v.outcome)+'</p>';
  return '<div class="dcard wide"><span class="tag-demo">DEMO</span><h3>'+esc(v.name)+'</h3><div class="sub">Crop: '+esc(v.crop)+' · asked by '+v.n+' member'+(v.n===1?'':'s')+' (first: <span class="idcode">Member '+v.by+'</span>) · '+v.id+'</div>'+act+'</div>';}).join('')+'</div>';}
function pho(){return '<div class="cards">'+S.photos.map(p=>{const act=p.status==='open'?'<div class="actions"><button class="dbtn primary" data-a="pok" data-id="'+p.id+'">Approve</button><select data-pr="'+p.id+'"><option>Shows a face</option><option>Shows writing or an address</option><option>Not the right item</option><option>Poor quality</option></select><button class="dbtn" data-a="prej" data-id="'+p.id+'">Reject</button></div>':'<p class="chipline">'+esc(p.outcome)+'</p>';
  return '<div class="dcard"><span class="tag-demo">DEMO</span><div class="ph">photo (placeholder)</div><h3>'+esc(p.item)+'</h3><div class="sub">Label: '+esc(p.label)+' · <span class="idcode">Member '+p.by+'</span> · location data already stripped</div>'+act+'</div>';}).join('')+'</div>';}
function mem(){const q=($('#mq')?$('#mq').value:'').toUpperCase().trim();const list=q?M.filter(m=>m.id.includes(q)).slice(0,8):[];const m=S.sel&&MB[S.sel];
  const log=m?[['2026-10-09T08:00','Passive','Linked app in use, monthly',+1],['2026-09-28T14:12','Check-in','Introduction check-in answered positive',+3],['2026-09-14T10:41','Bad link','Link rejected: does not load (reversed, fixed in 14 days)',-1],['2026-09-16T09:03','Bad link','Rejection reversed after fix',+1],['2026-08-30T17:25','Check-in','Introduction check-in answered positive',+3]]:[];
  return '<div class="dcontrols"><label>Find a member by ID<input id="mq" type="search" placeholder="for example C9A" value="'+esc(q)+'"></label></div>'
   +(list.length?'<div class="cards one">'+list.map(x=>'<div class="dcard wide"><span class="idcode">Member '+x.id+'</span> '+'<span class="karma k-'+x.level.toLowerCase()+'">'+x.level+'</span> <button class="dbtn" data-a="open" data-id="'+x.id+'">Open</button></div>').join('')+'</div>':'<p class="signin">Type part of an ID.</p>')
   +(m?'<div class="dcard wide"><h3 class="idcode">Member '+m.id+'</h3><div class="badgerow"><span class="karma k-'+m.level.toLowerCase()+'">Karma: '+m.level+'</span><span class="pill">'+m.swaps+' swaps</span><span class="pill">Member since '+esc(m.since)+'</span></div><p class="sub">'+esc(RG[m.region].name)+' · status: active</p>'
     +'<div class="actions"><button class="dbtn" data-a="note" data-id="'+m.id+'">Add a note</button><button class="dbtn" data-a="susp7" data-id="'+m.id+'">Suspend 7 days</button>'+(S.role==='admin'?'<button class="dbtn" data-a="ban" data-id="'+m.id+'">Ban</button><button class="dbtn" data-a="adj" data-id="'+m.id+'">Adjust karma</button><button class="dbtn" data-a="mreveal" data-id="'+m.id+'">Reveal identity (logged)</button>':'<button class="dbtn" disabled>Ban, karma changes and identity: Admins only</button>')+'</div>'
     +(m.revealed?'<p class="chipline">Identity revealed and logged: sample name · '+m.id.toLowerCase()+'@example.com</p>':'')
     +'<h4>Karma log (server time)</h4><table class="klog"><tr><th>When</th><th>Kind</th><th>What</th><th>Points</th></tr>'+log.map(l=>'<tr><td>'+fmt(l[0]+':00+11:00')+'</td><td>'+l[1]+'</td><td>'+esc(l[2])+'</td><td>'+(l[3]>0?'+':'')+l[3]+'</td></tr>').join('')+'</table></div>':'');}
function upd(){return '<div class="stats"><div><b>128</b>sign-ups</div><div><b>96</b>confirmed</div><div><b>28</b>waiting to confirm</div><div><b>4</b>unsubscribed</div></div>'
  +'<div class="cols2"><div class="dcard"><h4>By country</h4><p>Australia 74<br>United States 31<br>New Zealand 9<br>United Kingdom 6<br>Other 8</p></div><div class="dcard"><h4>What they want to hear about</h4><p>App updates 101<br>Community launch 88<br>Swap board 64<br>Plants 79 · Animals 31 · Both 18</p></div></div>'
  +'<div class="actions"><button class="dbtn" disabled>Export confirmed list (CSV)</button><button class="dbtn" disabled>Draft an update</button></div><p class="signin">Sample counts. Only confirmed, not-unsubscribed people can be emailed. Every export is logged.</p>';}
function aud(){return '<table class="klog"><tr><th>When</th><th>Who</th><th>What</th></tr>'+S.audit.map(a=>'<tr><td>'+fmt(a.t)+'</td><td>'+esc(a.who)+'</td><td>'+esc(a.what)+'</td></tr>').join('')+'</table><p class="signin">Append only. Includes every time private details are opened.</p>';}
function render(){seed();if(S.role!=='admin'&&['upd','aud'].includes(S.tab))S.tab='over';
  $('#rolebar').innerHTML='<b>Viewing as</b><span class="seg" id="roleSeg"><button data-r="mod" aria-pressed="'+(S.role==='mod')+'">Moderator</button><button data-r="admin" aria-pressed="'+(S.role==='admin')+'">Admin</button></span><span class="dsnote">Dummy data only. Nothing here is real or saved on a server.</span><button class="dbtn" id="rReset">Reset demo</button>';
  $('#aview').innerHTML=tabs()+({over,rep,grp,var:varq,pho,mem,upd,aud}[S.tab]||over)();save();}
function upr(list,id,patch,msg){S[list]=S[list].map(x=>x.id===id?Object.assign({},x,patch):x);audit(msg);render();}
document.addEventListener('click',e=>{
  const r=e.target.closest('[data-r]');if(r&&r.closest('#roleSeg')){S.role=r.dataset.r;render();return;}
  if(e.target.id==='rReset'){try{localStorage.removeItem(K);}catch(x){}S={role:S.role,tab:'over'};render();return;}
  const t=e.target.closest('#atabs [data-t]');if(t){S.tab=t.dataset.t;render();return;}
  const b=e.target.closest('[data-a]');if(!b)return;const id=b.dataset.id,a=b.dataset.a,v=s=>document.querySelector(s);
  if(a==='resolve'){const o=v('[data-o="'+id+'"]').value;upr('reports',id,{status:'done',outcome:o},'Resolved report '+id+': '+o.toLowerCase());}
  if(a==='escalate')upr('reports',id,{status:'escalated'},'Escalated report '+id+' to Admin');
  if(a==='reveal'){const r0=S.reports.find(x=>x.id===id);upr('reports',id,{revealed:'Member '+r0.reported+' · sample name · '+r0.reported.toLowerCase()+'@example.com'},'Viewed identity of Member '+r0.reported+' (report '+id+')');}
  if(a==='approve'){const g=x=>(v('[data-f="'+x+'"][data-id="'+id+'"]')||{}).value;const c=S.cands.find(x=>x.id===id),adm=g('admin');
    if(g('claim')==='Global'&&!adm){alert('A global group must say where its admin is before it can be approved.');return;}
    upr('cands',id,{status:'done',outcome:'Approved as “Added by Lineage Tracker”. '+g('type')+', claims '+g('claim').toLowerCase()+', admin in '+(adm?rn(adm):'not given')+', most members in '+rn(c.base)+'.'},'Approved group candidate '+id);}
  if(a==='reject'){const o=v('[data-rj="'+id+'"]').value;upr('cands',id,{status:'done',outcome:'Rejected: '+o+'. The members who suggested it are shown this reason.'},'Rejected group candidate '+id+': '+o.toLowerCase());}
  if(a==='vadd')upr('reqs',id,{status:'done',outcome:'Added to the list. The member is told.'},'Added variety request '+id);
  if(a==='vmap'){const o=v('[data-vm="'+id+'"]').value;upr('reqs',id,{status:'done',outcome:o+' (saved as an alias).'},'Mapped variety request '+id);}
  if(a==='vrej')upr('reqs',id,{status:'done',outcome:'Rejected.'},'Rejected variety request '+id);
  if(a==='pok')upr('photos',id,{status:'done',outcome:'Approved. Now visible.'},'Approved photo '+id);
  if(a==='prej'){const o=v('[data-pr="'+id+'"]').value;upr('photos',id,{status:'done',outcome:'Rejected: '+o+'.'},'Rejected photo '+id+': '+o.toLowerCase());}
  if(a==='open'){S.sel=id;render();}
  if(a==='note'||a==='susp7'||a==='ban'||a==='adj'){const msg={note:'Added a note to',susp7:'Suspended for 7 days:',ban:'Banned:',adj:'Adjusted karma for'}[a]+' Member '+id;audit(msg);alert('Demo: "'+msg+'" is recorded in the audit log.');render();}
  if(a==='mreveal'){MB[id].revealed=1;audit('Viewed identity of Member '+id);render();}
});
document.addEventListener('input',e=>{if(e.target.id==='mq'){const p=e.target.selectionStart;render();const i=$('#mq');i.focus();i.setSelectionRange(p,p);}});
render();
})();
