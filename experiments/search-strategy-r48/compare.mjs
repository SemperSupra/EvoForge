import {createHash} from 'node:crypto';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';import {AXES,cardinality,rowAt} from '../coverage-browser-r43/index.mjs';import {recipe,intent} from '../coverage-browser-r43/recipe.mjs';
const lane=process.argv[2];assert.ok(Object.hasOwn(AXES,lane));const total=Number(cardinality(AXES[lane])),axes=Object.values(AXES[lane]),keys=Object.keys(AXES[lane]),budget=512;
function rng(seed){let s=seed>>>0;return n=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)%n;};}
const gcd=(a,b)=>b?gcd(b,a%b):a;
const rankOf=c=>{let n=0,stride=1;for(let i=0;i<axes.length;i++){n+=c[keys[i]]*stride;stride*=axes[i];}return n;};
async function trial(strategy,seed){
 const rand=rng(seed),seen=new Set(),outputs=new Set(),trace=[],rankSet=new Set(),start=performance.now();let parents=[],children=[];let stride=1+rand(total-1);while(gcd(stride,total)!==1)stride=stride%total+1;const offset=rand(total);
 for(let i=0;i<budget;i++){
  let rank;if(strategy==='systematic')rank=(offset+i*stride)%total;
  else if(strategy==='random')rank=rand(total);
  else if(i<16||rand(5)===0||!parents.length)rank=rand(total);
  else{const a=rowAt(lane,parents[rand(parents.length)]).candidate,b=rowAt(lane,parents[rand(parents.length)]).candidate,c={};for(let j=0;j<keys.length;j++){const k=keys[j];c[k]=rand(2)?a[k]:b[k];if(rand(100)<22)c[k]=rand(axes[j]);}rank=rankOf(c);}
  const r=recipe(lane,rowAt(lane,rank).candidate),{rgba}=await r.render(r.g,r.config,intent);const hash=createHash('sha256').update(rgba).digest('hex');const novel=!outputs.has(hash);rankSet.add(rank);outputs.add(hash);children.push({rank,novel});
  if(strategy==='coarse-ga'&&(i+1)%16===0){const ranked=children.filter(x=>x.novel);parents=[...new Set((ranked.length?ranked:children).map(x=>x.rank))].slice(0,4);children=[];}
  if((i+1)%64===0)trace.push({attempts:i+1,uniqueRanks:rankSet.size,uniquePixels:outputs.size});
 }
 return {strategy,seed,attempts:budget,uniqueRanks:rankSet.size,uniquePixels:outputs.size,elapsedSeconds:(performance.now()-start)/1000,trace};
}
const results=[];for(const seed of [42,1337,2026])for(const strategy of ['systematic','random','coarse-ga'])results.push(await trial(strategy,seed));
const report={lane,total,budget,scope:'equal real render attempts on same coarse fixed-texture domain; coarse GA is a reference novelty-selection strategy, not production GA or human aesthetic preference; preview equality only',results};await mkdir('strategy-evidence',{recursive:true});await writeFile('strategy-evidence/summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify({lane,total,budget,results:results.map(({trace,...x})=>x)}));assert.ok(results.filter(x=>x.strategy==='systematic').every(x=>x.uniqueRanks===budget));
