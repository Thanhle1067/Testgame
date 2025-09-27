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
  io.emit('gift', { username, amount });
  res.json({ ok: true, username, amount });
});

app.post('/api/gift', (req, res) => {
  const username = (req.body && req.body.username) ? req.body.username : 'Anonymous';
  const amount = (req.body && req.body.amount) ? parseInt(req.body.amount, 10) : 1;
  io.emit('gift', { username, amount });
  res.json({ ok: true, username, amount });
});

io.on('connection', (socket) => {
  console.log('Overlay connected:', socket.id);
  socket.emit('hello', { msg: 'connected' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});