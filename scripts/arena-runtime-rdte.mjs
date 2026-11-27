// Native runtime diagnostic; does not change the production arena or its gates.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const mode=process.argv[2];
const modes={
 'linux-swiftshader':{headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']},
 'mac-headed':{headless:false,args:['--enable-unsafe-webgpu']},
 'mac-headless':{channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']}
};
if(!modes[mode]||mode.startsWith('mac-')&&process.platform!=='darwin'||mode.startsWith('linux-')&&process.platform!=='linux')throw Error('PROFILE');
const html=await readFile(new URL('../public/experiences/alife/index.html',import.meta.url)),probe=await readFile(new URL('./browser-probe.mjs',import.meta.url));
const server=createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/probe.mjs')return res.writeHead(200,{'Content-Type':'text/javascript'}).end(probe);
 if(p==='/arena')return res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);
 if(p==='/')return res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<!doctype html><title>GPU oracle</title>');
 res.writeHead(404).end();
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,report={schema:1,profile:mode,source:process.env.GITHUB_SHA??null,arenaSha256:createHash('sha256').update(html).digest('hex'),os:process.platform,arch:process.arch,launch:modes[mode],canary:{status:'NOT_RUN'},arena:{status:'NOT_RUN'},trace:[]};
let browser,context,timer;
const deadline=(p,ms)=>Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),ms)})]).finally(()=>clearTimeout(timer));
try{
 browser=await chromium.launch({...modes[mode],timeout:45000});report.browser=browser.version();
 context=await browser.newContext({viewport:{width:960,height:640},serviceWorkers:'block'});
 const page=await context.newPage();
 await page.goto(origin);
 report.canary=await deadline(page.evaluate(async()=>{
  let device;
  try{
   if(!navigator.gpu)return {status:'UNAVAILABLE',reason:'API absent'};
   const adapter=await navigator.gpu.requestAdapter();if(!adapter)return {status:'UNAVAILABLE',reason:'No adapter'};
   const m=await import('/probe.mjs'),info=adapter.info??{};
   device=await adapter.requestDevice();const f=m.fixture(64),expected=m.reference(f),actual=await m.gpuBatch(window,device,f);
   const error=Math.max(...actual.map((v,i)=>Math.abs(v-expected[i])));return {status:Number.isFinite(error)&&error<=.0001?'PASS_SCOPED':'FAIL',maxError:error,info:{vendor:info.vendor??null,architecture:info.architecture??null,description:info.description??null,fallback:info.isFallbackAdapter??adapter.isFallbackAdapter??null},limits:{storage:device.limits.maxStorageBuffersPerShaderStage,buffer:device.limits.maxBufferSize}};
  }catch(e){return {status:'FAIL_OR_BLOCKED',reason:String(e).slice(0,300)}}finally{device?.destroy()}
 }),45000);
 await page.close();
 // Isolated new page and fresh device for the shipped arena.
 const p=await context.newPage();
 const record=(kind,msg)=>{if(report.trace.length<160)report.trace.push({kind,message:String(msg).slice(0,900)});};
 p.on('console',m=>record(m.type(),m.text()));p.on('pageerror',e=>record('pageerror',e.message));p.on('crash',()=>record('crash','page crashed'));
 await p.addInitScript(()=>{
  const emit=(event,data={})=>console.info('RDTE '+JSON.stringify({event,...data}));
  window.addEventListener('pagehide',e=>emit('pagehide',{persisted:e.persisted}));
  if(!navigator.gpu)return;
  const request=navigator.gpu.requestAdapter.bind(navigator.gpu);
  navigator.gpu.requestAdapter=async(...args)=>{
   const a=await request(...args);if(!a){emit('no-adapter');return a;}
   const i=a.info??{};emit('adapter',{vendor:i.vendor,architecture:i.architecture,description:i.description,fallback:i.isFallbackAdapter??a.isFallbackAdapter??null});
   const req=a.requestDevice.bind(a);
   a.requestDevice=async(...args)=>{
    const d=await req(...args);let submitted=0;
    emit('device',{storage:d.limits.maxStorageBuffersPerShaderStage});
    d.lost.then(i=>emit('device-lost',{reason:i.reason,message:i.message,submitted}));
    d.addEventListener('uncapturederror',e=>emit('uncaptured',{message:e.error.message}));
    for(const method of ['createComputePipeline','createRenderPipeline']){
     const orig=d[method].bind(d);d[method]=desc=>{emit(method,{entry:desc.compute?.entryPoint??desc.vertex?.entryPoint});return orig(desc);};
    }
    const submit=d.queue.submit.bind(d.queue);d.queue.submit=cmds=>{submitted++;if(submitted<=16)emit('submit',{submitted});return submit(cmds);};
    const done=d.queue.onSubmittedWorkDone.bind(d.queue);d.queue.onSubmittedWorkDone=()=>{const n=submitted;return done().then(()=>{if(n<=16)emit('complete',{submitted:n});});};
    const destroy=d.destroy.bind(d);d.destroy=()=>{emit('explicit-destroy',{submitted});return destroy();};
    return d;
   };return a;
  };
 });
 try{
  await p.goto(origin+'/arena?mode=observe&profile=smoke&seed=42',{timeout:15000});
  await p.waitForFunction(()=>{const s=window.__ARENA_RPC__?.getState();return s&&(s.phase==='error'||s.telemetry.tick>=15);},null,{timeout:90000});
  const s=await p.evaluate(()=>window.__ARENA_RPC__.getState());
  report.arena={status:s.phase!=='error'&&s.telemetry.tick>=15&&s.telemetry.energy.flora>0?'PASS_SCOPED':'FAIL',phase:s.phase,error:s.error,tick:s.tick,telemetry:s.telemetry};
 }catch(e){report.arena={status:'FAIL_OR_BLOCKED',reason:String(e).slice(0,400),state:await p.evaluate(()=>window.__ARENA_RPC__?.getState()).catch(()=>null)};}
 await p.close();
}catch(e){report.error=String(e).slice(0,400);}
finally{clearTimeout(timer);await browser?.close();await new Promise(r=>server.close(r));}
await mkdir('runtime-evidence',{recursive:true});await writeFile('runtime-evidence/'+mode+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(report.canary.status!=='PASS_SCOPED'||report.arena.status!=='PASS_SCOPED')process.exitCode=1;
