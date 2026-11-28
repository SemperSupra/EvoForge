import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../human-ux-r58/server.mjs';
const out='overlay-bakeoff-evidence';await mkdir(out,{recursive:true});
const {base,close}=await serve();const browser=await chromium.launch();const results=[];
const routes=['mosaic-legacy','mosaic','mosaic-craft','mosaic-motifs','mosaic-emblems'];
try{
 for(const route of routes){
  const ctx=await browser.newContext({viewport:{width:1600,height:1000},serviceWorkers:'block'});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'?experience='+route);
  await p.waitForFunction(()=>document.querySelectorAll('.mosaic-viewer .card[data-render-state=ready]').length===16,null,{timeout:120000});
  const left=p.locator('#mosaic-lens-left'),right=p.locator('#mosaic-lens-right'),map=left.locator('svg[aria-label="Concentric rings of current generation candidate membership"]');
  await right.locator('summary').click();assert.equal(await right.getAttribute('open'),null);
  const measure=()=>map.evaluate(svg=>{
   const markers=[...svg.querySelectorAll('g[data-ring]')];let pairs=0,near=0,min=Infinity,maxIntersection=0;
   for(let i=0;i<markers.length;i++)for(let j=i+1;j<markers.length;j++){
    const a=markers[i].getBoundingClientRect(),b=markers[j].getBoundingClientRect();const d=Math.hypot((a.x+a.width/2)-(b.x+b.width/2),(a.y+a.height/2)-(b.y+b.height/2));min=Math.min(min,d);
    const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    if(w>1&&h>1){pairs++;maxIntersection=Math.max(maxIntersection,w*h/Math.min(a.width*a.height,b.width*b.height));}
    if(d<16)near++;
   }
   return {count:markers.length,unique:new Set(markers.map(x=>x.dataset.candidateId)).size,width:svg.getBoundingClientRect().width,overlaps:pairs,near16px:near,minCenterDistance:Number(min.toFixed(2)),maxOverlapFraction:Number(maxIntersection.toFixed(3)),closePairs320:Number(svg.dataset.closePairs)};
  });
  const dimensions=[];
  for(const requested of ['default','expanded']){
   if(requested==='expanded'){await p.getByRole('separator',{name:'Resize Reality Rings'}).focus();await p.getByRole('separator',{name:'Resize Reality Rings'}).press('End');await p.waitForTimeout(250);}
   const separate=await measure();assert.equal(separate.count,16);assert.equal(separate.unique,16);
   await p.screenshot({path:out+'/'+route+'-'+requested+'-separate.png'});
   await left.getByRole('button',{name:'Combined rings + radar',exact:true}).click();
   const combined=[];
   for(const [angle,size] of [['brightness','contrast'],['contrast','edge'],['saturation','brightness']]){
    await left.getByRole('combobox',{name:'Angle',exact:true}).selectOption(angle);
    await left.getByRole('combobox',{name:'Marker size',exact:true}).selectOption(size);
    const m=await measure();assert.equal(m.count,16);assert.equal(m.unique,16);
    assert.ok(Math.abs(m.width-separate.width)<=2,'paired comparison width drift');
    combined.push({angle,size,...m});
    await p.screenshot({path:out+'/'+route+'-'+requested+'-'+angle+'-'+size+'.png'});
   }
   dimensions.push({requested,separate,combined});
   await left.getByRole('button',{name:'Separate rings and radar',exact:true}).click();
   // Separate mode reopens right by design. Close it again for matched width.
   if(await right.getAttribute('open')!==null)await right.locator('summary').click();
  }
  assert.deepEqual(errors,[]);results.push({route,dimensions});
  console.log('BAKEOFF '+JSON.stringify(results.at(-1)));
  await writeFile(out+'/results.json',JSON.stringify({source:process.env.GITHUB_SHA,scope:'initial actual rendered populations, 5 routes, two matched pane widths, three metric pairs, DOM bounding-box overlaps; not human preference or all future generations',results},null,2));
  await ctx.close();
 }
}finally{await browser.close();await close();}
