// 창고 물품 관리 서버 (Node.js 14 이상, 추가 설치 없음)
// 실행:  WH_PASSWORD=원하는비밀번호 PORT=3000 node server.js
// WH_PASSWORD 를 비우면 누구나 수정할 수 있습니다. (조회는 항상 누구나 가능)
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.env.PORT || 3000, PASSWORD = process.env.WH_PASSWORD || '';
const F = path.join(__dirname, 'data', 'data.json');
const J = 'application/json; charset=utf-8';
const read = () => { try { const d = JSON.parse(fs.readFileSync(F, 'utf8')); return { items: d.items || [], locs: d.locs || [] } } catch (e) { return { items: [], locs: [] } } };
const write = d => { const t = F + '.tmp'; fs.writeFileSync(t, JSON.stringify(d)); fs.renameSync(t, F) };
const n = v => Math.max(0, parseInt(v, 10) || 0), s = v => String(v == null ? '' : v).trim();

function apply(d, b) {
  switch (b.op) {
    case 'setItem': {
      const i = b.item || {}, code = s(i.code), name = s(i.name);
      if (!code || !name) return '물품코드와 품명이 필요합니다';
      const nw = n(i.nw), used = n(i.used);
      const it = { no: i.no == null ? null : n(i.no), code, name, spec: s(i.spec), base: n(i.base), nw, used, qty: nw + used, loc: s(i.loc) };
      const prev = s(b.prev), out = []; let done = false;
      for (const x of d.items) {
        if (x.code === code || (prev && x.code === prev)) { if (!done) { out.push(it); done = true } } else out.push(x);
      }
      if (!done) out.push(it);
      d.items = out; return null;
    }
    case 'delItem': d.items = d.items.filter(x => x.code !== s(b.id)); return null;
    case 'setLoc': {
      const l = b.loc || {}, code = s(l.code);
      if (!code) return '위치 코드가 필요합니다';
      const o = { code, desc: s(l.desc) }, k = d.locs.findIndex(x => x.code === code);
      if (k < 0) d.locs.push(o); else d.locs[k] = o;
      return null;
    }
    case 'delLoc': d.locs = d.locs.filter(x => x.code !== s(b.id)); return null;
  }
  return '알 수 없는 요청입니다';
}

http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const send = (c, t, b) => { res.writeHead(c, { 'Content-Type': t, 'Cache-Control': 'no-store' }); res.end(b) };
  if (u === '/api.php') {
    if (req.method === 'GET') return send(200, J, JSON.stringify(read()));
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 1e6) req.destroy() });
      req.on('end', () => {
        if (PASSWORD && req.headers['x-pass'] !== PASSWORD) return send(401, J, '{"error":"unauthorized"}');
        let b; try { b = JSON.parse(body) } catch (e) { return send(400, J, '{"error":"잘못된 요청입니다"}') }
        const d = read(), e = apply(d, b || {});
        if (e) return send(400, J, JSON.stringify({ error: e }));
        try { write(d) } catch (er) { return send(500, J, '{"error":"data 폴더에 쓸 수 없습니다"}') }
        send(200, J, '{"ok":true}');
      });
      return;
    }
  }
  const ST = { '/sw.js': 'application/javascript; charset=utf-8', '/manifest.webmanifest': 'application/manifest+json', '/icon-192.png': 'image/png', '/icon-512.png': 'image/png' };
  if (ST[u]) { try { return send(200, ST[u], fs.readFileSync(path.join(__dirname, u))) } catch (e) { return send(404, 'text/plain', 'Not found') } }
  if (u === '/' || u === '/index.html') return send(200, 'text/html; charset=utf-8', fs.readFileSync(path.join(__dirname, 'index.html')));
  send(404, 'text/plain; charset=utf-8', 'Not found');
}).listen(PORT, () => console.log('창고 물품 관리: http://localhost:' + PORT + (PASSWORD ? ' (수정 비밀번호 사용)' : ' (비밀번호 없음)')));
