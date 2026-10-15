(function(){
const $=s=>document.querySelector(s),swap=location.pathname.includes('swap');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const R=DEMO.regions,M=DEMO.members,S=DEMO.swaps,TAX=DEMO.tax,ST=DEMO.states,CT=DEMO.countries;
const SN=Object.fromEntries(ST.map(x=>[x.id,x.name])),CN=Object.fromEntries(CT.map(c=>[c.id,c.name]));
const rn=Object.fromEntries(R.map(r=>[r.id,r.name+', '+SN[r.state]+(r.country==='AU'?'':', '+CN[r.country])])),rst=Object.fromEntries(R.map(r=>[r.id,r.state])),rco=Object.fromEntries(R.map(r=>[r.id,r.country])),mn=Object.fromEntries(M.map(m=>[m.id,m]));
const LV={New:0,Member:1,Trusted:2,Steward:3},MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const since=m=>{const p=m.since.split(' ');return +p[1]*12+MON.indexOf(p[0]);};
const opts=(sel,arr,first)=>{const v=$(sel).value;$(sel).innerHTML=(first?'<option value="">'+first+'</option>':'')+arr.map(x=>'<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>').join('');if(arr.some(x=>x[0]===v))$(sel).value=v;};
const stOpts=()=>{const co=$('#fco').value;opts('#fst',ST.filter(x=>!co||x.country===co).map(x=>[x.id,x.name+(co?'':', '+CN[x.country])]),'All states');};
const regOpts=()=>{const co=$('#fco').value,st=$('#fst').value;opts('#fr',R.filter(r=>(!co||r.country===co)&&(!st||r.state===st)).map(r=>[r.id,r.name+(st?'':', '+SN[r.state])]),'All regions');};
const karma=m=>'<span class="karma k-'+m.level.toLowerCase()+'" title="Karma level">Karma: '+m.level+'</span>';
const badges=m=>'<div class="badgerow">'+karma(m)+'<span class="pill">'+m.swaps+' swap'+(m.swaps===1?'':'s')+'</span><span class="pill">Member since '+esc(m.since)+'</span></div>';
const SIGN='<button class="dbtn" disabled>Sign in to ask for an introduction</button><p class="signin">Free sign-in. Use the demo sign-in switch above to try it.</p>';
const me=()=>DS.me;
const xmsg=l=>{if(l.state===me().state)return '';return (l.state.slice(0,2)!==me().state.slice(0,2)?'Crosses a country border':'Crosses a state border')+' from you. Review the laws.';};
const q=new URLSearchParams(location.search);
$('#fco').innerHTML='<option value="">All countries</option>'+CT.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'<optgroup label="Not open yet">'+DEMO.soon.map(n=>'<option disabled>'+esc(n)+'</option>').join('')+'</optgroup>';
if(q.get('country'))$('#fco').value=q.get('country');
stOpts();if(q.get('state'))$('#fst').value=q.get('state');
regOpts();if(q.get('region'))$('#fr').value=q.get('region');
let tax={c:null,t:null};
if(swap){
  $('#fre').innerHTML='<option value="">Anywhere</option>'+CT.map(c=>'<optgroup label="'+esc(c.name)+'">'+ST.filter(x=>x.country===c.id).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('')+'</optgroup>').join('');
  const fillC=()=>{const g=$('#fg').value;opts('#fc',TAX.filter(c=>!g||c.group===g).map(c=>[c.crop,c.crop]),'Any');fillT();};
  const fillT=()=>{const c=TAX.find(x=>x.crop===$('#fc').value);opts('#ft',c?c.types.map(t=>[t.name,t.name]):[],'Any');fillV();};
  const fillV=()=>{const c=TAX.find(x=>x.crop===$('#fc').value),t=c&&c.types.find(x=>x.name===$('#ft').value);
    opts('#fv',t?t.varieties.map(v=>[v,v]):c?c.types.flatMap(t=>t.varieties).map(v=>[v,v]):[],'Any');};
  fillC();
  $('#fg').onchange=()=>{fillC();draw();};$('#fc').onchange=()=>{fillT();draw();};$('#ft').onchange=()=>{fillV();draw();};
  // search index: names plus alternative names and common spellings from our own lists
  const norm=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
  const IDX=[];
  TAX.forEach(c=>{IDX.push({k:[norm(c.crop)].concat(c.aliases.map(norm)),label:c.crop,kind:'Crop',set:{g:c.group,c:c.crop}});
    c.types.forEach(t=>{IDX.push({k:[norm(t.name)].concat(t.aliases.map(norm)),label:t.name,kind:'Type of '+c.crop.toLowerCase(),set:{g:c.group,c:c.crop,t:t.name}});
      t.varieties.forEach(v=>IDX.push({k:[norm(v)],label:v,kind:t.name+', '+c.crop.toLowerCase(),set:{g:c.group,c:c.crop,t:t.name,v:v}}));});});
  ST.forEach(x=>IDX.push({k:[norm(x.name),norm(x.code)].filter((v,i,a)=>v.length>2||i===0),label:x.name+(x.country==='AU'?'':', '+CN[x.country]),kind:'State',set:{st:x.id}}));
  CT.forEach(c=>IDX.push({k:[norm(c.name)],label:c.name,kind:'Country',set:{co:c.id}}));
  function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=[];for(let i=0;i<=a.length;i++)d[i]=[i];for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length];}
  function find(s){s=norm(s);if(s.length<2)return[];const out=[];
    IDX.forEach(e=>{let best=9;e.k.forEach(k=>{let sc=9;if(k===s)sc=0;else if(k.startsWith(s))sc=1;else if((' '+k).includes(' '+s))sc=2;else if(s.length>=4&&lev(k.slice(0,s.length),s)<=1)sc=3;else if(s.length>=4&&lev(k,s)<=2)sc=3;best=Math.min(best,sc);});if(best<9)out.push(Object.assign({s:best},e));});
    out.sort((a,b)=>a.s-b.s||a.label.localeCompare(b.label));return out.slice(0,7);}
  function apply(e){const x=e.set;
    if(x.co){$('#fco').value=x.co;stOpts();regOpts();$('#fr').value='';}
    else if(x.st){const sx=ST.find(z=>z.id===x.st);$('#fco').value=sx.country;stOpts();$('#fst').value=x.st;regOpts();$('#fr').value='';}
    else{$('#fg').value=x.g;fillC();$('#fc').value=x.c;fillT();$('#ft').value=x.t||'';fillV();$('#fv').value=x.v||'';}
    $('#qres').innerHTML='';$('#q').value=e.label;
    $('#qnote').textContent='Understood as: '+(x.co?CN[x.co]:x.st?SN[x.st]:[x.c,x.t,x.v].filter(Boolean).join(' › '))+'. You can change it in the dropdowns.';draw();}
  const inp=$('#q'),list=$('#qres');let res=[];
  const sh=()=>{res=find(inp.value);if(inp.value.trim().length<2){list.innerHTML='';$('#qnote').textContent='';return;}
    if(!res.length){list.innerHTML='';$('#qnote').textContent='No match in our lists. Try the dropdowns, or a broader word such as "pumpkin".';return;}
    $('#qnote').textContent='';list.innerHTML=res.map((e,i)=>'<button type="button" data-i="'+i+'"><b>'+esc(e.label)+'</b> <span>'+esc(e.kind)+'</span></button>').join('');};
  list.onclick=ev=>{const b=ev.target.closest('button');if(b)apply(res[+b.dataset.i]);};
  inp.addEventListener('input',sh);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(res[0])apply(res[0]);else sh();}});
}
function draw(){
  const co=$('#fco').value,st=$('#fst').value,rg=$('#fr').value;let h='',n=0;
  if(!swap){const k=$('#fk').value,lv=$('#fl').value,sw=$('#fs').value;
    M.filter(m=>(!co||rco[m.region]===co)&&(!st||rst[m.region]===st)&&(!rg||m.region===rg)&&(!k||m.kind===k||m.kind==='both')&&(!lv||m.level===lv)&&(!sw||m.open))
     .sort((a,b)=>LV[b.level]-LV[a.level]||b.swaps-a.swaps).forEach(m=>{n++;
      h+='<div class="dcard"><span class="tag-demo">DEMO</span><h3 class="idcode">Member '+m.id+'</h3>'+badges(m)+'<div class="sub">'+esc(rn[m.region])+'</div>'
       +(m.plants.length?'<p><b>Plants:</b> '+m.plants.map(esc).join(', ')+'</p>':'')+(m.animals.length?'<p><b>Animals:</b> '+m.animals.map(esc).join(', ')+'</p>':'')
       +'<p><b>Interested in:</b> '+m.intents.map(esc).join(', ')+'</p><p>'+(m.open?'Open to swaps':'Not swapping right now')+'</p>'+(DS.signed()?(S.some(x=>x.member===m.id)?'<a class="dbtn primary" href="swap.html?member='+m.id+'">See their listings</a><p class="signin">Introductions start from a listing.</p>':'<p class="signin">No listings, so there is nothing to ask about.</p>'):SIGN)+'</div>';});}
  else{const g=$('#fg').value,c=$('#fc').value,t=$('#ft').value,v=$('#fv').value,re=$('#fre').value,so=$('#so').value;
    S.filter(l=>(!q.get('member')||l.member===q.get('member'))&&(!co||l.country===co)&&(!st||l.state===st)&&(!rg||l.region===rg)&&(!g||l.cat===g)&&(!c||l.crop===c)&&(!t||l.type===t)&&(!v||l.variety===v)&&(!re||l.reach.includes(re)))
     .sort((a,b)=>{const x=mn[a.member],y=mn[b.member];return so==='swaps'?y.swaps-x.swaps:so==='since'?since(x)-since(y):LV[y.level]-LV[x.level]||y.swaps-x.swaps;}).forEach(l=>{n++;const m=mn[l.member];
      h+='<div class="dcard"><span class="tag-demo">DEMO</span><h3>'+esc(l.variety)+'</h3><div class="sub">'+esc(l.form)+' · '+esc(l.crop)+' · '+esc(l.type)+'</div>'
       +'<p class="sub">'+esc(rn[l.region])+'</p>'
       +'<p><b>Offered by:</b> <span class="idcode">Member '+m.id+'</span></p>'+badges(m)
       +'<p><b>Amount:</b> '+esc(l.amount)+' · <b>When:</b> '+esc(l.season)+'</p><p><b>Looking for:</b> '+esc(l.wants)+'</p><p><b>Will send to:</b> '+esc(l.sends)+'</p>'+(xmsg(l)?'<p class="xwarn">⚠ '+esc(xmsg(l))+'</p>':'')+(DS.signed()?'<button class="dbtn primary ask" data-l="'+l.id+'">Ask about this</button>':SIGN)+'</div>';});}
  if(swap&&q.get('member'))h='<p class="chipline" style="grid-column:1/-1">Showing listings from <span class="idcode">Member '+esc(q.get('member'))+'</span> only. <a href="swap.html">Show everything</a></p>'+h;
  $('#cards').innerHTML=h||'<p class="empty">Nothing matches. Try widening the filters.</p>';$('#count').textContent=n+' demo '+(swap?'listing':'member')+(n===1?'':'s');
}
$('#clr').onclick=()=>{['fco','fst','fr','fk','fl','fs','fre','fg','fc','ft','fv'].forEach(i=>{const e=$('#'+i);if(e)e.value='';});if($('#so'))$('#so').value='karma';if($('#q')){$('#q').value='';$('#qres').innerHTML='';$('#qnote').textContent='';}
  stOpts();regOpts();if(swap){$('#fg').onchange();}draw();};
$('#fco').onchange=()=>{stOpts();regOpts();draw();};$('#fst').onchange=()=>{regOpts();draw();};
['fr','fk','fl','fs','fre','so','fv'].forEach(i=>$('#'+i)&&($('#'+i).onchange=draw));draw();
$('#cards').addEventListener('click',e=>{const b=e.target.closest('.ask');if(b&&window.openAsk)openAsk(b.dataset.l);});addEventListener('dsession',draw);
})();
