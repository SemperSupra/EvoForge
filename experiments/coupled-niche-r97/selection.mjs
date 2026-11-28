// R98: matched-seed artificial selection on R97 local resource/access rules.
// Resources and founder energy are explicitly replenished between generations.
// No closed-world births, deaths, photosynthetic chemistry or native Arena claim.
import {system,totals,act} from './coupled.mjs';
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const equal=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);
function rng(seed){let x=seed>>>0||0x9e3779b9;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function stream(seed,g,salt){return rng((seed^Math.imul(g+1,0x9e3779b1)^salt)>>>0);}
function fixture(guild,stock,allocation){
 const pop=allocation.length,deep=stock==='deep'?168:stock==='shallow'?24:96,shallow=192-deep;
 const layers=guild==='animal'?
 [{id:'water',bottom:-2,top:0,water:200,oxygenWater:400,organic:deep,heat:4000,opacity:50},{id:'air',bottom:0,top:2,oxygenGas:400,organic:shallow,heat:4000}]:
 [{id:'deep',bottom:-2,top:-1,matrix:50,water:50,oxygenWater:50,solute:deep,hardness:50,permeability:50,poreSize:5,opacity:100,heat:2000},{id:'shallow',bottom:-1,top:0,matrix:50,water:50,oxygenWater:50,solute:shallow,hardness:10,permeability:70,poreSize:10,opacity:100,heat:2000},{id:'air',bottom:0,top:1,oxygenGas:200,heat:2000}];
 const organisms=allocation.map((a,i)=>({id:'a'+i,energy:180,traits:{size:1,dig:0,gasResp:guild==='animal'?100-a.trait:0,waterResp:guild==='animal'?a.trait:0,root:guild==='plant'?a.trait:0},parts:[{id:'body',layer:'air',medium:'gas'}]}));
 return system({width:1,depth:1,columns:[layers],locals:[{organisms}]});
}
export function experiment({guild='animal',seed=1,generations=30,population=16,stock='deep',mutation=350,traitCost=1}={}){
 if(!['animal','plant'].includes(guild)||!['deep','balanced','shallow'].includes(stock)||!int(seed,0,0xffffffff)||!int(generations,1,80)||!int(population,4,32)||!int(mutation,0,1000)||!int(traitCost,0,4))throw Error('experiment bounds');
 let pop=Array.from({length:population},(_,i)=>({trait:guild==='animal'?0:20,lineage:i}));const trace=[];
 for(let g=0;g<generations;g++){
  let state=fixture(guild,stock,pop);const before=totals(state),order=pop.map((_,i)=>i),shuffle=stream(seed,g,0x721e);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const fitness=Array(population).fill(1);let deepVisits=0,deepTaken=0,shallowTaken=0;
  for(const i of order){
   const id='a'+i,trait=pop[i].trait,o=state.locals[0].organisms.find(a=>a.id===id);
   // Explicit energetic cost of maintaining the heritable specialization.
   const fee=Math.min(o.energy,Math.ceil(trait/10)*traitCost);o.energy-=fee;state.locals[0].heatSpent+=fee;
   if(guild==='animal'){
    const w=state.columns[0][0],a=state.columns[0][1];
    const swim=Math.min(w.organic,w.oxygenWater,Math.floor(trait/10)),air=Math.min(a.organic,a.oxygenGas,Math.floor((100-trait)/10));
    const chooseWater=swim>0&&6*swim-1>6*air;
    if(chooseWater){state=act(state,id,'move',{part:'body',target:'water',medium:'liquid'});deepVisits++;}
    state=act(state,id,'feed',{part:'body',requested:10});
    if(chooseWater)deepTaken+=state.receipt.taken;else shallowTaken+=state.receipt.taken;
    fitness[i]=Math.max(1,state.locals[0].organisms.find(a=>a.id===id).energy-180+12);
   }else{
    // Roots always extend through the adjacent shallow horizon. A deeper
    // branch is selected by local nutrient availability and net work cost.
    if(trait>=10){
     state=act(state,id,'extendRoot',{parent:'body',newId:'root',target:'shallow'});
     const d=state.columns[0][0],s=state.columns[0][1],shallowPotential=Math.min(s.solute,Math.floor(trait/10)),deepPotential=trait>=50?Math.min(d.solute,Math.floor(trait/10)):0;
     if(deepPotential>shallowPotential){
      state=act(state,id,'extendRoot',{parent:'root',newId:'deep-root',target:'deep'});deepVisits++;
      state=act(state,id,'uptake',{part:'deep-root',requested:10});deepTaken+=state.receipt.taken;
     }else{state=act(state,id,'uptake',{part:'root',requested:10});shallowTaken+=state.receipt.taken;}
    }
    const plant=state.locals[0].organisms.find(a=>a.id===id);
    // Nutrient receipt is an explicit artificial-selection proxy, not ATP,
    // photosynthesis or a real plant reproduction model.
    fitness[i]=Math.max(1,12+plant.nutrients*10-Math.ceil((180-plant.energy)/4));
   }
  }
  const after=totals(state);if(!equal(before,after))throw Error('nonconservative generation');
  trace.push({g,meanTrait:sum(pop.map(x=>x.trait))/population,deepVisits,deepTaken,shallowTaken,lineages:new Set(pop.map(x=>x.lineage)).size,meanFitness:sum(fitness)/population,conserved:true});
  const random=stream(seed,g,0x319b),total=sum(fitness);
  pop=Array.from({length:population},()=>{let k=random()*total,i=0;while(i<population-1&&k>=fitness[i])k-=fitness[i++];const p=pop[i],change=random()*1000<mutation,delta=random()<.5?-10:10;return {trait:change?Math.max(0,Math.min(100,p.trait+delta)):p.trait,lineage:p.lineage};});
 }
 return {guild,seed,stock,mutation,traitCost,trace,terminal:trace.at(-1)};
}
export function ensemble(guild,seeds=[1,2,3,4,5,6]){
 if(!Array.isArray(seeds)||!seeds.length||seeds.length>16||new Set(seeds).size!==seeds.length)throw Error('seed ensemble');
 const arms={deep:{stock:'deep'},balanced:{stock:'balanced'},shallow:{stock:'shallow'},noMutation:{stock:'deep',mutation:0}};
 return Object.fromEntries(Object.entries(arms).map(([id,params])=>{const runs=seeds.map(seed=>experiment({guild,seed,...params}));const avg=k=>sum(runs.map(r=>r.terminal[k]))/runs.length;return [id,{runs:runs.map(r=>({seed:r.seed,...r.terminal})),meanTrait:avg('meanTrait'),meanDeepVisits:avg('deepVisits'),meanDeepTaken:avg('deepTaken'),meanLineages:avg('lineages')}]}));
}
