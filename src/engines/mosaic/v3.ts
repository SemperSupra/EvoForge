import type { CandidateEngine, EngineConfig } from "../types";

// Canonical CPU mosaic: fixed world geometry, independent subject, technique and material.
// No canvas rasterization, random global state or transcendental pixel math.
export const SUBJECTS = ["Medallion","Star lattice","Botanical","Tidal ribbons","Marine life","Bird and branch"] as const;
export const TECHNIQUES = ["Contour tesserae","Polygon inlay","Broken ceramic","Byzantine courses"] as const;
export const MATERIALS = ["Stone","Glazed ceramic","Glass and gold"] as const;
export const PALETTE_NAMES = ["ravenna","pompeii","andalusian","celadon","marine","jewel"] as const;
type RGB = readonly [number,number,number];
const PAL: readonly (readonly RGB[])[] = [
 [[221,204,165],[28,46,55],[176,125,45],[36,104,109],[149,61,39],[245,227,175],[81,119,77]],
 [[218,196,157],[49,39,36],[180,126,61],[74,107,87],[168,65,48],[245,224,185],[100,132,149]],
 [[223,223,204],[31,52,88],[193,141,51],[25,116,110],[138,53,38],[247,239,211],[60,85,139]],
 [[213,224,202],[30,63,58],[174,133,67],[61,123,100],[168,81,63],[239,232,203],[93,149,145]],
 [[194,216,214],[20,47,70],[195,149,64],[33,110,145],[33,134,120],[237,239,219],[86,164,181]],
 [[214,191,145],[31,38,65],[202,151,45],[40,101,132],[145,44,73],[250,231,168],[72,125,91]],
];
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const div=(a:number,b:number)=>Math.floor(a/b);
const mod=(a:number,b:number)=>a-div(a,b)*b;
const abs=Math.abs;
const isqrt=(n:number)=>{let r=Math.floor(Math.sqrt(n));while((r+1)*(r+1)<=n)r++;while(r*r>n)r--;return r;};
const len=(x:number,y:number)=>isqrt(x*x+y*y);
const hash=(a:number,b:number,c:number)=>{let x=(a^Math.imul(b,0x9e3779b1)^Math.imul(c,0x85ebca6b))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d)>>>0;x=Math.imul(x^(x>>>15),0x846ca68b)>>>0;return (x^(x>>>16))>>>0;};
// Turns in [0,4096), integer parabolic sine and rational atan approximation.
const SIN=Int16Array.from({length:4096},(_,q)=>{const t=q<2048?q:q-2048;return (q<2048?1:-1)*div(4*t*(2048-t)*1024,2048*2048);});
const sin=(a:number)=>SIN[a&4095];
const cos=(a:number)=>sin(a+1024);
function angle(x:number,y:number){const a=abs(x),b=abs(y);if(!a&&!b)return 0;const m=Math.max(a,b),n=Math.min(a,b),q=div(n*1024,m),o=div(q*(640-div(q,8)),1024),z=a>=b?o:1024-o;return mod(x>=0?(y>=0?z:-z):(y>=0?2048-z:2048+z),4096);}
const wave=(x:number,p:number,a:number)=>div(sin(div(x*4096,p))*a,1024);
function decode(g:Uint16Array,config:EngineConfig){
 if(g.length!==24)throw Error("Mosaic 3.0.0 requires 24 genes");
 const v=(i:number,a:number,b:number)=>a+div(g[i]*(b-a+1),65536);
 const lock=(k:string,n:number,fallback:number)=>{const x=config[k];return typeof x==="number"&&Number.isInteger(x)&&x>=0&&x<n?x:fallback;};
 const palette=typeof config.paletteId==="string"?PALETTE_NAMES.findIndex(x=>x===config.paletteId):-1;
 const technique=lock("techniqueId",4,v(16,0,3));
 return {family:lock("familyId",6,v(0,0,5)),palette:palette>=0?palette:v(1,0,5),technique,material:lock("materialId",3,technique===3?2:v(17,0,2)),cell:v(2,17,29),grout:v(3,1,2),variance:v(4,4,14),border:v(5,0,2),scale:v(6,85,115),petals:v(7,6,10),phase:v(8,0,4095),ornament:v(9,25,55),accent:v(10,0,1)?4:3,sym:v(11,0,1),warp:v(12,1,4),bevel:v(13,4,11),seed:(g[14]|g[15]<<16)>>>0,detail:v(18,8,13),asym:v(19,-75,75),subjectCount:v(20,1,3),gold:v(21,0,2),fragment:v(22,16,23),light:v(23,0,3)};
}
type D=ReturnType<typeof decode>;
type Ellipse={x:number;y:number;rx:number;ry:number;kind:number;flip:number;id:number};
type Scene={hw:number;hh:number;p:D;subjects:Ellipse[]};
function makeScene(hw:number,hh:number,p:D):Scene{
 const span=Math.min(hw,hh),s=div(span*p.scale,100),subjects:Ellipse[]=[];
 const add=(x:number,y:number,rx:number,ry:number,kind:number,flip=1)=>subjects.push({x,y,rx:Math.max(24,rx),ry:Math.max(24,ry),kind,flip,id:subjects.length+1});
 if(p.family===0)add(0,0,div(s*65,100),div(s*65,100),0);
 if(p.family===2){const broad=hw>hh*1.25;const n=broad?p.subjectCount:1;for(let i=0;i<n;i++){const off=i-div(n,2);add(off*div(s*75,100)+div(p.asym,2),off===0?-div(s,4):div(s,8)*((i%2)?1:-1),div(s*(off===0?28:23),100),div(s*(off===0?28:23),100),1);}}
 if(p.family===4){const wide=hw>hh*1.4;add(wide?-div(s,4):0,div(p.asym,2),div(s*57,100),div(s*28,100),2,p.sym?-1:1);if(wide&&p.subjectCount>1){add(div(s*97,100),-div(s*42,100),div(s*24,100),div(s*13,100),2,p.sym?1:-1);if(p.subjectCount===3)add(div(s*94,100),div(s*44,100),div(s*24,100),div(s*13,100),2,p.sym?1:-1);}}
 if(p.family===5){add(div(p.asym,2),-div(s,8),div(s*49,100),div(s*35,100),3,p.sym?-1:1);}
 return {hw,hh,p,subjects};
}
function local(e:Ellipse,x:number,y:number){return [div((x-e.x)*256,e.rx)*e.flip,div((y-e.y)*256,e.ry)] as const;}
function subjectRole(e:Ellipse,x:number,y:number,p:D):number{const [u,v]=local(e,x,y);return subjectLocal(e,u,v,p);}
function subjectLocal(e:Ellipse,u:number,v:number,p:D):number{
 if(abs(u)>420||abs(v)>365)return -1;const r=len(u,v);
 const a=e.kind<2?angle(u,v):0;
 if(e.kind===0){if(r>256)return -1;if(r>242)return 1;if(r>224)return 2;if(r>202)return 1;if(r>181)return mod(div(a*p.petals*2,4096),2)?2:3;if(r>170)return 1;if(r<29)return 2;if(r<43)return 1;const lobe=1024-abs(mod(a*p.petals+p.phase,2048)-1024),tip=80+div(lobe*88,1024);return r<tip?(r>tip-13?1:r<64?2:lobe>700?5:p.accent):0;}
 if(e.kind===1){const tip=170+div((1024-abs(mod(a*p.petals+p.phase,2048)-1024))*86,1024);if(r>tip)return -1;if(r>tip-17)return 1;if(r<43)return 2;if(r<60)return 1;if(r<93)return 5;return mod(div(a*p.petals*2+p.phase,4096),2)?p.accent:4;}
 if(e.kind===2){
  // Fish body, layered scale arcs, eye, gill, fins and flared tail.
  const tail=-u-190;if(tail>0&&tail<178&&abs(v)<40+div(tail*4,5))return abs(v)>26+div(tail*4,5)||tail>165?1:(mod(tail+abs(v),56)<12?2:p.accent);
  if(u>-90&&u<65&&v<-165&&v>-335+abs(u+22))return v<-316+abs(u+22)?1:2;
  if(u>-40&&u<70&&v>160&&v<285-abs(u-5))return v>267-abs(u-5)?1:3;
  if(r>256)return -1;if(r>239)return 1;
  const eye=len(u-151,v+70);if(eye<34)return eye<15?1:eye<24?5:2;
  if(abs(u-108-div(v*v,1024))<10)return 1;if(u>115)return 2;
  const scale=mod(u+div(abs(v)*abs(v),270)+div(p.phase,64),58),row=mod(v,60);
  if(scale<9&&row>8&&row<52)return 2;
  return v<-38?p.accent:v>85?5:3;
 }
 // Bird: large wing in body ellipse, head, beak, tail, leg and branch.
 const head=len(u-171,v+185);if(head<105){if(head>90)return 1;if(len(u-196,v+203)<22)return 1;return 2;}
 if(u>247&&u<395&&abs(v+180)<div(395-u,3))return 4;
 if(u<-160&&u>-385&&v>div(u+160,2)-40&&v<div(u+160,2)+55)return abs(v-div(u+160,2))>39?1:3;
 if(r>256)return -1;if(r>236)return 1;
 const wing=len(u+45,div(v*5,4));if(wing<164){if(wing>150)return 1;return mod(u+div(abs(v)*abs(v),360),46)<8?2:p.accent;}
 return v>70?5:3;
}
function role(x:number,y:number,s:Scene):number{
 const {p,hw,hh,subjects}=s,edge=Math.min(hw-abs(x),hh-abs(y));
 const band=p.cell*(p.technique===1?3:4);
 if(edge<band){const q=div(edge,Math.max(1,div(band,4))),along=hw-abs(x)<hh-abs(y)?y:x;return q<=0||q===3?1:q===1?2:mod(div(along,p.cell*2)+p.border,3)===0?4:5;}
 for(const e of subjects){const v=subjectRole(e,x,y,p);if(v>=0)return v;}
 if(p.family===0){const r=len(x,y),a=angle(x,y);return mod(div(r,83)+div(a*8,4096),2)?0:5;}
 if(p.family===1){const period=div(310*p.scale,100),dx=abs(mod(x+div(period,2),period)-div(period,2)),dy=abs(mod(y+div(period,2),period)-div(period,2));const a=Math.min(Math.max(dx,dy)*10,(dx+dy)*7);if(a<1000)return a>900?1:a>740?2:a>580?1:a>220?p.accent:5;const b=abs(dx-div(period,2))+abs(dy-div(period,2));return b<68?b>53?1:3:Math.min(dx,dy)<10?2:0;}
 if(p.family===2){for(const e of subjects){const base=hh-150,dy=base-e.y;if(y>e.y&&y<base){const cx=e.x+wave(y-e.y,Math.max(120,dy*2),45);if(abs(x-cx)<13)return 6;const k=mod(y-e.y,126)-63,side=mod(div(y-e.y,126)+p.sym,2)?1:-1,dx=(x-cx)*side-72;const u=dx+k,v=dx-k;if(u*u*2+v*v*8<17000)return abs(v)<7?2:6;}}const vine=hh-170+wave(x,Math.max(250,div(hw,2)),40);if(abs(y-vine)<9&&abs(x)<hw-145)return 6;return 0;}
 if(p.family===3){const z=mod(y-wave(x+div(p.phase,8),div(630*p.scale,100),p.ornament+65),200);return z<14?1:z<35?5:z<73?6:z<112?3:z<125?1:z<150?2:p.accent;}
 if(p.family===4){const z=mod(y-wave(x+div(p.phase,8),560,p.ornament),115);return z<13?6:z<22?3:0;}
 const branch=div(hh,3)+wave(x,800,40);if(abs(y-branch)<16&&abs(x)<hw-160)return 1;
 for(const e of subjects){for(const foot of [-1,1]){const lx=e.x+foot*div(e.rx,7),from=e.y+div(e.ry*3,4),dy=y-from; if(dy>=0&&y<branch+3&&abs(x-lx-div(dy*foot,6))<11)return 1;}}
 if(abs(x)>div(hw,3)&&abs(y-branch-50)<50){const dx=mod(x,146)-73,dy=y-branch-50;if(dx*dx+dy*dy*5<3200)return 6;}
 const moon=len(x-div(hw,3),y+div(hh,3));return moon<67?moon>55?2:5:0;
}
type Tile={cx:number;cy:number;id:number;edge:number;u:number;v:number;size:number;role?:number};
function rect(x:number,y:number,c:number,flow:boolean,p:D,group:number):Tile{
 const off=flow?wave(x+div(p.phase,8),560,p.ornament):0, yy=y-off+wave(x,241,p.warp),row=div(yy,c),shift=mod(row,2)*div(c,2),xx=x+shift, col=div(xx,c),u=mod(xx,c),v=mod(yy,c),cx=col*c+div(c,2)-shift;
 return {cx,cy:row*c+div(c,2)+(flow?wave(cx+div(p.phase,8),560,p.ornament):0)-wave(cx,241,p.warp),id:hash(group,col,row),edge:Math.min(u,c-1-u,v,c-1-v),u,v,size:c};
}
function polar(u:number,v:number,r:number,e:Ellipse,c:number):Tile{
 const a=angle(u,v),small=Math.min(e.rx,e.ry),step=Math.max(3,div(c*256,small)),ring=div(r,step),mid=Math.min(254,ring*step+div(step,2)),count=Math.max(1,div(628*mid*div(e.rx+e.ry,2),100*256*c)),stagger=mod(ring,2)*2048,at=a*count+stagger,sector=div(at,4096),q=mod(at,4096),ca=mod(div(sector*4096+2048-stagger,count),4096);
 const px=div(cos(ca)*mid*e.rx,1024*256)*e.flip,py=div(sin(ca)*mid*e.ry,1024*256),uu=div(q*c,4096),vv=div(mod(r,step)*c,step);
 return {cx:e.x+px,cy:e.y+py,id:hash(e.id,mod(sector,count),ring),edge:Math.min(uu,c-1-uu,vv,c-1-vv),u:uu,v:vv,size:c};
}
function inlay(x:number,y:number,p:D):Tile{
 const c=p.cell*4,xx=x+y,yy=x-y,i=div(xx,c),j=div(yy,c),u=mod(xx,c),v=mod(yy,c),flip=mod(i+j,2),b=flip?u+v>=c:u>=v;
 const a0=flip?(b?div(c*2,3):div(c,3)):(b?div(c*2,3):div(c,3)),b0=flip?a0:c-a0,U=i*c+a0,V=j*c+b0;
 const diagonal=flip?abs(u+v-c):abs(u-v);
 return {cx:div(U+V,2),cy:div(U-V,2),id:hash(44,i,j*2+(b?1:0)),edge:div(Math.min(u,c-1-u,v,c-1-v,diagonal),2),u,v,size:c};
}
// Deterministic irregular Voronoi fragments. 24% center jitter bounds nearest-site search to 3x3.
type Site={x:number;y:number;id:number;role:number};
function makeSites(s:Scene,c:number){const pad=2,loX=div(-s.hw,c)-pad,loY=div(-s.hh,c)-pad,nx=div(s.hw,c)-loX+pad+1,ny=div(s.hh,c)-loY+pad+1,sites:Site[]=[];const j=div(c*24,100);for(let y=loY;y<loY+ny;y++)for(let x=loX;x<loX+nx;x++){const h=hash(s.p.seed,x,y),sx=x*c+div(c,2)+mod(h,2*j+1)-j,sy=y*c+div(c,2)+mod(h>>>12,2*j+1)-j;sites.push({x:sx,y:sy,id:h,role:role(sx,sy,s)});}return {sites,nx,loX,loY,c};}
function fragment(x:number,y:number,g:ReturnType<typeof makeSites>):Tile{
 const c=g.c,i=div(x,c)-g.loX,j=div(y,c)-g.loY;let first=g.sites[j*g.nx+i],second=first,d0=Infinity,d1=Infinity;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const a=g.sites[(j+dy)*g.nx+i+dx],u=x-a.x,v=y-a.y,d=u*u+v*v;if(d<d0){d1=d0;second=first;d0=d;first=a;}else if(d<d1){d1=d;second=a;}}
 const sep=Math.max(1,len(second.x-first.x,second.y-first.y));return {cx:first.x,cy:first.y,id:first.id,edge:div(d1-d0,2*sep),u:x-first.x+div(c,2),v:y-first.y+div(c,2),size:c,role:first.role};
}
function tile(x:number,y:number,s:Scene,sites:ReturnType<typeof makeSites>|null,fine:ReturnType<typeof makeSites>|null):Tile{
 const {p,hw,hh,subjects}=s,edge=Math.min(hw-abs(x),hh-abs(y));
 if(edge<p.cell*(p.technique===1?3:4))return rect(x,y,p.cell,false,p,0);
 if(p.technique===1)return inlay(x,y,p);
 for(const e of subjects){const [u,v]=local(e,x,y);if(abs(u)>410||abs(v)>365)continue;const r=len(u,v),sr=subjectLocal(e,u,v,p);if(sr<0)continue;
  if(sites&&fine)return fragment(x,y,fine);
  if(e.kind===2&&len(u-151,v+70)<49)return rect(x,y,Math.max(6,div(p.detail*2,3)),false,p,e.id+20);
  if(r<=256)return polar(u,v,r,e,p.detail);
  return rect(x,y,p.detail,false,p,e.id+30);
 }
 if(sites)return fragment(x,y,sites);
 if(p.family===2||p.family===5){const r=role(x,y,s);if(r===1||r===2||r===6)return rect(x,y,Math.max(9,p.detail),false,p,77);}
 return rect(x,y,p.cell,p.family===3||p.family===4,p,99);
}
function shade(t:Tile,r:number,p:D,lod:number,x:number,y:number):RGB{
 const gold=p.material===2&&(r===2||r===0&&p.gold===2),base=gold?(r===0?[191,146,53]:[217,169,57]):PAL[p.palette][r];
 const n=hash(p.seed,t.id,47),gap=p.technique===1?p.grout+1:p.grout;
 if(t.edge<gap)return p.material===0?[113,102,84]:p.material===1?[105,103,94]:[93,81,59];
 let d=mod(n,p.variance*2+1)-p.variance;
 if(lod>0){const f=p.light%2?t.u:t.v;d+=div((t.size-f)*p.bevel,Math.max(1,t.size))-div(p.bevel,2);if(t.edge<gap+2)d+=(t.u+t.v<t.size?1:-1)*p.bevel;if(p.material===2)d+=mod(n>>>12,17)-8+((t.u+2*t.v< div(t.size,2))?22:0);else if(p.material===1&&t.u+2*t.v<div(t.size,3))d+=14;}
 if(lod>1){if(p.technique===1){const vein=abs(mod(x+2*y+wave(x,180,20)+div(n%131,2),59)-29);if(vein<2)d-=13;else if(vein<4)d+=7;}d+=mod(hash(n,div(x,3),div(y,3)),7)-3;}
 return [clamp(base[0]+d,0,255),clamp(base[1]+d,0,255),clamp(base[2]+d,0,255)];
}
export const mosaicEngine_v3:CandidateEngine={
 spec(){return {id:"mosaic",version:"3.0.0",displayName:"Mosaic Atelier - Craft Lab",genomeLength:24,supports:{palettes:true,palettePhysics:false,longevityVisual:false}};},
 defaultConfig(){return {familyId:"evolved",paletteId:"evolved",techniqueId:"evolved",materialId:"evolved"};},decode,
 async renderRGBA(g,config,intent){const p=decode(g,config),w=intent.width,h=intent.height,lod=clamp(intent.lod|0,0,2);if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>8192||h>8192||w*h>16_777_216||Math.max(w,h)>16*Math.min(w,h))throw Error("Invalid mosaic dimensions");const short=Math.min(w,h),s=makeScene(div(w*512,short),div(h*512,short),p),sites=p.technique===2?makeSites(s,p.fragment*2):null,fine=sites?makeSites(s,Math.max(13,p.detail*2)):null,cache=new Map<number,number>(),rgba=new Uint8ClampedArray(w*h*4);const xs=Int32Array.from({length:w},(_,i)=>div((2*i+1-w)*512,short));for(let y=0;y<h;y++){const yy=div((2*y+1-h)*512,short);for(let x=0;x<w;x++){const xx=xs[x],t=tile(xx,yy,s,sites,fine),key=t.cx*65536+t.cy;let r=t.role??cache.get(key);if(r===undefined){r=role(t.cx,t.cy,s);cache.set(key,r);}const rgb=shade(t,r,p,lod,xx,yy),i=(y*w+x)*4;rgba[i]=rgb[0];rgba[i+1]=rgb[1];rgba[i+2]=rgb[2];rgba[i+3]=255;}}return {rgba,meta:{paletteId:PALETTE_NAMES[p.palette],titleHint:SUBJECTS[p.family],tags:[TECHNIQUES[p.technique],MATERIALS[p.material]]}};},
 mutate(g,rng,ga){const a=g.slice(),rate=clamp(ga.mutationRate,0,1),categories=new Set([0,1,5,10,11,16,17,20,21,23]);for(let i=0;i<a.length;i++){if(rng()>=rate)continue;if(categories.has(i)){if(rng()<.18)a[i]=div(rng()*65536,1);}else if(i===14||i===15){if(rng()<.10)a[i]=div(rng()*65536,1);}else a[i]=clamp(a[i]+div(rng()*24577,1)-12288,0,65535);}if(rate>0&&a.every((v,i)=>v===g[i])){const i=[2,4,6,8,9,12,13,18,19,22][div(rng()*10,1)];a[i]=a[i]<32768?Math.min(65535,a[i]+8192):Math.max(0,a[i]-8192);}return a;},
 crossover(a,b,rng){const out=a.slice();for(const [lo,hi] of [[0,2],[2,6],[6,12],[12,16],[16,18],[18,24]])if(rng()<.5)out.set(b.subarray(lo,hi),lo);return out;}
};

// Structural phenotype signature, not an aesthetic score or an exact pixel oracle.
export function mosaicNoveltyKey(g:Uint16Array,config:EngineConfig):string{
 const p=decode(g,config),s=makeScene(910,512,p),chars:number[]=[];
 for(let y=0;y<14;y++)for(let x=0;x<24;x++)chars.push(65+role(div((2*x+1-24)*910,24),div((2*y+1-14)*512,14),s));
 return [p.family,p.palette,p.technique,p.material,p.cell,p.grout,p.technique===2?p.fragment:p.detail,p.gold,p.warp,String.fromCharCode(...chars)].join(":");
}
