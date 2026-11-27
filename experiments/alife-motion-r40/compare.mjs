import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
const baseline='cdc020ac29efbb7bdca26461c75c78dae61938bc';
const candidate=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const path='public/experiences/alife/index.html';
const old=execFileSync('git',['show',baseline+':'+path],{encoding:'utf8'});
const current=await readFile(path,'utf8');
function instrument(s){
 const change=(a,b)=>{assert.equal(s.split(a).length,2,a);s=s.replace(a,b)};
 change('size: MAX_NODES * 48 * 3, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST','size: MAX_NODES * 48 * 3, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC');
 change('const statsReadBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });','const statsReadBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });\n  const traceBuffer=device.createBuffer({size:MAX_NODES*48,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});window.__motionTrace=[];');
 change('    const rpass = encoder.beginRenderPass({','    if(stepping && state.simTick<=180)encoder.copyBufferToBuffer(nodeBuffer,0,traceBuffer,0,eco.activeNodes*48);\n    const rpass = encoder.beginRenderPass({');
 change('    device.queue.onSubmittedWorkDone().then(() => { if(!stopped) requestAnimationFrame(frame); }).catch(error => failArena(error.message));',`    const traceTick=state.simTick;
    device.queue.onSubmittedWorkDone().then(async()=>{
      if(stepping && traceTick<=180){
        await traceBuffer.mapAsync(GPUMapMode.READ);
        try{const buf=traceBuffer.getMappedRange();const f=new Float32Array(buf),u=new Uint32Array(buf);const heads=[];
          for(let i=0;i<eco.activeNodes;i++){let k=i*12;if(f[k+3]>.05&&f[k+7]<6&&u[k+9]===0)heads.push([u[k+8],f[k+7],f[k],f[k+1],f[k+2]]);
          }window.__motionTrace.push({tick:traceTick,heads});
        }finally{traceBuffer.unmap();}
      }
      if(!stopped)requestAnimationFrame(frame);
    }).catch(error=>failArena(error.message));`);
 return s;
}
const pages={baseline:instrument(old),candidate:instrument(current)};
const server=createServer((req,res)=>{const key=new URL(req.url,'http://localhost').pathname.slice(1);if(!Object.hasOwn(pages,key)){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(pages[key])});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
const out='motion-evidence';await mkdir(out,{recursive:true});
function summarize(trace){
 assert.equal(trace.length,180);assert.ok(trace.every((t,i)=>t.tick===i+1));
 const retained=new Set(trace[29].heads.map(h=>h[0]));const previous=new Map();const velocities=new Map(),speed=[],acceleration=[],jerk=[],turn=[];
 for(const sample of trace.slice(29)){
  const live=new Set(sample.heads.map(h=>h[0]));for(const id of retained)if(!live.has(id))retained.delete(id);
  for(const [id,sp,x,y,z] of sample.heads){assert.ok([x,y,z].every(Number.isFinite));if(!retained.has(id))continue;const pos=[x,y,z],p=previous.get(id);previous.set(id,pos);if(!p)continue;
   const v=pos.map((n,i)=>n-p[i]),norm=Math.hypot(...v);speed.push(norm);const old=velocities.get(id);if(old){const a=v.map((n,i)=>n-old.v[i]);acceleration.push(Math.hypot(...a));if(old.a)jerk.push(Math.hypot(...a.map((n,i)=>n-old.a[i])));const mag=Math.hypot(...old.v);if(mag>0.005&&norm>0.005)turn.push(Math.acos(Math.max(-1,Math.min(1,v.reduce((s,n,i)=>s+n*old.v[i],0)/(mag*norm)))));velocities.set(id,{v,a});}else velocities.set(id,{v});
  }
 }
 function stats(a){assert.ok(a.length>0);const sorted=[...a].sort((x,y)=>x-y);return {n:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p95:sorted[Math.floor(.95*(a.length-1))]};}
 return {speed:stats(speed),acceleration:stats(acceleration),jerk:stats(jerk),turn:stats(turn),survivingContinuousSlots:retained.size};
}
const results=[];
try{
 for(const seed of [42,1337,2026])for(const variant of ['baseline','candidate']){
  const context=await browser.newContext({viewport:{width:960,height:640},serviceWorkers:'block'});
  await context.addInitScript(()=>{const request=navigator.gpu.requestAdapter.bind(navigator.gpu);navigator.gpu.requestAdapter=async(...args)=>{const a=await request(...args);if(a)window.__adapter={vendor:a.info.vendor,fallback:a.info.isFallbackAdapter??a.isFallbackAdapter};return a}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+variant+'?mode=observe&profile=smoke&seed='+seed);
  await page.waitForFunction(()=>window.__ARENA_RPC__?.getState().phase==='error'||window.__motionTrace?.length===180,null,{timeout:120000});
  const {trace,state,adapter}=await page.evaluate(()=>({trace:window.__motionTrace,state:window.__ARENA_RPC__.getState(),adapter:window.__adapter}));
  assert.notEqual(state.phase,'error',state.error);assert.ok(adapter.vendor.toLowerCase().includes('apple'));assert.equal(adapter.fallback,false);assert.equal(state.knobs.state.arenaRadius,9.5);assert.equal(state.knobs.state.popCounts.reduce((a,b)=>a+b,0),16);assert.deepEqual(errors,[]);
  const row={seed,variant,...summarize(trace),finalTelemetry:state.telemetry};results.push(row);console.log(JSON.stringify(row));
  await writeFile(out+'/'+variant+'-'+seed+'.json',JSON.stringify(trace));
  await page.evaluate(()=>window.__ARENA_RPC__.setPaused(true));await page.screenshot({path:out+'/'+variant+'-'+seed+'.png'});await context.close();
 }
 await writeFile(out+'/summary.json',JSON.stringify({baseline,candidate,scope:'same seed, smoke population, radius, arena family, native Metal; combined-change comparison, not causal isolation; node slot trajectories after warmup, not lifetime identity',results},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
