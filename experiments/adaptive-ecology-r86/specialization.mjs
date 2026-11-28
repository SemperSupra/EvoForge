// R86: finite-resource artificial selection experiment using the R83 material ledger.
// Explicit external replenishment and selection between generations; not a closed-world
// ecological model, a biological prediction, or a live Arena implementation.
import {Ledger,materials,process} from '../material-ecology-r83/material.mjs';
const zero=()=>[0,0,0,0,0,0],sum=a=>a.reduce((s,x)=>s+x,0);
const valid=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
function rng(seed){let x=seed>>>0||0x6d2b79f5;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function stream(seed,g,salt){return rng((seed^Math.imul(g+1,0x9e3779b1)^salt)>>>0);}
export function experiment({seed=1,generations=40,population=32,softSupply=64,woodSupply=320,mutationPermille=350,traitCost=1}={}){
 if(!valid(seed,0,0xffffffff)||!valid(generations,1,120)||!valid(population,4,64)||!valid(softSupply,0,10000)||!valid(woodSupply,0,10000)||!valid(mutationPermille,0,1000)||!valid(traitCost,0,5))throw Error("experiment bounds");
 let pop=Array.from({length:population},(_,id)=>({wood:0,lineage:id}));const trace=[];
 const initialEnergy=30;
 for(let g=0;g<generations;g++){
  const ledger=new Ledger({soft:materials.soft.input.map(x=>x*softSupply),wood:materials.wood.input.map(x=>x*woodSupply),shell:zero(),rock:zero(),consumer:zero(),soil:zero(),air:zero(),heat:zero(),char:zero(),reserve:[0,0,0,0,0,initialEnergy*population],spent:zero()});
  const before=ledger.total();let consumedWood=0,consumedSoft=0,charged=0;
  const order=Array.from({length:population},(_,i)=>i),shuffle=stream(seed,g,0x4271a1);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const scores=Array(population).fill(0);
  for(const i of order){
   const w=pop[i].wood,traits={soft:100-w,wood:w,shell:0,rock:0};
   const energy=[0,0,0,0,0,initialEnergy];ledger.apply([{from:'reserve',to:'consumer',amount:energy}]);
   const fee=Math.min(initialEnergy,Math.ceil(w/10)*traitCost);
   if(fee)ledger.apply([{from:'consumer',to:'heat',amount:[0,0,0,0,0,fee]}]);charged+=fee;
   consumedSoft+=process(ledger,{kind:'soft',traits,requested:Math.floor((100-w)/10)}).units;
   consumedWood+=process(ledger,{kind:'wood',traits,requested:Math.floor(w/10)}).units;
   const body=ledger.get('consumer');scores[i]=Math.max(1,body[5]-initialEnergy+8);
   ledger.apply([{from:'consumer',to:'spent',amount:body}]);
  }
  const after=ledger.total(),residual=after.map((x,i)=>x-before[i]);
  if(residual.some(Boolean))throw Error('nonconservative generation');
  trace.push({g,meanWood:sum(pop.map(c=>c.wood))/population,woodUsers:pop.filter(c=>c.wood>=10).length,consumedWood,consumedSoft,charged,lineages:new Set(pop.map(c=>c.lineage)).size,meanFitness:sum(scores)/population,residual});
  const sample=stream(seed,g,0x628c7d),total=sum(scores);
  pop=Array.from({length:population},()=>{let pick=sample()*total,index=0;while(index<population-1&&pick>=scores[index])pick-=scores[index++];const parent=pop[index];const mutate=sample()*1000<mutationPermille;const delta=sample()<.5?-10:10;return {wood:mutate?Math.max(0,Math.min(100,parent.wood+delta)):parent.wood,lineage:parent.lineage};});
 }
 return {parameters:{seed,generations,population,softSupply,woodSupply,mutationPermille,traitCost},trace,terminal:trace.at(-1)};
}
export function ensemble(seeds=[1,2,3,4,5,6,7,8]){
 if(!Array.isArray(seeds)||seeds.length<1||seeds.length>32||new Set(seeds).size!==seeds.length)throw Error('seed ensemble');
 const arms={woodAvailable:{},noMutation:{mutationPermille:0},noWood:{woodSupply:0},noTraitCost:{traitCost:0}};
 return Object.fromEntries(Object.entries(arms).map(([name,params])=>{const runs=seeds.map(seed=>experiment({seed,...params}));return [name,{runs:runs.map(r=>({seed:r.parameters.seed,...r.terminal})),meanWood:sum(runs.map(r=>r.terminal.meanWood))/runs.length,meanConsumption:sum(runs.map(r=>r.terminal.consumedWood))/runs.length}]}));
}
