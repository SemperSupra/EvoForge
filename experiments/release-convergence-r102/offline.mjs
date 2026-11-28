import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {serve} from '../human-ux-r58/server.mjs';
const source=process.env.EXPECTED_SOURCE,out='offline-assurance-evidence';await mkdir(out,{recursive:true});
assert.match(source??'',/^[a-f0-9]{40}$/,'exact source required');
const actual=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(actual,source,'offline harness must exercise exact experimental preview checkout');
const {base,close}=await serve();let browser;const receipt={source,scope:'actual Chromium service worker; touch-emulated startup; not native offline GPU performance or complete browser cache migration'};
const hash=s=>createHash('sha256').update(s).digest('hex');
try{
 browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'allow'}),p=await ctx.newPage();
 const shell=base+'experiences/alife/index.html',manifest=base+'experiences/alife/manifest.webmanifest',old='evoforge-preview-alife-0.1.0-rdte.8',fresh='evoforge-preview-alife-0.1.0-rdte.9';
 await p.goto(base);await p.evaluate(async({old,shell})=>{await(await caches.open(old)).put(shell,new Response('old cache fixture'));await(await caches.open('unrelated-cache-fixture')).put(location.origin+'/unrelated',new Response('retain'));},{old,shell});
 await p.goto(shell+'?mode=observe&profile=smoke');
 await p.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:30000});
 await p.waitForFunction(async({old,fresh})=>{const keys=await caches.keys();return keys.includes(fresh)&&!keys.includes(old)&&keys.includes('unrelated-cache-fixture');},{old,fresh});
 const online=await p.evaluate(async({shell,manifest})=>{const a=await fetch(shell+'?mode=observe'),b=await fetch(manifest);return {shell:await a.text(),manifest:await b.text(),status:[a.status,b.status]};},{shell,manifest});
 assert.deepEqual(online.status,[200,200]);assert.ok(online.shell.includes("version: '0.1.0-rdte.9'"));assert.equal(JSON.parse(online.manifest).scope,'./');
 const keys=await p.evaluate(async fresh=>(await(await caches.open(fresh)).keys()).map(x=>x.url).sort(),fresh);assert.deepEqual(keys,[shell,manifest].sort());
 await ctx.setOffline(true);
 const offline=await p.evaluate(async({shell,manifest,base})=>{const a=await fetch(shell+'?mode=play&seed=42'),b=await fetch(manifest);let unrelatedBlocked=false;try{await fetch(base+'experiences.json',{cache:'no-store'});}catch{unrelatedBlocked=true;}return {shell:await a.text(),manifest:await b.text(),status:[a.status,b.status],unrelatedBlocked};},{shell,manifest,base});
 assert.deepEqual(offline.status,[200,200]);assert.equal(offline.shell,online.shell);assert.equal(offline.manifest,online.manifest);assert.equal(offline.unrelatedBlocked,true);
 await p.goto(shell+'?mode=observe&profile=smoke',{waitUntil:'domcontentloaded'});assert.ok((await p.content()).includes("0.1.0-rdte.9"));
 await p.screenshot({path:out+'/offline-shell.png'});
 await ctx.setOffline(false);const preserved=await p.evaluate(async()=>await(await(await caches.open('unrelated-cache-fixture')).match(location.origin+'/unrelated')).text());assert.equal(preserved,'retain');
 Object.assign(receipt,{pass:true,cacheKeys:keys,oldCacheRemoved:true,unrelatedCachePreserved:true,offlineScopeRestricted:true,shellSha256:hash(online.shell),manifestSha256:hash(online.manifest),browser:browser.version()});await ctx.close();
}finally{await writeFile(out+'/results.json',JSON.stringify(receipt,null,2));await browser?.close();await close();}
