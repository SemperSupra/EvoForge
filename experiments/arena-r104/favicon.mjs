import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../human-ux-r58/server.mjs';
const out='favicon-evidence';await mkdir(out,{recursive:true});const responses=[],errors=[];
const {base,close}=await serve({onResponse:r=>{if(responses.length<200)responses.push(r);}});let browser;
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rows=[];
const manifest=JSON.parse(await readFile('dist/experiences/alife/manifest.webmanifest','utf8')),icon=manifest.icons[0].src;
try{
 browser=await chromium.launch({channel:'chromium',headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),p=await ctx.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 for(const url of [base,base+'experiences/alife/index.html?mode=observe&profile=mobile']){
  await p.goto(url,{waitUntil:'load'});const href=await p.locator('link[rel=icon]').getAttribute('href');assert.equal(href,icon);
  await p.waitForTimeout(700);rows.push({url:new URL(url).pathname,explicitIcon:true});
 }
 assert.deepEqual(errors,[]);
 assert.ok(!responses.some(r=>r.path==='/favicon.ico'&&r.status===404),'favicon fallback 404 still present');
 assert.ok(!responses.some(r=>r.status>=400),JSON.stringify(responses.filter(r=>r.status>=400)));
 await ctx.close();
}finally{await writeFile(out+'/results.json',JSON.stringify({source,rows,responses,errors,scope:'actual native Chromium loopback launcher and mobile safe-start network requests; no simulation start'},null,2));await browser?.close();await close();}
