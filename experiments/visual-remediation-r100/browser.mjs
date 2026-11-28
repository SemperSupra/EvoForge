import assert from 'node:assert/strict';import {chromium,firefox,webkit} from '@playwright/test';import {mkdir,writeFile} from 'node:fs/promises';import {serve} from '../human-ux-r58/server.mjs';
const name=process.argv[2]||'chromium',engine={chromium,firefox,webkit}[name];assert.ok(engine);
const {base,close}=await serve(),out='radar-cluster-evidence';await mkdir(out,{recursive:true});let browser;const rows=[];
try{browser=await engine.launch();for(const route of ['mosaic-legacy','mosaic','mosaic-craft','mosaic-motifs','mosaic-emblems']){
 const ctx=await browser.newContext({viewport:{width:1600,height:1000},serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?experience='+route);
 await p.waitForFunction(()=>document.querySelectorAll('.grid .card[data-render-state=ready]').length===16,null,{timeout:120000});
 const radar=p.locator('#mosaic-lens-right'),chart=radar.locator('.population-plot'),mode=radar.getByRole('combobox',{name:'Radar display'});assert.equal(await mode.inputValue(),'clusters');
 const read=()=>chart.locator('g[data-candidate-id][data-ring]').evaluateAll(es=>es.map(e=>({id:e.dataset.candidateId,x:Number(e.dataset.x),y:Number(e.dataset.y),ring:Number(e.dataset.ring)})).sort((a,b)=>a.id.localeCompare(b.id)));
 const first=await read();assert.equal(first.length,16);assert.equal(new Set(first.map(x=>x.id)).size,16);
 const before=await chart.getAttribute('data-cluster-count');assert.ok(Number(before)<=16);
 const labels=chart.locator('g[data-cluster-id]');if(await labels.count()){
  const group=labels.first(),count=Number(await group.getAttribute('data-count'));await group.focus();await group.press('Enter');assert.equal(await group.getAttribute('aria-expanded'),'true');
  const members=radar.locator('[data-radar-group-member]');assert.equal(await members.count(),count);assert.equal(new Set(await members.evaluateAll(es=>es.map(e=>e.dataset.radarGroupMember))).size,count);
  await p.screenshot({path:out+'/'+route+'-expanded.png'});
 }
 await mode.selectOption('individual');assert.deepEqual(await read(),first);assert.equal(await chart.getAttribute('data-display'),'individual');await p.screenshot({path:out+'/'+route+'-individual.png'});
 await mode.selectOption('clusters');assert.deepEqual(await read(),first);await p.screenshot({path:out+'/'+route+'-clustered.png'});
 assert.deepEqual(errors,[]);rows.push({route,points:16,clusters:Number(before),coordinateParity:true,pass:true});await ctx.close();
}
const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),p=await ctx.newPage();await p.goto(base+'?experience=mosaic-craft');await p.waitForFunction(()=>document.querySelectorAll('.grid .card[data-render-state=ready]').length===16,null,{timeout:120000});
const timeline=p.locator('.stage-transport'),options=timeline.getByRole('button',{name:'Stage timing and position options'}),interval=timeline.getByRole('slider',{name:'Stage interval'});
assert.equal(await interval.isVisible(),false);const collapsed=(await timeline.boundingBox()).height;await options.click();assert.equal(await interval.isVisible(),true);const expanded=(await timeline.boundingBox()).height;assert.ok(expanded>collapsed);await interval.fill('400');await options.click();assert.equal(await interval.isVisible(),false);
await timeline.getByRole('button',{name:'Rewind stage timeline'}).click();assert.ok(await timeline.getByRole('slider',{name:'Stage history position'}).isVisible());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await p.screenshot({path:out+'/phone-transport.png'});rows.push({route:'phone',collapsed,expanded,pass:true});await ctx.close();
}finally{await writeFile(out+'/results.json',JSON.stringify({browser:name,rows},null,2));await browser?.close();await close();}
