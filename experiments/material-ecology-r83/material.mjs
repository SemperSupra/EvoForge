// R83 CPU reference only. Integer accounting units, illustrative stoichiometries.
// Carbon, nitrogen, phosphorus, water, inert mineral, and chemical/thermal energy
// are separately conserved. No physical calibration or live Arena coupling.
export const dimensions=Object.freeze(["C","N","P","water","inert","energy"]);
const LIMIT=1_000_000_000;
const v=(...a)=>Object.freeze(a);
const assertVector=a=>{if(!Array.isArray(a)||a.length!==6||a.some(x=>!Number.isSafeInteger(x)||x<0||x>LIMIT))throw Error("invalid resource vector");};
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const zero=()=>[0,0,0,0,0,0];
export const materials=Object.freeze({
 soft:Object.freeze({input:v(10,2,1,4,0,20),body:v(4,1,1,2,0,8),soil:v(2,1,0,2,0,0),air:v(4,0,0,0,0,0),heat:v(0,0,0,0,0,12),ignition:60,flammability:30}),
 wood:Object.freeze({input:v(16,1,1,2,0,32),body:v(5,1,0,1,0,10),soil:v(2,0,1,1,0,0),air:v(9,0,0,0,0,0),heat:v(0,0,0,0,0,22),ignition:75,flammability:85}),
 shell:Object.freeze({input:v(4,1,4,0,8,8),body:v(1,1,0,0,0,2),soil:v(1,0,4,0,8,0),air:v(2,0,0,0,0,0),heat:v(0,0,0,0,0,6),ignition:100,flammability:5}),
 rock:Object.freeze({input:v(0,0,2,0,10,0),body:v(0,0,0,0,0,0),soil:v(0,0,2,0,10,0),air:v(0,0,0,0,0,0),heat:v(0,0,0,0,0,0),ignition:100,flammability:0})
});
export class Ledger {
 #accounts;
 constructor(initial){
  const entries=Object.entries(initial);if(entries.length>64)throw Error("account cap");
  this.#accounts=new Map(entries.map(([k,a])=>{assertVector(a);return [k,a.slice()]}));
  assertVector(this.total());
 }
 get(id){const a=this.#accounts.get(id);if(!a)throw Error("unknown account "+id);return a.slice();}
 total(){return [...this.#accounts.values()].reduce(add,zero());}
 snapshot(){return Object.fromEntries([...this.#accounts].map(([k,a])=>[k,a.slice()]));}
 apply(moves){
  if(!Array.isArray(moves)||moves.length>32)throw Error("transaction cap");
  const next=new Map([...this.#accounts].map(([k,a])=>[k,a.slice()]));
  for(const {from,to,amount} of moves){
   assertVector(amount);if(from===to||!next.has(from)||!next.has(to))throw Error("invalid transfer");
   const a=next.get(from),b=next.get(to);
   const debit=a.map((x,i)=>x-amount[i]),credit=add(b,amount);
   assertVector(debit);assertVector(credit);next.set(from,debit);next.set(to,credit);
  }
  this.#accounts=next; // no partially applied transaction on error
 }
}
const capacity=(amount,unit)=>Math.min(...unit.flatMap((x,i)=>x?[Math.floor(amount[i]/x)]:[]));
export function processingCapacity(traits,kind){
 const keys=["soft","wood","shell","rock"];if(!keys.includes(kind)||!traits||keys.some(k=>!Number.isInteger(traits[k])||traits[k]<0||traits[k]>100)||keys.reduce((s,k)=>s+traits[k],0)>100)throw Error("invalid trait allocation");
 return traits[kind];
}
export function process(ledger,{kind,traits,requested=1,moisture=100,oxygen=100}){
 const m=materials[kind];if(!m||!Number.isInteger(requested)||requested<0||requested>1000||![moisture,oxygen].every(x=>Number.isInteger(x)&&x>=0&&x<=100))throw Error("invalid process");
 const ability=processingCapacity(traits,kind),cost=2;
 const units=Math.max(0,Math.min(requested,capacity(ledger.get(kind),m.input),Math.floor(ability*moisture*oxygen/10000),Math.floor(ledger.get("consumer")[5]/cost)));
 if(!units)return {units:0,netChemicalEnergy:0};
 const moves=[{from:"consumer",to:"heat",amount:[0,0,0,0,0,cost*units]}];
 for(const [key,to] of [["body","consumer"],["soil","soil"],["air","air"],["heat","heat"]])moves.push({from:kind,to,amount:m[key].map(x=>x*units)});
 ledger.apply(moves);
 return {units,netChemicalEnergy:(m.body[5]-cost)*units};
}
export function burn(ledger,{kind,temperature,moisture,oxygen,requested=1}){
 const m=materials[kind];if(!m||![temperature,moisture,oxygen,requested].every(Number.isInteger)||temperature<0||moisture<0||moisture>100||oxygen<0||oxygen>100||requested<0||requested>1000)throw Error("invalid combustion");
 if(!m.flammability||temperature<m.ignition||moisture>35||oxygen<20)return 0;
 const units=Math.min(requested,capacity(ledger.get(kind),m.input),Math.floor(m.flammability*(100-moisture)*oxygen/10000));
 if(!units)return 0;
 const [c,n,p,w,inert,e]=m.input,char=Math.floor(c/4);
 ledger.apply([{from:kind,to:"char",amount:[char*units,0,0,0,0,0]},{from:kind,to:"air",amount:[(c-char)*units,0,0,w*units,0,0]},{from:kind,to:"soil",amount:[0,n*units,p*units,0,inert*units,0]},{from:kind,to:"heat",amount:[0,0,0,0,0,e*units]}]);
 return units;
}
