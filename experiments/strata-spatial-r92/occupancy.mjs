// R93: local vertical occupancy, root extension and paid excavation reference.
// This is a one-column, discrete part-occupancy model, not full kinematics or
// biochemistry. Debris and respiration sinks remain explicit inventories.
import {column,inventory,access,gasSpace,rootUptake,lightProfile} from '../stratified-arena-r91/strata.mjs';
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(v);
const mediums=['gas','liquid','root','burrow'];
const index=(s,id)=>{const i=s.layers.findIndex(l=>l.id===id);if(i<0)throw Error('unknown layer');return i};
function body(raw,layers){
 const {id:bodyId,energy=0,nutrients=0,traits,parts}=raw;
 if(!id(bodyId)||!int(energy,0,1e8)||!int(nutrients,0,1e8)||!traits||!['size','dig','gasResp','waterResp','root'].every(k=>int(traits[k],k==='size'?1:0,100))||!Array.isArray(parts)||parts.length<1||parts.length>16)throw Error('body bounds');
 const p=parts.map(({id:partId,layer,medium,parent=null})=>{
  if(!id(partId)||!layers.some(l=>l.id===layer)||!mediums.includes(medium)||parent!==null&&!id(parent))throw Error('part bounds');
  return {id:partId,layer,medium,parent};
 });
 if(new Set(p.map(x=>x.id)).size!==p.length||p.filter(x=>x.parent===null).length!==1||p[0].parent!==null)throw Error('part topology');
 for(let i=1;i<p.length;i++){const q=p.slice(0,i).find(x=>x.id===p[i].parent);if(!q||Math.abs(layers.findIndex(l=>l.id===q.layer)-layers.findIndex(l=>l.id===p[i].layer))>1)throw Error('part connection');}
 return {id:bodyId,energy,nutrients,traits:{...traits},parts:p};
}
export function system({layers,organisms=[],debris=0,heatSpent=0,respiredOxygen=0}){
 const l=column(layers);if(!Array.isArray(organisms)||organisms.length>64||![debris,heatSpent,respiredOxygen].every(x=>int(x,0,1e8)))throw Error('system bounds');
 const o=organisms.map(x=>body(x,l));if(new Set(o.map(x=>x.id)).size!==o.length)throw Error('duplicate organism');
 return {layers:l,organisms:o,debris,heatSpent,respiredOxygen};
}
export function totals(s){
 const e=inventory(s.layers);
 return {matrix:e.matrix+s.debris,water:e.water,oxygen:e.oxygen+s.respiredOxygen,solute:e.solute+s.organisms.reduce((n,o)=>n+o.nutrients,0),organic:e.organic,energy:e.heat+s.heatSpent+s.organisms.reduce((n,o)=>n+o.energy,0)};
}
const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);
function transaction(input,actor,apply){
 const s=system(input),before=totals(s),o=s.organisms.find(x=>x.id===actor);if(!o)throw Error('unknown actor');
 const receipt=apply(s,o);const out=system(s);if(!same(before,totals(out)))throw Error('occupancy conservation');return {...out,receipt};
}
function charge(s,o,n){if(o.energy<n)throw Error('insufficient energy');o.energy-=n;s.heatSpent+=n;}
function allowed(l,o,medium){const a=access(l,o.traits,medium);
 // Excavation and occupancy are separate. R91 potential-to-burrow is not a void.
 if(medium==='burrow'&&l.poreSize<o.traits.size)return false;
 return a.allowed;
}
export function move(input,actor,partId,target,medium){
 return transaction(input,actor,(s,o)=>{
  const p=o.parts.find(x=>x.id===partId);if(!p)throw Error('unknown part');
  if(p.medium==='root'||o.parts.some(x=>x.parent===p.id)||medium==='root')throw Error('use connected root extension; body move is single-part reference');
  const i=index(s,p.layer),j=index(s,target);if(Math.abs(i-j)>1)throw Error('nonadjacent move');
  const l=s.layers[j];if(!allowed(l,o,medium))throw Error('inaccessible destination');
  if(p.parent!==null&&Math.abs(index(s,o.parts.find(x=>x.id===p.parent).layer)-j)>1)throw Error('part disconnected');
  const cost=access(l,o.traits,medium).cost;charge(s,o,cost);p.layer=target;p.medium=medium;return {action:'move',actor,part:partId,from:s.layers[i].id,to:target,cost};
 });
}
export function excavate(input,actor,partId,target,amount){
 if(!int(amount,1,1000))throw Error('excavation amount');
 return transaction(input,actor,(s,o)=>{
  const p=o.parts.find(x=>x.id===partId);if(!p||p.medium==='root')throw Error('invalid excavator');
  const i=index(s,p.layer),j=index(s,target),l=s.layers[j];
  if(Math.abs(i-j)>1||!l.matrix||!l.permeability||o.traits.dig<l.hardness)throw Error('unexcavatable destination');
  const removed=Math.min(amount,l.matrix),cost=removed*(1+Math.ceil(l.hardness/10));charge(s,o,cost);
  l.matrix-=removed;s.debris+=removed;l.poreSize=Math.min(100,l.poreSize+removed);
  return {action:'excavate',actor,layer:target,removed,cost,aperture:l.poreSize};
 });
}
export function extendRoot(input,actor,parentId,newId,target){
 return transaction(input,actor,(s,o)=>{
  const p=o.parts.find(x=>x.id===parentId);if(!p||!id(newId)||o.parts.some(x=>x.id===newId)||o.parts.length>=16)throw Error('invalid root parent/id');
  const i=index(s,p.layer),j=index(s,target),l=s.layers[j];if(Math.abs(i-j)>1||!allowed(l,o,'root'))throw Error('root access');
  const cost=access(l,o.traits,'root').cost;charge(s,o,cost);o.parts.push({id:newId,layer:target,medium:'root',parent:parentId});return {action:'root-extension',actor,part:newId,layer:target,cost};
 });
}
export function uptake(input,actor,partId,requested){
 return transaction(input,actor,(s,o)=>{
  const p=o.parts.find(x=>x.id===partId);if(!p||p.medium!=='root')throw Error('root required');
  const r=rootUptake(s.layers,p.layer,o.traits,requested);charge(s,o,r.cost);s.layers=r.layers;o.nutrients+=r.taken;return {action:'uptake',actor,part:partId,layer:p.layer,taken:r.taken,cost:r.cost};
 });
}
export function breathe(input,actor,partId,requested){
 if(!int(requested,0,10000))throw Error('respiration request');
 return transaction(input,actor,(s,o)=>{
  const p=o.parts.find(x=>x.id===partId);if(!p||p.medium==='root')throw Error('respiratory part required');const l=s.layers[index(s,p.layer)];
  const water=p.medium==='liquid',key=water?'oxygenWater':'oxygenGas',capacity=water?o.traits.waterResp:o.traits.gasResp;
  const used=allowed(l,o,p.medium)?Math.min(requested,l[key],Math.floor(capacity/10)):0;
  l[key]-=used;s.respiredOxygen+=used;return {action:'respire',actor,part:partId,layer:p.layer,used,satisfied:used===requested};
 });
}
export function occupancy(input){
 const s=system(input),light=lightProfile(s.layers);
 return s.layers.map(l=>{const parts=s.organisms.flatMap(o=>o.parts.filter(p=>p.layer===l.id).map(p=>({organism:o.id,...p})));return {id:l.id,parts,organisms:new Set(parts.map(p=>p.organism)).size,light:light[l.id].mean,gasSpace:gasSpace(l)};});
}
