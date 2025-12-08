let seconds = 0, stage = 1, lastEventId = 0;
const params = new URLSearchParams(location.search);
const T2 = parseInt(params.get('t2') || '10000', 10);
const IMG_TIER1 = './bars-default.png', IMG_TIER2 = './bars-gold.png';

const root = document.getElementById('root');
const baseBars = document.getElementById('bars');
const counter = document.getElementById('counter');
const popup = document.getElementById('popup');
const snowglobeEl = document.getElementById('snowglobe');
const explosionEl = document.getElementById('explosion');
const santaEls = document.querySelectorAll('.santa-fly');
const comboDisplay = document.getElementById('combo-display');
const comboCountSpan = document.getElementById('combo-count');

const sndTing = document.getElementById('snd-ting');
const sndClack = document.getElementById('snd-clack');
const sndBoom = document.getElementById('snd-boom');
const sndPull = document.getElementById('snd-pull');

[IMG_TIER1, IMG_TIER2].forEach(src => { const i = new Image(); i.src = src; });

// Audio Helper to prevent rapid repeats (debounce)
const soundLastPlay = new Map();
function playSound(audioEl) {
  if (!audioEl) return;
  const now = Date.now();
  const last = soundLastPlay.get(audioEl) || 0;
  if (now - last < 100) return; // 100ms debounce
  soundLastPlay.set(audioEl, now);
  try { audioEl.currentTime = 0; audioEl.play().catch(() => { }); } catch (e) { }
}

function showBars() {
  playSound(sndPull);

  baseBars.classList.remove('hidden', 'exit');
  baseBars.classList.add('enter');
  if (santaEls.length) santaEls.forEach(el => el.classList.add('flying'));
  if (!baseBars.style.backgroundImage) baseBars.style.backgroundImage = `url(${IMG_TIER1})`;
  setTimeout(() => baseBars.classList.remove('enter'), 900);
}
function hideBars() {

  baseBars.classList.add('exit');
  setTimeout(() => {
    baseBars.classList.add('hidden');
    baseBars.classList.remove('exit');
    if (santaEls.length) santaEls.forEach(el => el.classList.remove('flying'));
  }, 900);
}

function render() {
  if (seconds > 0) {
    counter.textContent = '🎁 ' + seconds + ' giây 🎄';
    counter.classList.remove('hidden');
  } else {
    counter.classList.add('hidden');
  }
}

function showPopupText(text, negative = false) {
  popup.textContent = text;
  popup.className = 'popup show' + (negative ? ' negative' : '');
  setTimeout(() => { popup.className = 'popup'; }, 1000);
}

function swapBars(url) {
  const incoming = document.createElement('div');
  incoming.className = 'bars next';
  incoming.style.backgroundImage = `url(${url})`;
  root.appendChild(incoming);
  incoming.addEventListener('animationend', () => {
    baseBars.style.backgroundImage = `url(${url})`;
    root.removeChild(incoming);
  }, { once: true });
}

function updateStageBySeconds(s) {
  const newStage = (s >= T2) ? 2 : 1;
  if (newStage === stage) return;

  // Play sound on upgrade to stage 2
  if (newStage === 2 && stage === 1) {
    playSound(sndBoom);
  }

  stage = newStage;
  swapBars(stage === 2 ? IMG_TIER2 : IMG_TIER1);
}

function triggerSnowglobe() {
  snowglobeEl.classList.remove('hidden');
  snowglobeEl.classList.add('fall');
  snowglobeEl.addEventListener('animationend', () => {
    snowglobeEl.classList.add('hidden');
    snowglobeEl.classList.remove('fall');
    explosionEl.classList.remove('hidden');
    explosionEl.classList.add('boom');
    playSound(sndBoom);
    baseBars.classList.add('shake');
    setTimeout(() => baseBars.classList.remove('shake'), 700);
    setTimeout(() => {
      explosionEl.classList.add('hidden');
      explosionEl.classList.remove('boom');
    }, 650);
  }, { once: true });
}

async function poll() {
  try {
    const r = await fetch('/api/state'); const j = await r.json(); if (!j.ok) return;

    if ((j.active || j.seconds > 0) && baseBars.classList.contains('hidden')) {
      showBars();
    }


    if (j.lastEventId && j.lastEventId !== lastEventId) {
      if (j.lastType === 'reset') { try { hideBars(); } catch (e) { } }
      const d = j.lastDelta || 0;
      if (d > 0) {
        playSound(sndTing);
        showPopupText('+' + d + ' giây 🎅', false);
      } else if (d < 0) {
        playSound(sndClack);
        showPopupText(d + ' giây ❄️', true);
        if (j.lastType === 'rescue') { triggerSnowglobe(); }
      } else if (j.lastType === 'wish' && j.lastWish && j.lastWish.message) {
        spawnWish(j.lastWish.message);
      }
      lastEventId = j.lastEventId;
    }

    // Update Combo Display
    if (j.comboCount && j.comboCount > 1) {
      comboCountSpan.textContent = 'x' + j.comboCount;
      comboDisplay.classList.remove('hidden');
      comboDisplay.classList.add('show');

      // Super combo effect
      if (j.comboCount >= 5) {
        comboDisplay.classList.add('super');
      } else {
        comboDisplay.classList.remove('super');
      }
    } else {
      comboDisplay.classList.remove('show', 'super');
      // Delay hiding to allow exit animation if desired, or just hide
      setTimeout(() => {
        if (!comboDisplay.classList.contains('show')) comboDisplay.classList.add('hidden');
      }, 300);
    }

    seconds = j.seconds | 0;
    updateStageBySeconds(seconds);
    render();

    if (!j.active && seconds <= 0 && !baseBars.classList.contains('hidden')) {
      hideBars();
    }
  } catch (e) {
  } finally {
    setTimeout(poll, 700);
  }
}

function spawnWish(text) {
  const wish = document.createElement('div');
  wish.className = 'wish-bubble';
  wish.textContent = text;

  // Random Position
  const left = 10 + Math.random() * 80; // 10% to 90%
  wish.style.left = left + '%';

  // Christmas Colors Random
  const themes = ['red', 'green', 'gold'];
  wish.classList.add('wish-' + themes[Math.floor(Math.random() * themes.length)]);

  root.appendChild(wish);

  // Play sound if possible
  playSound(sndTing);

  wish.addEventListener('animationend', () => {
    if (wish.parentNode) wish.parentNode.removeChild(wish);
  });
}

poll();


/* === SFX Enhancer removed (integrated into main loop) === */

/* ❄️ === Snowfall System - Hệ thống tuyết rơi === ❄️ */
(function () {
  const snowfallContainer = document.querySelector('.snowfall-container');
  if (!snowfallContainer) return;

  const snowflakeSymbols = ['❄', '❅', '❆', '•']; // Thêm chấm tròn nhỏ cho đa dạng
  const maxSnowflakes = 75; // Tăng số lượng tối đa cho dày hơn
  let snowflakeCount = 0;

  // Thuật toán phân phối đều "Fair Random"
  // Giúp tuyết không bị dồn cục về một phía
  let xSlots = [];
  function getFairX() {
    if (xSlots.length === 0) {
      // Chia màn hình thành 10 phần
      for (let i = 0; i < 10; i++) xSlots.push(i);
      // Xáo trộn ngẫu nhiên thứ tự các phần
      xSlots.sort(() => Math.random() - 0.5);
    }
    // Lấy một phần ra dùng
    const slot = xSlots.pop();
    // Random vị trí trong phần đó (VD: slot 0 là 0-10%, slot 1 là 10-20%)
    return (slot * 10) + (Math.random() * 10);
  }

  function createSnowflake() {
    // Chỉ tạo tuyết khi bars đang hiện
    // Nếu bars ẩn, ngừng tạo mới (nhưng tuyết cũ vẫn rơi hết)
    if (baseBars && baseBars.classList.contains('hidden')) return;

    if (snowflakeCount >= maxSnowflakes) return;

    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.textContent = snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)];

    // Sử dụng vị trí phân phối đều
    snowflake.style.left = getFairX() + '%';

    // Kích thước đa dạng hơn
    const size = 0.8 + Math.random() * 1.5; // 0.8em - 2.3em
    snowflake.style.fontSize = size + 'em';

    // Thời gian rơi mượt mà (5-12s)
    const duration = 5 + Math.random() * 7;
    snowflake.style.animationDuration = duration + 's';

    // Opacity ngẫu nhiên để tạo độ sâu
    snowflake.style.opacity = 0.4 + Math.random() * 0.6;

    snowfallContainer.appendChild(snowflake);
    snowflakeCount++;

    // Xóa bông tuyết SAU KHI animation kết thúc (chính xác 100%)
    // Thay vì dùng setTimeout có thể bị lệch
    snowflake.addEventListener('animationend', () => {
      if (snowflake.parentNode === snowfallContainer) {
        snowfallContainer.removeChild(snowflake);
        snowflakeCount--;
      }
    });
  }

  // Vòng lặp tạo tuyết mượt mà (Organic Loop)
  function spawnLoop() {
    // Nếu bars bị ẩn (hết giờ), xóa sạch tuyết ngay lập tức
    if (baseBars && baseBars.classList.contains('hidden')) {
      if (snowfallContainer.hasChildNodes()) {
        snowfallContainer.innerHTML = '';
        snowflakeCount = 0;
      }
      // Check lại chậm hơn để tiết kiệm CPU khi đang ẩn
      setTimeout(spawnLoop, 500);
      return;
    }

    createSnowflake();

    // Random thời gian giữa các lần tạo tuyết (100ms - 300ms)
    // Thay vì tạo 1 cục mỗi giây, ta tạo rải rác liên tục
    const nextSpawnDelay = 100 + Math.random() * 200;

    setTimeout(spawnLoop, nextSpawnDelay);
  }

  // Khởi động loop ngay lập tức
  spawnLoop();

})();
/* ❄️ === /Snowfall System === ❄️ */
