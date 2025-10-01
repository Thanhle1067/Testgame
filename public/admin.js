
async function load() {
  const res = await fetch('/api/punishments');
  const data = await res.json();
  document.getElementById('items').value = (data.items || []).join('\n');
  document.getElementById('tts-enabled').checked = data.tts?.enabled ?? true;
  document.getElementById('tts-lang').value = data.tts?.lang ?? 'vi-VN';
  document.getElementById('tts-rate').value = data.tts?.rate ?? 1;
  document.getElementById('tts-pitch').value = data.tts?.pitch ?? 1;
  document.getElementById('tts-volume').value = data.tts?.volume ?? 1;
  document.getElementById('wheel-size').value = data.wheel?.size ?? 800;
  document.getElementById('wheel-fontScale').value = Math.round((data.wheel?.fontScale ?? 1) * 100);
}
async function save() {
  const items = document.getElementById('items').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const tts = {
    enabled: document.getElementById('tts-enabled').checked,
    lang: document.getElementById('tts-lang').value || 'vi-VN',
    rate: Number(document.getElementById('tts-rate').value) || 1,
    pitch: Number(document.getElementById('tts-pitch').value) || 1,
    volume: Number(document.getElementById('tts-volume').value) || 1,
  };
  const wheel = {
    size: Number(document.getElementById('wheel-size').value) || 800,
    fontScale: (Number(document.getElementById('wheel-fontScale').value) || 100) / 100
  };
  const res = await fetch('/api/punishments', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ items, tts, wheel })
  });
  if (res.ok) alert('Đã lưu!'); else alert('Lưu thất bại.');
}
async function testSpin() {
  await fetch('/api/test-gift', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({from:'Admin', gift:'Test', amount:1}) });
  alert('Đã gửi tín hiệu test. Mở overlay để xem.');
}
document.getElementById('save').addEventListener('click', save);
document.getElementById('test-spin').addEventListener('click', testSpin);
load();
