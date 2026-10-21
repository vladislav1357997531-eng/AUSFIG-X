const PREFIX='ausfig-x:'+self.registration.scope+':';
const CACHE=PREFIX+'b83bc9292a8db314';
const FILES=["./","./THIRD_PARTY_NOTICES.txt","./app.js","./icon-192.png","./icon-512.png","./icon.svg","./index.html","./manifest.webmanifest","./styles.css"];
const URLS=new Set(FILES.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const u=new URL(event.request.url);if(!URLS.has(u.href))return;event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));});
