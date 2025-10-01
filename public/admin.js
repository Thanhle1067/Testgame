
async function load() {
  const res = await fetch('/api/punishments', { cache: 'no-store' });
  const data = await res.json();
  document.getElementById('items').value = (data.items || []).join('\n');
  document.getElementById('tts-enabled').checked = data.tts?.enabled ?? true;
  document.getElementById('tts-lang').value = data.tts?.lang ?? 'vi-VN';
  document.getElementById('tts-rate').value = data.tts?.rate ?? 1;
  document.getElementById('tts-pitch').value = data.tts?.pitch ?? 1;
  document.getElementById('tts-volume').value = data.tts?.volume ?? 1;
  document.getElementById('wheel-size').value = data.wheel?.size ?? 800;
  document.getElementById('wheel-fontScale').value = Math.round((data.wheel?.fontScale ?? 1) * 100);
  document.getElementById('overlay-hideDelaySec').value = (data.overlay?.hideDelaySec ?? 3);
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
  const overlay = { hideDelaySec: Math.max(0, Math.min(30, Number(document.getElementById('overlay-hideDelaySec').value) || 0)) };
  const res = await fetch('/api/punishments', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ items, tts, wheel, overlay })
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

// Tab switching
document.getElementById('tab-config').addEventListener('click',e=>{e.preventDefault();document.getElementById('page-config').style.display='block';document.getElementById('page-history').style.display='none';});
document.getElementById('tab-history').addEventListener('click',e=>{e.preventDefault();document.getElementById('page-config').style.display='none';document.getElementById('page-history').style.display='block';loadHistory();});

async function loadHistory(){
  const res= await fetch('/api/history',{cache:'no-store'});
  const hist= await res.json();
  const tb=document.querySelector('#history-table tbody');
  tb.innerHTML='';
  hist.forEach(h=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${new Date(h.time).toLocaleString()}</td><td>${h.from}</td><td>${h.gift} x${h.amount}</td><td>${h.result||''}</td>`;
    tb.appendChild(tr);
  });
}

document.getElementById('export-history').addEventListener('click',async()=>{
  const res= await fetch('/api/history',{cache:'no-store'});
  const hist= await res.json();
  let csv='time,from,gift,amount,result\n';
  hist.forEach(h=>{csv+=`${h.time},${h.from},${h.gift},${h.amount},${h.result||''}\n`;});
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='history.csv';a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('clear-history').addEventListener('click',async()=>{
  await fetch('/api/history/clear',{method:'POST'});loadHistory();
});


// Queue tab
document.getElementById('tab-queue').addEventListener('click', async (e)=>{
  e.preventDefault();
  document.getElementById('page-config').style.display='none';
  document.getElementById('page-history').style.display='none';
  document.getElementById('page-queue').style.display='block';
  await loadQueue();
});
async function loadQueue(){
  const res = await fetch('/api/queue', {cache:'no-store'});
  const { queue } = await res.json();
  const tb=document.querySelector('#queue-table tbody');
  tb.innerHTML='';
  queue.forEach((q,i)=>{
    const tr=document.createElement('tr');
    const t = new Date(q.time).toLocaleString();
    tr.innerHTML = `<td>${i+1}</td><td>${t}</td><td>${q.from}</td><td>${q.gift}</td><td>${q.amount}</td>`;
    tb.appendChild(tr);
  });
}
document.getElementById('queue-skip').addEventListener('click', async ()=>{
  await fetch('/api/queue/skip', {method:'POST'});
  await loadQueue();
});
document.getElementById('queue-clear').addEventListener('click', async ()=>{
  await fetch('/api/queue/clear', {method:'POST'});
  await loadQueue();
});
