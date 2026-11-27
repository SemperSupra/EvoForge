// Bounded resource model. Local shade, root competition, seasonal soil recovery.
// Separate from the R52 behavior reference; no hard species quota.
import {run} from '../flora-mutualism-r52/mutualism.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function policy(w){
 const soil=(p)=>clamp(w.water+.12*Math.sin(p.x*.6)*Math.cos(p.z*.5),.05,.95);
 function load(p){let root=0,shade=0;for(const q of w.plants){if(q.id===p.id)continue;const d=dist(p,q);const mature=Math.min(1,q.age/36);const tree=q.g.species!=='herb';root+=(tree?.55:.18)*mature*Math.max(0,1-d/(tree?2.4:1.2));if(tree)shade+=mature*Math.max(0,1-d/2.2);}return {root,shade};}
 return {energyDelta(p){const {root,shade}=load(p),tree=p.g.species!=='herb';const water=soil(p)/(1+root);const light=1/(1+shade*(tree?.35:1.3));return .065*water*light-.021-(1-p.g.droughtTolerance)*.008;},admit(s){const {root,shade}=load(s);return soil(s)/(1+root)>.25&&(s.g.species!=='herb'||shade<.9)&&root<.8;}};
}
export function trial(seed,animals=true,ticks=720,competition=true){const r=run(seed,animals,ticks,competition?policy:null);const counts=r.frames.map(f=>{const c={flower:0,fruit:0,herb:0};for(const p of f.plants)c[p.species==='herb'?'herb':p.species==='flower-tree'?'flower':'fruit']++;return {tick:f.tick,total:f.plants.length,...c};});const late=counts.filter(x=>x.tick>=ticks/2);return {...r,competition,counts,summary:{peak:Math.max(...counts.map(x=>x.total)),lateMean:late.reduce((n,x)=>n+x.total,0)/late.length,saturationFraction:late.filter(x=>x.total===128).length/late.length,final:counts.at(-1),plantDeaths:r.metrics.plantDeaths,gutGerminations:r.metrics.gutGerminations,pollinations:r.metrics.pollinations}};}
