// AUSFIG X PWA v4. Network-first updates, cached offline resources.
const PREFIX='ausfig-x:'+self.registration.scope+':';
const CACHE=PREFIX+'v6-public-messages-telegram';
const FILES=['./','./index.html','./app.js','./styles.css','./public-app-v4.js','./public-app-v4.css','./quick-crypto.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon.svg'];
const PATHS=new Set(FILES.map(f=>new URL(f,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const u=new URL(request.url);if(u.origin!==self.location.origin||!PATHS.has(u.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(request,{cache:'no-store'});if(response.ok)await cache.put(request,response.clone());return response;}
  catch{const previous=await cache.match(request,{ignoreSearch:true});return previous||Response.error();}
 })());
});