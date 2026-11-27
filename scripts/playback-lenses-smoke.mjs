import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const shots=process.env.EVOFORGE_SCREENSHOT_DIR;
if(shots)await mkdir(shots,{recursive:true});
const browser=await chromium.launch(process.env.EVOFORGE_CHROMIUM_EXECUTABLE?{executablePath:process.env.EVOFORGE_CHROMIUM_EXECUTABLE,args:['--disable-dev-shm-usage']}:{});
const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const ready=()=>page.waitForFunction(()=>{const cards=[...document.querySelectorAll('.grid .card')];return cards.length===16&&cards.every(c=>c.getAttribute('data-render-state')==='ready');},null,{timeout:90000});
const generation=()=>page.locator('.grid').getAttribute('data-generation').then(Number);
const next=async g=>{await page.waitForFunction(v=>Number(document.querySelector('.grid')?.getAttribute('data-generation'))>v,g,{timeout:90000});return generation();};
const pace=()=>page.getByRole('combobox',{name:'Evolution pace'});
const btn=name=>page.getByRole('button',{name,exact:true});
const sleep=ms=>page.waitForTimeout(ms);
const results=[];
try{
 for(const route of ['mosaic-legacy','mosaic']){
   await page.goto('http://127.0.0.1:5174/?experience='+route);
   await ready();assert.equal(await page.locator('.grid').getAttribute('data-playback'),'paused');
   await pace().selectOption('slow');await ready();
   const initial=await generation(),started=Date.now();
   await btn('Play').click();await next(initial);const slow=Date.now()-started;assert.ok(slow>=2200,'slow pace advanced too early '+slow);
   const current=await generation();await next(current); // No manual picks in either cycle.
   await btn('Pause').click();await ready();const held=await generation();await sleep(2700);assert.equal(await generation(),held);
   await btn('Next').click();await next(held);await ready();
   await pace().selectOption('fast');await ready();const g=await generation(),fastStarted=Date.now();
   await btn('Play').click();await next(g);const fast=Date.now()-fastStarted;assert.ok(fast>=270,'fast pace advanced too early '+fast);
   await btn('Pause').click();await ready();
   await pace().selectOption('manual');await ready();const m=await generation();await sleep(1100);assert.equal(await generation(),m);
   await btn('Play').click();assert.equal(await pace().inputValue(),'medium');await next(m);await btn('Pause').click();await ready();
   // Manual selections remain optional; verify a selected parent remains represented.
   const parentId=await page.locator('.grid .card').first().getAttribute('data-candidate-id');
   await page.locator('.grid .card').first().getByRole('button',{name:'Pick',exact:true}).click();
   const picked=await generation();await btn('Next').click();await next(picked);await ready();
   assert.ok(await page.locator('.grid .card').evaluateAll((cards,id)=>cards.some(c=>c.getAttribute('data-candidate-id')===id),parentId),'picked parent identity not retained');
   await pace().selectOption('slow');await ready();await btn('Play').click();
   await page.locator('.grid .card canvas').first().click();const focus=await generation();
   await sleep(2700);assert.equal(await generation(),focus,'focus must hold autoplay');
   await btn('Close').click();await next(focus);await btn('Pause').click();await ready();
   await btn('Play').click();await btn('Library').click();const library=await generation();
   await sleep(2700);assert.equal(await generation(),library,'library must hold autoplay');
   await btn('Close').click();await next(library);await btn('Pause').click();await ready();
   const rings=page.locator('.evolution-lenses details').filter({hasText:'Reality Rings'});
   const radar=page.locator('.evolution-lenses details').filter({hasText:'Population radar'});
   await rings.locator('summary').click();await radar.locator('summary').click();
   await rings.getByRole('combobox',{name:'Reality Rings layout'}).selectOption('rings');
   const ringMap=rings.locator('.ring-visual svg');
   assert.ok(await ringMap.isVisible());assert.ok(await radar.locator('.population-plot').isVisible());
   assert.equal(await ringMap.locator('[data-candidate-id]').count(),16);
   assert.equal(await radar.locator('.population-plot [data-candidate-id]').count(),16);
   await rings.getByRole('combobox',{name:'View filter metric'}).selectOption('contrast');
   await rings.getByRole('spinbutton',{name:'Minimum metric percent'}).fill('100');
   await rings.getByRole('button',{name:'Add filter ring'}).click();
   await rings.getByRole('button',{name:/Contrast ≥ 100%/}).click();
   assert.ok(await rings.getByText(/Residents at this ring:/).isVisible());
   assert.equal(await ringMap.locator('[data-candidate-id]').count(),16);
   assert.equal(await page.locator('.grid .card').count(),16,'View filtering must not delete candidates');
   if(shots)await page.screenshot({path:join(shots,route+'-rings-radar.png'),fullPage:true});
   await radar.locator('.radar-roster button').first().click();
   await btn('Radar').click();assert.ok(await page.locator('.focus-radar.open').isVisible());
   await btn('Image').click();await btn('Close').click();
   await rings.getByRole('button',{name:'Remove Contrast ring 1'}).click();
   results.push({route,slowObservedMs:slow,fastObservedMs:fast,automaticWithoutPicks:true,pauseNext:true,manualPlay:true,pickedParent:true,focusAndLibraryHold:true,liveRingsRadar:true});
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({gate:'playback-lenses',results},null,2));
}finally{await browser.close();}
