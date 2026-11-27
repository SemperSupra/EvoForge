import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const shots=process.env.EVOFORGE_SCREENSHOT_DIR;
if(shots)await mkdir(shots,{recursive:true});
const capture=async(page,name)=>{if(shots)await page.screenshot({path:join(shots,name+'.png'),fullPage:true});};
import { chromium } from '@playwright/test';
const base='http://127.0.0.1:5174/';
const browser=await chromium.launch();
try {
  const context=await browser.newContext({viewport:{width:960,height:640},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#golden');
  await page.getByRole('heading',{name:'EvoForge',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__evoforgeGoldenRender),'undefined','Development-only hook must not be exposed');
  await capture(page,'launcher');
  for(const [label,href] of [
    ['Craft Lab 3.0','./?experience=mosaic-craft'],
    ['Motif & Heraldry Lab','./?experience=mosaic-motifs'],
    ['Emblems & flags','./?experience=mosaic-emblems'],
    ['Mosaic Atelier 2.0','./?experience=mosaic'],
    ['Legacy Mosaic 1.0.0','./?experience=mosaic-legacy']
  ]) {
    const link=page.getByRole('link',{name:label,exact:true});
    assert.equal(await link.getAttribute('href'),href);
    await link.click();
    await page.waitForFunction(()=>{
      const cards=[...document.querySelectorAll('.grid .card')];
      return cards.some(c=>c.getAttribute('data-render-state')==='err')||cards.length===16&&cards.every(c=>c.getAttribute('data-render-state')==='ready');
    },null,{timeout:60000});
    assert.equal(await page.locator('.grid .card[data-render-state="err"]').count(),0,label);
    assert.equal(await page.locator('.grid .card[data-render-state="ready"]').count(),16,label);
    assert.equal(await page.evaluate(()=>typeof window.__evoforgeGoldenRender),'undefined');
    await capture(page,href.split('=')[1]);
    await page.getByRole('link',{name:'All EvoForge experiences'}).click();
    await page.getByRole('heading',{name:'EvoForge',exact:true}).waitFor();
  }
  for(const label of ['Observe','Play']){
    const link=page.getByRole('link',{name:label,exact:true});
    const href=await link.getAttribute('href');
    assert.ok(href);
    const url=new URL(href,base);
    assert.equal(url.origin,new URL(base).origin);
    assert.equal(url.pathname,'/experiences/alife/index.html');
    assert.equal(url.searchParams.get('mode'),label.toLowerCase());
    const result=await context.request.get(url.href);
    assert.ok(result.ok(),label+' static route missing');
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({gate:'production-smoke',mosaicRoutes:5,readyCards:80,arenaStaticRoutes:2,devHookAbsent:true,gpuQualification:false}));
} finally {await browser.close();}
