
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Basic middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({limit: '2mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// --- In-memory clients for overlay
const wss = new WebSocketServer({ noServer: true });
let sockets = new Set();

wss.on('connection', (ws) => {
  sockets.add(ws);
  ws.on('close', () => sockets.delete(ws));
});

// --- HTTP -> WS upgrade
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/overlay-socket')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// --- Data storage
const DATA_FILE = path.join(__dirname, 'data', 'punishments.json');
function readPunishments() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
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
      wheel: { size: 800 }
    };
  }
}
function writePunishments(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Ensure file exists
writePunishments(readPunishments());

// --- Admin API
app.get('/api/punishments', (req,res)=>{
  res.json(readPunishments());
});

app.post('/api/punishments', (req,res)=>{
  const { items, tts, wheel } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({error: 'items must be a non-empty array'});
  }
  const data = readPunishments();
  data.items = items.map(x=>String(x)).slice(0, 100);
  if (tts && typeof tts === 'object') {
    data.tts = Object.assign({}, data.tts || {}, tts);
  }
  if (wheel && typeof wheel === 'object') {
    const size = Number(wheel.size);
    if (!isNaN(size) && size > 200 && size <= 2000) {
      data.wheel = Object.assign({}, data.wheel || {}, { size });
    }
  }
  writePunishments(data);
  res.json({ok:true});
});

// --- Tikfinity Webhook endpoint
// Configure Tikfinity to POST JSON here when a gift arrives.
// We'll accept any JSON and broadcast a 'gift' event.
app.post('/webhook/tikfinity', (req,res)=>{
  const payload = req.body || {};
  console.log('Webhook received:', JSON.stringify(payload));
  broadcast({ type: 'gift', payload });
  res.json({ ok: true });
});

// --- Manual trigger for testing
app.post('/api/test-gift', (req,res)=>{
  const payload = req.body || {from: "Tester", gift: "Test Gift", amount: 1};
  broadcast({ type: 'gift', payload });
  res.json({ ok: true });
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of sockets) {
    try { ws.send(data); } catch(e){}
  }
}

// --- Serve admin and overlay routes
app.get('/admin', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Default to overlay
app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
