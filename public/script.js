
(async function(){
  const wheelCanvas = document.getElementById('wheel');
  const wrapper = document.getElementById('wheel-wrapper');
  const resultEl = document.getElementById('result');

  async function loadConfig() {
    const res = await fetch('/api/punishments');
    return res.json();
  }

  const config = await loadConfig();
  const labels = config.items || [];
  const tts = config.tts || { enabled: true, lang: 'vi-VN', rate: 1, pitch: 1, volume: 1 };
  const wheelCfg = config.wheel || { size: 800 };
  const overlayCfg = Object.assign({ showWheel: true, onlyOnGift: true }, config.overlay || {});

  const size = Math.max(200, Math.min(2000, Number(wheelCfg.size) || 800));
  wheelCanvas.width = size;
  wheelCanvas.height = size;
  document.getElementById('wheel-wrapper').style.width = (size + 40) + 'px';

  const wheel = new Wheel(wheelCanvas, labels);
  wheel.setFontScale((wheelCfg && wheelCfg.fontScale) ? Number(wheelCfg.fontScale) : 1);
  wheel.draw();
  /* INIT_VIS */
  if (overlayCfg.onlyOnGift) {
    // hide until a gift arrives
    document.getElementById('wheel-wrapper').classList.add('hidden');
  } else {
    // always visible
    document.getElementById('wheel-wrapper').classList.remove('hidden');
  }

  function speak(text) {
    try {
      if (!tts.enabled) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = tts.lang || 'vi-VN';
      u.rate = tts.rate || 1;
      u.pitch = tts.pitch || 1;
      u.volume = tts.volume || 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { console.warn('TTS error', e); }
  }

  function showOverlay() { wrapper.classList.remove('hidden'); }
  function hideOverlay() { setTimeout(()=> wrapper.classList.add('hidden'), 8000); }

  async function spinOnce() {
    const pickedIdx = Math.floor(Math.random() * labels.length);
    const picked = labels[pickedIdx];

    if (overlayCfg.showWheel) {
      showOverlay();
      wheel.spinToIndex(pickedIdx, ()=>{
        const finalPicked = labels[wheel.indexAtPointer()] || picked;
        resultEl.textContent = finalPicked;
        resultEl.classList.remove('hidden');
        speak(finalPicked);
        hideOverlay();
      });
    } else {
      // Hide wheel; speak only
      speak(picked);
      console.log('[overlay] TTS only:', picked);
    }
  }

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/overlay-socket`);
    ws.onopen = ()=> console.log('[overlay] WS connected');
    ws.onmessage = (ev)=> {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'gift') spinOnce();
      } catch (e) {}
    };
    ws.onclose = ()=> { setTimeout(connectWS, 1500); };
  }
  connectWS();

  window.addEventListener('keydown', (e)=>{ if (e.key.toLowerCase() === 'g') spinOnce(); });

})();
