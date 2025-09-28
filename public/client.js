const socket = io();

let seconds = 0;
let barsShown = false;

const barsEl = document.getElementById('bars');
const counterEl = document.getElementById('counter');
const bonusEl = document.getElementById('bonus');
const ting = document.getElementById('ting');

function render(){ counterEl.textContent = String(Math.max(0, seconds)); }
function showBars(){ if (!barsShown){ barsShown=true; barsEl.classList.add('show'); } }
function hideBars(){ barsEl.classList.remove('show'); barsShown=false; }
function flash(text){ bonusEl.textContent = text; bonusEl.classList.add('show'); setTimeout(()=>bonusEl.classList.remove('show'), 900); }

// Countdown
setInterval(()=>{
  if (seconds>0){
    seconds -= 1;
    if (seconds<=0){ seconds=0; hideBars(); }
    render();
  }
},1000);

// Core gift handler
socket.on('gift', data => {
  const amount = parseInt(data?.amount || 1, 10);
  const isRescue = data?.type === 'rescue';
  const hasSec = (data?.sec !== undefined && data.sec !== null && data.sec !== '');
  let delta = hasSec ? parseInt(data.sec,10) : 10 * (isNaN(amount) ? 1 : amount);

  // Force subtract on rescue, even if sec is positive
  if (isRescue && delta > 0) delta = -delta;

  seconds = Math.max(0, seconds + delta);

  if (delta > 0){ flash('+'+delta+'s'); try{ ting.currentTime = 0; ting.play(); }catch(e){} }
  else if (delta < 0){ flash(delta+'s'); }

  if (seconds > 0) showBars(); else hideBars();
  render();
});

socket.on('hello', ()=>console.log('connected'));
render();