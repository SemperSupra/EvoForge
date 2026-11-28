import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../human-ux-r58/server.mjs';
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const expected='608de62e75f67d0382aafd719b510af5225357ce';
const out='arena-r103-evidence';await mkdir(out,{recursive:true});
const serverErrors=[];const {base,close}=await serve({onResponse:r=>{if(r.status>=400&&serverErrors.length<100)serverErrors.push(r);}});let browser;const rows=[];
const percentile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(p*(a.length-1)))]:null;
function summarize(samples){
 const groups=new Map();
 for(const s of samples){const k=s.phase+'-'+s.width+'x'+s.height;const g=groups.get(k)??[];g.push(s);groups.set(k,g);}
 return [...groups.entries()].map(([group,s])=>({group,n:s.length,timed:s.filter(x=>x.computeMs!==null&&x.renderMs!==null).length,renderTimed:s.filter(x=>x.renderMs!==null).length,
  computeMs:{p50:percentile(s.flatMap(x=>x.computeMs===null?[]:[x.computeMs]),.5),p95:percentile(s.flatMap(x=>x.computeMs===null?[]:[x.computeMs]),.95)},
  renderMs:{p50:percentile(s.flatMap(x=>x.renderMs===null?[]:[x.renderMs]),.5),p95:percentile(s.flatMap(x=>x.renderMs===null?[]:[x.renderMs]),.95)},
  fenceMs:{p50:percentile(s.flatMap(x=>x.fenceMs===null?[]:[x.fenceMs]),.5),p95:percentile(s.flatMap(x=>x.fenceMs===null?[]:[x.fenceMs]),.95)},
  hostEncodeMs:{p50:percentile(s.map(x=>x.encodeMs),.5),p95:percentile(s.map(x=>x.encodeMs),.95)},dispatches:Math.max(...s.map(x=>x.dispatches)),workgroups:Math.max(...s.map(x=>x.workgroups)),activeNodes:[...new Set(s.map(x=>x.nodes))]}));
}
try{
 // Diagnostic checkout is an exact descendant with harness only. Confirm product blob parity in workflow.
 browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
 for(const [width,height,touch,dpr] of [[1280,800,false,2],[390,844,true,2]]){
  serverErrors.length=0;
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:dpr,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[],warnings=[],http=[],failed=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(['warning','error'].includes(m.type())&&warnings.length<40)warnings.push(m.text().slice(0,500));});
  const local=url=>{try{const u=new URL(url);return u.origin===new URL(base).origin?u.pathname+u.search:u.origin+u.pathname;}catch{return String(url).slice(0,200);}};
  p.on('response',r=>{if(r.status()>=400&&http.length<40)http.push({url:local(r.url()),status:r.status(),type:r.request().resourceType()});});
  p.on('requestfailed',r=>{if(failed.length<40)failed.push({url:local(r.url()),type:r.resourceType(),error:r.failure()?.errorText});});
  await ctx.addInitScript(()=>{
   const samples=[],errors=[];window.__profile={samples,errors,feature:false,adapter:null,phase:'warmup',count:0};
   const P=window.__profile,encoders=new WeakMap(),buffers=new WeakMap(),queues=new WeakMap(),passRecords=new WeakMap(),queueLast=new WeakMap();
   let nodes=0,pending=false;
   const adapterRequest=navigator.gpu.requestAdapter.bind(navigator.gpu);
   navigator.gpu.requestAdapter=async(...args)=>{const a=await adapterRequest(...args);if(a)P.adapter={vendor:a.info.vendor,fallback:a.info.isFallbackAdapter??a.isFallbackAdapter,advertisedTimestamp:a.features.has('timestamp-query')};return a;};
   const request=GPUAdapter.prototype.requestDevice;
   GPUAdapter.prototype.requestDevice=async function(desc={}){
    const supported=this.features.has('timestamp-query');
    const d=await request.call(this,supported?{...desc,requiredFeatures:[...new Set([...(desc.requiredFeatures??[]),'timestamp-query'])]}:desc);
    P.feature=d.features.has('timestamp-query');const q={device:d,set:null,resolve:null,read:null};
    if(P.feature){q.set=d.createQuerySet({type:'timestamp',count:4});q.resolve=d.createBuffer({size:32,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC});q.read=d.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});}
    queues.set(d.queue,q);return d;
   };
   const write=GPUQueue.prototype.writeBuffer;
   GPUQueue.prototype.writeBuffer=function(buffer,offset,data,...rest){if(buffer.size===608&&offset===0&&data instanceof ArrayBuffer&&data.byteLength===608)nodes=new Uint32Array(data)[0];return write.call(this,buffer,offset,data,...rest);};
   const make=GPUDevice.prototype.createCommandEncoder;
   GPUDevice.prototype.createCommandEncoder=function(...args){
    const e=make.apply(this,args),q=queues.get(this.queue);P.count++;
    if(q&&!pending&&P.phase!=='warmup'&&P.count%5===0&&samples.length<160){
     pending=true;const c=document.getElementById('canvas');
     encoders.set(e,{q,record:{phase:P.phase,width:c.width,height:c.height,nodes,computeMs:null,renderMs:null,fenceMs:null,encodeMs:0,dispatches:0,workgroups:0,ordinal:P.count},start:performance.now(),compute:false,render:false});
    }
    return e;
   };
   const compute=GPUCommandEncoder.prototype.beginComputePass,render=GPUCommandEncoder.prototype.beginRenderPass;
   GPUCommandEncoder.prototype.beginComputePass=function(desc={}){
    const s=encoders.get(this);if(s)s.compute=true;
    const p=compute.call(this,s?.q.set?{...desc,timestampWrites:{querySet:s.q.set,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:desc);
    if(s)passRecords.set(p,s.record);return p;
   };
   GPUCommandEncoder.prototype.beginRenderPass=function(desc){
    const s=encoders.get(this);if(s)s.render=true;
    return render.call(this,s?.q.set?{...desc,timestampWrites:{querySet:s.q.set,beginningOfPassWriteIndex:2,endOfPassWriteIndex:3}}:desc);
   };
   const dispatch=GPUComputePassEncoder.prototype.dispatchWorkgroups;
   GPUComputePassEncoder.prototype.dispatchWorkgroups=function(x,y=1,z=1){const r=passRecords.get(this);if(r){r.dispatches++;r.workgroups+=x*y*z;}return dispatch.call(this,x,y,z);};
   const finish=GPUCommandEncoder.prototype.finish;
   GPUCommandEncoder.prototype.finish=function(...args){
    const s=encoders.get(this);
    if(s?.q.set&&s.render){const first=s.compute?0:2,count=s.compute?4:2;this.resolveQuerySet(s.q.set,first,count,s.q.resolve,0);this.copyBufferToBuffer(s.q.resolve,0,s.q.read,0,count*8);}
    const b=finish.apply(this,args);if(s){s.record.encodeMs=performance.now()-s.start;buffers.set(b,s);}return b;
   };
   const submit=GPUQueue.prototype.submit,fence=GPUQueue.prototype.onSubmittedWorkDone;
   GPUQueue.prototype.submit=function(commands){
    const s=commands.map(c=>buffers.get(c)).find(Boolean);const at=performance.now();const result=submit.call(this,commands);
    if(s){s.submit=at;queueLast.set(this,s);
     if(s.q.set&&s.render){s.q.read.mapAsync(GPUMapMode.READ).then(()=>{
       const arr=new BigUint64Array(s.q.read.getMappedRange());const ms=(a,b)=>b>=a?Number(b-a)/1e6:null;
       if(s.compute){s.record.computeMs=ms(arr[0],arr[1]);s.record.renderMs=ms(arr[2],arr[3]);}
       else{s.record.renderMs=ms(arr[0],arr[1]);}
       s.q.read.unmap();s.mapped=true;if(s.fenced){samples.push(s.record);pending=false;}
      }).catch(e=>{errors.push(String(e));s.mapped=true;if(s.fenced){samples.push(s.record);pending=false;}});
     }else s.mapped=true;
    }return result;
   };
   GPUQueue.prototype.onSubmittedWorkDone=function(...args){
    const s=queueLast.get(this);if(s)queueLast.delete(this);
    const promise=fence.apply(this,args);
    if(s)promise.then(()=>{s.record.fenceMs=performance.now()-s.submit;s.fenced=true;if(s.mapped){samples.push(s.record);pending=false;}},e=>{errors.push(String(e));pending=false;});
    return promise;
   };
  });
  await p.goto(base+'experiences/alife/index.html?mode=play&seed=42');if(touch)await p.locator('#mobile-start-button').click();
  await p.waitForFunction(()=>{const s=window.__ARENA_RPC__?.getState();return s&&(s.phase==='error'||s.telemetry.tick>=15);},null,{timeout:120000});
  const snap=()=>p.evaluate(()=>window.__ARENA_RPC__.getState()),initial=await snap();assert.equal(initial.version,'0.1.0-rdte.8');assert.notEqual(initial.phase,'error',initial.error);
  await p.evaluate(()=>window.__profile.phase='running');const start=Date.now();await p.waitForTimeout(25000);const end=await snap();assert.ok(end.tick>initial.tick);assert.notEqual(end.phase,'error',end.error);
  const runningSeconds=(Date.now()-start)/1000;await p.evaluate(()=>{window.__ARENA_RPC__.setPaused(true);window.__profile.phase='paused-render';});
  const stopped=await snap();for(let i=0;i<35;i++){const revision=(await snap()).knobs.state.viewRevision;await p.locator('#cam-home').click();await p.waitForFunction(r=>window.__ARENA_RPC__.getState().knobs.state.viewRevision>r,revision,{timeout:20000});}
  assert.equal((await snap()).tick,stopped.tick);await p.waitForTimeout(300);const receipt=await p.evaluate(()=>window.__profile);
  assert.equal(receipt.adapter.fallback,false);assert.deepEqual(receipt.errors,[]);assert.deepEqual(errors,[]);
  assert.ok(receipt.samples.some(s=>s.phase==='running'&&s.dispatches>=20&&s.fenceMs!==null));
  assert.ok(receipt.samples.some(s=>s.phase==='paused-render'&&s.dispatches===0));
  if(receipt.feature)assert.ok(receipt.samples.some(s=>s.computeMs>0&&s.renderMs>0),'advertised timestamp feature must yield actual timings');
  const groups=summarize(receipt.samples);const row={profile:initial.knobs.state.deviceProfile,width,height,touch,initialDpr:initial.knobs.state.renderDpr,finalDpr:end.knobs.state.renderDpr,ticks:end.tick-initial.tick,seconds:runningSeconds,ticksPerSecond:(end.tick-initial.tick)/runningSeconds,target:end.knobs.state.targetHz,feature:receipt.feature,adapter:receipt.adapter,groups,http,serverErrors:serverErrors.slice(),failed,warnings,errors,scope:'sampled diagnostic feature injection; no per-kernel timestamp claim, no physical device; fence includes other queue and host delay'};
  rows.push(row);console.log('PROFILE '+JSON.stringify(row));await writeFile(out+'/'+row.profile+'-samples.json',JSON.stringify(receipt.samples,null,2));await ctx.close();
 }
}finally{await writeFile(out+'/results.json',JSON.stringify({source,productBase:expected,rows},null,2));await browser?.close();await close();}
