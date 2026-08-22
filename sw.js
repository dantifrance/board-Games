const CACHE='board-games-v1';
const ASSETS=['./','./index.html','./style.css','./app.js','./config.js','./data.json','./manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
