// R88 bounded organ gas exchange, energy-funded repair and death release.
// Normalized physiology, not biological or electrical safety calibration.
import {organ,leak,lift} from '../material-ecology-r83/gas-organ.mjs';
const valid=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
export function system({organ:raw,environmentGas=0,energy=100,heat=0,alive=true}){
 const o=organ(raw);if(![environmentGas,energy,heat].every(x=>valid(x,0,1e9))||typeof alive!=='boolean'||o.gas+environmentGas>1e9||energy+heat>1e9)throw Error('organ system bounds');
 return {organ:o,environmentGas,energy,heat,alive};
}
export function total(s){return {gas:s.organ.gas+s.environmentGas,energy:s.energy+s.heat};}
export function advance(input,{repair=0,refill=0,vent=0,minEnergy=5}={}){
 const s=system(input),before=total(s);if(![repair,refill,vent,minEnergy].every(x=>valid(x,0,10000)))throw Error('organ regulation bounds');
 let leaked=0,vented=0,filled=0,repaired=0;
 if(!s.alive){leaked=s.organ.gas;s.environmentGas+=leaked;s.organ.gas=0;}
 else{
  const r=leak(s.organ);s.organ=r.organ;leaked=r.released;s.environmentGas+=leaked;
  vented=Math.min(vent,s.organ.gas);s.organ.gas-=vented;s.environmentGas+=vented;
  // Repair measured in thousandths; no spontaneous recovery, finite energy and viable host.
  const damage=Math.max(0,Math.floor((1-s.organ.integrity)*1000+1e-8));
  repaired=Math.min(repair,damage,Math.floor(Math.max(0,s.energy-minEnergy)/2));
  if(repaired){s.organ.integrity=Math.min(1,s.organ.integrity+repaired/1000);s.energy-=repaired*2;s.heat+=repaired*2;}
  const gasCapacity=Math.max(0,Math.floor(s.organ.maxVolume*s.organ.ambientPressure/s.organ.temperature)-s.organ.gas);
  if(s.organ.integrity>=.5){
   filled=Math.min(refill,s.environmentGas,gasCapacity,Math.max(0,s.energy-minEnergy));
   s.organ.gas+=filled;s.environmentGas-=filled;s.energy-=filled;s.heat+=filled;
  }
 }
 const after=total(s);if(after.gas!==before.gas||after.energy!==before.energy)throw Error('nonconservative organ step');
 return {...s,receipt:{leaked,vented,filled,repaired,lift:lift(s.organ),total:after}};
}
