// server.js — nhận cả GET lẫn POST (x-www-form-urlencoded/JSON) + debug
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // <-- Quan trọng cho POST form
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ==== Debug logs (realtime) ====
const LOG_MAX = 200;
const logs = [];
function logRow(kind, info) {
  const row = { ts: new Date().toISOString(), kind, ...info };
  logs.push(row); while (logs.length > LOG_MAX) logs.shift();
  io.emit('log', row);
  return row;
}

app.use('/', express.static('public'));

function toInt(v, def){ if(v===undefined||v===null||v==='') return def; const n=parseInt(v,10); return Number.isFinite(n)?n:def; }
function pickSec(obj, def=null){ return toInt(obj?.sec ?? obj?.Sec ?? obj?.SEC ?? obj?.value1 ?? obj?.amount, def); }
function pickAmount(obj, def=1){ return toInt(obj?.amount ?? obj?.coins ?? obj?.likeCount ?? obj?.repeatCount, def); }
function pickUsername(obj, def='Anonymous'){ return (obj?.u || obj?.username || obj?.tikfinityUsername || obj?.nickname || obj?.nickName || def); }
function emitGift({ username='Anonymous', amount=1, sec=null, type='normal' }, req){
  const payload = { username, amount, sec, type };
  io.emit('gift', payload);
  logRow('gift', { method:req.method, path:req.path, query:req.query, body:req.body, payload });
  return { ok:true, ...payload };
}

app.get('/api/test', (req,res)=>res.json({ok:true}));

// Back-compat
app.get('/api/gift', (req,res)=> {
  res.json(emitGift({
    username: pickUsername(req.query),
    amount: pickAmount(req.query,1),
    sec: (req.query.sec!==undefined)?toInt(req.query.sec,null):null,
    type: req.query.type || 'normal'
  }, req));
});
app.post('/api/gift', (req,res)=> {
  res.json(emitGift({
    username: pickUsername(req.body),
    amount: pickAmount(req.body,1),
    sec: (req.body.sec!==undefined)?toInt(req.body.sec,null):pickSec(req.body,null),
    type: req.body.type || 'normal'
  }, req));
});

// ADD
app.get('/api/add', (req,res)=> {
  res.json(emitGift({
    username: pickUsername(req.query),
    amount: pickAmount(req.query,1),
    sec: (req.query.sec!==undefined)?toInt(req.query.sec,null):null,
    type: 'normal'
  }, req));
});
app.post('/api/add', (req,res)=> {
  res.json(emitGift({
    username: pickUsername(req.body),
    amount: pickAmount(req.body,1),
    sec: pickSec(req.body,null),
    type: 'normal'
  }, req));
});

// RESCUE
app.get('/api/rescue', (req,res)=> {
  res.json(emitGift({
    username: pickUsername(req.query),
    amount: pickAmount(req.query,1),
    sec: (req.query.sec!==undefined)?toInt(req.query.sec,null):null,
    type: 'rescue'
  }, req));
});
app.post('/api/rescue', (req,res)=> {
  res.json(emitGift({
    username: pickUsername(req.body),
    amount: pickAmount(req.body,1),
    sec: pickSec(req.body,null),
    type: 'rescue'
  }, req));
});

// Debug endpoints
app.get('/api/logs', (req,res)=>res.json({ok:true, logs}));
app.get('/debug', (req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"><title>Debug</title>
  <style>body{font-family:system-ui,Arial;background:#0b1220;color:#e6eefc;margin:0;padding:16px}.row{display:grid;grid-template-columns:160px 1fr;gap:8px;padding:8px;border-bottom:1px solid #24314d}.mono{font-family:ui-monospace,Menlo,Consolas,monospace}</style></head>
  <body><h1 style="margin:0 0 12px">Debug Webhooks (GET/POST)</h1><div id="list"></div>
  <script src="/socket.io/socket.io.js"></script><script>
  const list=document.getElementById('list');
  function row(d){const el=document.createElement('div');el.className='row';el.innerHTML=\`<div>\${d.ts}</div><div class="mono"><b>\${d.kind}</b> \${d.method} \${d.path}<br/>query: \${JSON.stringify(d.query||{})}<br/>body: \${JSON.stringify(d.body||{})}<br/>payload: \${JSON.stringify(d.payload||{})}</div>\`;list.prepend(el);}
  fetch('/api/logs').then(r=>r.json()).then(({logs})=>{(logs||[]).forEach(row)}); const ioScript = document.createElement('script'); ioScript.onload=()=>{const socket=io(); socket.on('log', row);};</script></body></html>`);
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { cors:{origin:"*"} });
httpServer.listen(PORT, HOST, ()=>console.log(`Server on http://${HOST}:${PORT}`));
