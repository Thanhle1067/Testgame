let seconds=0, stage=1, lastEventId=0;
const params=new URLSearchParams(location.search);
const T2=parseInt(params.get('t2')||'10000',10);
const T3=parseInt(params.get('t3')||'20000',10);
const IMG_TIER1='./bars-default.png', IMG_TIER2='./bars-gold.png', IMG_TIER3='./bars-gold.png';

const root=document.getElementById('root');
const baseBars=document.getElementById('bars');
const counter=document.getElementById('counter');
const popup=document.getElementById('popup');
const bombEl=document.getElementById('bomb');
const explosionEl=document.getElementById('explosion');
const fireRow=document.getElementById('fire-row');

const sndTing=document.getElementById('snd-ting');
const sndClack=document.getElementById('snd-clack');
const sndBoom=document.getElementById('snd-boom');

[IMG_TIER1,IMG_TIER2,IMG_TIER3].forEach(src=>{const i=new Image();i.src=src;});

function createFlames(count=26){
  fireRow.innerHTML='';
  for(let i=0;i<count;i++){
    const f=document.createElement('div');
    f.className='flame';
    const x=((i+Math.random()*0.5)/count)*100;
    f.style.left=`calc(${x}% - 9px)`;
    f.style.animationDelay=`${(Math.random()*0.25).toFixed(2)}s, ${(Math.random()*1.0).toFixed(2)}s`;
    fireRow.appendChild(f);
  }
}

function showBars(){
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
    fireRow.style.display='none';
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
  let newStage = 1;
  if(s >= T2 && s < T3) newStage = 2;
  else if(s >= T3) newStage = 3;
  if(newStage === stage) return;
  stage = newStage;
  if(stage === 1){
    swapBars(IMG_TIER1);
    fireRow.style.display='none';
  } else {
    swapBars(IMG_TIER2);
    fireRow.style.display='block';
    if(!fireRow.hasChildNodes()) createFlames();
  }
}

function triggerBomb(){
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
      if(j.seconds >= T2){
        fireRow.style.display='block';
        if(!fireRow.hasChildNodes()) createFlames();
      }else{
        fireRow.style.display='none';
      }
    }

    if(j.lastEventId && j.lastEventId!==lastEventId){
      const d=j.lastDelta||0;
      if(d>0){
        try{ sndTing.currentTime=0; sndTing.play(); }catch(e){}
        showPopupText('+'+d+' giây', false);
      }else if(d<0){
        try{ sndClack.currentTime=0; sndClack.play(); }catch(e){}
        showPopupText(d+' giây', true);
        if(j.lastType==='rescue'){ triggerBomb(); }
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
