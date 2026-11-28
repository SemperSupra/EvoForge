// R97: couple R92 spatial columns and R93 local occupancy with bounded shared stocks.
// Normalized discrete reference. Organisms are assigned to one column; connected
// roots span vertical layers, and only single-part animals migrate laterally.
// Food is an illustrative energy-bearing organic stock (8 energy units/unit).
// Respired oxygen and debris are explicit sinks, not calibrated chemical species.
import {world,advance as flow,totals as worldTotals} from '../strata-spatial-r92/world.mjs';
import * as occ from '../strata-spatial-r92/occupancy.mjs';
import {access,gasSpace} from '../stratified-arena-r91/strata.mjs';
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const FOOD_ENERGY=8;
export function system(input){
 const w=world(input.width,input.depth,input.columns);
 if(!Array.isArray(input.locals)||input.locals.length!==w.columns.length)throw Error('local inventories');
 const locals=input.locals.map((l,i)=>{
  const s=occ.system({layers:w.columns[i],organisms:l.organisms,debris:l.debris,heatSpent:l.heatSpent,respiredOxygen:l.respiredOxygen});
  if(!int(l.consumedOrganic??0,0,1e8))throw Error('consumed organic bound');
  return {organisms:s.organisms,debris:s.debris,heatSpent:s.heatSpent,respiredOxygen:s.respiredOxygen,consumedOrganic:l.consumedOrganic??0};
 });
 const ids=locals.flatMap(l=>l.organisms.map(o=>o.id));if(ids.length>64||new Set(ids).size!==ids.length)throw Error('world organism bound');
 const s={...w,locals};if(Object.values(totals(s)).some(v=>!int(v,0,1e9)))throw Error('coupled inventory budget');return s;
}
export function totals(s){
 const w=worldTotals(s.columns),l=s.locals;
 const bodies=l.flatMap(x=>x.organisms),sum=(xs,k)=>xs.reduce((n,x)=>n+x[k],0);
 return {matrix:w.matrix+sum(l,'debris'),water:w.water,oxygen:w.oxygen+sum(l,'respiredOxygen'),solute:w.solute+sum(bodies,'nutrients'),organic:w.organic+sum(l,'consumedOrganic'),energy:w.heat+sum(l,'heatSpent')+sum(bodies,'energy')+FOOD_ENERGY*w.organic};
}
const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);
function actorAt(s,id){const i=s.locals.findIndex(l=>l.organisms.some(o=>o.id===id));if(i<0)throw Error('unknown actor');return {i,local:s.locals[i],o:s.locals[i].organisms.find(o=>o.id===id)};}
function checked(input,fn){const s=system(input),before=totals(s),receipt=fn(s);const out=system(s),after=totals(out);if(!same(before,after))throw Error('coupled conservation');return {...out,receipt:{...receipt,totals:after}};}
function charge(local,o,n){if(o.energy<n)throw Error('insufficient energy');o.energy-=n;local.heatSpent+=n;}
function findLayer(s,i,id){const l=s.columns[i].find(x=>x.id===id);if(!l)throw Error('unknown layer');return l;}
function admitted(l,o,medium){return access(l,o.traits,medium).allowed&&(medium!=='burrow'||l.poreSize>=o.traits.size);}
export function step(input,options={}){return checked(input,s=>{const w=flow(s,options);s.columns=w.columns;return {action:'environment',transfers:w.receipt.transfers.length};});}
export function act(input,id,action,args={}){
 return checked(input,s=>{
  const {i,local,o}=actorAt(s,id);
  if(action==='migrate'){
   const {target,layer,medium}=args,p=o.parts[0];
   if(o.parts.length!==1||p.medium==='root'||medium==='root'||!int(target,0,s.columns.length-1)||target===i)throw Error('invalid migration');
   const x=i%s.width,z=Math.floor(i/s.width),nx=target%s.width,nz=Math.floor(target/s.width);
   if(Math.abs(x-nx)+Math.abs(z-nz)!==1)throw Error('nonadjacent column');
   const a=findLayer(s,i,p.layer),b=findLayer(s,target,layer);
   if(Math.min(a.top,b.top)<=Math.max(a.bottom,b.bottom))throw Error('no overlapping passage');
   if(!admitted(a,o,p.medium)||!admitted(b,o,medium))throw Error('inaccessible migration');
   const cost=access(b,o.traits,medium).cost+1;charge(local,o,cost);
   local.organisms=local.organisms.filter(v=>v.id!==id);p.layer=layer;p.medium=medium;s.locals[target].organisms.push(o);
   return {action,actor:id,from:i,to:target,layer,cost};
  }
  if(action==='feed'){
   const p=o.parts.find(p=>p.id===args.part);if(!p||p.medium==='root'||!int(args.requested,0,1000))throw Error('invalid feeding');
   const l=findLayer(s,i,p.layer);
   if(!admitted(l,o,p.medium))return {action,actor:id,layer:p.layer,taken:0,energy:0};
   const water=p.medium==='liquid',key=water?'oxygenWater':'oxygenGas',capacity=water?o.traits.waterResp:o.traits.gasResp;
   const n=Math.min(args.requested,l.organic,l[key],Math.floor(capacity/10));
   l.organic-=n;l[key]-=n;local.consumedOrganic+=n;local.respiredOxygen+=n;o.energy+=6*n;local.heatSpent+=2*n;
   return {action,actor:id,layer:p.layer,taken:n,energy:6*n};
  }
  const localState={layers:s.columns[i],...local};let r;
  switch(action){
   case 'move':r=occ.move(localState,id,args.part,args.target,args.medium);break;
   case 'excavate':r=occ.excavate(localState,id,args.part,args.target,args.amount);break;
   case 'extendRoot':r=occ.extendRoot(localState,id,args.parent,args.newId,args.target);break;
   case 'uptake':r=occ.uptake(localState,id,args.part,args.requested);break;
   case 'breathe':r=occ.breathe(localState,id,args.part,args.requested);break;
   default:throw Error('unknown action');
  }
  s.columns[i]=r.layers;s.locals[i]={organisms:r.organisms,debris:r.debris,heatSpent:r.heatSpent,respiredOxygen:r.respiredOxygen,consumedOrganic:local.consumedOrganic};
  return {...r.receipt,column:i};
 });
}
export function observe(input){
 const s=system(input);return s.columns.map((layers,i)=>({column:i,occupancy:occ.occupancy({layers,...s.locals[i]}),food:layers.map(l=>({id:l.id,organic:l.organic})),organisms:s.locals[i].organisms.map(o=>({id:o.id,energy:o.energy,nutrients:o.nutrients,parts:o.parts.map(p=>({...p}))}))}));
}
