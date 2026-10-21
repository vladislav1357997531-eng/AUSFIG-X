// AUSFIG X fast offline shell. Never block cached launches on network.
const PREFIX='ausfig-x:'+self.registration.scope+':';
const CACHE=PREFIX+'v11-full-offline-shell-20261021';
const CORE=['./','./index.html','./styles.css','./public-app-v4.css?v=9','./public-app-fast-v5.js?v=11','./quick-crypto.js','./app.js?v=11','./private-contacts-v5.js?v=11','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon.svg'];
const SCOPE=new URL(self.registration.scope);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   const cached=await cache.match(request,{ignoreSearch:false});
   if(cached){
     if(request.mode==='navigate'){
       event.waitUntil(fetch(request,{cache:'no-store'}).then(response=>response.ok?cache.put(request,response.clone()):undefined).catch(()=>{}));
     }
     return cached;
   }
   try{
     const response=await fetch(request);
     if(response.ok)event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));
     return response;
   }catch{
     if(request.mode==='navigate')return await cache.match(new URL('./index.html',SCOPE).href)||Response.error();
     return Response.error();
   }
 })());
});