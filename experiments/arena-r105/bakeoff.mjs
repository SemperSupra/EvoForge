import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../human-ux-r58/server.mjs';
const out='arena-r105-evidence';await mkdir(out,{recursive:true});const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const {base,close}=await serve();let browser;const rows=[];
const pct=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*q)];
try{
 browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
 // Balanced order, fixed viewport and same founder/seed/solver, actual tick-count window.
 // clear-only is a diagnostic intervention on drawing, never a product mode.
 const arms=[['full75',.75,false],['clear75',.75,true],['full50',.5,false],['full50',.5,false],['clear75',.75,true],['full75',.75,false]];
 for(let trial=0;trial<arms.length;trial++){
  const [arm,dpr,clearOnly]=arms[trial],ctx=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:dpr,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await ctx.addInitScript(clearOnly=>{
   const P=window.__bakeoff={frames:[],adapter:null,done:false,errors:[]};let tick=0,nodes=0,lastTick=-1,dispatches=0,workgroups=0,draws=0,suppressed=0,last=null;
   const req=navigator.gpu.requestAdapter.bind(navigator.gpu);navigator.gpu.requestAdapter=async(...args)=>{const a=await req(...args);if(a)P.adapter={vendor:a.info.vendor,fallback:a.info.isFallbackAdapter??a.isFallbackAdapter};return a;};
   const write=GPUQueue.prototype.writeBuffer;GPUQueue.prototype.writeBuffer=function(b,o,d,...r){if(b.size===608&&o===0&&d instanceof ArrayBuffer&&d.byteLength===608){const v=new Uint32Array(d);nodes=v[0];tick=v[4];}return write.call(this,b,o,d,...r);};
   const dispatch=GPUComputePassEncoder.prototype.dispatchWorkgroups;GPUComputePassEncoder.prototype.dispatchWorkgroups=function(x,y=1,z=1){dispatches++;workgroups+=x*y*z;return dispatch.call(this,x,y,z);};
   for(const key of ['draw','drawIndexed','executeBundles']){
    const original=GPURenderPassEncoder.prototype[key];if(typeof original!=='function')continue;
    GPURenderPassEncoder.prototype[key]=function(...args){draws++;if(clearOnly){suppressed++;return;}return original.apply(this,args);};
   }
   const submit=GPUQueue.prototype.submit,fence=GPUQueue.prototype.onSubmittedWorkDone;
   GPUQueue.prototype.submit=function(cmds){const c=document.getElementById('canvas');last={tick,nodes,width:c.width,height:c.height,dispatches,workgroups,draws,suppressed,submitted:performance.now(),stepping:tick!==lastTick};lastTick=tick;dispatches=workgroups=draws=suppressed=0;return submit.call(this,cmds);};
   GPUQueue.prototype.onSubmittedWorkDone=function(...args){
    const frame=last;last=null;const promise=fence.apply(this,args);
    if(frame?.stepping&&frame.tick>=30&&frame.tick<=150)promise.then(()=>{
     frame.completed=performance.now();frame.fenceMs=frame.completed-frame.submitted;P.frames.push(frame);
     if(frame.tick===150){window.__ARENA_RPC__.setPaused(true);P.done=true;}
    },e=>P.errors.push(String(e)));
    return promise;
   };
  },clearOnly);
  await p.goto(base+'experiences/alife/index.html?mode=play&seed=42');
  await p.waitForFunction(()=>{const s=window.__ARENA_RPC__?.getState();return window.__bakeoff?.done||s?.phase==='error';},null,{timeout:120000});
  const [s,receipt]=await Promise.all([p.evaluate(()=>window.__ARENA_RPC__.getState()),p.evaluate(()=>window.__bakeoff)]);
  assert.notEqual(s.phase,'error',s.error);assert.equal(s.tick,150);assert.equal(s.knobs.state.deviceProfile,'laptop');assert.equal(s.knobs.state.targetHz,45);assert.equal(receipt.adapter.fallback,false);assert.deepEqual(receipt.errors,[]);assert.deepEqual(errors,[]);
  assert.equal(receipt.frames.length,121);assert.deepEqual(receipt.frames.map(f=>f.tick),Array.from({length:121},(_,i)=>i+30));
  const f=receipt.frames;assert.ok(f.every(v=>v.nodes===1449&&v.dispatches===24&&v.workgroups===2161&&v.width===Math.floor(1280*dpr)&&v.height===Math.floor(800*dpr)));
  assert.ok(f.every(v=>v.draws>0&&(clearOnly?v.suppressed===v.draws:v.suppressed===0)));
  const seconds=(f.at(-1).completed-f[0].completed)/1000,ms=f.map(v=>v.fenceMs),row={trial,arm,dpr,clearOnly,width:f[0].width,height:f[0].height,activeNodes:f[0].nodes,dispatches:f[0].dispatches,workgroups:f[0].workgroups,ticks:120,seconds,ticksPerSecond:120/seconds,fenceP50ms:pct(ms,.5),fenceP95ms:pct(ms,.95),adapter:receipt.adapter};
  console.log('BAKEOFF '+JSON.stringify(row));rows.push(row);
  await writeFile(out+'/trial-'+trial+'.json',JSON.stringify({row,frames:f},null,2));if(!clearOnly)await p.screenshot({path:out+'/'+arm+'-'+trial+'.png'});await ctx.close();
 }
 assert.equal(rows.length,6);
}finally{await writeFile(out+'/results.json',JSON.stringify({source,productBlob:'40c8357da97212aa2a6a03b7994537f5b7d15eb6',rows,scope:'native same-runner fixed-tick diagnostic; clear-only suppresses drawing, not product; no GPU timestamp or physical device inference'},null,2));await browser?.close();await close();}
