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

app.use('/', express.static('public'));

// Helpers
function toInt(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; }
function emitGift({ username='Anonymous', amount=1, sec=null, type='normal' }) {
  io.emit('gift', { username, amount, sec, type });
  return { ok: true, username, amount, sec, type };
}

// Health
app.get('/api/test', (req, res) => res.json({ ok: true }));

// Back-compat (supports type=rescue or sec negative)
app.get('/api/gift', (req, res) => {
  const username = req.query.u || 'Anonymous';
  const amount = toInt(req.query.amount, 1);
  const sec = req.query.sec !== undefined ? toInt(req.query.sec, null) : null;
  const type = req.query.type || 'normal';
  res.json(emitGift({ username, amount, sec, type }));
});

// Always add
app.get('/api/add', (req, res) => {
  const username = req.query.u || 'Anonymous';
  const amount = toInt(req.query.amount, 1);
  const sec = req.query.sec !== undefined ? toInt(req.query.sec, null) : null; // if null => 10*amount
  res.json(emitGift({ username, amount, sec, type: 'normal' }));
});

// Always rescue (subtract)
app.get('/api/rescue', (req, res) => {
  const username = req.query.u || 'Anonymous';
  const amount = toInt(req.query.amount, 1);
  const sec = req.query.sec !== undefined ? toInt(req.query.sec, null) : null; // if null => 10*amount
  res.json(emitGift({ username, amount, sec, type: 'rescue' }));
});

io.on('connection', (socket) => {
  console.log('Overlay connected:', socket.id);
  socket.emit('hello', { msg: 'connected' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));