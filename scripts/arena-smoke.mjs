import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/EvoForge/')){res.writeHead(404).end();return;}
    let rel=decodeURIComponent(url.pathname.slice('/EvoForge/'.length));if(!rel||rel.endsWith('/'))rel+='index.html';
    const path=resolve(root,rel);
    if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    const body=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'}).end(body);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+'/EvoForge/';
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:960,height:640},serviceWorkers:'block'});
  const errors=[];
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const snapshot=()=>page.evaluate(()=>window.__ARENA_RPC__.getState());
  async function progress(tick){
    await page.waitForFunction(t=>{const s=window.__ARENA_RPC__?.getState();return s&&(s.phase==='error'||s.telemetry.tick>=t);},tick,{timeout:90000});
    const s=await snapshot();
    assert.notEqual(s.phase,'error',s.error);
    assert.ok(s.telemetry.tick>=tick,'GPU telemetry must advance');
    assert.ok(Object.values(s.telemetry.populations).every(v=>Number.isInteger(v)&&v>=0&&v<=512));
    assert.ok(Object.values(s.telemetry.energy).every(v=>Number.isFinite(v)&&v>=0));
    return s;
  }
  await page.goto(base);
  await page.getByRole('heading',{name:'EvoForge',exact:true}).waitFor();
  // Explicitly pin the five selected release-candidate routes and their catalog
  // labels. A nav-only page or a failed lazy import is not a successful route.
  const mosaicRoutes=[
    ['Craft Lab 3.0','./?experience=mosaic-craft'],
    ['Motif & Heraldry Lab','./?experience=mosaic-motifs'],
    ['Emblems & flags','./?experience=mosaic-emblems'],
    ['Mosaic Atelier 2.0','./?experience=mosaic'],
    ['Legacy Mosaic 1.0.0','./?experience=mosaic-legacy']
  ];
  assert.equal(await page.getByRole('link',{name:'Observe',exact:true}).count(),1);
  assert.equal(await page.getByRole('link',{name:'Play',exact:true}).count(),1);
  for(const [label,href] of mosaicRoutes){
    assert.equal(await page.evaluate(()=>typeof window.__ARENA_RPC__),'undefined');
    const link=page.getByRole('link',{name:label,exact:true});
    assert.equal(await link.count(),1,label);
    assert.equal(await link.getAttribute('href'),href,label);
    await link.click();
    await page.getByRole('link',{name:'All EvoForge experiences'}).waitFor();
    // A placeholder canvas is not a rendered candidate. All 16 must be ready,
    // and any explicit render error is a failing gate rather than a timeout.
    await page.waitForFunction(()=>{const cards=[...document.querySelectorAll('.grid .card')];return cards.some(c=>c.getAttribute('data-render-state')==='err')||cards.length===16&&cards.every(c=>c.getAttribute('data-render-state')==='ready');},null,{timeout:60000});
    assert.equal(await page.locator('.grid .card[data-render-state="err"]').count(),0,label+' render errors');
    assert.equal(await page.locator('.grid .card[data-render-state="ready"]').count(),16,label+' ready cards');
    assert.equal(await page.evaluate(()=>typeof window.__ARENA_RPC__),'undefined');
    await page.getByRole('link',{name:'All EvoForge experiences'}).click();
    await page.getByRole('heading',{name:'EvoForge',exact:true}).waitFor();
  }
  await page.goto(base+'experiences/alife/index.html?mode=observe&profile=smoke&seed=42');
  const first=await progress(15);assert.equal(first.mode,'observe');assert.ok(first.telemetry.energy.flora>0);
  const adapterInfo=await page.evaluate(async()=>{const a=await navigator.gpu.requestAdapter();return a?{vendor:a.info?.vendor||'',architecture:a.info?.architecture||'',device:a.info?.device||'',description:a.info?.description||'',fallback:a.info?.isFallbackAdapter??null}:null;});
  console.log('Native browser '+browser.version()+' adapter '+JSON.stringify(adapterInfo));
  assert.ok(await page.locator('#sl-temp').isDisabled());
  assert.ok(await page.evaluate(()=>{try{window.__ARENA_RPC__.setKnobs({ambientTemp:32});return false;}catch{return true;}}));
  await page.evaluate(()=>window.__ARENA_RPC__.setPaused(true));
  const paused=await snapshot();await page.waitForTimeout(300);assert.equal((await snapshot()).tick,paused.tick);
  await page.evaluate(()=>window.__ARENA_RPC__.setPaused(false));await progress(Math.ceil((paused.tick+1)/15)*15);
  await page.getByRole('link',{name:'All experiences',exact:true}).click();
  await page.getByRole('heading',{name:'EvoForge',exact:true}).waitFor();
  await page.goto(base+'experiences/alife/index.html?mode=play&profile=smoke&seed=42');
  await progress(15);
  for(let family=0;family<7;family++){
    await page.evaluate(()=>window.__ARENA_RPC__.setPaused(true));
    await page.locator('#fam-'+family).click();
    await page.evaluate(()=>window.__ARENA_RPC__.resetEcosystem());
    assert.equal((await snapshot()).knobs.state.arenaFamily,family);
    await page.evaluate(()=>window.__ARENA_RPC__.setPaused(false));
    await progress(15);
  }
  await page.evaluate(()=>window.__ARENA_RPC__.setPaused(true));
  assert.equal((await page.evaluate(()=>window.__ARENA_RPC__.setKnobs({ambientTemp:33}))).knobs.state.ambientTemp,33);
  await page.goto(base+'experiences/alife/index.html?mode=observe&seed=42');
  await progress(15);
  assert.equal((await snapshot()).mode,'observe');
  assert.deepEqual(errors,[],'Uncaught browser errors');
  await context.close();
  const noGpu=await browser.newContext({serviceWorkers:'block'});
  await noGpu.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true}));
  const fallback=await noGpu.newPage();
  await fallback.goto(base+'experiences/alife/index.html?mode=observe');
  await fallback.waitForFunction(()=>window.__ARENA_RPC__?.getState().phase==='error');
  await fallback.getByRole('link',{name:'Return to EvoForge',exact:true}).click();
  await fallback.getByRole('heading',{name:'EvoForge',exact:true}).waitFor();
  await noGpu.close();
  console.log('PASS: built-site launcher, Mosaic routing, native WebGPU pipeline, observe/play, seven families, default population, pause/reset and unsupported-browser route');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
