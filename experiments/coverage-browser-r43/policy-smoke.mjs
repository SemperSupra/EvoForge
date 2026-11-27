import {chromium,webkit,devices} from '@playwright/test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='r49-evidence';await mkdir(out,{recursive:true});const results=[];
for(const [engine,opts,lane,total,unique] of [[chromium,{viewport:{width:1440,height:900}},'craft',2592,1458],[webkit,devices['iPhone 13'],'emblem',864,864]]){
 const browser=await engine.launch();try{const page=await browser.newPage(opts);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/experiments/coverage-browser-r43/');
 const status=()=>page.locator('#progress').textContent(),count=()=>page.locator('#bar').evaluate(e=>Number(e.value));
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('evoforge-r44-index-v1')));
 await page.locator('#engine').selectOption(lane);await page.locator('#budget').selectOption('128');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#progress').textContent.includes('batch complete'));
 assert.equal(await count(),128);const initial=await saved();assert.equal(initial.completed,128);assert.equal(initial.complete,false);
 await page.reload();assert.equal(await count(),128);await page.locator('#budget').selectOption('512');await page.locator('#resume').click();await page.waitForFunction(()=>document.querySelector('#progress').textContent.includes('batch complete'));assert.equal(await count(),640);
 const second=await saved();const ranks=x=>new Set(x.groups.flatMap(g=>g.ranks));assert.equal(ranks(second).size,640);assert.ok([...ranks(initial)].every(x=>ranks(second).has(x)));
 await page.locator('#budget').selectOption('all');await page.locator('#resume').click();await page.waitForFunction(n=>Number(document.querySelector('#bar').value)===n&&document.querySelector('#progress').textContent.endsWith('complete'),total,{timeout:120000});
 const final=await saved();assert.equal(final.completed,total);assert.equal(final.groups.length,unique);assert.equal(ranks(final).size,total);assert.equal(final.complete,true);assert.equal(await page.locator('#resume').isDisabled(),true);
 const max=lane==='emblem'?8:24;await page.waitForFunction(n=>document.querySelectorAll('#gallery canvas[data-ready=true]').length===n,max);await page.screenshot({path:out+'/'+lane+'.png'});await writeFile(out+'/'+lane+'.json',JSON.stringify(final));assert.deepEqual(errors,[]);results.push({lane,total,unique,firstBatch:128,secondBatch:512,complete:true});
 }finally{await browser.close();}
}await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
