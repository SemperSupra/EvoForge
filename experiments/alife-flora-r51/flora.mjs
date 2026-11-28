// Bounded deterministic ecological reference; not yet part of the live GPU arena.
export const SPECIES=['flower-tree','fruit-tree','herb'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const valid=(n)=>Number.isFinite(n);
export function genome(species,seed=42){if(!SPECIES.includes(species)||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('genome');let n=seed>>>0;const r=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};return {species,angle:18+r()*22,branchLength:.8+r()*.4,branchRatio:.62+r()*.18,depth:2+Math.floor(r()*3),bloomAge:12+Math.floor(r()*12),nectar:.3+r()*.6,fruit:.3+r()*.6,leafHue:85+r()*55,flowerHue:Math.floor(r()*360),droughtTolerance:.2+r()*.6};}
function mutate(a,b,random){const mix=(k,lo,hi)=>clamp((a[k]+b[k])/2+(random()-.5)*(hi-lo)*.12,lo,hi);return {species:a.species,angle:mix('angle',18,40),branchLength:mix('branchLength',.8,1.2),branchRatio:mix('branchRatio',.62,.8),depth:Math.round(mix('depth',2,4)),bloomAge:Math.round(mix('bloomAge',12,24)),nectar:mix('nectar',.3,.9),fruit:mix('fruit',.3,.9),leafHue:mix('leafHue',85,140),flowerHue:mix('flowerHue',0,359),droughtTolerance:mix('droughtTolerance',.2,.8)};}
export function createWorld(seed=42){if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('seed');return {seed:seed>>>0,tick:0,nextId:1,plants:[],animals:[],seeds:[],receipts:[],water:.65};}
function rnd(w){w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0;return w.seed/4294967296;}
function record(w,type,data){w.receipts.push({tick:w.tick,type,...data});if(w.receipts.length>256)w.receipts.shift();}
function position(x,z){if(!valid(x)||!valid(z)||Math.hypot(x,z)>20)throw Error('position');}
export function plant(w,g,x,z,age=0){position(x,z);if(w.plants.length>=128||!SPECIES.includes(g.species)||!Number.isSafeInteger(age)||age<0||age>10000)throw Error('plant admission');const p={id:w.nextId++,g:{...g},x,z,age,energy:1,pollinated:false,fruit:0,fruitSeeds:[]};w.plants.push(p);return p;}
export function animal(w,x,z){position(x,z);if(w.animals.length>=64)throw Error('animal capacity');const a={id:w.nextId++,x,z,energy:0,pollen:null,gut:[]};w.animals.push(a);return a;}
export function visit(w,a,p){if(!w.animals.includes(a)||!w.plants.includes(p)||distance(a,p)>1||p.age<p.g.bloomAge||p.energy<.2)throw Error('visit not admitted');
 if(p.g.species==='flower-tree'||p.g.species==='fruit-tree'){
  const carried=a.pollenBySpecies?a.pollenBySpecies[p.g.species]:a.pollen;
  if(carried&&carried.id!==p.id&&carried.g.species===p.g.species&&!p.pollinated){p.pollinated=true;p.mate={...carried.g};p.donorId=carried.id;record(w,'cross-pollination',{plant:p.id,donor:carried.id,animal:a.id});}
  a.pollen={id:p.id,g:{...p.g}};if(a.pollenBySpecies)a.pollenBySpecies[p.g.species]=a.pollen;a.energy+=p.g.nectar*.1;
 }
 if(p.g.species==='fruit-tree'&&p.fruit>0&&a.gut.length<8){p.fruit--;const stored=p.fruitSeeds.shift();a.gut.push({g:stored?.g??mutate(p.g,p.mate??p.g,()=>rnd(w)),parent:p.id,donor:stored?.donor??p.donorId,due:w.tick+6});a.energy+=p.g.fruit*.25;record(w,'fruit-eaten',{plant:p.id,animal:a.id});}
}
export function move(a,x,z){position(x,z);a.x=x;a.z=z;}
function seed(w,g,x,z,parent,via){if(w.seeds.length>=256)return;w.seeds.push({g,x,z,parent,via,due:w.tick+4});record(w,'seed-deposited',{parent,via,x,z});}
export function step(w,ticks=1,policy=null){if(!Number.isSafeInteger(ticks)||ticks<0||ticks>300)throw Error('tick budget');for(let i=0;i<ticks;i++){
 w.tick++;
 for(const p of w.plants){p.age++;if(policy?.fallenFruit){while(p.fruitSeeds.length&&w.tick-p.fruitSeeds[0].ripeAt>=policy.fallenFruit){const fruit=p.fruitSeeds.shift();p.fruit--;const angle=rnd(w)*Math.PI*2,x=p.x+Math.cos(angle)*.9,z=p.z+Math.sin(angle)*.9;if(Math.hypot(x,z)<=20)seed(w,fruit.g,x,z,p.id,'fallen-fruit');}}p.energy=clamp(p.energy+(policy?policy.energyDelta(p):(w.water-.5)*.03-(1-p.g.droughtTolerance)*.004),0,1);
  if(p.age>=p.g.bloomAge&&p.energy>.25&&p.pollinated&&p.age%8===0&&(!policy?.reproduce||policy.reproduce(p))){if(p.g.species==='fruit-tree'){if(p.fruit<4){p.fruit++;p.fruitSeeds.push({g:mutate(p.g,p.mate??p.g,()=>rnd(w)),donor:p.donorId,ripeAt:w.tick});}if(policy?.reproduce)p.pollinated=false;}else if(p.g.species==='flower-tree'){const angle=rnd(w)*Math.PI*2,x=p.x+Math.cos(angle)*1.5,z=p.z+Math.sin(angle)*1.5;if(Math.hypot(x,z)<=20)seed(w,mutate(p.g,p.mate,()=>rnd(w)),x,z,p.id,'wind');p.pollinated=false;}}
  if(p.g.species==='herb'&&p.age>=p.g.bloomAge&&p.age%16===0&&p.energy>.25&&(!policy?.reproduce||policy.reproduce(p))){const x=p.x+(rnd(w)-.5)*3,z=p.z+(rnd(w)-.5)*3;if(Math.hypot(x,z)<=20)seed(w,mutate(p.g,p.g,()=>rnd(w)),x,z,p.id,'self');}
 }
 for(const a of w.animals){const due=a.gut.filter(s=>s.due<=w.tick);a.gut=a.gut.filter(s=>s.due>w.tick);for(const s of due)seed(w,s.g,a.x,a.z,s.parent,'gut');}
 const ready=w.seeds.filter(s=>s.due<=w.tick);w.seeds=w.seeds.filter(s=>s.due>w.tick);
 for(const s of ready){if(w.plants.length>=128||w.water<.2||w.plants.some(p=>distance(p,s)<.7)||(policy&&!policy.admit(s))){if(policy?.defer&&policy.defer(s)&&w.seeds.length<256){s.due=w.tick+8;s.attempts=(s.attempts??0)+1;w.seeds.push(s);continue;}record(w,'germination-rejected',{parent:s.parent,via:s.via});continue;}const p=plant(w,s.g,s.x,s.z);if(policy?.establish)policy.establish(p);record(w,'germinated',{plant:p.id,parent:s.parent,via:s.via});}
}}
export function structure(g){ // parameterized L-system: F -> F[+F][-F]F with bounded depth
 if(!Number.isSafeInteger(g.depth)||g.depth<2||g.depth>4||!valid(g.angle)||!valid(g.branchRatio)||!valid(g.branchLength))throw Error('growth bounds');
 let word='F';for(let i=0;i<g.depth;i++)word=word.replaceAll('F','F[+F][-F]F');const stack=[],segments=[],tips=[];let x=0,y=0,a=-90,l=g.branchLength,depth=0;
 for(const ch of word){if(ch==='F'){const nx=x+Math.cos(a*Math.PI/180)*l,ny=y+Math.sin(a*Math.PI/180)*l;segments.push({x,y,nx,ny,width:Math.max(.035,.18*Math.pow(g.branchRatio,depth)),depth});x=nx;y=ny;tips.push({x,y,depth});}else if(ch==='['){stack.push([x,y,a,l,depth]);l*=g.branchRatio;depth++;}else if(ch===']'){[x,y,a,l,depth]=stack.pop();}else if(ch==='+')a+=g.angle;else if(ch==='-')a-=g.angle;}
 return {segments,tips};}
