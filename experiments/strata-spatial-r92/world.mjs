// R92: variable-elevation columns on a bounded x/z lattice; illustrative units.
// No fluid solver or dynamic phase geometry. All cross-column contacts require
// actual vertical overlap. Closed boundaries, deterministic sequential exchanges.
import {column,inventory,volume,gasSpace,temperature,exchange,conditions,locate} from '../stratified-arena-r91/strata.mjs';
const fields=['matrix','water','gasSpace','oxygen','solute','organic','heat'];
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
export function totals(columns){
 const t=Object.fromEntries(fields.map(k=>[k,0]));
 for(const c of columns){const q=inventory(c);for(const k of fields)t[k]+=q[k];}
 return t;
}
export function world(width,depth,columns){
 if(!int(width,1,16)||!int(depth,1,16)||!Array.isArray(columns)||columns.length!==width*depth)throw Error('world bounds');
 const cells=columns.map(column);
 if(Object.values(totals(cells)).some(x=>!int(x,0,100000000)))throw Error('world inventory budget');
 return {width,depth,columns:cells};
}
export function at(w,x,z,y){
 if(!int(x,0,w.width-1)||!int(z,0,w.depth-1)||!Number.isFinite(y))throw Error('position bounds');
 const layers=w.columns[z*w.width+x],l=locate(layers,y);
 return l?{x,z,layer:l.id,bottom:l.bottom,top:l.top,conditions:conditions(layers,y)}:null;
}
export function contacts(a,b){
 const out=[];for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  const depth=Math.min(a[i].top,b[j].top)-Math.max(a[i].bottom,b[j].bottom);
  if(depth>0)out.push({i,j,depth});
 }
 return out;
}
const proportional=(stock,n,capacity)=>n===capacity?stock:Math.floor(stock*n/capacity);
export function advance(input,{vertical=true,drain=8,conduct=70,oxygenDiffusion=4,lateralWater=6,lateralHeat=50,lateralOxygen=4}={}){
 const w=world(input.width,input.depth,input.columns),before=totals(w.columns),receipts=[];
 if(typeof vertical!=='boolean'||![drain,conduct,oxygenDiffusion,lateralWater,lateralHeat,lateralOxygen].every(x=>int(x,0,10000)))throw Error('exchange settings');
 if(vertical)for(let i=0;i<w.columns.length;i++){const r=exchange(w.columns[i],{drain,conduct,oxygenDiffusion});w.columns[i]=r.layers;for(const v of r.receipts)receipts.push({kind:'vertical',column:i,...v});}
 // Lateral exchange: each edge exactly once, no wrap or teleportation.
 for(let z=0;z<w.depth;z++)for(let x=0;x<w.width;x++){
  const ia=z*w.width+x;
  for(const [dx,dz] of [[1,0],[0,1]]){
   const nx=x+dx,nz=z+dz;if(nx>=w.width||nz>=w.depth)continue;
   const ib=nz*w.width+nx,A=w.columns[ia],B=w.columns[ib];
   for(const c of contacts(A,B)){
    const a=A[c.i],b=B[c.j],perm=Math.min(a.permeability,b.permeability);
    const av=volume(a),bv=volume(b),pa=av-a.matrix,pb=bv-b.matrix;
    const contact=Math.min(c.depth/(a.top-a.bottom),c.depth/(b.top-b.bottom));
    let n=0,h=0,ow=0,og=0;
    if(perm&&pa&&pb){
     const d=a.water/pa-b.water/pb,src=d>=0?a:b,dst=d>=0?b:a;
     n=Math.min(Math.floor(lateralWater*perm*contact/100),src.water,gasSpace(dst),Math.floor(Math.abs(d)/(1/pa+1/pb)));
     if(n){
      const sol=proportional(src.solute,n,src.water),ox=proportional(src.oxygenWater,n,src.water),gas=proportional(dst.oxygenGas,n,gasSpace(dst));
      src.water-=n;dst.water+=n;src.solute-=sol;dst.solute+=sol;src.oxygenWater-=ox;dst.oxygenWater+=ox;dst.oxygenGas-=gas;src.oxygenGas+=gas;
     }
    }
    const dt=temperature(a)-temperature(b),hot=dt>=0?a:b,cold=dt>=0?b:a;
    h=Math.min(Math.floor(lateralHeat*contact),hot.heat,Math.floor(Math.abs(dt)/(1/av+1/bv)));hot.heat-=h;cold.heat+=h;
    for(const [key,space] of [['oxygenWater',l=>l.water],['oxygenGas',gasSpace]]){
     const va=space(a),vb=space(b);if(!perm||!va||!vb)continue;
     const d=a[key]/va-b[key]/vb,src=d>=0?a:b,dst=d>=0?b:a;
     const q=Math.min(Math.floor(lateralOxygen*contact*perm/100),src[key],Math.floor(Math.abs(d)/(1/va+1/vb)));
     src[key]-=q;dst[key]+=q;if(key==='oxygenWater')ow=q;else og=q;
    }
    if(n||h||ow||og)receipts.push({kind:'lateral',a:ia,b:ib,layerA:a.id,layerB:b.id,overlap:c.depth,water:n,heat:h,oxygenWater:ow,oxygenGas:og});
   }
  }
 }
 const out=world(w.width,w.depth,w.columns),after=totals(out.columns);
 if(fields.some(k=>before[k]!==after[k]))throw Error('world conservation');
 return {...out,receipt:{transfers:receipts,totals:after}};
}
