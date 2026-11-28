import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../human-ux-r58/server.mjs';
const lane=process.argv[2]??'visual';assert.ok(['visual','endurance','governor'].includes(lane));
const out='arena-r101-'+lane;await mkdir(out,{recursive:true});const {base,close}=await serve();let browser;const rows=[];
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
try{
 browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
 const profiles=lane==='visual'?[[1280,800,false,1],[390,844,true,1],[844,390,true,1]]:lane==='endurance'?[[390,844,true,2],[1280,800,false,2]]:[[390,844,true,2]];
 for(const [width,height,touch,dpr] of profiles){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:dpr,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[],warnings=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(['error','warning'].includes(m.type())&&warnings.length<30)warnings.push(m.text().slice(0,400));});
  await ctx.addInitScript(stress=>{
   const request=navigator.gpu.requestAdapter.bind(navigator.gpu);
   navigator.gpu.requestAdapter=async(...args)=>{const a=await request(...args);if(a)window.__adapter={vendor:a.info.vendor,fallback:a.info.isFallbackAdapter??a.isFallbackAdapter};return a};
   if(stress){const finish=GPUQueue.prototype.onSubmittedWorkDone;GPUQueue.prototype.onSubmittedWorkDone=async function(...args){await finish.apply(this,args);await new Promise(r=>setTimeout(r,120));};}
  },lane==='governor');
  await p.goto(base+'experiences/alife/index.html?mode=play&seed=42'+(lane==='visual'?'&profile=smoke':''));
  if(touch)await p.locator('#mobile-start-button').click();
  const snap=()=>p.evaluate(()=>window.__ARENA_RPC__.getState());
  const ready=await p.waitForFunction(()=>{const s=window.__ARENA_RPC__?.getState();return s&&(s.phase==='error'||s.telemetry.tick>=15);},null,{timeout:120000});
  const initial=await snap();assert.notEqual(initial.phase,'error',initial.error);assert.equal(initial.version,'0.1.0-rdte.9');const adapter=await p.evaluate(()=>window.__adapter);assert.equal(adapter.fallback,false);assert.ok(adapter.vendor.toLowerCase().includes('apple'));
  const pause=value=>p.evaluate(v=>window.__ARENA_RPC__.setPaused(v),value);
  const shot=label=>p.screenshot({path:out+'/'+width+'x'+height+'-'+label+'.png'});
  if(lane==='visual'){
   await pause(true);const before=await snap(),toggle=p.locator('#scene-only');
   await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#viewport-tool-stack').isVisible(),false);assert.equal(await p.locator('#panel-controls').isVisible(),false);
   assert.equal((await snap()).tick,before.tick);assert.deepEqual((await snap()).interventions,before.interventions);
   await toggle.click();assert.ok(await p.locator('#cam-home').isVisible());assert.equal(await toggle.getAttribute('aria-pressed'),'false');
   // Use actual native scene-only control, then accepted simulation event API.
   await toggle.click();
   // Wait for an actual rendered event frame and pause inside the RAF observer, before another tick.
   const capture=async(kind,id,minAge=0,maxAge=200)=>p.evaluate(({kind,id,minAge,maxAge})=>new Promise((resolve,reject)=>{
    const start=performance.now();
    const check=()=>{const api=window.__ARENA_RPC__,s=api.getState(),v=s.visual,impact=s.interventions.receipts.find(r=>r.id===id&&r.type==='meteor-impact'),age=impact?s.tick-impact.tick:-1;
     const match=kind==='descent'?v.pendingId===id&&v.phase==='descent'&&v.meteorBodies>0:kind==='dust'?v.impactIds.includes(id)&&v.dustParticles>0&&age>=minAge&&age<=maxAge:v.lightningStrokes>0;
     if(match&&v.tick===s.tick){api.setPaused(true);resolve(api.getState());return;}
     if(s.phase==='error'||performance.now()-start>110000){reject(Error('event frame unavailable '+JSON.stringify({kind,id,tick:s.tick,visual:v,age,error:s.error})));return;}requestAnimationFrame(check);
    };check();
   }),{kind,id,minAge,maxAge});
   const events=await p.evaluate(()=>{const a=window.__ARENA_RPC__;a.setPaused(false);return a.armMeteor(0,0,true).pending.id;});
   const descent=await capture('descent',events);await shot('meteor-descent');assert.ok(descent.visual.meteorBodies>0);
   await pause(false);const impact=await capture('dust',events,0,12);await shot('impact');assert.ok(impact.visual.dustParticles>0);
   await pause(false);const plume=await capture('dust',events,35,75);await shot('plume');assert.ok(plume.tick>impact.tick);
   await p.evaluate(()=>{const a=window.__ARENA_RPC__;a.setPaused(false);return a.lightning(-3,0);});
   const lightning=await capture('lightning',0);await shot('lightning');assert.ok(lightning.visual.lightningStrokes>0);
   assert.equal(lightning.visual.sceneOnly,true);
   await toggle.click();await p.locator('#cam-under').click();await p.waitForFunction(()=>window.__ARENA_RPC__.getState().visual.visible===false);
   const below=await snap();assert.equal(below.visual.meteorBodies+below.visual.dustParticles+below.visual.lightningStrokes,0);await p.locator('#cam-home').click();
   assert.deepEqual(errors,[]);rows.push({width,height,touch,adapter,source,descent:descent.visual,impact:impact.visual,plume:plume.visual,lightning:lightning.visual,warnings,pass:true});
  }else if(lane==='governor'){
   const target=initial.knobs.state.targetHz,pop=initial.knobs.state.popCounts;
   await p.waitForFunction(()=>window.__ARENA_RPC__.getState().knobs.state.renderDpr<=.75,null,{timeout:20000});
   const reduced=await snap();assert.equal(reduced.knobs.state.targetHz,target);assert.deepEqual(reduced.knobs.state.popCounts,pop);assert.equal(initial.knobs.state.deviceProfile,'phone');assert.ok(reduced.tick<90,'elapsed-time reduction precedes old 90 slow frame gate');
   await pause(true);await shot('governor');assert.deepEqual(errors,[]);rows.push({width,height,adapter,initialTick:initial.tick,finalTick:reduced.tick,initialDpr:initial.knobs.state.renderDpr,finalDpr:reduced.knobs.state.renderDpr,target,pop,syntheticLatencyMs:120,warnings,pass:true});
  }else{
   const samples=[],started=Date.now();let last=initial.tick;
   for(let i=0;i<12;i++){await p.waitForTimeout(5000);const s=await snap();assert.notEqual(s.phase,'error',s.error);assert.ok(s.tick>last,'simulation stalled');last=s.tick;
    samples.push({seconds:(Date.now()-started)/1000,tick:s.tick,telemetryTick:s.telemetry.tick,dpr:s.knobs.state.renderDpr,targetHz:s.knobs.state.targetHz,populations:s.telemetry.populations});}
   const final=await snap();await pause(true);const paused=await snap();await p.waitForTimeout(500);assert.equal((await snap()).tick,paused.tick);await shot('endurance');
   assert.deepEqual(errors,[]);rows.push({width,height,touch,dpr,adapter,profile:initial.knobs.state.deviceProfile,tickDelta:final.tick-initial.tick,elapsed:(Date.now()-started)/1000,samples,warnings,pass:true});
  }
  await ctx.close();
 }
}finally{await writeFile(out+'/results.json',JSON.stringify({source,workflowEventSha:process.env.GITHUB_SHA,lane,scope:'native Metal, emulated viewport; governor lane synthetic fence latency, not physical phone; visual receipts record projected overlay draw calls',rows},null,2));await browser?.close();await close();}
