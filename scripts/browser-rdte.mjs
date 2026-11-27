import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fixture, reference, qualification } from './browser-probe.mjs';
import assert from 'node:assert/strict';
const profile=process.argv[2]||'chromium';
const choices={chromium:[chromium,{}],edge:[chromium,{channel:'msedge'}],firefox:[firefox,{}],webkit:[webkit,{}],'chromium-touch':[chromium,{}],'webkit-touch':[webkit,{}]};
assert.ok(choices[profile], 'Unknown browser profile');
const touch=profile.endsWith('-touch'), [engine,launch]=choices[profile], probe=await readFile(new URL('./browser-probe.mjs',import.meta.url));
const server=createServer((req,res)=>{
 if(req.url==='/probe.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(probe);return;}
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Browser capability probe</title>');return;}
 res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser, timer;
const report={schema:1,profile,host:{platform:process.platform,arch:process.arch,node:process.version},executionModel:touch?'desktop viewport/touch emulation':'native desktop browser process',source:process.env.GITHUB_SHA??null,cpuNode:qualification(),status:'NOT_RUN'};
try{
 browser=await engine.launch({...launch,headless:true,timeout:45000});
 report.browserVersion=browser.version();
 const context=await browser.newContext(touch?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:900}});
 const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port,{timeout:15000});
 report.browser=await Promise.race([page.evaluate(async()=>{
   const m=await import('/probe.mjs');
   const out={secureContext:isSecureContext,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],touch:navigator.maxTouchPoints,cpu:m.qualification(),gates:{},gpu:{status:'NOT_RUN'}};
   const check=async(name,fn)=>{try{out.gates[name]={status:await fn()?'PASS':'FAIL'};}catch(e){out.gates[name]={status:'BLOCKED_OR_FAIL',reason:String(e).slice(0,180)};}};
   await check('wasm',async()=>{const b=new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,127,3,2,1,0,7,5,1,1,102,0,0,10,6,1,4,0,65,42,11]);return (await WebAssembly.instantiate(b)).instance.exports.f()===42;});
   await check('crypto',async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array([97,98,99]))),x=>x.toString(16).padStart(2,'0')).join('')==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
   await check('worker',()=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob(['onmessage=e=>postMessage(e.data+1)'],{type:'text/javascript'}));const worker=new Worker(url);const close=()=>{worker.terminate();URL.revokeObjectURL(url);};const t=setTimeout(()=>{close();reject(Error('worker timeout'));},3000);worker.onmessage=e=>{clearTimeout(t);close();resolve(e.data===42);};worker.onerror=e=>{clearTimeout(t);close();reject(Error(e.message));};worker.postMessage(41);}));
   await check('indexedDB',()=>new Promise((resolve,reject)=>{const name='evoforge-browser-canary',req=indexedDB.open(name,1);req.onupgradeneeded=()=>req.result.createObjectStore('test');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('test','readwrite'),store=tx.objectStore('test');store.put(42,'value');const read=store.get('value');let good=false;read.onsuccess=()=>good=read.result===42;tx.onabort=()=>{db.close();reject(tx.error);};tx.oncomplete=()=>{db.close();const del=indexedDB.deleteDatabase(name);del.onsuccess=()=>resolve(good);del.onerror=()=>reject(del.error);};};}));
   let device;
   try{
    if(!navigator.gpu)out.gpu={status:'UNAVAILABLE',reason:'API absent'};
    else{
     const a=await navigator.gpu.requestAdapter();if(!a)out.gpu={status:'UNAVAILABLE',reason:'No adapter'};
     else{
      const info=a.info??{};device=await a.requestDevice();const rows=[];
      for(const n of [1,16,64,256,1024,4096]){
       const f=m.fixture(n),expected=m.reference(f),samples=[];let maxError=0;
       for(let j=0;j<4;j++){const start=performance.now(),actual=await m.gpuBatch(window,device,f);if(j>0)samples.push(performance.now()-start);for(let i=0;i<n;i++){if(!Number.isFinite(actual[i]))throw Error('Nonfinite output');maxError=Math.max(maxError,Math.abs(expected[i]-actual[i]));}}
       rows.push({n,maxError,samplesMs:samples,passed:maxError<=0.0001});
      }
      out.gpu={status:rows.every(x=>x.passed)?'PASS_SCOPED':'FAIL',adapter:{vendor:info.vendor??null,architecture:info.architecture??null,description:info.description??null,fallback:info.isFallbackAdapter??a.isFallbackAdapter??null},rows,scope:'actual synthetic compute/readback; includes allocation and dispatch; not physical mobile or full ALife qualification'};
     }
    }
   }catch(e){out.gpu={status:'FAIL_OR_BLOCKED',reason:String(e).slice(0,300)};}finally{device?.destroy();}
   return out;
 }),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('browser probe deadline')),120000);})]);
 const result=report.browser;
 report.status=Object.values(result.gates).every(x=>x.status==='PASS')?'COMPLETE':'FAIL_OR_BLOCKED';
 if(['FAIL','FAIL_OR_BLOCKED'].includes(result.gpu.status))report.status='FAIL_OR_BLOCKED';
}catch(e){report.status='FAIL_OR_BLOCKED';report.reason=String(e).slice(0,400);}
finally{clearTimeout(timer);await browser?.close();await new Promise(resolve=>server.close(resolve));}
await mkdir('browser-evidence',{recursive:true});await writeFile('browser-evidence/'+profile+'.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(report.status!=='COMPLETE')process.exitCode=1;
