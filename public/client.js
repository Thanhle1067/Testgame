const socket = io();
let totalSeconds = 0;
let bonusQueue = 0;
const timerEl = document.getElementById('timer');
const bonusEl = document.getElementById('bonus');
const gateEl = document.getElementById('gate');
const giftUserEl = document.getElementById('giftUser');
const prisonEl = document.getElementById('prison');
const bigCounterEl = document.getElementById('bigCounter');

let prisonEnabled = false;
let prisonTotalSeconds = 0;

setInterval(() => {
  if (bonusQueue > 0) {
    totalSeconds += 1;
    bonusQueue -= 1;
    showBonus('+' + (bonusQueue + 1) + 's');
  } else {
    totalSeconds += 1;
    hideBonusSoon();
  }
  renderTimer();

  if (prisonEnabled) {
    prisonTotalSeconds += 1;
    bigCounterEl.textContent = String(prisonTotalSeconds);
  }
}, 1000);

function renderTimer(){
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

let bonusHideTimer = null;
function showBonus(text){
  bonusEl.textContent = text;
  bonusEl.classList.add('show');
  clearTimeout(bonusHideTimer);
  bonusHideTimer = setTimeout(() => bonusEl.classList.remove('show'), 800);
}
function hideBonusSoon(){
  clearTimeout(bonusHideTimer);
  bonusHideTimer = setTimeout(() => bonusEl.classList.remove('show'), 400);
}

function playGate(username){
  gateEl.classList.remove('hidden');
  giftUserEl.textContent = username ? `🎁 ${username}` : '';
  giftUserEl.classList.add('show');
  gateEl.classList.remove('play');
  void gateEl.offsetWidth;
  gateEl.classList.add('play');
  setTimeout(() => {
    giftUserEl.classList.remove('show');
    gateEl.classList.add('hidden');
  }, 1600);
}

function showPrison() {
  if (!prisonEnabled) {
    prisonEnabled = true;
    prisonEl.classList.remove('hidden');
    prisonEl.classList.add('fadein');
    setTimeout(() => prisonEl.classList.remove('fadein'), 500);
  }
}

socket.on('hello', () => {
  console.log('Connected to overlay server');
});

socket.on('gift', (data) => {
  const username = data?.username || 'Anonymous';
  const amount = parseInt(data?.amount || 1, 10);
  const addSeconds = 10 * (isNaN(amount) ? 1 : amount);
  bonusQueue += addSeconds;
  playGate(username);
  showPrison();
  prisonTotalSeconds += addSeconds;
});

window.debugGift = function(name='Tester', amount=1){
  const addSeconds = 10 * amount;
  playGate(name);
  bonusQueue += addSeconds;
  showPrison();
  prisonTotalSeconds += addSeconds;
};