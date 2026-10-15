(function(){
const K='lt_demo_session_v1';let mem={signed:false,sent:[],recv:null,ways:null};
try{const j=localStorage.getItem(K);if(j)Object.assign(mem,JSON.parse(j));}catch(e){}
function save(){try{localStorage.setItem(K,JSON.stringify(mem));}catch(e){}}
window.DS={get:()=>mem,set(p){Object.assign(mem,p);save();},signed:()=>!!mem.signed,
  me:{id:'ME-DEMO',region:'syd',state:'AU-NSW',stateName:'New South Wales',level:'Member',swaps:3,since:'July 2026'},
  reset(){mem.sent=[];mem.recv=null;mem.ways=null;save();dispatchEvent(new Event('dsession'));}};
function bar(){const el=document.getElementById('demobar');if(!el)return;
  el.innerHTML='<b>Demo sign-in</b><span class="seg" id="dsSeg"><button data-s="0" aria-pressed="'+!mem.signed+'">Visitor</button><button data-s="1" aria-pressed="'+mem.signed+'">Signed-in member</button></span>'
   +'<span class="dsnote">'+(mem.signed?'You are Member ME-DEMO, Greater Sydney. Nothing here is sent anywhere.':'Switch to a signed-in member to see group details, ask about swaps and open My introductions.')+'</span>'
   +(mem.signed?'<button class="dbtn" id="dsReset" type="button">Reset demo</button>':'');
  el.querySelector('#dsSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;mem.signed=b.dataset.s==='1';save();bar();dispatchEvent(new Event('dsession'));};
  const r=el.querySelector('#dsReset');if(r)r.onclick=()=>{DS.reset();};}
bar();
})();
