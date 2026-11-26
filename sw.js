const CACHE='myroster-web-v1-010';
const assets=['./','./index.html','./style.css','./core.js','./app.js','./support.js','./backup-core.js','./ocr-core.js','./ocr-ui.js','./airports.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(assets.map(a=>new Request(a,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('myroster-web-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin||!e.request.url.startsWith(self.registration.scope))return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request).catch(()=>e.request.mode==='navigate'?c.match('./index.html'):Response.error())));});
