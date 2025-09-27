// Countdown + rescue + auto-hide bars when reaches 0
const socket = io();

let remainingSeconds = 0;    // start at 0
let prisonShown = false;

const bigCounterEl = document.getElementById('bigCounter');
const prisonEl = document.getElementById('prison');
const timerEl = document.getElementById('timer');
const gateEl = document.getElementById('gate');
const giftUserEl = document.getElementById('giftUser');

function renderBig(){ bigCounterEl.textContent = String(Math.max(0, remainingSeconds)); }
function renderSmall(){
  const m = Math.floor(Math.max(0, remainingSeconds) / 60);
  const s = Math.max(0, remainingSeconds) % 60;
  timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function showPrison(){
  if (!prisonShown) {
    prisonShown = true;
    prisonEl.classList.remove('hidden');
    prisonEl.classList.add('fadein');
    setTimeout(() => prisonEl.classList.remove('fadein'), 500);
  }
}

function hidePrison(){
  prisonEl.classList.add('hidden');
  prisonShown = false;
}

function playGate(username){
  gateEl.classList.remove('hidden');
  giftUserEl.textContent = username ? `🎁 ${username}` : '';
  gateEl.classList.remove('play'); void gateEl.offsetWidth; gateEl.classList.add('play');
  setTimeout(() => { gateEl.classList.add('hidden'); }, 1600);
}

// Tick: count down only when > 0 and auto-hide when hits 0
setInterval(() => {
  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      hidePrison(); // auto-hide bars at 0
    }
    renderBig(); renderSmall();
  }
}, 1000);

// Gift handler with rescue support
socket.on('gift', (data) => {
  const username = data?.username || 'Anonymous';
  const amount   = parseInt(data?.amount || 1, 10);
  const secOverride = data?.sec ? parseInt(data.sec, 10) : null;
  const isRescue = data?.type === 'rescue';

  let delta = Number.isFinite(secOverride) ? secOverride : (10 * (isNaN(amount) ? 1 : amount));
  if (isRescue) delta = -delta;   // subtract if rescue

  remainingSeconds = Math.max(0, remainingSeconds + delta);

  if (remainingSeconds > 0) {
    showPrison();      // show bars if we have positive time
  } else {
    hidePrison();      // no time left → hide immediately
  }

  playGate(username);
  renderBig(); renderSmall();
});

socket.on('hello', () => console.log('Connected to overlay server'));

// Manual test
window.debugGift = (name='Tester', amount=1, sec=null, type='normal') => {
  let delta = Number.isFinite(sec) ? sec : (10 * amount);
  if (type === 'rescue') delta = -delta;
  remainingSeconds = Math.max(0, remainingSeconds + delta);
  if (remainingSeconds > 0) showPrison(); else hidePrison();
  playGate(name); renderBig(); renderSmall();
};

renderBig(); renderSmall();