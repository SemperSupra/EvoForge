import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { serve } from '../human-ux-r58/server.mjs';

const out='experience-assurance-evidence';
await mkdir(out,{recursive:true});
const {base,close}=await serve();
let browser;
const results={schemaVersion:1,source:process.env.GITHUB_SHA??null,runner:process.env.RUNNER_OS??process.platform,scope:'scripted browser RPC consumer, not autonomous agent or physical mobile qualification',scenarios:[]};
try {
 browser=await chromium.launch({channel:'chromium',headless:true,args:['--enable-unsafe-webgpu']});
 for(const mode of ['observe','play']){
  const ctx=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[],samples=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(navigator.gpu){const orig=navigator.gpu.requestAdapter.bind(navigator.gpu);navigator.gpu.requestAdapter=async(...a)=>{const adapter=await orig(...a);if(adapter)window.__testAdapter={vendor:adapter.info.vendor,fallback:adapter.info.isFallbackAdapter??adapter.isFallbackAdapter};return adapter;};}});
  const started=performance.now();
  const catalog=await (await page.request.get(base+'experiences.json')).json();
  assert.equal(catalog.schemaVersion,1);
  const entry=catalog.experiences.find(x=>x.id==='alife');
  assert.ok(entry);
  const action=entry.actions.find(a=>new URL(a.href,base).searchParams.get('mode')===mode);
  assert.ok(action);
  const url=new URL(action.href,base);url.searchParams.set('seed','42');
  assert.equal(url.origin,new URL(base).origin);
  await page.goto(url.href);
  await page.waitForFunction(()=>{const s=window.__ARENA_RPC__?.getState();return s&&(s.phase==='error'||s.telemetry.tick>=15);},null,{timeout:90000});
  const rpc=async(method,args=[])=>{
   const t=performance.now();
   const reply=await page.evaluate(({method,args})=>{try{return {ok:true,value:window.__ARENA_RPC__[method](...args)}}catch(e){return {ok:false,error:{name:e.name,message:e.message}}}},{method,args});
   samples.push({method,ok:reply.ok,roundTripMs:performance.now()-t});return reply;
  };
  const call=async(m,...a)=>{const r=await rpc(m,a);assert.equal(r.ok,true,JSON.stringify(r));return r.value;};
  const reject=async(m,...a)=>{const r=await rpc(m,a);assert.equal(r.ok,false,m+' must reject');assert.ok(r.error.message);return r.error;};
  const initial=await call('getState');assert.equal(initial.phase,'running',initial.error);assert.equal(initial.mode,mode);assert.equal(initial.knobs.state.seed,42);
  const adapter=await page.evaluate(()=>window.__testAdapter);assert.equal(adapter?.fallback,false);
  const readyMs=performance.now()-started;
  const methods=await page.evaluate(()=>Object.keys(window.__ARENA_RPC__).sort());
  for(const method of ['getState','setPaused','setKnobs','triggerSurprise','armMeteor','lightning','cancelMeteor','resetEcosystem'])assert.ok(methods.includes(method));
  await call('setPaused',true);
  const paused=await call('getState');assert.equal(paused.phase,'paused');
  await page.waitForTimeout(250);assert.equal((await call('getState')).tick,paused.tick);
  await reject('setPaused','true');
  const isolated=await page.evaluate(()=>{const s=window.__ARENA_RPC__.getState();const before=s.knobs.state.ambientTemp;s.knobs.state.ambientTemp=999;return window.__ARENA_RPC__.getState().knobs.state.ambientTemp===before;});
  assert.equal(isolated,true);
  if(mode==='observe'){
   for(const [method,args] of [['setKnobs',[{ambientTemp:30}]],['triggerSurprise',['bloom']],['armMeteor',[0,0]],['lightning',[0,0]],['cancelMeteor',[]],['resetEcosystem',[]]]){
    assert.match((await reject(method,...args)).message,/Observation mode/);
   }
   assert.deepEqual((await call('getState')).knobs,paused.knobs);
  }else{
   await reject('setKnobs',{ambientTemp:30,gravityScale:99});
   assert.deepEqual((await call('getState')).knobs,paused.knobs);
   await reject('setKnobs',{species:{0:{burn:.7},7:{burn:.7}}});
   assert.deepEqual((await call('getState')).knobs,paused.knobs);
   await call('setKnobs',{ambientTemp:30,species:{0:{burn:.7}}});
   const after=await call('getState');assert.equal(after.knobs.state.ambientTemp,30);assert.equal(after.knobs.speciesConfig[0].burn,.7);
   // Only this parity probe uses a UI locator; the consumer above uses RPC.
   assert.equal(Number(await page.locator('#sl-temp').inputValue()),30);
   await page.locator('#sl-temp').fill('31');assert.equal((await call('getState')).knobs.state.ambientTemp,31);
   await reject('armMeteor',0,0);
  }
  await call('setPaused',false);
  await page.waitForFunction(t=>window.__ARENA_RPC__.getState().tick>t,paused.tick,{timeout:15000});
  if(mode==='play'){
   await reject('lightning',999,999);
   const armed=await call('armMeteor',0,0);assert.equal(armed.pending.phase,'countdown');
   assert.equal(await call('cancelMeteor'),true);assert.equal((await call('getState')).interventions.pending,null);
  }
  assert.deepEqual(errors,[]);
  results.scenarios.push({mode,adapter,readyMs,methods,roundTrips:samples,pass:true});
  await page.screenshot({path:out+'/'+mode+'.png'});
  await ctx.close();
 }
} catch(e){results.failure=String(e.stack??e);throw e;}
finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser?.close();await close();}
