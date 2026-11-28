import assert from 'node:assert/strict';import {chromium,firefox,webkit} from '@playwright/test';import {mkdir,writeFile} from 'node:fs/promises';import {serve} from '../human-ux-r58/server.mjs';
const browserName=process.argv[2]||'chromium',engine={chromium,firefox,webkit}[browserName];assert.ok(engine);
const {base,close}=await serve();const out='history-adapter-evidence';await mkdir(out,{recursive:true});let browser;const rows=[];
try{browser=await engine.launch();for(const [route,width,height] of [['mosaic-craft',1280,800],['mosaic-motifs',390,844]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:width<500,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'?experience='+route);const grid=p.locator('.mosaic-viewer'),ready=()=>p.waitForFunction(()=>document.querySelectorAll('.grid .card[data-render-state=ready]').length===16,null,{timeout:120000});await ready();
 const old=await grid.getAttribute('data-generation');await grid.getByRole('button',{name:'Pick',exact:true}).first().click();await p.getByRole('button',{name:'Next',exact:true}).click();await p.waitForFunction(g=>document.querySelector('.mosaic-viewer').dataset.generation!==g,old);await ready();
 const live=await grid.getAttribute('data-generation');const toggle=p.getByRole('button',{name:'Generation history',exact:true});await toggle.click();
 const panel=p.getByRole('region',{name:'Generation history'}),select=panel.getByRole('combobox',{name:'Recorded generation'});await select.waitFor();assert.equal(await select.locator('option').count(),1);
 const checkpoint=await select.inputValue();assert.ok(/^[a-f0-9]{64}$/.test(checkpoint));assert.ok((await panel.textContent()).includes('1 recorded picks'));assert.ok(await p.getByRole('button',{name:'Next',exact:true}).isDisabled());
 const livePicks=await grid.getByRole('button',{name:'Unpick',exact:true}).count();
 await panel.getByRole('combobox',{name:'Alternative parent'}).selectOption('g0-c1');await panel.getByRole('button',{name:'Compare alternative next generation'}).click();
 await p.waitForFunction(()=>document.querySelector('.generation-history-result')?.textContent.includes('Preview only; live population unchanged'));
 assert.ok(Number((await panel.locator('.generation-history-result').textContent()).split(' ')[0])>0);
 assert.equal(await grid.getAttribute('data-generation'),live);assert.equal(await grid.getByRole('button',{name:'Unpick',exact:true}).count(),livePicks);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/'+route+'-comparison.png',fullPage:false});
 await panel.getByRole('button',{name:'Close history'}).click();assert.ok(await p.getByRole('button',{name:'Next',exact:true}).isEnabled());
 await p.getByRole('button',{name:'Next',exact:true}).click();await ready();await toggle.click();await p.waitForFunction(()=>document.querySelector('.generation-history-panel select[aria-label="Recorded generation"]')?.options.length===2);
 const entries=await select.locator('option').evaluateAll(es=>es.map(e=>e.value));assert.equal(entries[0],checkpoint);
 await p.reload();await ready();await toggle.click();await p.waitForFunction(()=>document.querySelector('.generation-history-panel select[aria-label="Recorded generation"]')?.options.length===2);
 assert.deepEqual(await select.locator('option').evaluateAll(es=>es.map(e=>e.value)),entries);
 assert.deepEqual(errors,[]);rows.push({route,width,height,checkpoints:2,localRestore:true,readOnly:true,pass:true});await ctx.close();
}}finally{await writeFile(out+'/results.json',JSON.stringify({browser:browserName,scope:'actual gallery pre-advance snapshots, read-only comparison and local restore; no archived pixel viewer or active branch switch',rows},null,2));await browser?.close();await close();}
