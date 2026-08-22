const CACHE='board-games-v2';
const ASSETS=['./','./index.html','./style.css','./app.js','./config.js','./data.json','./manifest.json','./collection.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
