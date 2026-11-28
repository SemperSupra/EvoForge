import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../human-ux-r58/server.mjs';
const name=process.argv[2]||'chromium',engine={chromium,firefox,webkit}[name];assert.ok(engine);
const out='lens-workspace-evidence';await mkdir(out,{recursive:true});
const {base,close}=await serve();let browser;const rows=[];
const routes=['mosaic-legacy','mosaic','mosaic-craft','mosaic-motifs','mosaic-emblems'];
try{
 browser=await engine.launch();
 for(const route of routes){
  const ctx=await browser.newContext({viewport:{width:1600,height:1000},serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'?experience='+route);
  await p.waitForFunction(()=>document.querySelectorAll('.grid .card[data-render-state=ready]').length===16,null,{timeout:120000});
  const left=p.locator('#mosaic-lens-left'),right=p.locator('#mosaic-lens-right'),viewer=p.locator('.mosaic-viewer');
  const map=left.locator('svg[aria-label="Concentric rings of current generation candidate membership"]');
  const assertLayout=async()=>{const l=await left.boundingBox(),v=await viewer.boundingBox(),r=await right.boundingBox();assert.ok(l.x+l.width<=v.x+1&&v.x+v.width<=r.x+1);assert.ok(v.width>=320);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));};
  await assertLayout();assert.equal(await left.getAttribute('open'),'');assert.equal(await right.getAttribute('open'),'');
  const sep=p.getByRole('separator',{name:'Resize Reality Rings'}),old=await left.boundingBox();
  const b=await sep.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+Math.min(50,b.height/2));await p.mouse.down();await p.mouse.move(b.x+b.width/2+70,b.y+Math.min(50,b.height/2),{steps:6});await p.mouse.up();
  await p.waitForFunction(w=>document.querySelector('#mosaic-lens-left').getBoundingClientRect().width>=w+45,old.width);await p.waitForTimeout(250);await assertLayout();
  const widened=await left.boundingBox();
  await sep.focus();await sep.press('ArrowLeft');await p.waitForTimeout(250);assert.ok((await left.boundingBox()).width<widened.width);
  await sep.press('End');await p.waitForTimeout(250);await assertLayout();
  const remembered=(await left.boundingBox()).width;await left.locator('summary').click();assert.equal(await left.getAttribute('open'),null);
  await left.locator('summary').click();assert.ok(Math.abs((await left.boundingBox()).width-remembered)<4);
  const metrics=()=>map.evaluate(svg=>{const markers=[...svg.querySelectorAll('g[data-candidate-id]')];let overlaps=0;for(let i=0;i<markers.length;i++)for(let j=i+1;j<markers.length;j++){const a=markers[i].getBoundingClientRect(),b=markers[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps++;}return {count:markers.length,unique:new Set(markers.map(e=>e.getAttribute('data-candidate-id'))).size,closePairs:Number(svg.dataset.closePairs),overlaps,width:svg.getBoundingClientRect().width};});
  const separate=await metrics();assert.equal(separate.count,16);assert.equal(separate.unique,16);
  await p.screenshot({path:out+'/'+route+'-separate.png'});
  await left.getByRole('button',{name:'Combined rings + radar',exact:true}).click();
  assert.equal(await right.getAttribute('open'),null);assert.equal(await map.getAttribute('data-view'),'combined');
  const combined=await metrics();assert.equal(combined.unique,16);
  assert.ok(await left.getByRole('combobox',{name:'Angle',exact:true}).isVisible());assert.ok(await left.getByRole('combobox',{name:'Marker size',exact:true}).isVisible());
  await p.screenshot({path:out+'/'+route+'-combined.png'});
  await left.getByRole('button',{name:'Separate rings and radar',exact:true}).click();await assertLayout();
  // At least one fresh generation observed via real DOM membership events, not inferred worker delay.
  if(route==='mosaic-legacy'||route==='mosaic-craft'){
   await p.evaluate(()=>{window.__lensTrace=[];let last='';const record=()=>{const grid=document.querySelector('.mosaic-viewer'),m=[...document.querySelectorAll('#mosaic-lens-left svg g[data-ring]')].map(e=>[e.getAttribute('data-candidate-id'),Number(e.getAttribute('data-ring'))]);const gen=grid?.dataset.generation;const key=JSON.stringify([gen,m]);if(gen&&m.length&&key!==last){last=key;window.__lensTrace.push({t:performance.now(),gen,m});}};new MutationObserver(record).observe(document.body,{subtree:true,childList:true});});
   await p.getByRole('button',{name:'Play',exact:true}).click();
   await p.waitForFunction(()=>document.querySelectorAll('#mosaic-lens-left svg g[data-ring="0"]').length>0);
   await p.waitForFunction(()=>document.querySelectorAll('#mosaic-lens-left svg g[data-ring="1"]').length>0);
   await p.getByRole('button',{name:'Pause',exact:true}).click();
   const paused=await map.locator('g[data-ring]').evaluateAll(es=>es.map(e=>[e.dataset.candidateId,e.dataset.ring]));
   await p.waitForTimeout(1400);assert.deepEqual(await map.locator('g[data-ring]').evaluateAll(es=>es.map(e=>[e.dataset.candidateId,e.dataset.ring])),paused);
   await p.getByRole('button',{name:'Play',exact:true}).click();
   await p.waitForFunction(()=>document.querySelectorAll('#mosaic-lens-left svg g[data-ring="2"]').length===16,null,{timeout:30000});
   const generation=await viewer.getAttribute('data-generation');
   await p.getByRole('slider',{name:'Review speed'}).fill('59');
   await p.waitForFunction(g=>document.querySelector('.mosaic-viewer').dataset.generation!==g,generation,{timeout:30000});
   await p.waitForFunction(()=>document.querySelectorAll('#mosaic-lens-left svg g[data-ring="1"]').length>0,null,{timeout:30000});
   await p.waitForFunction(()=>document.querySelectorAll('#mosaic-lens-left svg g[data-ring="2"]').length>=12,null,{timeout:30000});
   await p.getByRole('button',{name:'Pause',exact:true}).click();
   const trace=await p.evaluate(()=>window.__lensTrace);const next=trace.find(x=>x.gen!==generation)?.gen;assert.ok(next);
   const events=trace.filter(x=>x.gen===next),seen=new Map();
   for(const e of events)for(const [id,stage] of e.m){if(!seen.has(id))seen.set(id,new Map());if(!seen.get(id).has(stage))seen.get(id).set(stage,e.t);}
   const full=[...seen.values()].filter(x=>x.has(0)&&x.has(1)&&x.has(2));assert.ok(full.length>=8,'fresh candidates must be visible at all three stages');
   assert.ok(full.every(x=>x.get(1)>x.get(0)&&x.get(2)-x.get(1)>=450),'rendered stage must be visible for a meaningful interval');
   await writeFile(out+'/'+route+'-trace.json',JSON.stringify({generation:next,trace,complete:full.length},null,2));
  }
  assert.deepEqual(errors,[]);rows.push({route,separate,combined,pass:true});await ctx.close();
 }
 for(const [width,height] of [[390,844],[844,390],[820,1180]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'}),p=await ctx.newPage();
  await p.goto(base+'?experience=mosaic-craft');await p.waitForFunction(()=>document.querySelectorAll('.grid .card[data-render-state=ready]').length===16,null,{timeout:120000});
  const left=p.locator('#mosaic-lens-left'),right=p.locator('#mosaic-lens-right'),dock=p.locator('.lens-dock');
  assert.equal(await left.getAttribute('open'),null);assert.equal(await right.getAttribute('open'),null);
  await dock.getByRole('button',{name:'Reality Rings',exact:true}).click();assert.ok(await left.isVisible());assert.equal(await right.getAttribute('open'),null);
  await p.screenshot({path:out+'/touch-'+width+'x'+height+'-left.png'});
  await left.locator('summary').click();
  await dock.getByRole('button',{name:'Population radar',exact:true}).click();assert.ok(await right.isVisible());assert.equal(await left.getAttribute('open'),null);
  await p.screenshot({path:out+'/touch-'+width+'x'+height+'-right.png'});
  await right.locator('summary').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  rows.push({width,height,compact:true,pass:true});await ctx.close();
 }
}finally{await writeFile(out+'/results.json',JSON.stringify({source:process.env.GITHUB_SHA,browser:name,scope:'emulated browser viewports; overlap counts use bounding boxes and are not human preference evidence',rows},null,2));await browser?.close();await close();}
