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

app.get('/api/test', (req, res) => res.json({ ok: true }));

app.get('/api/gift', (req, res) => {
  const username = req.query.u || 'Anonymous';
  const amount = parseInt(req.query.amount || '1', 10);
  const sec = req.query.sec ? parseInt(req.query.sec, 10) : null;
  const type = req.query.type || 'normal';
  io.emit('gift', { username, amount, sec, type });
  res.json({ ok: true, username, amount, sec, type });
});

app.post('/api/gift', (req, res) => {
  const username = (req.body && req.body.username) ? req.body.username : 'Anonymous';
  const amount = (req.body && req.body.amount) ? parseInt(req.body.amount, 10) : 1;
  const sec = (req.body && req.body.sec) ? parseInt(req.body.sec, 10) : null;
  const type = (req.body && req.body.type) ? String(req.body.type) : 'normal';
  io.emit('gift', { username, amount, sec, type });
  res.json({ ok: true, username, amount, sec, type });
});

io.on('connection', (socket) => {
  console.log('Overlay connected:', socket.id);
  socket.emit('hello', { msg: 'connected' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));