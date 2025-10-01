
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({limit: '2mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket for overlays
const wss = new WebSocketServer({ noServer: true });
let sockets = new Set();
wss.on('connection', (ws) => {
  sockets.add(ws);
  ws.on('close', () => sockets.delete(ws));
});
const server = app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/overlay-socket')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else socket.destroy();
});

// Data helpers
const DATA_FILE = path.join(__dirname, 'data', 'punishments.json');
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {
      items: [
        "Hít đất 10 cái",
        "Im lặng 30 giây",
        "Hát 1 đoạn 15s",
        "Uống nước 1 ngụm",
        "Nhảy lắc 10s",
        "Kể 1 bí mật vui",
        "Đếm từ 50 về 0",
        "Mỉm cười 20s không cười to"
      ],
      tts: { enabled: true, lang: "vi-VN", rate: 1, pitch: 1, volume: 1 },
      wheel: { size: 800 },
      overlay: { showWheel: true }
    };
  }
}
function writeData(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
}
// ensure exists
writeData(readData());

// Admin API
app.get('/api/punishments', (req,res)=> res.json(readData()));
app.post('/api/punishments', (req,res)=>{
  const { items, tts, wheel, overlay } = req.body || {};
  const data = readData();
  if (Array.isArray(items) && items.length) data.items = items.map(x=>String(x)).slice(0,100);
  if (tts && typeof tts === 'object') data.tts = Object.assign({}, data.tts || {}, tts);
  if (wheel && typeof wheel === 'object') {
    const size = Number(wheel.size);
    if (!isNaN(size) && size >= 200 && size <= 2000) data.wheel = Object.assign({}, data.wheel || {}, { size });
  }
  if (overlay && typeof overlay === 'object') {
    if (typeof overlay.showWheel === 'boolean') data.overlay = Object.assign({}, data.overlay || {}, { showWheel: overlay.showWheel });
  }
  writeData(data);
  res.json({ ok: true });
});

// Tikfinity webhook
app.post('/webhook/tikfinity', (req,res)=>{
  const payload = req.body || {};
  console.log('Webhook gift:', JSON.stringify(payload));
  broadcast({ type: 'gift', payload });
  res.json({ ok: true });
});

// Manual test
app.post('/api/test-gift', (req,res)=>{
  const payload = req.body || { from:'Tester', gift:'Test', amount:1 };
  broadcast({ type: 'gift', payload });
  res.json({ ok: true });
});

function broadcast(msg) {
  const buf = JSON.stringify(msg);
  for (const ws of sockets) try { ws.send(buf); } catch(e){}
}

// Routes
app.get('/admin', (req,res)=> res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req,res)=> res.sendFile(path.join(__dirname, 'public', 'index.html')));
