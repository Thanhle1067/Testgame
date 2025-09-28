const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ---- Simple in-memory logs ----
const LOG_MAX = 100;
const logs = [];
function logEvent(kind, info) {
  const row = { ts: new Date().toISOString(), kind, ...info };
  logs.push(row);
  while (logs.length > LOG_MAX) logs.shift();
  io.emit('log', row);
  return row;
}

// Static
app.use('/', express.static('public'));

// Health
app.get('/api/test', (req, res) => res.json({ ok: true }));

// Helpers
function toInt(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; }
function emitGift({ username='Anonymous', amount=1, sec=null, type='normal' }, req) {
  const payload = { username, amount, sec, type };
  io.emit('gift', payload);
  logEvent('gift', { path: req.path, query: req.query, body: req.body, payload });
  return { ok: true, ...payload };
}

// Back-compat: /api/gift
app.get('/api/gift', (req, res) => {
  const username = req.query.u || 'Anonymous';
  const amount = toInt(req.query.amount, 1);
  const sec = (req.query.sec !== undefined) ? toInt(req.query.sec, null) : null;
  const type = req.query.type || 'normal';
  res.json(emitGift({ username, amount, sec, type }, req));
});
app.post('/api/gift', (req, res) => {
  const username = req.body?.username || 'Anonymous';
  const amount = toInt(req.body?.amount, 1);
  const sec = (req.body?.sec !== undefined) ? toInt(req.body.sec, null) : null;
  const type = req.body?.type || 'normal';
  res.json(emitGift({ username, amount, sec, type }, req));
});

// Always add
app.get('/api/add', (req, res) => {
  const username = req.query.u || 'Anonymous';
  const amount = toInt(req.query.amount, 1);
  const sec = (req.query.sec !== undefined) ? toInt(req.query.sec, null) : null;
  res.json(emitGift({ username, amount, sec, type: 'normal' }, req));
});

// Always subtract
app.get('/api/rescue', (req, res) => {
  const username = req.query.u || 'Anonymous';
  const amount = toInt(req.query.amount, 1);
  const sec = (req.query.sec !== undefined) ? toInt(req.query.sec, null) : null;
  res.json(emitGift({ username, amount, sec, type: 'rescue' }, req));
});

// Logs API
app.get('/api/logs', (req, res) => res.json({ ok: true, logs }));

// Debug UI
app.get('/debug', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Debug Tikfinity Webhooks</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;background:#0b1220;color:#e6eefc;margin:0;padding:16px}
  h1{font-size:20px;margin:0 0 12px}
  .row{display:grid;grid-template-columns:140px 1fr;gap:8px;padding:8px;border-bottom:1px solid #24314d}
  .mono{font-family:ui-monospace,Menlo,Consolas,monospace}
  .pill{display:inline-block;background:#22314e;color:#cfe0ff;padding:2px 6px;border-radius:8px;margin-right:6px}
  .header{display:flex;gap:8px;align-items:center;margin-bottom:12px}
  button{background:#2a6df5;border:0;color:white;padding:8px 12px;border-radius:8px;cursor:pointer}
  #list{max-height:60vh;overflow:auto;border:1px solid #24314d;border-radius:10px}
</style>
</head>
<body>
  <div class="header">
    <h1>Debug Tikfinity Webhooks (realtime)</h1>
    <button id="refresh">Refresh logs</button>
    <span class="pill">GET /api/add?sec=10</span>
    <span class="pill">GET /api/rescue?sec=10</span>
    <a class="pill" href="/api/test" target="_blank">/api/test</a>
  </div>
  <div id="list"></div>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const list = document.getElementById('list');
    function row(data){
      const el = document.createElement('div');
      el.className = 'row';
      el.innerHTML = \`
        <div>\${data.ts}</div>
        <div class="mono"><b>\${data.kind}</b> \${data.path || ''}<br/>
        query: \${JSON.stringify(data.query || {})}<br/>
        body: \${JSON.stringify(data.body || {})}<br/>
        payload: \${JSON.stringify(data.payload || {})}</div>
      \`;
      list.prepend(el);
    }
    fetch('/api/logs').then(r=>r.json()).then(({logs})=>{ (logs||[]).forEach(row); });
    document.getElementById('refresh').onclick = ()=>{ list.innerHTML=''; fetch('/api/logs').then(r=>r.json()).then(({logs})=>{ (logs||[]).forEach(row); }); };
    const socket = io(); socket.on('log', row);
  </script>
</body>
</html>`);
});

io.on('connection', (socket) => {
  socket.emit('hello', { msg: 'connected' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));