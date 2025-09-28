const socket = io();
let remainingSeconds = 0;
let prisonShown = false;
const prisonEl = document.getElementById('prison');
const bigCounterEl = document.getElementById('bigCounter');
const bonusTextEl = document.getElementById('bonusText');
const ting = document.getElementById('ting');
function renderBig(){ bigCounterEl.textContent = String(Math.max(0, remainingSeconds)); }
function showPrison(){ if (!prisonShown) { prisonShown = true; prisonEl.classList.add('show'); prisonEl.classList.remove('hidden'); } }
function hidePrison(){ prisonEl.classList.remove('show'); prisonShown = false; setTimeout(() => prisonEl.classList.add('hidden'), 800); }
function showBonusText(text){ bonusTextEl.textContent = text; bonusTextEl.classList.add('show'); setTimeout(() => bonusTextEl.classList.remove('show'), 900); }
setInterval(() => { if (remainingSeconds > 0) { remainingSeconds -= 1; if (remainingSeconds <= 0) { remainingSeconds = 0; hidePrison(); } renderBig(); } }, 1000);
socket.on('gift', (data) => { const amount = parseInt(data?.amount || 1, 10); const secOverride = data?.sec ? parseInt(data.sec, 10) : null; const isRescue = data?.type === 'rescue'; let delta = Number.isFinite(secOverride) ? secOverride : (10 * (isNaN(amount) ? 1 : amount)); if (isRescue) delta = -delta; remainingSeconds = Math.max(0, remainingSeconds + delta); if (delta > 0) { showBonusText('+' + delta + 's'); try { ting.currentTime = 0; ting.play(); } catch(e) {} } else if (delta < 0) { showBonusText(delta + 's'); } if (remainingSeconds > 0) showPrison(); else hidePrison(); renderBig(); });
socket.on('hello', () => console.log('Connected to overlay server'));
renderBig();