import assert from 'node:assert/strict';
import {webkit,devices} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await webkit.launch();const out='mobile-evidence';await mkdir(out,{recursive:true});
try{
 const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block'});
 const page=await context.newPage();const failures=[];page.on('pageerror',e=>failures.push(e.message));
 await page.addInitScript(()=>{window.gpuRequests=0;Object.defineProperty(navigator,'gpu',{configurable:true,value:{requestAdapter:async()=>{window.gpuRequests++;return null}}})});
 const base='http://127.0.0.1:4173/';
 await page.goto(base+'experiences/alife/index.html?mode=observe');
 await page.locator('#mobile-start').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>window.gpuRequests),0);
 await page.screenshot({path:out+'/01-alife-safe-start.png'});
 await page.locator('#mobile-start-button').click();
 await page.locator('#arena-message').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>window.gpuRequests),1);
 await page.screenshot({path:out+'/02-alife-gpu-unavailable.png'});
 await page.reload();await page.locator('#mobile-start').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>window.gpuRequests),0);
 await page.goto(base+'?experience=mosaic-craft');
 await page.locator('.card').first().waitFor({timeout:30000});
 const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.card button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}))}));
 assert.ok(layout.scroll<=layout.width+1,JSON.stringify(layout));assert.ok(layout.buttons.length>0);assert.ok(layout.buttons.every(b=>b.w>=44&&b.h>=44),JSON.stringify(layout));
 await page.screenshot({path:out+'/03-mobile-craft.png',fullPage:false});
 assert.deepEqual(failures,[]);
 await writeFile(out+'/result.json',JSON.stringify({pass:true,scope:'WebKit mobile emulation; mocked adapter refusal, not physical GPU qualification',layout},null,2));
}finally{await browser.close()}
