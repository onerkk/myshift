const CACHE_NAME='myshift-admin-v1';
self.addEventListener('install',e=>{e.waitUntil(self.skipWaiting())});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(n=>Promise.all(n.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);u.search='';
  const k=u.toString();
  e.respondWith(
    fetch(e.request).then(r=>{
      if(!r||r.status!==200)return r;
      const c=r.clone();
      caches.open(CACHE_NAME).then(x=>x.put(k,c));
      return r;
    }).catch(()=>caches.match(k))
  );
});
