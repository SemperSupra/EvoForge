// Fresh-context browser storage and coordination qualification. No product/user storage is touched.
import {chromium,firefox,webkit} from '@playwright/test';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
const name=process.argv[2],engine={chromium,firefox,webkit}[name];if(!engine)throw Error('PROFILE');
const sw="self.addEventListener('install',e=>e.waitUntil(self.skipWaiting())); self.addEventListener('activate',e=>e.waitUntil(self.clients.claim())); self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname==='/offline-canary') e.respondWith(new Response('42'));});";
const server=createServer((req,res)=>{if(req.url==='/sw.js')return res.writeHead(200,{'Content-Type':'text/javascript'}).end(sw);if(req.url==='/')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Storage test</title>');res.writeHead(404).end();});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,report={schema:1,source:process.env.GITHUB_SHA??null,engine:name,os:process.platform,arch:process.arch,gates:{}};let browser,ctx;
const gate=async(key,fn)=>{try{const x=await fn();report.gates[key]={status:x===true?'PASS':'FAIL'};}catch(e){report.gates[key]={status:'FAIL_OR_BLOCKED',reason:String(e).slice(0,300)};}};
try{
 browser=await engine.launch({headless:true,timeout:45000});report.version=browser.version();ctx=await browser.newContext();const a=await ctx.newPage(),b=await ctx.newPage();await Promise.all([a.goto(origin),b.goto(origin)]);
 await gate('idbAtomicRecovery',async()=>{
  const result=await a.evaluate(async()=>{
   if(!indexedDB)throw Error('IndexedDB absent');
   const open=()=>new Promise((r,j)=>{const q=indexedDB.open('fixture',1);q.onupgradeneeded=()=>q.result.createObjectStore('state');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});
   const tx=(db,abort=false)=>new Promise((r,j)=>{const t=db.transaction('state','readwrite');const q=t.objectStore('state').put(abort?99:42,'pointer');let intentional=false;t.oncomplete=()=>r(!abort);t.onabort=()=>intentional?r(true):j(t.error??Error('Unexpected abort'));t.onerror=()=>{ /* terminal abort is the authority */ };if(abort)q.onsuccess=()=>{intentional=true;t.abort();};});
   const read=db=>new Promise((r,j)=>{const q=db.transaction('state').objectStore('state').get('pointer');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});
   let db=await open();const ok=await tx(db)&&await tx(db,true);db.close();db=await open();const value=await read(db);db.close();return ok&&value===42;
  });return result&&await b.evaluate(()=>new Promise((r,j)=>{const q=indexedDB.open('fixture',1);q.onsuccess=()=>{const db=q.result,read=db.transaction('state').objectStore('state').get('pointer');read.onsuccess=()=>{db.close();r(read.result===42);};read.onerror=()=>{db.close();j(read.error);};};q.onerror=()=>j(q.error);}));
 });
 await gate('crossTabWebLocks',async()=>{
  await a.evaluate(()=>{if(!navigator.locks)throw Error('Web Locks absent');window.acquired=false;window.released=new Promise(r=>window.release=r);window.hold=navigator.locks.request('fixture',async()=>{window.acquired=true;await window.released;});});
  await a.waitForFunction(()=>window.acquired,null,{timeout:5000});
  const blocked=await b.evaluate(()=>navigator.locks.request('fixture',{ifAvailable:true},lock=>lock===null));
  await a.evaluate(async()=>{window.release();await window.hold;});
  const acquired=await b.evaluate(()=>navigator.locks.request('fixture',{ifAvailable:true},lock=>!!lock&&lock.mode==='exclusive'));return blocked&&acquired;
 });
 await gate('cache',()=>a.evaluate(async()=>{const c=await caches.open('fixture');await c.put('/sample',new Response('42'));const value=await(await c.match('/sample')).text();await caches.delete('fixture');return value==='42';}));
 await gate('opfs',()=>a.evaluate(async()=>{if(!navigator.storage?.getDirectory)throw Error('OPFS absent');const root=await navigator.storage.getDirectory(),f=await root.getFileHandle('fixture',{create:true}),w=await f.createWritable();await w.write('42');await w.close();const ok=(await(await f.getFile()).text())==='42';await root.removeEntry('fixture');return ok;}));
 await gate('serviceWorkerOffline',async()=>{
  await a.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});await a.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:10000});await ctx.setOffline(true);
  try{return await a.evaluate(async()=>await(await fetch('/offline-canary')).text()==='42');}finally{await ctx.setOffline(false);}
 });
}catch(e){report.error=String(e).slice(0,400);}
finally{await browser?.close();await new Promise(r=>server.close(r));}
report.status=!report.error&&Object.keys(report.gates).length===5&&Object.values(report.gates).every(x=>x.status==='PASS')?'PASS_SCOPED':'FAIL_OR_BLOCKED';
await mkdir('runtime-evidence',{recursive:true});await writeFile('runtime-evidence/storage-'+name+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.status!=='PASS_SCOPED')process.exitCode=1;
