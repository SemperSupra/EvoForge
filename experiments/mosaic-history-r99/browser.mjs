import assert from 'node:assert/strict';import {chromium,firefox,webkit} from '@playwright/test';import {mkdir,writeFile} from 'node:fs/promises';import {serve} from '../human-ux-r58/server.mjs';
const name=process.argv[2]||'chromium',engine={chromium,firefox,webkit}[name];assert.ok(engine);
const {base,close}=await serve();const out='historical-replay-evidence';await mkdir(out,{recursive:true});let browser;const rows=[];
try{browser=await engine.launch();for(const [route,width,height] of [['mosaic-craft',1440,900],['mosaic-motifs',390,844]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:width<500,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?experience='+route);
 const grid=p.locator('.mosaic-viewer'),ready=()=>p.waitForFunction(()=>document.querySelectorAll('.grid .card[data-render-state=ready]').length===16,null,{timeout:120000});await ready();
 const originalBranch=await grid.getAttribute('data-history-branch'),originalWorker=Number(await grid.getAttribute('data-generation'));
 await grid.getByRole('button',{name:'Pick',exact:true}).first().click();await p.getByRole('button',{name:'Next',exact:true}).click();await p.waitForFunction(n=>Number(document.querySelector('.mosaic-viewer').dataset.generation)>n,originalWorker);await ready();
 const departingWorker=Number(await grid.getAttribute('data-generation'));assert.equal(await grid.getAttribute('data-logical-generation'),'1');
 const toggle=p.getByRole('button',{name:'Generation history',exact:true});await toggle.click();const panel=p.getByRole('region',{name:'Generation history'}),select=panel.getByRole('combobox',{name:'Recorded generation'});await select.waitFor();const checkpoint=await select.inputValue();
 assert.ok(await grid.getByRole('button',{name:'Pick',exact:true}).first().isDisabled());
 await panel.getByRole('button',{name:'Reconstruct historical images'}).click();await p.waitForFunction(()=>document.querySelectorAll('.history-replay-grid canvas').length===16,null,{timeout:120000});
 const pixels=()=>panel.locator('canvas[data-history-candidate]').evaluateAll(es=>Promise.all(es.map(async e=>{const d=e.getContext('2d').getImageData(0,0,e.width,e.height).data;const hash=await crypto.subtle.digest('SHA-256',d);return {id:e.dataset.historyCandidate,w:e.width,h:e.height,hash:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')};})));
 const first=await pixels();assert.equal(first.length,16);assert.ok(first.every(x=>x.w===192&&x.h===108));assert.ok(new Set(first.map(x=>x.hash)).size>1);
 await panel.getByRole('button',{name:'Reconstruct historical images'}).click();await p.waitForFunction(()=>document.querySelectorAll('.history-replay-grid canvas').length===16,null,{timeout:120000});assert.deepEqual(await pixels(),first);
 assert.equal(Number(await grid.getAttribute('data-generation')),departingWorker);await p.screenshot({path:out+'/'+route+'-reconstructed.png',fullPage:false});
 await panel.getByRole('combobox',{name:'Alternative parent'}).selectOption('g0-c1');await panel.getByRole('button',{name:'Start alternative branch'}).click();assert.equal(await grid.getAttribute('data-history-branch'),originalBranch);
 await panel.getByRole('button',{name:'Confirm new branch'}).click();await p.waitForFunction(branch=>document.querySelector('.mosaic-viewer').dataset.historyBranch!==branch,originalBranch);await ready();
 const fork=await grid.getAttribute('data-history-branch');assert.ok(fork.startsWith('fork-'));assert.equal(await grid.getAttribute('data-logical-generation'),'0');assert.ok(Number(await grid.getAttribute('data-generation'))>departingWorker);assert.equal(await grid.getAttribute('data-playback'),'paused');
 assert.equal(await grid.locator('[data-candidate-id="g0-c1"]').getByRole('button',{name:'Unpick',exact:true}).count(),1);
 assert.equal(await grid.getByRole('button',{name:'Unpick',exact:true}).count(),1);
 await toggle.click();await p.waitForFunction(()=>document.querySelector('.generation-history-panel select[aria-label="Recorded generation"]')?.options.length===3);
 const entries=await p.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('evoforge:generation-history:v1:'));return JSON.parse(localStorage.getItem(key)).entries.map(e=>({id:e.id,data:JSON.parse(e.data)}));});
 assert.equal(entries[0].id,checkpoint);assert.equal(entries[1].data.branch,originalBranch);assert.equal(entries[1].data.generationIndex,1);assert.equal(entries[2].data.parent,checkpoint);assert.equal(entries[2].data.branch,fork);
 await panel.getByRole('button',{name:'Close history'}).click();await p.getByRole('button',{name:'Next',exact:true}).click();await ready();assert.equal(await grid.getAttribute('data-logical-generation'),'1');
 assert.deepEqual(errors,[]);rows.push({route,width,height,images:16,repeatHash:true,parentRetained:true,departingRetained:true,workerIdentityMonotonic:true,pass:true});await ctx.close();
}}finally{await writeFile(out+'/results.json',JSON.stringify({browser:name,scope:'reconstructed fixed-intent images; explicit active fork; no original thumbnail-intent guarantee',rows},null,2));await browser?.close();await close();}
