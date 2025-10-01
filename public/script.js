
(async function(){
  const overlay = document.getElementById('overlay');

  async function loadConfig() {
    const res = await fetch('/api/punishments', { cache: 'no-store' });
    return res.json();
  }
  const config = await loadConfig();
  const labels = config.items || [];
  const tts = config.tts || { enabled: true, lang: 'vi-VN', rate: 1, pitch: 1, volume: 1 };
  const wheelCfg = config.wheel || { size: 800, fontScale: 1 };
  const overlayCfg = (config.overlay || {});
  const hideDelaySec = Math.max(0, Math.min(30, Number(overlayCfg.hideDelaySec ?? 3)));

  let wrapper, wheelCanvas, pointerEl, resultEl, wheel;

  function createOverlayIfNeeded() {
    if (wrapper) return;
    wrapper = document.createElement('div');
    wrapper.id = 'wheel-wrapper';
    wrapper.className = 'hidden';

    wheelCanvas = document.createElement('canvas');
    wheelCanvas.id = 'wheel';
    const size = Math.max(200, Math.min(2000, Number(wheelCfg.size) || 800));
    wheelCanvas.width = size;
    wheelCanvas.height = size;
    wrapper.style.width = (size + 40) + 'px';

    pointerEl = document.createElement('div');
    pointerEl.id = 'pointer';
    pointerEl.textContent = '▼';

    resultEl = document.createElement('div');
    resultEl.id = 'result';
    resultEl.className = 'hidden';

    wrapper.appendChild(wheelCanvas);
    wrapper.appendChild(pointerEl);
    wrapper.appendChild(resultEl);
    overlay.appendChild(wrapper);

    wheel = new Wheel(wheelCanvas, labels);
    wheel.setFontScale((wheelCfg && wheelCfg.fontScale) ? Number(wheelCfg.fontScale) : 1);
    wheel.draw();
  }

  function speak(text, cb) {
    try {
      if (!tts.enabled) return cb && cb();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = tts.lang || 'vi-VN';
      u.rate = tts.rate || 1;
      u.pitch = tts.pitch || 1;
      u.volume = tts.volume || 1;
      u.onend = () => { if (cb) cb(); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { console.warn('TTS error', e); if (cb) cb(); }
  }

  function showOverlay() { createOverlayIfNeeded(); wrapper.classList.remove('hidden'); }
  let _fallbackTimer = null;
  function scheduleHide() {
    // Hide strategy:
    // - Try to hide after TTS ends (speak(..., hideOverlay)).
    // - Also set a hard fallback in case OBS/CEF doesn't fire onend.
    if (_fallbackTimer) { try { clearTimeout(_fallbackTimer); } catch(e){} }
    const fallbackMs = (hideDelaySec > 0 ? hideDelaySec*1000 : 0) + 7000; // ~7s safety
    _fallbackTimer = setTimeout(()=>{ try { hideOverlay(); } catch(e){} }, fallbackMs);
  }
  function hideOverlay(cb) {
    if (!wrapper) return;

    const doRemove = () => {
      try {
        overlay.removeChild(wrapper);
      } catch (e) {}
      wrapper = null;
      wheelCanvas = null;
      pointerEl = null;
      resultEl = null;
      wheel = null;
      if (typeof cb === 'function') { try { cb(); } catch(e){} }
    };

    const startFadeOut = () => {
      try {
        // Start fade-out
        wrapper.classList.add('fade-out');
        const onEnd = () => {
          wrapper.removeEventListener('transitionend', onEnd);
          // Hide hard before remove (to avoid flicker)
          wrapper.classList.add('hidden');
          wrapper.style.display = 'none';
          doRemove();
        };
        wrapper.addEventListener('transitionend', onEnd);
        // Safety timeout in case transitionend doesn't fire
        setTimeout(()=>{
          try { wrapper.removeEventListener('transitionend', onEnd); } catch(e){}
          wrapper.classList.add('hidden');
          wrapper.style.display = 'none';
          doRemove();
        }, 800);
      } catch (e) {
        // Fallback: remove immediately
        doRemove();
      }
    };

    if (hideDelaySec <= 0) startFadeOut();
    else setTimeout(startFadeOut, hideDelaySec * 1000);
  } catch(e) { console.warn(e); }
    };
    if (hideDelaySec <= 0) removeNode();
    else setTimeout(removeNode, hideDelaySec * 1000);
  }

  async function spinOnce_DEPRECATED() {
    createOverlayIfNeeded();
    const pickedIdx = Math.floor(Math.random() * labels.length);
    const picked = labels[pickedIdx];
    showOverlay();
    wheel.spinToIndex(pickedIdx, ()=>{
      const finalPicked = labels[wheel.indexAtPointer()] || picked;
      resultEl.textContent = finalPicked;
      resultEl.classList.remove('hidden');
      scheduleHide();
      hideOverlay();
      speak(finalPicked);

      // Update history with result
      fetch('/api/history', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({result: finalPicked})}).catch(()=>{});

    });
  }

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/overlay-socket`);
    ws.onopen = ()=> console.log('[overlay] WS connected');
    ws.onmessage = (ev)=> { try { const msg = JSON.parse(ev.data); if (msg.type === 'gift') enqueueGift(msg.payload || {});
        if (msg.type === 'queue') { /* could sync UI if overlay needed */ } } catch (e) {} };
    ws.onclose = ()=> setTimeout(connectWS, 1500);
  }

  // Kick off by fetching existing queue from server
  try {
    const qres = await fetch('/api/queue', { cache: 'no-store' });
    const qjson = await qres.json();
    if (Array.isArray(qjson.queue)) {
      qjson.queue.forEach(item => enqueueGift(item));
    }
  } catch (e) { console.warn('queue init fetch failed', e); }
  connectWS();

  
  // --- Local processing queue ---
  const localQueue = [];
  let processing = false;

  function enqueueGift(payload){
    localQueue.push(payload);
    if (!processing) processNext();
  }

  function processNext(){
    if (processing) return;
    const next = localQueue.shift();
    if (!next) return;
    processing = true;
    // run one spin
    runSpinOnce(next, ()=>{
      processing = false;
      // small gap to avoid overlap
      setTimeout(processNext, 200);
    });
  }

  function runSpinOnce(payload, done){
    createOverlayIfNeeded();
    const pickedIdx = Math.floor(Math.random() * labels.length);
    const picked = labels[pickedIdx];
    showOverlay();
    wheel.spinToIndex(pickedIdx, ()=>{
      const finalPicked = labels[wheel.indexAtPointer()] || picked;
      resultEl.textContent = finalPicked;
      resultEl.classList.remove('hidden');

      // Update history with result
      fetch('/api/history', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({result: finalPicked})}).catch(()=>{});

      // speak (non-blocking)
      speak(finalPicked);

      // hide after delay, then call done
      hideOverlay(()=>{ if (done) done(); });
    });
  }

  window.addEventListener('keydown', (e)=>{ if (e.key.toLowerCase() === 'g') enqueueGift({from:'Hotkey'}); });

  // Polling fallback (every 2s) in case WS is not working
  let _pollTimer = null;
  async function pollQueueOnce(){
    try {
      const res = await fetch('/api/queue', { cache: 'no-store' });
      const { queue } = await res.json();
      // If server queue has more items than local, enqueue the difference
      const diff = Math.max(0, (queue?.length || 0) - localQueue.length - (processing ? 1 : 0));
      if (Array.isArray(queue)) {
        // naive sync: enqueue all items if local is idle
        if (!processing && localQueue.length === 0 && queue.length > 0) {
          queue.forEach(item => enqueueGift(item));
        }
      }
    } catch(e){ /* ignore */ }
  }
  function startQueuePolling(){
    if (_pollTimer) return;
    _pollTimer = setInterval(pollQueueOnce, 2000);
  }
  startQueuePolling();

})();
