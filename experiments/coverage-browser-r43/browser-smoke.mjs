import {webkit,chromium,devices} from '@playwright/test';
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='r43-browser-evidence';await mkdir(out,{recursive:true});const observations=[];
for(const [engine,opts,expected] of [[webkit,devices['iPhone 13'],864],[chromium,{viewport:{width:1440,height:900}},1458]]){
 const b=await engine.launch();try{const page=await b.newPage(opts);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/experiments/coverage-browser-r43/');
 await page.locator('#engine').selectOption(expected===864?'emblem':'craft');await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#progress')?.textContent.includes('complete'),null,{timeout:120000});
 assert.ok((await page.locator('#progress').textContent()).includes(expected+' unique previews'));
 const cap=expected===864?8:24;await page.waitForFunction(n=>document.querySelectorAll('#gallery canvas[data-ready=true]').length===n,cap,{timeout:60000});assert.equal(await page.locator('#gallery article').count(),cap);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:out+'/'+expected+'-gallery.png'});await page.locator('#gallery button').first().click();assert.ok((await page.locator('#receipt').textContent()).includes('aliasRanks'));await page.locator('#close').click();
 await page.locator('#next').click();await page.waitForFunction(n=>document.querySelectorAll('#gallery canvas[data-ready=true]').length===n,cap,{timeout:60000});assert.equal(await page.locator('#gallery article').count(),cap);
 const download=page.waitForEvent('download');await page.locator('#export').click();await (await download).saveAs(out+'/'+expected+'-index.json');
 const first=await page.locator('#gallery article').first().getAttribute('data-rank');assert.ok(Number(first)>0);assert.deepEqual(errors,[]);observations.push({expected,cap,first,pass:true});await page.close();
 }finally{await b.close();}
}await writeFile(out+'/result.json',JSON.stringify(observations,null,2));
