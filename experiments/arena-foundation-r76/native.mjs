import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../human-ux-r58/server.mjs';
const out='foundation-evidence';await mkdir(out,{recursive:true});
const {base,close}=await serve();let browser;const rows=[];
try{
 browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
 for(const [width,height,touch] of [[1280,800,false],[390,844,true],[844,390,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:1,serviceWorkers:'block'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{
   window.__drawTrace=[];
   const draw=GPURenderPassEncoder.prototype.draw,execute=GPURenderPassEncoder.prototype.executeBundles;
   GPURenderPassEncoder.prototype.draw=function(...args){if(window.__drawTrace.length<2000)window.__drawTrace.push(['draw',...args]);return draw.apply(this,args)};
   GPURenderPassEncoder.prototype.executeBundles=function(...args){if(window.__drawTrace.length<2000)window.__drawTrace.push(['bundle']);return execute.apply(this,args)};
   const original=navigator.gpu.requestAdapter.bind(navigator.gpu);
   navigator.gpu.requestAdapter=async(...args)=>{const a=await original(...args);if(a)window.__adapter={vendor:a.info.vendor,fallback:a.info.isFallbackAdapter??a.isFallbackAdapter};return a};
  });
  await p.goto(base+'experiences/alife/index.html?mode=play&seed=42');
  if(touch)await p.locator('#mobile-start-button').click();
  await p.waitForFunction(()=>window.__ARENA_RPC__?.getState().telemetry.tick>=15,null,{timeout:90000});
  await p.locator('#btn-pause').click();
  const snap=()=>p.evaluate(()=>window.__ARENA_RPC__.getState());
  const initial=await snap();assert.equal(await p.evaluate(()=>window.__adapter.fallback),false);
  const move=async(id)=>{const v=(await snap()).knobs.state.viewRevision;await p.locator('#cam-'+id).click();await p.waitForFunction(v=>window.__ARENA_RPC__.getState().knobs.state.viewRevision>v,v,{timeout:20000});};
  await p.screenshot({path:out+'/top-'+width+'x'+height+'.png'});
  await p.evaluate(()=>window.__drawTrace.length=0);
  await move('under');
  let under=await snap();assert.ok(under.knobs.state.camPitch<0);assert.equal(under.tick,initial.tick);assert.deepEqual(under.interventions,initial.interventions);
  const trace=await p.evaluate(()=>window.__drawTrace.slice());
  assert.ok(trace.some(t=>t[0]==='draw'&&t[1]===768));
  assert.ok(trace.some(t=>t[0]==='draw'&&t[1]===768&&t[2]===8));
  assert.ok(!trace.some(t=>t[0]==='bundle'||(t[0]==='draw'&&t[1]===24576)));
  const alpha=await p.locator('#strike-overlay').evaluate(c=>{let d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i])return false;return true});
  assert.ok(alpha);
  await p.screenshot({path:out+'/under-'+width+'x'+height+'.png'});
  await p.locator('#cam-orbit').click();await move('left');
  assert.equal((await snap()).tick,initial.tick);
  await move('home');
  const home=await snap();assert.ok(home.knobs.state.camPitch>0);assert.equal(home.tick,initial.tick);assert.deepEqual(home.interventions,initial.interventions);
  await p.screenshot({path:out+'/return-'+width+'x'+height+'.png'});
  assert.deepEqual(errors,[]);rows.push({width,height,touch,adapter:await p.evaluate(()=>window.__adapter),tick:initial.tick,trace,alpha,pass:true});
  await context.close();
 }
}finally{await writeFile(out+'/results.json',JSON.stringify({source:process.env.GITHUB_SHA,scope:'native WebGPU renderer, emulated mobile viewports, draw trace and overlay checks; screenshots require human visual review',rows},null,2));await browser?.close();await close()}
