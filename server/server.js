const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const ROOT = path.join(__dirname, '..');
const DB = path.join(__dirname, 'data', 'db.json');
fs.mkdirSync(path.dirname(DB), { recursive: true });

let store = { users: {}, tokens: {} };
try { store = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) {}

function persist() {
  const tmp = DB + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store));
  fs.renameSync(tmp, DB);
}

function hash(pwd, salt) {
  return crypto.scryptSync(String(pwd), salt, 32).toString('hex');
}

function newToken() { return crypto.randomBytes(24).toString('hex'); }

function body(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function send(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(s);
}

function auth(req) {
  const h = req.headers.authorization || '';
  const t = h.replace(/^Bearer /, '');
  const name = store.tokens[t];
  return name && store.users[name] ? name : null;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/register' && req.method === 'POST') {
      const b = await body(req);
      const u = String(b.user || '').trim(), p = String(b.password || '');
      if (u.length < 2 || p.length < 4) return send(res, 400, { error: '账号至少2位、密码至少4位' });
      if (store.users[u]) return send(res, 409, { error: '账号已存在' });
      const salt = crypto.randomBytes(16).toString('hex');
      store.users[u] = { salt, pw: hash(p, salt), mode: b.mode === 'cet4' ? 'cet4' : 'cet6', created: Date.now(), data: { cet6: {}, cet4: {} } };
      const t = newToken(); store.tokens[t] = u; persist();
      return send(res, 200, { ok: true, token: t, user: u, mode: store.users[u].mode });
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const b = await body(req);
      const u = String(b.user || '').trim(), p = String(b.password || '');
      const rec = store.users[u];
      if (!rec || hash(p, rec.salt) !== rec.pw) return send(res, 401, { error: '账号或密码不对' });
      const t = newToken(); store.tokens[t] = u;
      if (b.mode) rec.mode = b.mode === 'cet4' ? 'cet4' : 'cet6';
      persist();
      return send(res, 200, { ok: true, token: t, user: u, mode: rec.mode });
    }
    if (url.pathname === '/api/data') {
      const u = auth(req);
      if (!u) return send(res, 401, { error: '未登录' });
      if (req.method === 'GET') return send(res, 200, { ok: true, user: u, mode: store.users[u].mode, data: store.users[u].data });
      if (req.method === 'PUT') {
        const b = await body(req);
        const lv = b.level === 'cet4' ? 'cet4' : 'cet6';
        store.users[u].data[lv] = b.data || {};
        persist();
        return send(res, 200, { ok: true, at: Date.now() });
      }
    }
    if (url.pathname === '/api/me') {
      const u = auth(req);
      if (!u) return send(res, 401, { error: '未登录' });
      return send(res, 200, { ok: true, user: u, mode: store.users[u].mode });
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      let p = url.pathname === '/' ? '/index.html' : url.pathname;
      if (p !== '/index.html') { res.writeHead(404); return res.end('not found'); }
      return serveFile(res, path.join(ROOT, p));
    }
    send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log('CET app running: http://0.0.0.0:' + PORT));


