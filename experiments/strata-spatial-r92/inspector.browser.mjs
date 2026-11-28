import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const allow=new Set(['/experiments/strata-spatial-r92/inspector.html','/experiments/stratified-arena-r91/strata.mjs','/experiments/stratified-arena-r91/fixtures.mjs']);
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(!allow.has(p)){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':p.endsWith('.html')?'text/html; charset=utf-8':'application/javascript; charset=utf-8'}).end(await readFile(new URL(p.slice(1),root)));}catch{res.writeHead(500).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/experiments/strata-spatial-r92/inspector.html';
const dir='strata-inspector-evidence';await mkdir(dir,{recursive:true});let browser;const rows=[];
try{browser=await chromium.launch();for(const [width,height,touch] of [[1280,800,false],[390,844,true],[844,390,true]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!!window.__STRATA_INSPECTOR__);
 const state=()=>p.evaluate(()=>window.__STRATA_INSPECTOR__.getState());const initial=await state();assert.equal(initial.layers.length,7);
 await p.getByRole('button',{name:'mineral subsoil',exact:true}).click();assert.equal(await p.locator('#current-layer').textContent(),'mineral subsoil');
 for(const mode of ['oxygen','heat','nutrients','light','phase']){await p.locator('#field').selectOption(mode);assert.deepEqual(await state(),initial);}
 await p.locator('#depth').fill('0');assert.equal(await p.locator('#current-layer').textContent(),'upper air');
 await p.getByRole('button',{name:'Step environment'}).click();let next=await state();assert.equal(next.step,1);assert.deepEqual(next.inventory,initial.inventory);assert.notDeepEqual(next.layers,initial.layers);
 await p.locator('#field').selectOption('oxygen');assert.deepEqual(await state(),next);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.screenshot({path:dir+'/section-'+width+'x'+height+'.png',fullPage:true});
 await p.getByRole('button',{name:'Reset fixture'}).click();assert.deepEqual(await state(),initial);assert.deepEqual(errors,[]);
 rows.push({width,height,touch,conserved:true,viewOnly:true,pass:true});await ctx.close();
}}finally{await writeFile(dir+'/results.json',JSON.stringify({scope:'reference column only, emulated viewports, not native Arena',rows},null,2));await browser?.close();await new Promise(r=>server.close(r));}
