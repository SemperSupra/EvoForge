// Only this experience's immutable app shell is cached. Do not intercept other experiences.
const PREFIX = 'evoforge-alife-';
const CACHE = PREFIX + '0.1.0-rdte.3';
const shell = new URL('./index.html', self.registration.scope);
const manifest = new URL('./manifest.webmanifest', self.registration.scope);
const allowed = new Set([shell.href, manifest.href]);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...allowed])).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  url.search=''; url.hash='';
  if(!allowed.has(url.href))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok && response.type==='basic') { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(c=>c.put(url.href,copy))); }
    return response;
  }).catch(async()=>await caches.match(url.href) || new Response('Arena is offline and has not been cached.',{status:503})));
});
