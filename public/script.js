
(async function(){
  const wheelCanvas = document.getElementById('wheel');
  const wrapper = document.getElementById('wheel-wrapper');
  const resultEl = document.getElementById('result');

  // Fetch punishments from server
  async function loadConfig() {
    const res = await fetch('/api/punishments');
    return res.json();
  }

  const config = await loadConfig();
  const labels = config.items || [];
  const tts = config.tts || { enabled: true, lang: 'vi-VN', rate: 1, pitch: 1, volume: 1 };
  const wheelCfg = config.wheel || { size: 800 };
  const size = Math.max(200, Math.min(2000, Number(wheelCfg.size) || 800));
  wheelCanvas.width = size;
  wheelCanvas.height = size;
  document.getElementById('wheel-wrapper').style.width = (size + 40) + 'px';


  const wheel = new Wheel(wheelCanvas, labels);
  wheel.draw();

  function speak(text) {
    try {
      if (!tts.enabled) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = tts.lang || 'vi-VN';
      utter.rate = tts.rate || 1;
      utter.pitch = tts.pitch || 1;
      utter.volume = tts.volume || 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('TTS error', e);
    }
  }

  function showOverlay() {
    wrapper.classList.remove('hidden');
  }
  function hideOverlay() {
    // optional: auto-hide after a while
    setTimeout(()=> wrapper.classList.add('hidden'), 8000);
  }

  async function spinOnce() {
    showOverlay();
    const index = Math.floor(Math.random() * labels.length);
    wheel.spinToIndex(index, ()=>{
      const picked = labels[wheel.indexAtPointer()];
      resultEl.textContent = picked;
      resultEl.classList.remove('hidden');
      speak(picked);
      hideOverlay();
    });
  }

  // WebSocket connection for real-time triggers
  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/overlay-socket`);
    ws.onopen = ()=> console.log('[overlay] WS connected');
    ws.onmessage = (ev)=> {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'gift') {
          // Every gift triggers a spin
          spinOnce();
        }
      } catch (e) {}
    };
    ws.onclose = ()=> {
      console.log('[overlay] WS closed. Reconnecting...');
      setTimeout(connectWS, 1500);
    };
  }
  connectWS();

  // Expose a quick keyboard test in OBS: press "G" to spin
  window.addEventListener('keydown', (e)=>{
    if (e.key.toLowerCase() === 'g') spinOnce();
  });

})();
