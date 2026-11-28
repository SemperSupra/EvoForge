// R85 illustrative normalized gas-organ physiology, separate injury and pressure channels.
// Not a lightning/fish clinical or physical-calibration model. Gas quantity is discrete.
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const inRange=(x,min,max)=>finite(x)&&x>=min&&x<=max;
export function organ({gas=100,integrity=1,maxVolume=100,bodyVolume=100,bodyMass=150,temperature=1,ambientPressure=1,gasMassPerUnit=.01}={}){
 if(!Number.isSafeInteger(gas)||!inRange(gas,0,1e6)||!inRange(integrity,0,1)||!inRange(maxVolume,1,1e5)||!inRange(bodyVolume,0,1e5)||!inRange(bodyMass,0,1e6)||!inRange(temperature,.1,10)||!inRange(ambientPressure,.1,100)||!inRange(gasMassPerUnit,0,1))throw Error("invalid organ");
 return {gas,integrity,maxVolume,bodyVolume,bodyMass,temperature,ambientPressure,gasMassPerUnit};
}
export function volume(o){return Math.min(o.maxVolume,o.gas*o.temperature/o.ambientPressure);}
export function lift(o,{density=1,gravity=1}={}){
 organ(o);if(!inRange(density,0,100)||!inRange(gravity,0,100))throw Error("invalid medium");
 return gravity*(density*(o.bodyVolume+volume(o))-o.bodyMass-o.gas*o.gasMassPerUnit);
}
export function injury(input,{electrical=0,thermal=0,mechanical=0,resistance=0}={}){
 const o=organ(input);if(![electrical,thermal,mechanical,resistance].every(x=>inRange(x,0,1)))throw Error("invalid injury");
 const pressureRatio=o.gas*o.temperature/(o.maxVolume*o.ambientPressure);
 const pressureDamage=Math.min(1,Math.max(0,pressureRatio-1.5)*.2);
 const shock=electrical*(1-resistance);
 const injuryDose=Math.min(1,shock*.65+thermal*.5+mechanical*.8+pressureDamage);
 o.integrity=Math.max(0,o.integrity-injuryDose);
 return {organ:o,electricalDose:shock,thermalDose:thermal,mechanicalDose:mechanical,pressureDamage,injuryDose,combustion:false};
}
export function leak(input){
 const o=organ(input);const released=Math.min(o.gas,Math.ceil(o.gas*(1-o.integrity)*.12));
 o.gas-=released;return {organ:o,released};
}
