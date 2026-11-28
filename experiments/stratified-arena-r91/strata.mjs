// R91 stratified, multiphase column reference. Normalized integer model units,
// not calibrated soil physics or fluid dynamics. Geometry is bottom-inclusive/top-exclusive.
// Matrix volume is immobile; water and gas occupy its pores or open space.
// Gas volume is free-space occupancy, NOT gas mass. Gas species inventory is separate.
const LIMIT=1e8;
const integer=(x,lo=0,hi=LIMIT)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const bounds=(v,min,max)=>integer(v,min,max);
const fields=['water','oxygenWater','oxygenGas','solute','organic','heat'];
const requireId=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x);
export function layer(raw){
 const {id,bottom,top,matrix=0,water=0,oxygenWater=0,oxygenGas=0,solute=0,organic=0,heat=0,hardness=0,permeability=100,poreSize=100,opacity=0}=raw;
 if(!requireId(id)||!integer(bottom,-1000,1000)||!integer(top,bottom+1,1000))throw Error('layer geometry');
 const capacity=(top-bottom)*100,gas=capacity-matrix-water;
 if(!bounds(matrix,0,capacity)||!bounds(water,0,capacity-matrix)||!bounds(hardness,0,100)||!bounds(permeability,0,100)||!bounds(poreSize,0,100)||!bounds(opacity,0,100)||![oxygenWater,oxygenGas,solute,organic,heat].every(x=>integer(x))||(!water&&(oxygenWater||solute))||(!gas&&oxygenGas))throw Error('layer inventory');
 return {id,bottom,top,matrix,water,oxygenWater,oxygenGas,solute,organic,heat,hardness,permeability,poreSize,opacity};
}
export const volume=l=>(l.top-l.bottom)*100;
export const gasSpace=l=>volume(l)-l.matrix-l.water;
export const temperature=l=>l.heat/volume(l);
export function column(input){
 if(!Array.isArray(input)||input.length<1||input.length>32)throw Error('layer count');
 const layers=input.map(layer).sort((a,b)=>a.bottom-b.bottom);
 if(new Set(layers.map(l=>l.id)).size!==layers.length)throw Error('duplicate layer id');
 for(let i=1;i<layers.length;i++)if(layers[i].bottom!==layers[i-1].top)throw Error('layer overlap or gap');
 if(Object.values(inventory(layers)).some(x=>!integer(x)))throw Error('column inventory bound');
 return layers;
}
export function inventory(layers){
 const result={matrix:0,water:0,gasSpace:0,oxygen:0,solute:0,organic:0,heat:0};
 for(const l of layers){result.matrix+=l.matrix;result.water+=l.water;result.gasSpace+=gasSpace(l);result.oxygen+=l.oxygenWater+l.oxygenGas;result.solute+=l.solute;result.organic+=l.organic;result.heat+=l.heat;}
 return result;
}
export function locate(layers,y){
 if(typeof y!=='number'||!Number.isFinite(y))throw Error('position');
 return layers.find(l=>y>=l.bottom&&y<l.top)??null;
}
export function lightProfile(input,incident=100){
 const layers=column(input);if(!bounds(incident,0,100))throw Error('incident light');
 let light=incident;const result={};
 for(let i=layers.length-1;i>=0;i--){const l=layers[i],enter=light;light=Math.floor(light*(100-l.opacity)/100);result[l.id]={enter,exit:light,mean:(enter+light)/2};}
 return result;
}
// Drains downward into available pore space, displacing equal gas space upward.
// Advects dissolved solute/O2 and displaced gas O2. Conservative thermal exchange
// uses a fixed effective heat capacity per layer volume (first-order approximation).
export function exchange(input,{drain=20,conduct=100,oxygenDiffusion=10}={}){
 if(![drain,conduct,oxygenDiffusion].every(x=>integer(x,0,10000)))throw Error('exchange rates');
 const l=column(input),before=inventory(l),receipts=[];
 for(let i=l.length-1;i>0;i--){
  const a=l[i],b=l[i-1],perm=Math.min(a.permeability,b.permeability);
  const moved=Math.min(Math.floor(drain*perm/100),a.water,gasSpace(b));
  if(moved){
   const solute=Math.floor(a.solute*moved/a.water),oxygenWater=Math.floor(a.oxygenWater*moved/a.water),oxygenGas=Math.floor(b.oxygenGas*moved/gasSpace(b));
   a.water-=moved;b.water+=moved;a.solute-=solute;b.solute+=solute;a.oxygenWater-=oxygenWater;b.oxygenWater+=oxygenWater;b.oxygenGas-=oxygenGas;a.oxygenGas+=oxygenGas;
   receipts.push({from:a.id,to:b.id,water:moved,solute,oxygenWater,displacedGasOxygen:oxygenGas});
  }
  const diff=temperature(a)-temperature(b),hot=diff>=0?a:b,cold=diff>=0?b:a;
  const h=Math.min(conduct,hot.heat,Math.floor(Math.abs(diff)/(1/volume(hot)+1/volume(cold))));
  hot.heat-=h;cold.heat+=h;
  // Oxygen concentration equilibration in contacting phases, no crossing sealed matrix.
  for(const [key,space] of [['oxygenWater',x=>x.water],['oxygenGas',gasSpace]]){
   const av=space(a),bv=space(b);if(!av||!bv||!perm)continue;
   const d=a[key]/av-b[key]/bv,source=d>=0?a:b,target=d>=0?b:a;
   const n=Math.min(Math.floor(oxygenDiffusion*perm/100),source[key],Math.floor(Math.abs(d)/(1/av+1/bv)));
   source[key]-=n;target[key]+=n;
  }
 }
 const layers=column(l),after=inventory(layers);
 if(Object.keys(before).some(k=>before[k]!==after[k]))throw Error('column conservation');
 return {layers,receipts,inventory:after};
}
export function conditions(input,y){
 const layers=column(input),l=locate(layers,y);if(!l)return null;
 const v=volume(l),gas=gasSpace(l);
 return {id:l.id,solidFraction:l.matrix/v,waterFraction:l.water/v,gasFraction:gas/v,temperature:temperature(l),light:lightProfile(layers)[l.id].mean,oxygenGas:gas?l.oxygenGas/gas:null,oxygenWater:l.water?l.oxygenWater/l.water:null,nutrient:l.water?l.solute/l.water:null,organic:l.organic,poreSize:l.poreSize,hardness:l.hardness};
}
export function access(l,traits,medium){
 l=layer(l);const {size=10,dig=0,gasResp=0,waterResp=0,root=0}=traits;
 if(![size,dig,gasResp,waterResp,root].every(x=>bounds(x,0,100))||size===0||!['gas','liquid','root','burrow'].includes(medium))throw Error('organism access');
 const porous=l.matrix>0,aperture=!porous||l.poreSize>=size;
 const gas=gasSpace(l),oxygen=medium==='liquid'?(l.water?l.oxygenWater/l.water:0):(gas?l.oxygenGas/gas:0);
 if(medium==='root')return {allowed:l.matrix>0&&l.water>0&&l.permeability>0&&root>=l.hardness,cost:1+Math.ceil(l.hardness/10),oxygen:null};
 if(medium==='burrow')return {allowed:l.matrix>0&&l.permeability>0&&dig>=l.hardness&&gas>0&&gasResp>0&&oxygen>0,cost:2+Math.ceil(l.hardness/10),oxygen};
 if(medium==='gas')return {allowed:aperture&&gas>=size&&gasResp>0&&oxygen>0,cost:1,oxygen};
 return {allowed:aperture&&l.water>=size&&waterResp>0&&oxygen>0,cost:1,oxygen};
}
// Root uptake is a transfer, not free energy. The caller owns the receiving
// plant ledger and must account for organic assimilation/respiration separately.
export function rootUptake(input,id,traits,requested){
 if(!integer(requested,0,10000))throw Error('uptake bounds');
 const layers=column(input),l=layers.find(x=>x.id===id);if(!l)throw Error('unknown layer');
 const before=inventory(layers),a=access(l,traits,'root');
 const taken=a.allowed?Math.min(requested,l.solute,Math.floor(traits.root/10)):0;
 l.solute-=taken;
 const after=inventory(column(layers));
 if(after.solute+taken!==before.solute||Object.keys(before).some(k=>k!=='solute'&&before[k]!==after[k]))throw Error('uptake conservation');
 return {layers,taken,cost:taken*a.cost};
}
