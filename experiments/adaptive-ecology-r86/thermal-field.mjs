// R87 bounded 2D closed reference, integer water/heat/solute ledger.
// R84 phase threshold and latent-heat scale are illustrative, not a steam table.
import {cell,step,totals,boilingAt,temperature} from '../material-ecology-r83/thermal.mjs';
const int=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
export function field(width,height,cells){
 if(!int(width,1,16)||!int(height,1,16)||!Array.isArray(cells)||cells.length!==width*height)throw Error("field bounds");
 const c=cells.map(v=>cell(v)),total=totals(c);
 if(Object.values(total).some(v=>!Number.isSafeInteger(v)||v<0||v>1e9))throw Error("field resource bound");
 return {width,height,cells:c};
}
const eq=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);
export function advance(input,{quench=300,conduct=60,waterFlow=1,vaporFlow=1,weather=1,condense=2,wind='east'}={}){
 const {width:w,height:h,cells:c}=field(input.width,input.height,input.cells);
 if(![quench,conduct,waterFlow,vaporFlow,weather,condense].every(x=>int(x,0,10000))||!['east','west','north','south','none'].includes(wind))throw Error('invalid field parameters');
 const before=totals(c);let boiled=0,condensed=0;
 // Local finite-source quench/weathering followed by paired heat sweeps.
 for(let i=0;i<c.length;i++){const s=step([c[i]],{quench,conduct:0,flow:0,weather});c[i]=s.cells[0];boiled+=s.emissions[0];}
 for(const vertical of [false,true])for(let parity=0;parity<2;parity++)for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if((vertical?y:x)%2!==parity|| (vertical?y+1>=h:x+1>=w))continue;
  const a=c[y*w+x],b=c[(y+(vertical?1:0))*w+x+(vertical?0:1)];if(!a.water||!b.water)continue;
  const d=temperature(a)-temperature(b),hot=d>=0?a:b,cold=d>=0?b:a;
  const amount=Math.min(conduct,hot.heat,Math.floor(Math.abs(d)/(1/hot.water+1/cold.water)));
  hot.heat-=amount;cold.heat+=amount;
 }
 // Snapshot outflow; no row wrap, no vapor/solute teleportation or loss at boundary.
 const direction={east:[1,0],west:[-1,0],north:[0,-1],south:[0,1],none:[0,0]}[wind];
 const flux=c.map((a,i)=>{const x=i%w,y=Math.floor(i/w),nx=x+direction[0],ny=y+direction[1];
  if(wind==='none'||nx<0||nx>=w||ny<0||ny>=h)return null;
  const water=Math.min(waterFlow,Math.max(0,a.water-1)),vapor=Math.min(vaporFlow,a.vapor);
  return {to:ny*w+nx,water,heat:water?Math.floor(a.heat*water/a.water):0,solute:water?Math.floor(a.solute*water/a.water):0,vapor,vaporHeat:vapor?Math.floor(a.vaporHeat*vapor/a.vapor):0};
 });
 for(let i=0;i<c.length;i++){const f=flux[i];if(!f)continue;for(const k of ['water','heat','solute','vapor','vaporHeat']){c[i][k]-=f[k];c[f.to][k]+=f[k];}}
 for(let i=0;i<c.length;i++){
  const s=step([c[i]],{quench:0,conduct:0,flow:0,weather:0});c[i]=s.cells[0];boiled+=s.emissions[0];
  const a=c[i];if(!a.water||!a.vapor||!condense)continue;
  const threshold=boilingAt(a.pressure),deficit=Math.max(0,a.water*threshold-a.heat);
  // Condensation transfers all carried vapor energy to cooler liquid; no hidden sink.
  const e=Math.ceil(a.vaporHeat/a.vapor),extra=Math.max(0,e-threshold);
  const count=Math.min(a.vapor,condense,extra?Math.floor(deficit/extra):a.vapor);
  if(!count)continue;
  const heat=count===a.vapor?a.vaporHeat:Math.floor(a.vaporHeat*count/a.vapor);
  a.water+=count;a.vapor-=count;a.heat+=heat;a.vaporHeat-=heat;condensed+=count;
 }
 const result=field(w,h,c),after=totals(result.cells);if(!eq(before,after))throw Error('nonconservative field step');
 return {...result,receipt:{boiled,condensed,totals:after}};
}
