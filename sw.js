const CACHE = 'rituel-v1.10.3';
const FILES = ['./','./index.html','./styles.css','./app.js','./features.js','./link-core.js','./rituel-nexus.js','./link-hub-onboard.js','./link-hub-bus.js','./trousse.js','./rituel-travel.js','./rituel-garage.js','./push-config.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});


// Push notifications must be shown immediately on iOS, including when RITUEL is closed.
self.addEventListener('push', event => {
  let payload={title:'RITUEL',body:'Tu as un rappel de routine.',url:'./index.html',tag:'rituel-rappel'};
  try{if(event.data)payload={...payload,...event.data.json()};}catch{if(event.data)payload.body=event.data.text();}
  const title=String(payload.title||'RITUEL').slice(0,100);
  const body=String(payload.body||'Ton rituel t’attend.').slice(0,250);
  const target=new URL(payload.url||'./index.html',self.registration.scope);
  // Never allow an external notification payload to open a third-party origin.
  const safeUrl=target.origin===self.location.origin?target.href:new URL('./index.html',self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(title,{
    body,icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',
    tag:String(payload.tag||'rituel-rappel').slice(0,60),
    data:{url:safeUrl},renotify:false
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||new URL('./index.html',self.registration.scope).href;
  event.waitUntil((async()=>{
    const clientsList=await clients.matchAll({type:'window',includeUncontrolled:true});
    const target=clientsList.find(c=>c.url.startsWith(self.registration.scope));
    if(target){await target.focus();return;}
    if(clients.openWindow)await clients.openWindow(url);
  })());
});
self.addEventListener('pushsubscriptionchange',event=>{
  // On some platforms this fires after subscription expiry; re-registration occurs
  // on the next foreground app open via app.js.
});
