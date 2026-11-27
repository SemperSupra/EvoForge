// Research reference: anatomical graph -> closed swept body mesh.
// This is not the live Arena's physical or heritable representation.
const finite=x=>Number.isFinite(x);
const v=(a,b)=>a.map((x,i)=>x-b[i]),add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),norm=a=>Math.hypot(...a),unit=a=>{const n=norm(a);if(n<1e-8)throw Error('degenerate direction');return mul(a,1/n)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const bounded=(x,a,b)=>Math.max(a,Math.min(b,x));
export const FAMILIES=['annelid','arthropod','swimmer'];
export function genome(family,seed=42){if(!FAMILIES.includes(family)||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('genome');let n=seed>>>0;const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};return {family,length:1.7+rand()*1.0,girth:.16+rand()*.12,tail:.25+rand()*.45,limb:.25+rand()*.25,segments:family==='arthropod'?6:10,pigment:[.24+rand()*.22,.20+rand()*.19,.15+rand()*.14]};}
export function anatomy(g){if(!g||!FAMILIES.includes(g.family)||![g.length,g.girth,g.tail,g.limb].every(finite)||g.length<1||g.length>4||g.girth<.08||g.girth>.5||g.tail<.1||g.tail>.9||g.limb<.1||g.limb>.8||!Number.isSafeInteger(g.segments)||g.segments<4||g.segments>20)throw Error('anatomy bounds');
 const spine=Array.from({length:g.segments+1},(_,i)=>{const t=i/g.segments;return {p:[g.length*(.5-t),0,0],r:g.girth*Math.max(.22,Math.sin(Math.PI*(.13+.87*t)))*(1-g.tail*t*.5)};});
 const limbs=[];if(g.family==='arthropod')for(let i=1;i<g.segments-1;i++)for(const side of [-1,1]){const p=spine[i].p;limbs.push({root:i,side,points:[{p,r:g.girth*.25},{p:add(p,[-.08,g.limb*.25,side*g.limb*.62]),r:g.girth*.13},{p:add(p,[-.17,-g.limb*.55,side*g.limb]),r:g.girth*.055}]});}
 if(g.family==='swimmer')for(const side of [-1,1]){const i=3,p=spine[i].p;limbs.push({root:i,side,points:[{p,r:g.girth*.27},{p:add(p,[-.25,0,side*g.limb]),r:g.girth*.10}]});}
 return {spine,limbs};}
export function sweep(points,sides=12){if(!Number.isSafeInteger(sides)||sides<6||sides>32||points.length<2||points.length>32)throw Error('mesh budget');
 const vertices=[],triangles=[];let normal=null;for(let i=0;i<points.length;i++){const a=points[i];if(!a.p.every(finite)||!finite(a.r)||a.r<=0)throw Error('point');const tangent=unit(v(points[Math.min(points.length-1,i+1)].p,points[Math.max(0,i-1)].p));const projected=normal&&v(normal,mul(tangent,dot(normal,tangent)));normal=projected&&norm(projected)>1e-6?unit(projected):unit(cross(tangent,Math.abs(tangent[1])<.9?[0,1,0]:[1,0,0]));const binormal=unit(cross(tangent,normal));
 for(let j=0;j<sides;j++){const t=j*2*Math.PI/sides;vertices.push(add(a.p,mul(add(mul(normal,Math.cos(t)),mul(binormal,Math.sin(t))),a.r)));}}
 for(let i=0;i<points.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;triangles.push([a,c,b],[b,c,d]);}
 const front=vertices.push(points[0].p.slice())-1,back=vertices.push(points.at(-1).p.slice())-1;for(let j=0;j<sides;j++){triangles.push([front,j,(j+1)%sides]);const a=(points.length-1)*sides+j,b=(points.length-1)*sides+(j+1)%sides;triangles.push([back,b,a]);}return {vertices,triangles};}
export function bodyMesh(g,sides=12){const a=anatomy(g);return [sweep(a.spine,sides),...a.limbs.map(l=>sweep(l.points,Math.max(6,Math.floor(sides/2))))];}
export function mutate(g,delta){if(!finite(delta)||Math.abs(delta)>.2)throw Error('mutation');return {...g,length:bounded(g.length*(1+delta),1,4),girth:bounded(g.girth*(1-delta*.5),.08,.5),tail:bounded(g.tail+delta,.1,.9)};}
export function obj(meshes){let out='',offset=1;for(let i=0;i<meshes.length;i++){const m=meshes[i];out+='o part_'+i+'\n';for(const p of m.vertices)out+='v '+p.map(x=>x.toFixed(6)).join(' ')+'\n';for(const t of m.triangles)out+='f '+t.map(x=>x+offset).join(' ')+'\n';offset+=m.vertices.length;}return out;}
