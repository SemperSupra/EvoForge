import {run} from '../flora-mutualism-r52/mutualism.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const fields=new WeakMap();
const cell=p=>clamp(Math.floor((p.x+20)/2),0,19)+20*clamp(Math.floor((p.z+20)/2),0,19);
export function budgetPolicy(w){
 let field=fields.get(w);if(!field){field=new Float64Array(400).fill(.78);fields.set(w,field);}
 for(let i=0;i<field.length;i++)field[i]=Math.min(1,field[i]+.003);
 function load(p){let root=0,shade=0;for(const q of w.plants){if(q.id===p.id)continue;const d=dist(p,q),m=Math.min(1,q.age/36),tree=q.g.species!=='herb';root+=(tree?.55:.18)*m*Math.max(0,1-d/(tree?2.4:1.2));if(tree)shade+=m*Math.max(0,1-d/2.2);}return {root,shade};}
 return {
 energyDelta(p){const i=cell(p),{root,shade}=load(p),tree=p.g.species!=='herb',water=clamp(w.water+.12*Math.sin(p.x*.6)*Math.cos(p.z*.5),.05,.95)/(1+root),light=1/(1+shade*(tree?.28:1.2));const uptake=Math.min(field[i],(tree?.008:.004)*water);field[i]-=uptake;return .065*water*light*Math.min(1,uptake/.003)-.012-(1-p.g.droughtTolerance)*.006;},
 reproduce(p){const tree=p.g.species!=='herb',cost=tree?.13:.28;if(p.energy<cost+.24||(!tree&&p.age<28))return false;if(p.g.species==='fruit-tree'&&p.fruit>=4)return false;p.energy-=cost;return true;},
 establish(p){p.energy=.32;const i=cell(p);field[i]=Math.max(0,field[i]-.025);},
 admit(s){const {root,shade}=load(s);return field[cell(s)]>.08&&w.water/(1+root)>.24&&(s.g.species!=='herb'||shade<.9)&&root<1;},
 defer(s){return (s.attempts??0)<6;},
 lifespan(p){return p.g.species==='herb'?70+Math.round(p.g.droughtTolerance*50):360+Math.round(p.g.droughtTolerance*140);},
 recycle(p){const i=cell(p);field[i]=Math.min(1,field[i]+.035);}
 };
}
export function trial(seed,budget=true,ticks=960){const r=run(seed,true,ticks,budget?budgetPolicy:null);const counts=r.frames.map(f=>({tick:f.tick,total:f.plants.length,herb:f.plants.filter(p=>p.species==='herb').length,flower:f.plants.filter(p=>p.species==='flower-tree').length,fruit:f.plants.filter(p=>p.species==='fruit-tree').length}));const late=counts.filter(f=>f.tick>=ticks/2);return {seed,budget,counts,metrics:r.metrics,summary:{lateMean:late.reduce((n,f)=>n+f.total,0)/late.length,saturation:late.filter(f=>f.total===128).length/late.length,final:counts.at(-1),pollinations:r.metrics.pollinations,gutGerminations:r.metrics.gutGerminations,plantDeaths:r.metrics.plantDeaths}};}
