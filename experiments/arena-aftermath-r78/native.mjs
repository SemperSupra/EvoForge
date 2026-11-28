import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../human-ux-r58/server.mjs';
const out='aftermath-evidence';await mkdir(out,{recursive:true});
const {base,close}=await serve();let browser;const rows=[];
try{
 browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
 for(const trial of ['dry','wet','remains']){
  const ctx=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await ctx.addInitScript(fixture=>{
   let gpu,nodeBuffer,creatureBuffer;
   const request=navigator.gpu.requestAdapter.bind(navigator.gpu);
   navigator.gpu.requestAdapter=async(...args)=>{const a=await request(...args);if(a)window.__adapter={vendor:a.info.vendor,fallback:a.info.isFallbackAdapter??a.isFallbackAdapter};return a};
   const create=GPUDevice.prototype.createBuffer;
   GPUDevice.prototype.createBuffer=function(d){
    const node=d.size===7200*48*3,creature=d.size===512*32;
    const b=create.call(this,node||creature?{...d,usage:d.usage|GPUBufferUsage.COPY_SRC}:d);
    if(node){gpu=this;nodeBuffer=b;}if(creature)creatureBuffer=b;return b;
   };
   const write=GPUQueue.prototype.writeBuffer;
   GPUQueue.prototype.writeBuffer=function(b,offset,data,...rest){
    if(fixture&&offset===0&&b===creatureBuffer&&data.byteLength===512*32){
     const bytes=data.slice(0),u=new Uint32Array(bytes);u[6*8]=0;u[7*8]=0;u[0]=90000;
     return write.call(this,b,offset,bytes,...rest);
    }
    if(fixture&&offset===0&&b===nodeBuffer&&data.byteLength===7200*48){
     const bytes=data.slice(0),f=new Float32Array(bytes),u=new Uint32Array(bytes);
     if(u[73*12+8]!==7||u[60*12+8]!==6)throw Error('fixture layout changed');
     // One seeded structural specimen, one normal dead urchin; all downstream state is real WGSL.
     f[73*12+3]=60/650;f[73*12+7]=8;u[73*12+10]=u[73*12+11]=0xffffffff;
     for(let j=61;j<66;j++){const o=j*12,live=114*12;
      f[o]=f[live]+Math.cos(j)*.13;f[o+1]=f[live+1];f[o+2]=f[live+2]+Math.sin(j)*.13;
      f[o+3]=228/650;f[o+4]=f[o];f[o+5]=f[o+1];f[o+6]=f[o+2];f[o+7]=6;u[o+10]=u[o+11]=0xffffffff;
     }
     return write.call(this,b,offset,bytes,...rest);
    }
    return write.call(this,b,offset,data,...rest);
   };
   async function read(b,size){
    await gpu.queue.onSubmittedWorkDone();
    const staging=create.call(gpu,{size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const e=gpu.createCommandEncoder();e.copyBufferToBuffer(b,0,staging,0,size);gpu.queue.submit([e.finish()]);await staging.mapAsync(GPUMapMode.READ);
    const data=staging.getMappedRange().slice(0);staging.unmap();staging.destroy();return data;
   }
   window.__readFixture=async()=>{const bytes=await read(nodeBuffer,328*48),f=new Float32Array(bytes),u=new Uint32Array(bytes),c=new Uint32Array(await read(creatureBuffer,512*32));
    return Array.from({length:328},(_,i)=>({x:f[i*12],y:f[i*12+1],z:f[i*12+2],mass:f[i*12+3],kind:f[i*12+7],cid:u[i*12+8],lid:u[i*12+9],energy:c[u[i*12+8]*8]}));};
  },trial==='remains');
  await p.goto(base+'experiences/alife/index.html?mode=play&profile=smoke&seed=42');
  await p.waitForFunction(()=>window.__ARENA_RPC__?.getState().telemetry.tick>=15,null,{timeout:90000});
  const snap=()=>p.evaluate(()=>window.__ARENA_RPC__.getState());
  const wait=(fn,arg=null)=>p.waitForFunction(fn,arg,{timeout:120000});
  const patch=x=>p.evaluate(x=>window.__ARENA_RPC__.setKnobs(x),x);
  const pause=x=>p.evaluate(x=>window.__ARENA_RPC__.setPaused(x),x);
  const initial=await snap();assert.equal(initial.version,'0.1.0-rdte.7');assert.equal(await p.evaluate(()=>window.__adapter.fallback),false);
  assert.equal(initial.telemetry.aftermath.impactFloraDebited,0);
  if(trial==='dry'){
   await patch({ambientTemp:45,waterLevel:-1.2,tidalAmp:0,airWind:.85,floraRegrow:0});
   await pause(true);const nodes=await p.evaluate(()=>window.__readFixture());
   const victim=nodes.find(n=>n.kind<6&&n.lid===0&&n.energy>0&&n.y<1.5&&Math.hypot(n.x,n.z)<8.3&&Math.hypot(n.x,n.z)>2);
   assert.ok(victim,'fixture target requires a grounded live creature');
   await p.evaluate(v=>{const a=window.__ARENA_RPC__;a.setPaused(false);a.lightning(v.x,v.z);},victim);
   await wait(()=>window.__ARENA_RPC__.getState().telemetry.terrainProbe.impactEnergyDebited>0);
   const lightning=await snap();assert.ok(lightning.telemetry.aftermath.impactFloraDebited>0);
   await p.evaluate(()=>window.__ARENA_RPC__.armMeteor(5.5,0,true));
   await wait(()=>{const s=window.__ARENA_RPC__.getState();return s.telemetry.terrainProbe.craters===1&&s.telemetry.aftermath.fireFloraDebited>0;});
   await pause(true);const after=await snap();assert.ok(after.telemetry.aftermath.scorchedCells>0);assert.ok(after.telemetry.terrainProbe.surface<after.telemetry.terrainProbe.base);
   assert.ok(after.telemetry.aftermath.impactFloraDebited>lightning.telemetry.aftermath.impactFloraDebited);
   await p.screenshot({path:out+'/dry-impact.png'});
   rows.push({trial,lightning:lightning.telemetry,after:after.telemetry,pass:true});
  }else if(trial==='wet'){
   await patch({ambientTemp:2,waterLevel:1.6,tidalAmp:0,floraRegrow:0});
   await p.evaluate(()=>window.__ARENA_RPC__.lightning(2.5,0));
   await wait(()=>window.__ARENA_RPC__.getState().telemetry.aftermath.impactFloraDebited>0);
   const before=(await snap()).tick;
   await wait(t=>window.__ARENA_RPC__.getState().telemetry.tick>=t+135,before);
   await pause(true);const after=await snap();assert.equal(after.telemetry.aftermath.fireCells,0);assert.equal(after.telemetry.aftermath.fireFloraDebited,0);assert.ok(after.telemetry.aftermath.scorchedCells>0);
   rows.push({trial,after:after.telemetry,pass:true});
  }else{
   await patch({floraRegrow:1.5,species:{0:{burn:.05}}});
   await wait(()=>window.__ARENA_RPC__.getState().tick>=125);
   await pause(true);const a=await snap(),nodes=await p.evaluate(()=>window.__readFixture());const specimen=nodes[73];
   const expected=60-(Math.floor((a.tick+73)/24)-Math.floor(73/24));
   assert.equal(specimen.kind,8);assert.equal(Math.round(specimen.mass*650),expected);
   assert.ok(a.telemetry.aftermath.remainsMineralsReturned>0);assert.ok(a.telemetry.aftermath.softMineralsReturned>0);
   await pause(false);await wait(()=>window.__ARENA_RPC__.getState().telemetry.tick>=675);
   await pause(true);const after=await snap(),later=await p.evaluate(()=>window.__readFixture());
   assert.equal(later[60].kind,8,'normal dead hard part becomes structural remains');
   assert.equal(later[73].kind,8,'seeded remains persist and are not consumed');
   assert.equal(Math.round(later[73].mass*650),60-(Math.floor((after.tick+73)/24)-Math.floor(73/24)));
   assert.ok(after.telemetry.aftermath.remainsMineralsReturned>a.telemetry.aftermath.remainsMineralsReturned);
   await p.screenshot({path:out+'/remains-age.png'});
   rows.push({trial,fixture:true,first:a.telemetry,after:after.telemetry,agedCount:after.telemetry.aftermath.olderCreatures,scavenged:after.telemetry.aftermath.scavengedSoftTissue,pass:true});
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
}finally{await writeFile(out+'/results.json',JSON.stringify({source:process.env.GITHUB_SHA,scope:'native GPU smoke simulation, dry/wet controls and explicitly seeded structural-remains fixture; not physical biology or all device performance',rows},null,2));await browser?.close();await close()}
