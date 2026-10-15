(function(){
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ME=DS.me,S=DEMO.swaps,M=DEMO.members,LIST=Object.fromEntries(S.map(l=>[l.id,l])),MB=Object.fromEntries(M.map(m=>[m.id,m])),RG=Object.fromEntries(DEMO.regions.map(r=>[r.id,r])),SN=Object.fromEntries(DEMO.states.map(s=>[s.id,s.name]));
const WAYS0=[{id:'handle',label:'Handle',val:'SeedSaverSam',on:true},{id:'name',label:'Real name',val:'Sam Taylor',on:false},{id:'email',label:'Email (confirmed)',val:'sam@example.com',on:false},{id:'site',label:'Website',val:'example.org/sams-garden',on:true},{id:'forum',label:'Forum or social profile',val:'example.org/forum/sam',on:false}];
const MY=[{id:'MY1',variety:'Black Futsu',form:'Seed',reach:['AU-NSW','AU-VIC','AU-QLD','AU-SA','AU-WA','AU-TAS','AU-NT','AU-ACT'],sends:'Australia-wide'},{id:'MY2',variety:'Rainbow Chard',form:'Seed',reach:['AU-NSW'],sends:'My state only'}];
const crossMsg=(a,b)=>{if(a===b)return '';return (a.slice(0,2)!==b.slice(0,2)?'This crosses a country border':'This crosses a state border')+' ('+SN[a]+' to '+SN[b]+'). Please review state and country laws on sending or receiving.';};
const NOUN={Seed:'seed',Seedlings:'seedlings',Cuttings:'cuttings','Hatching eggs':'hatching eggs','Young stock':'young stock'};
const badge=m=>'<span class="karma k-'+m.level.toLowerCase()+'">Karma: '+m.level+'</span> <span class="pill">'+m.swaps+' swap'+(m.swaps===1?'':'s')+'</span> <span class="pill">Member since '+esc(m.since)+'</span>';
const ways=()=>{const d=DS.get();if(!d.ways)DS.set({ways:WAYS0});return DS.get().ways;};
const mask=(id,v)=>id==='email'?v.replace(/^(.).*(@.*)$/,'$1•••$2'):v;
const theirVals=m=>({handle:'Grower'+m.id.replace('-',''),name:'(name they chose to share)',email:m.id.toLowerCase()+'@example.com',site:'example.org/'+m.id.toLowerCase(),forum:'example.org/forum/'+m.id.toLowerCase()});
const WL={handle:'Handle',name:'Real name',email:'Email',site:'Website',forum:'Forum or social profile'};
// ---- modal
function modal(html){closeModal();const o=document.createElement('div');o.className='mod';o.id='mod';o.innerHTML='<div class="modbox" role="dialog" aria-modal="true"><button class="modx" aria-label="Close">&times;</button>'+html+'</div>';document.body.appendChild(o);
  o.addEventListener('click',e=>{if(e.target===o||e.target.classList.contains('modx'))closeModal();});return o;}
function closeModal(){const o=$('#mod');if(o)o.remove();}
function shareTicks(prefix,preset){return ways().map(w=>'<label class="tick"><input type="checkbox" data-w="'+w.id+'" '+((preset?preset.includes(w.id):w.on)?'checked':'')+'> <span><b>'+esc(w.label)+'</b> <small>'+esc(mask(w.id,w.val))+'</small></span></label>').join('')+'<p class="signin">Phone numbers are not offered, for your safety. Anything you tick is shown to this one person only. You can stop sharing any item at any time from My introductions. That stops us showing it, but cannot undo what they have already seen or saved.</p>';}
const ticked=root=>[...root.querySelectorAll('input[data-w]:checked')].map(i=>i.dataset.w);
// ---- compose (swap page)
window.openAsk=function(id){
  const l=LIST[id],m=MB[l.member],outside=!l.reach.includes(ME.state),cm=crossMsg(l.state,ME.state);
  const o=modal('<h2>Ask about this</h2><p class="sub"><b>'+esc(l.variety)+'</b> · '+esc(l.form)+' · offered by <span class="idcode">Member '+m.id+'</span></p>'
   +'<p class="signin">One ask, one answer. This is not a chat. Pick what you want to say; nothing is typed.</p>'
   +(cm?'<div class="warnbox"><b>Check the rules.</b> '+esc(cm)+(outside?' This member also says they do not send to your state (they send: '+esc(l.sends)+').':'')+'<label class="tick"><input type="checkbox" id="q_ack"> <span>I will check the laws before anything is sent or received.</span></label></div>':'')
   +'<fieldset><legend>What would you like?</legend><div class="radios" id="q_what">'+['Seed','Seedlings','Cuttings','Hatching eggs','Young stock'].filter(x=>x===l.form).map(x=>'<label><input type="radio" name="w" value="'+x+'" checked> '+x+'</label>').join('')+'</div></fieldset>'
   +'<fieldset><legend>How?</legend><div class="radios" id="q_how"><label><input type="radio" name="h" value="swap for" checked> Swap</label><label><input type="radio" name="h" value="buy"> Buy</label><label><input type="radio" name="h" value="receive"> Gift</label></div></fieldset>'
   +'<fieldset><legend>Opening line</legend><div class="radios" id="q_line"><label><input type="radio" name="o" value="0" checked> Really like your…</label><label><input type="radio" name="o" value="1"> I would love to…</label><label><input type="radio" name="o" value="2"> Is it still available?</label></div><div class="preview" id="q_prev"></div></fieldset>'
   +'<fieldset><legend>What could you offer?</legend><select id="q_offer"><option>Open to offers</option>'+MY.map(x=>'<option>Swap for my '+x.variety+' ('+x.form+')</option>').join('')+'</select></fieldset>'
   +'<fieldset><legend>If they say yes, I am happy to share</legend>'+shareTicks()+'</fieldset>'
   +'<div class="actions"><button class="dbtn primary" id="q_send" type="button">Send</button> <button class="dbtn" id="q_cancel" type="button">Cancel</button></div><p class="signin" id="q_err"></p>');
  const build=()=>{const w=NOUN[o.querySelector('[name=w]:checked').value],h=o.querySelector('[name=h]:checked').value,k=+o.querySelector('[name=o]:checked').value;
    return [`Really like your ${l.variety}. How can I get some ${w}?`,`I would love to ${h} some ${w} of your ${l.variety}.`,`Is your ${l.variety} ${w} still available?`][k];};
  const upd=()=>{o.querySelector('#q_prev').textContent='“'+build()+'”';const ack=o.querySelector('#q_ack');const ok=ticked(o).length>0&&(!ack||ack.checked);const b=o.querySelector('#q_send');b.disabled=!ok;};
  o.addEventListener('change',upd);upd();o.querySelector('#q_cancel').onclick=closeModal;
  o.querySelector('#q_send').onclick=()=>{const sh=ticked(o);if(!sh.length){o.querySelector('#q_err').textContent='Tick at least one way to be reached.';return;}
    const d=DS.get();const rec={id:'S'+Date.now(),listing:id,line:build(),what:o.querySelector('[name=w]:checked').value,how:o.querySelector('[name=h]:checked').value,offer:o.querySelector('#q_offer').value,share:sh,status:'sent'};
    DS.set({sent:[rec].concat(d.sent||[])});
    o.querySelector('.modbox').innerHTML='<button class="modx" aria-label="Close">&times;</button><h2>Sent</h2><p>Your ask is on its way to <span class="idcode">Member '+m.id+'</span>. They will see your karma level, swap count and member since date, and the line you chose. You are told when they answer. Nothing is shared until they say yes.</p><div class="actions"><a class="dbtn primary" href="inbox.html">See my introductions</a> <button class="dbtn" id="q_done" type="button">Close</button></div>';
    o.querySelector('#q_done').onclick=closeModal;o.querySelector('.modx').onclick=closeModal;};
};
// ---- inbox page
if(!document.getElementById('inbox'))return;
let tab='recv';
function seed(){const d=DS.get();if(d.recv)return;
  const tr=M.find(x=>x.level==='Trusted'&&x.id),nw=M.find(x=>x.level==='New'),tas=M.find(x=>RG[x.region].state==='AU-TAS')||M.find(x=>x.level==='Member');
  const R=[{id:'R1',from:tr.id,my:'MY1',what:'Seed',how:'swap for',line:'Really like your Black Futsu. How can I get some seed?',offer:'Swap for their '+(tr.plants[0]||'Waltham Butternut')+' (Seed)',share:['handle','site'],status:'new'},
   {id:'R2',from:nw.id,my:'MY2',what:'Seed',how:'receive',line:'Is your Rainbow Chard seed still available?',offer:'Open to offers',share:['handle'],status:'new'},
   {id:'R3',from:tas.id,my:'MY2',what:'Seed',how:'buy',line:'I would love to buy some seed of your Rainbow Chard.',offer:'Open to offers',share:['handle','email'],status:'new'}];
  DS.set({recv:R});}
function recvCard(r){const m=MB[r.from],my=MY.find(x=>x.id===r.my),st=RG[m.region].state,out=!my.reach.includes(st);
  let acts='';
  if(r.status==='new'||r.status==='later')acts='<div class="actions"><button class="dbtn primary" data-a="accept" data-id="'+r.id+'">Accept</button><button class="dbtn" data-a="later" data-id="'+r.id+'">Not right now</button><button class="dbtn" data-a="decline" data-id="'+r.id+'">Decline</button><button class="dbtn" data-a="report" data-id="'+r.id+'">Report</button></div>';
  let res='';
  if(r.status==='later')res='<p class="chipline">Marked “not right now”. They are told you are busy.</p>';
  if(r.status==='declined')res='<p class="chipline">You declined: '+esc(r.reason)+'. They see only that reason.</p>';
  if(r.status==='reported')res='<p class="chipline warn">Reported. An admin will review this introduction and see both sides. Nothing was shared.</p>';
  if(r.status==='connected')res=connected(r,'recv',m);
  return '<div class="dcard wide"><span class="tag-demo">DEMO</span><h3 class="idcode">Member '+m.id+'</h3><div class="badgerow">'+badge(m)+'</div><div class="sub">'+esc(RG[m.region].name+', '+SN[st])+'</div>'
   +'<blockquote>“'+esc(r.line)+'”</blockquote><p class="sub">About your listing: <b>'+esc(my.variety)+' ('+esc(my.form)+')</b> · Could offer: '+esc(r.offer)+'</p>'
   +((crossMsg(st,ME.state)||out)?'<div class="warnbox"><b>Check the rules.</b> '+esc(crossMsg(st,ME.state))+(out?' They are in '+esc(SN[st])+' and you only send this listing to: '+esc(my.sends)+'. Declining with “not sending to your area” is one tap.':'')+'</div>':'')+acts+res+'</div>';}
function connected(rec,list,m){const tv=theirVals(m),their=list==='recv'?rec.share:rec.theirShare,mine=list==='recv'?rec.mine:rec.share,rv=rec.revoked||[],tr=rec.theirRevoked||[];
  const mineLeft=mine.filter(i=>!rv.includes(i)),theirLeft=their.filter(i=>!tr.includes(i)),at=rec.at||'11 Oct 2026';
  const btn=(a,w,label)=>'<button class="linkb" data-a="'+a+'" data-id="'+rec.id+'" data-list="'+list+'"'+(w?' data-w="'+w+'"':'')+'>'+label+'</button>';
  return '<div class="conn"><b>'+(mineLeft.length||theirLeft.length?'You are connected.':'Nothing is being shared now.')+'</b> Carry on wherever you like. Each of you only sees what the other chose to share, and either of you can stop sharing at any time. Shared on '+esc(at)+'.'
   +'<div class="cols"><div><h4>They share</h4>'+their.map(i=>tr.includes(i)?'<p class="gone">'+WL[i]+': no longer shared</p>':'<p>'+WL[i]+': <span class="idcode">'+esc(tv[i])+'</span></p>').join('')+'</div>'
   +'<div><h4>You share</h4>'+mine.map(i=>{const w=ways().find(x=>x.id===i);return rv.includes(i)?'<p class="gone">'+WL[i]+': you stopped sharing</p>':'<p>'+WL[i]+': <span class="idcode">'+esc(w?w.val:'')+'</span> '+btn('revoke',i,'Stop sharing')+'</p>';}).join('')+'</div></div>'
   +(mineLeft.length?'<div class="actions">'+btn('endall','', 'Stop sharing everything').replace('class="linkb"','class="dbtn"')+'</div>':'<p class="chipline">You are no longer sharing anything with this person.</p>')
   +(theirLeft.length?'<div class="democtl"><small>Demo only:</small> '+btn('theirrevoke','','They stop sharing something').replace('class="linkb"','class="dbtn"')+'</div>':'')+'</div>';}
function sentCard(s){const l=LIST[s.listing],m=MB[l.member];let res='';
  if(s.status==='sent')res='<p class="chipline">Waiting for an answer.</p><div class="democtl"><small>Demo only, to preview the answers:</small> <button class="dbtn" data-a="theyaccept" data-id="'+s.id+'">They accept</button> <button class="dbtn" data-a="theydecline" data-id="'+s.id+'">They decline</button></div>';
  if(s.status==='declined')res='<p class="chipline">Declined. Reason: '+esc(s.reason)+'. Nothing was shared.</p>';
  if(s.status==='connected')res=connected(s,'sent',m);
  return '<div class="dcard wide"><span class="tag-demo">DEMO</span><h3>'+esc(l.variety)+'</h3><div class="sub">'+esc(l.form)+' · to <span class="idcode">Member '+m.id+'</span> · '+esc(RG[l.region].name)+'</div><blockquote>“'+esc(s.line)+'”</blockquote>'
   +'<p class="sub">You would share if accepted: '+s.share.map(i=>WL[i]).join(', ')+'</p>'+res+'</div>';}
function waysTab(){const w=ways();return '<div class="optin"><b>Ways to reach me (private).</b> Add what you are happy to be reached by. For every introduction you choose, case by case, what to show. Nothing here is public.</div>'
  +w.map(x=>'<div class="wayrow"><label><b>'+esc(x.label)+'</b><input type="text" data-wv="'+x.id+'" value="'+esc(x.val)+'"></label><label class="tick"><input type="checkbox" data-wd="'+x.id+'" '+(x.on?'checked':'')+'> <span>Ticked by default</span></label></div>').join('')
  +'<p class="signin">No phone numbers: not offered, for your safety. Websites and profile links are checked before they can be shared.</p>';}
function render(){seed();const d=DS.get(),el=$('#inbox');
  if(!DS.signed()){el.innerHTML='<div class="note-box"><b>Sign in to see your introductions.</b> In this demo, use the “Demo sign-in” switch above and choose Signed-in member.</div>';return;}
  const n=(d.recv||[]).filter(r=>r.status==='new').length;
  let body=tab==='recv'?(d.recv.map(recvCard).join('')||'<p class="empty">Nothing yet.</p>'):tab==='sent'?((d.sent||[]).map(sentCard).join('')||'<p class="empty">You have not asked anyone yet. Open the Swap board and choose “Ask about this” on a listing.</p>'):waysTab();
  el.innerHTML='<div class="subnav tabs"><button data-t="recv" '+(tab==='recv'?'aria-pressed="true"':'')+'>Received'+(n?' <span class="pill">'+n+' new</span>':'')+'</button><button data-t="sent" '+(tab==='sent'?'aria-pressed="true"':'')+'>Sent ('+(d.sent||[]).length+')</button><button data-t="ways" '+(tab==='ways'?'aria-pressed="true"':'')+'>Ways to reach me</button></div>'
   +'<p class="signin">An introduction is one ask and one answer, not a chat. After a yes, you carry on in whatever way you each chose to share.</p><div class="cards one">'+body+'</div>';}
function upd(id,list,patch){const d=DS.get();DS.set({[list]:d[list].map(x=>x.id===id?Object.assign({},x,patch):x)});render();}
$('#inbox').addEventListener('click',e=>{const t=e.target.closest('[data-t]');if(t){tab=t.dataset.t;render();return;}
  const b=e.target.closest('[data-a]');if(!b)return;const id=b.dataset.id,a=b.dataset.a,d=DS.get();
  if(a==='later')upd(id,'recv',{status:'later'});
  if(a==='accept'){const rr=d.recv.find(x=>x.id===id),cmA=crossMsg(RG[MB[rr.from].region].state,ME.state);
    const o=modal('<h2>Accept and share</h2><p>Choose what to show this person. They choose what to show you at the same time.</p>'+(cmA?'<div class="warnbox"><b>Check the rules.</b> '+esc(cmA)+'<label class="tick"><input type="checkbox" id="ack"> <span>I will check the laws before anything is sent or received.</span></label></div>':'')+shareTicks()+'<div class="actions"><button class="dbtn primary" id="ok">Accept and share</button> <button class="dbtn" id="no">Cancel</button></div><p class="signin" id="err"></p>');
    o.querySelector('#no').onclick=closeModal;o.querySelector('#ok').onclick=()=>{const t=ticked(o);if(!t.length){o.querySelector('#err').textContent='Tick at least one way to be reached.';return;}const ak=o.querySelector('#ack');if(ak&&!ak.checked){o.querySelector('#err').textContent='Please confirm you will check the laws.';return;}closeModal();upd(id,'recv',{status:'connected',mine:t,at:'11 Oct 2026'});};}
  if(a==='decline'){const o=modal('<h2>Decline</h2><p>Pick a reason. They see only this.</p><div class="radios col">'+['Not sending to your area','Already promised','Not available right now','Not interested'].map((x,i)=>'<label><input type="radio" name="r" value="'+x+'" '+(i?'':'checked')+'> '+x+'</label>').join('')+'</div><div class="actions"><button class="dbtn primary" id="ok">Decline</button> <button class="dbtn" id="no">Cancel</button></div>');
    o.querySelector('#no').onclick=closeModal;o.querySelector('#ok').onclick=()=>{const r=o.querySelector('[name=r]:checked').value;closeModal();upd(id,'recv',{status:'declined',reason:r});};}
  if(a==='report'){const o=modal('<h2>Report this introduction</h2><p>An admin will see both sides. Nothing is shared with them.</p><div class="radios col">'+['Looks like a scam','Asking for something illegal or restricted','Abusive or threatening','Something else'].map((x,i)=>'<label><input type="radio" name="r" value="'+x+'" '+(i?'':'checked')+'> '+x+'</label>').join('')+'</div><div class="actions"><button class="dbtn primary" id="ok">Send report</button> <button class="dbtn" id="no">Cancel</button></div>');
    o.querySelector('#no').onclick=closeModal;o.querySelector('#ok').onclick=()=>{closeModal();upd(id,'recv',{status:'reported'});};}
  if(a==='revoke'||a==='endall'||a==='theirrevoke'){const list=b.dataset.list,rec=d[list].find(x=>x.id===id),mine=list==='recv'?rec.mine:rec.share,their=list==='recv'?rec.share:rec.theirShare,m=MB[list==='recv'?rec.from:LIST[rec.listing].member];
    if(a==='theirrevoke'){const left=their.filter(i=>!(rec.theirRevoked||[]).includes(i));upd(id,list,{theirRevoked:(rec.theirRevoked||[]).concat(left[0])});return;}
    const w=b.dataset.w,what=a==='endall'?'everything you share':WL[w];
    const o=modal('<h2>Stop sharing</h2><p>Stop showing <b>'+esc(what)+'</b> to <span class="idcode">Member '+m.id+'</span>?</p><p class="signin">They will not see it on our site again, and they are told you stopped. It cannot undo anything they have already seen or saved elsewhere.</p><div class="actions"><button class="dbtn primary" id="ok">Stop sharing</button> <button class="dbtn" id="no">Cancel</button></div>');
    o.querySelector('#no').onclick=closeModal;o.querySelector('#ok').onclick=()=>{closeModal();const rv=rec.revoked||[];upd(id,list,{revoked:a==='endall'?mine.slice():rv.concat(w)});};return;}
  if(a==='theyaccept')upd(id,'sent',{status:'connected',theirShare:['handle','site'],at:'11 Oct 2026'});
  if(a==='theydecline')upd(id,'sent',{status:'declined',reason:'Not available right now'});});
$('#inbox').addEventListener('input',e=>{const v=e.target.dataset.wv,dd=e.target.dataset.wd;if(!v&&!dd)return;const w=ways().map(x=>x.id===(v||dd)?Object.assign({},x,v?{val:e.target.value}:{on:e.target.checked}):x);DS.set({ways:w});});
addEventListener('dsession',render);render();
})();
