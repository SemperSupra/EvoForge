import {genome,createWorld,plant,animal,visit,move,step} from '../alife-flora-r51/flora.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function run(seed,withAnimals=true,ticks=240){
 if(!Number.isSafeInteger(ticks)||ticks<1||ticks>1000)throw Error('tick budget');
 const w=createWorld(seed),metrics={pollinations:0,fruitEaten:0,gutSeeds:0,gutGerminations:0,windGerminations:0,plantDeaths:0},frames=[],events=[];
 const types=['flower-tree','fruit-tree','herb'];
 for(let i=0;i<3;i++)for(let j=0;j<4;j++){const angle=j*Math.PI/2+i*.38,r=3+i*2.5;plant(w,genome(types[i],(seed+7919*i+3571*j)>>>0),Math.cos(angle)*r,Math.sin(angle)*r,24);}
 if(withAnimals)for(let i=0;i<6;i++){const a=animal(w,Math.cos(i*Math.PI/3)*4,Math.sin(i*Math.PI/3)*4);a.role=i<3?'pollinator':'frugivore';a.target=null;a.rest=0;a.last=null;a.energy=1;}
 const founderIds=new Set(w.plants.map(p=>p.id));const capture=()=>frames.push({tick:w.tick,plants:w.plants.map(p=>({id:p.id,x:p.x,z:p.z,age:p.age,energy:p.energy,fruit:p.fruit,species:p.g.species,pollinated:p.pollinated})),animals:w.animals.map(a=>({id:a.id,x:a.x,z:a.z,role:a.role,energy:a.energy,pollen:a.pollen?.id??null,gut:a.gut.length}))});
 capture();
 for(let t=0;t<ticks;t++){
  w.water=.58+.17*Math.sin(t*.047);w.receipts=[];
  for(const a of w.animals){
   a.energy=Math.max(0,a.energy-.013);a.rest=Math.max(0,a.rest-1);
   // Gut transit and continued movement create dispersal rather than a direct scripted deposit.
   const eligible=w.plants.filter(p=>p.g.species===(a.role==='pollinator'?'flower-tree':'fruit-tree')&&p.age>=p.g.bloomAge&&p.energy>.2);
   const targets=eligible.filter(p=>p.id!==a.last);
   if(!targets.length)continue;
   let p=targets.find(p=>p.id===a.target);
   if(!p){p=targets.slice().sort((p,q)=>score(q)-score(p)||p.id-q.id)[0];a.target=p.id;}
   function score(p){return (a.role==='frugivore'?p.fruit*.7:0)+(a.pollen&&a.pollen.id!==p.id&&!p.pollinated?1.1:0)+p.g.nectar*.2-dist(a,p)*.09;}
   const d=dist(a,p),speed=a.role==='pollinator'?.65:.42;
   if(d>.75){const n=Math.min(d,speed);move(a,a.x+(p.x-a.x)*n/d,a.z+(p.z-a.z)*n/d);}
   if(dist(a,p)<=.75&&a.rest===0){visit(w,a,p);a.energy=Math.min(2,a.energy);a.last=p.id;a.target=null;a.rest=3;}
  }
  step(w);
  // Finite plant lifetime and resource stress free ecological capacity.
  const old=w.plants.length;w.plants=w.plants.filter(p=>p.energy>.03&&p.age<190+Math.round(p.g.droughtTolerance*80));metrics.plantDeaths+=old-w.plants.length;
  for(const e of w.receipts){if(e.type==='cross-pollination')metrics.pollinations++;if(e.type==='fruit-eaten')metrics.fruitEaten++;if(e.type==='seed-deposited'&&e.via==='gut')metrics.gutSeeds++;if(e.type==='germinated'&&e.via==='gut')metrics.gutGerminations++;if(e.type==='germinated'&&e.via==='wind')metrics.windGerminations++;events.push(e);}
  if(w.tick%8===0||w.tick===ticks)capture();
 }
 return {seed,withAnimals,ticks,metrics,frames,events,offspring:w.plants.filter(p=>!founderIds.has(p.id)).map(p=>({id:p.id,g:p.g,x:p.x,z:p.z})),scope:'CPU reference autonomous local movement and visits; no live GPU integration, animal heredity or energetic sustainability proof'};
}
