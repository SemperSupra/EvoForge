// R84 conservative one-dimensional thermal/solute reference, no physical calibration.
// Sensible heat units: water-unit * degree-equivalent; vapor stores sensible+latent heat.
// Bounded pressure threshold is an illustrative monotonic fixture, not a steam table.
const MAX=1e9,LATENT=540;
const integer=(x,max=MAX)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export function cell({water=0,heat=0,solute=0,vapor=0,vaporHeat=0,lavaHeat=0,lavaMineral=0,pressure=1}={}){
 const c={water,heat,solute,vapor,vaporHeat,lavaHeat,lavaMineral,pressure};
 if(!Object.values(c).every(x=>integer(x))||pressure<1||pressure>20||(!water&&heat))throw Error("invalid cell");
 return c;
}
export const boilingAt=p=>100+12*(p-1);
export const temperature=c=>c.water?c.heat/c.water:null;
export function totals(cells){return cells.reduce((s,c)=>({water:s.water+c.water+c.vapor,energy:s.energy+c.heat+c.vaporHeat+c.lavaHeat,mineral:s.mineral+c.solute+c.lavaMineral}),{water:0,energy:0,mineral:0});}
export function step(input,{quench=300,conduct=50,flow=1,weather=1}={}){
 if(!Array.isArray(input)||!input.length||input.length>64||![quench,conduct,flow,weather].every(x=>integer(x,10000)))throw Error("invalid thermal workset");
 const cells=input.map(c=>cell(c)),before=totals(cells);
 if(!Object.values(before).every(x=>integer(x)))throw Error("field budget");
 const emissions=Array(cells.length).fill(0);
 for(const c of cells){if(!c.water)continue;
   const heat=Math.min(c.lavaHeat,quench);c.lavaHeat-=heat;c.heat+=heat;
   const mineral=heat?Math.min(weather,c.lavaMineral):0;c.lavaMineral-=mineral;c.solute+=mineral;
 }
 // Sequential disjoint edge passes; each conservative exchange reads bounded current state.
 for(let parity=0;parity<2;parity++)for(let i=parity;i+1<cells.length;i+=2){
   const a=cells[i],b=cells[i+1];if(!a.water||!b.water)continue;
   const d=a.heat/a.water-b.heat/b.water,hot=d>=0?a:b,cold=d>=0?b:a;
   const exchange=Math.min(conduct,hot.heat,Math.floor(Math.abs(d)/(1/hot.water+1/cold.water)));
   hot.heat-=exchange;cold.heat+=exchange;
 }
 // Snapshot-based downstream transport: one outgoing edge per cell, retain one water unit.
 const outgoing=cells.map((c,i)=>{const w=i===cells.length-1?0:Math.min(flow,Math.max(0,c.water-1));return {water:w,heat:w?Math.floor(c.heat*w/c.water):0,solute:w?Math.floor(c.solute*w/c.water):0};});
 for(let i=0;i<cells.length;i++){const a=outgoing[i],b=outgoing[i-1]??{water:0,heat:0,solute:0};for(const k of ["water","heat","solute"])cells[i][k]+=b[k]-a[k];}
 for(let i=0;i<cells.length;i++){
   const c=cells[i],boil=boilingAt(c.pressure);
   // Above-threshold energy must pay latent heat; no spontaneous steam without water/heat.
   const evaporate=Math.min(c.water,Math.floor(Math.max(0,c.heat-c.water*boil)/LATENT));
   const cost=evaporate*(boil+LATENT);c.water-=evaporate;c.heat-=cost;c.vapor+=evaporate;c.vaporHeat+=cost;emissions[i]=evaporate;
   // A completely dry cell has residual sensible heat assigned to the vapor phase.
   if(!c.water&&c.heat){c.vaporHeat+=c.heat;c.heat=0;}
   cell(c);
 }
 const after=totals(cells);if(Object.keys(before).some(k=>before[k]!==after[k]))throw Error("nonconservative thermal step");
 return {cells,emissions,totals:after};
}
export function exposure(c,{directMoltenContact=false,energy=1000,heatTolerance=42}={}){
 cell(c);if(!integer(energy)||!integer(heatTolerance,1000))throw Error("invalid exposure");
 // Fixture threshold for exposed molten reservoir; crust is not direct molten contact.
 if(directMoltenContact&&c.lavaHeat>2000)return {debit:energy,alive:false,reason:"molten-contact"};
 const debit=Math.min(energy,Math.ceil(Math.max(0,(temperature(c)??0)-heatTolerance)));
 return {debit,alive:energy>debit,reason:debit?"thermal-dose":"none"};
}
