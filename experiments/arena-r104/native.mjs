import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../human-ux-r58/server.mjs';
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),out='arena-r104-evidence';await mkdir(out,{recursive:true});
const {base,close}=await serve();let browser;const rows=[];
try{
 browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
 for(const [width,height,touch] of [[390,844,true],[844,390,true],[1280,800,false]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:1,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await ctx.addInitScript(()=>{
   const request=navigator.gpu.requestAdapter.bind(navigator.gpu);
   navigator.gpu.requestAdapter=async(...args)=>{const a=await request(...args);if(a)window.__adapter={vendor:a.info.vendor,fallback:a.info.isFallbackAdapter??a.isFallbackAdapter};return a;};
   const write=GPUQueue.prototype.writeBuffer;
   GPUQueue.prototype.writeBuffer=function(buffer,offset,data,...rest){if(buffer.size===432&&offset===0&&data instanceof ArrayBuffer&&data.byteLength===432)window.__cameraMatrix=Array.from(new Float32Array(data).slice(0,16));return write.call(this,buffer,offset,data,...rest);};
  });
  await p.goto(base+'experiences/alife/index.html?mode=play&seed=42&profile=smoke');if(touch)await p.locator('#mobile-start-button').click();
  await p.waitForFunction(()=>{const s=window.__ARENA_RPC__?.getState();return s&&(s.phase==='error'||s.telemetry.tick>=15);},null,{timeout:120000});
  const snap=()=>p.evaluate(()=>window.__ARENA_RPC__.getState()),initial=await snap();assert.notEqual(initial.phase,'error',initial.error);assert.equal(initial.version,'0.1.0-rdte.9');assert.equal(await p.evaluate(()=>window.__adapter.fallback),false);
  await p.evaluate(()=>window.__ARENA_RPC__.setPaused(true));
  const matchedFrame=()=>p.waitForFunction(()=>{const v=lastSubmittedCamera,c=document.getElementById('canvas'),r=c.getBoundingClientRect();return v&&v.width===c.width&&v.height===c.height&&Math.abs(v.cssWidth-r.width)<=1&&Math.abs(v.cssHeight-r.height)<=1&&v.revision===window.__ARENA_RPC__.getState().knobs.state.viewRevision;},null,{timeout:20000});
  const refresh=async id=>{const rev=(await snap()).knobs.state.viewRevision;await p.locator('#'+id).click();await p.waitForFunction(r=>window.__ARENA_RPC__.getState().knobs.state.viewRevision>r,rev,{timeout:20000});await matchedFrame();};
  await refresh('cam-home');const before=await snap();
  const projection=()=>p.evaluate(()=>{
   const s=window.__ARENA_RPC__.getState(),R=s.knobs.state.arenaRadius,m=window.__cameraMatrix,rect=document.getElementById('canvas').getBoundingClientRect();
   const project=(x,y,z)=>{const w=m[3]*x+m[7]*y+m[11]*z+m[15];return [(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w];};
   const outline=Array.from({length:96},(_,i)=>{const a=i*Math.PI/48,x=R*Math.cos(a),z=R*Math.sin(a);return project(x,surface(x,z),z);});
   const target={x:2,z:1},q=project(target.x,surface(target.x,target.z),target.z);
   const screen={clientX:rect.left+(q[0]+1)*rect.width/2,clientY:rect.top+(1-q[1])*rect.height/2};
   const hit=worldPointer(screen),picked=hit?{x:strikeHover.x,z:strikeHover.z}:null;
   return {camera:{...lastSubmittedCamera},outline,extent:{x:Math.max(...outline.map(v=>Math.abs(v[0]))),y:Math.max(...outline.map(v=>Math.abs(v[1])))},target,picked,error:picked?Math.hypot(picked.x-target.x,picked.z-target.z):null,screen,aspect:rect.width/rect.height};
  });
  const fit=await projection();assert.ok(fit.error!==null&&fit.error<.08,JSON.stringify(fit));if(width<height)assert.ok(fit.extent.x<.95&&fit.extent.y<.95,'portrait home must fit actual ring projection');
  await refresh('scene-only');await p.screenshot({path:out+'/'+width+'x'+height+'-home.png'});await refresh('scene-only');
  const panels=p.locator('#panel-life');if(await panels.getAttribute('aria-expanded')!=='true')await panels.click();
  for(const [id,kind] of [['inspect-hard',10],['inspect-soft',11],['inspect-carcass',6],['inspect-all',9]]){
   await refresh(id);assert.equal((await snap()).knobs.state.inspectKind,kind);assert.equal(await p.locator('#'+id).getAttribute('aria-pressed'),'true');
  }
  await refresh('cam-under');const lower=await snap();assert.ok(lower.knobs.state.camPitch<0);assert.equal(lower.visual.visible,false);assert.deepEqual(lower.interventions,before.interventions);
  await refresh('cam-home');assert.equal((await snap()).tick,before.tick);const restored=await projection();assert.ok(restored.error!==null&&restored.error<.08);assert.deepEqual(restored.extent,fit.extent);
  if(touch&&width<height){
   await p.setViewportSize({width:height,height:width});await matchedFrame();await refresh('cam-home');await p.waitForFunction(()=>lastSubmittedCamera.pitch===.72&&lastSubmittedCamera.eye.every((n,i)=>Math.abs(n-cameraEye()[i])<1e-6));const rotated=await projection();assert.ok(rotated.error!==null&&rotated.error<.08,JSON.stringify(rotated));assert.equal((await snap()).tick,before.tick);
   await p.setViewportSize({width,height});await matchedFrame();await refresh('cam-home');await p.waitForFunction(()=>lastSubmittedCamera.pitch===.72&&lastSubmittedCamera.eye.every((n,i)=>Math.abs(n-cameraEye()[i])<1e-6));const returned=await projection();assert.ok(returned.extent.x<.95&&returned.error!==null&&returned.error<.08,JSON.stringify(returned));assert.equal((await snap()).tick,before.tick);
  }
  assert.deepEqual(errors,[]);rows.push({width,height,touch,fit:{extent:fit.extent,error:fit.error,aspect:fit.aspect},restored:restored.extent,inspectionKinds:[10,11,6,9],pausedTick:before.tick,pass:true});await ctx.close();
 }
}finally{await writeFile(out+'/results.json',JSON.stringify({source,workflowEventSha:process.env.GITHUB_SHA,scope:'actual GPU projection matrix, inverse terrain-ray function test, native Metal and emulated viewport/orientation; no physical ergonomics or calibration',rows},null,2));await browser?.close();await close();}
