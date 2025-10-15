let seconds=0, stage=1, lastEventId=0;
const params=new URLSearchParams(location.search);
const T2=parseInt(params.get('t2')||'10000',10);
const IMG_TIER1='./bars-default.png', IMG_TIER2='./bars-gold.png';

const root=document.getElementById('root');
const baseBars=document.getElementById('bars');
const counter=document.getElementById('counter');
const popup=document.getElementById('popup');
const bombEl=document.getElementById('bomb');
const explosionEl=document.getElementById('explosion');
const rescueAnim=document.getElementById('rescue-anim');

const sndTing=document.getElementById('snd-ting');
const sndClack=document.getElementById('snd-clack');
const sndBoom=document.getElementById('snd-boom');
let pullPlayedOnce=false;
const sndPull=document.getElementById('snd-pull');
function safePlay(a){try{if(!a)return; a.muted=false; a.currentTime=0; const p=a.play(); if(p&&p.catch){p.catch(()=>{});} }catch(e){}}

const sndHammer=document.getElementById('snd-hammer');

[IMG_TIER1,IMG_TIER2].forEach(src=>{const i=new Image();i.src=src;});

function showBars(){
  if(!pullPlayedOnce){ safePlay(sndPull); pullPlayedOnce=true; }
  baseBars.classList.remove('hidden','exit');
  baseBars.classList.add('enter');
  if(!baseBars.style.backgroundImage) baseBars.style.backgroundImage = `url(${IMG_TIER1})`;
  setTimeout(()=> baseBars.classList.remove('enter'), 900);
}
function hideBars(){
  baseBars.classList.add('exit');
  setTimeout(()=>{
    baseBars.classList.add('hidden');
    baseBars.classList.remove('exit');
  }, 900);
}

function render(){
  if(seconds>0){
    counter.textContent = seconds + ' giây';
    counter.classList.remove('hidden');
  } else {
    counter.classList.add('hidden');
  }
}

function showPopupText(text, negative=false){
  popup.textContent = text;
  popup.className = 'popup show' + (negative ? ' negative' : '');
  setTimeout(()=>{ popup.className = 'popup'; }, 1000);
}

function swapBars(url){
  const incoming=document.createElement('div');
  incoming.className='bars next';
  incoming.style.backgroundImage=`url(${url})`;
  root.appendChild(incoming);
  incoming.addEventListener('animationend',()=>{
    baseBars.style.backgroundImage=`url(${url})`;
    root.removeChild(incoming);
  },{once:true});
}

function updateStageBySeconds(s){
  const newStage=(s>=T2)?2:1;
  if(newStage===stage) return;
  stage=newStage;
  swapBars(stage===2?IMG_TIER2:IMG_TIER1);
}

function playRescue(){
  safePlay(sndHammer);

  bombEl.classList.remove('hidden');
  bombEl.classList.add('fall');
  bombEl.addEventListener('animationend',()=>{
    bombEl.classList.add('hidden');
    bombEl.classList.remove('fall');
    explosionEl.classList.remove('hidden');
    explosionEl.classList.add('boom');
    try{ sndBoom.currentTime=0; sndBoom.play(); }catch(e){}
    baseBars.classList.add('shake');
    setTimeout(()=>baseBars.classList.remove('shake'), 700);
    setTimeout(()=>{
      explosionEl.classList.add('hidden');
      explosionEl.classList.remove('boom');
    }, 650);
  }, { once:true });
}

async function poll(){
  try{
    const r=await fetch('/api/state'); const j=await r.json(); if(!j.ok) return;

    if((j.active||j.seconds>0) && baseBars.classList.contains('hidden')){
      showBars();
    }

    if(j.lastEventId && j.lastEventId!==lastEventId){
      const d=j.lastDelta||0;
      if(d>0){
        try{ sndTing.currentTime=0; sndTing.play(); }catch(e){}
        showPopupText('+'+d+' giây', false);
      }else if(d<0){
        try{ sndClack.currentTime=0; sndClack.play(); }catch(e){}
        showPopupText(d+' giây', true);
        if(j.lastType==='rescue'){ playRescue(); }
      }
      lastEventId=j.lastEventId;
    }

    seconds=j.seconds|0;
    updateStageBySeconds(seconds);
    render();

    if(!j.active && seconds<=0 && !baseBars.classList.contains('hidden')){
      hideBars();
    }
  }catch(e){
  }finally{
    setTimeout(poll,700);
  }
}
poll();


function playRescue(){
  safePlay(sndHammer);

  if(!rescueAnim) return;
  rescueAnim.classList.remove('hidden','smash');
  // force reflow to restart animation if still visible
  void rescueAnim.offsetWidth;
  rescueAnim.classList.add('smash');
  rescueAnim.addEventListener('animationend', ()=>{
    rescueAnim.classList.add('hidden');
    rescueAnim.classList.remove('smash');
  }, { once: true });
}
