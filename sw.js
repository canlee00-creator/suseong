// 앱 화면(index.html 등)을 휴대폰에 저장해 두었다가 오프라인에서 열어 주는 서비스워커
const C='wh-v1',FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.endsWith('api.php'))return;
  const net=Promise.race([fetch(r),new Promise((_,j)=>setTimeout(j,4000))]);
  e.respondWith(net.then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r.mode==='navigate'?'index.html':r,cp))}return res})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
});
