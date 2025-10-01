
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
  function hideOverlay() {
    if (!wrapper) return;
    const removeNode = () => {
      try {
        // double-hide then remove from DOM
        wrapper.classList.add('hidden');
        wrapper.style.display = 'none';
        overlay.removeChild(wrapper);
        // release refs so next gift recreates DOM cleanly
        wrapper = null;
        wheelCanvas = null;
        pointerEl = null;
        resultEl = null;
        wheel = null;
      } catch(e) { console.warn(e); }
    };
    if (hideDelaySec <= 0) removeNode();
    else setTimeout(removeNode, hideDelaySec * 1000);
  }

  async function spinOnce() {
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
    });
  }

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/overlay-socket`);
    ws.onopen = ()=> console.log('[overlay] WS connected');
    ws.onmessage = (ev)=> { try { const msg = JSON.parse(ev.data); if (msg.type === 'gift') spinOnce(); } catch (e) {} };
    ws.onclose = ()=> setTimeout(connectWS, 1500);
  }
  connectWS();

  window.addEventListener('keydown', (e)=>{ if (e.key.toLowerCase() === 'g') spinOnce(); });
})();
