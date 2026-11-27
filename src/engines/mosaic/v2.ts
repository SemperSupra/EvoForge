import type { CandidateEngine, EngineConfig } from "../types";

// All geometry is in integer units, independent of output resolution and LOD.
// Colors are assigned once per tessera from a compositional field, not a pixel hash.
type RGB = readonly [number,number,number];
const FAMILIES = ["Medallion", "Star and Cross", "Botanical", "Tidal Ribbons", "Marine Life"] as const;
const PALETTES: Record<string, readonly RGB[]> = {
  ravenna: [[219,203,164],[25,48,66],[179,132,50],[40,108,115],[153,61,43],[245,226,169],[88,122,85]],
  pompeii: [[215,190,148],[48,40,35],[171,123,60],[75,101,79],[157,65,46],[239,220,180],[80,100,110]],
  andalusian: [[222,222,194],[29,50,92],[191,143,53],[25,121,119],[134,57,42],[248,239,206],[65,91,140]],
  celadon: [[204,213,192],[32,61,57],[175,143,79],[68,124,107],[159,90,75],[239,232,204],[99,148,151]],
  marine: [[196,213,210],[22,54,78],[178,144,82],[38,107,139],[35,126,120],[231,235,217],[93,159,173]],
};
const PALETTE_IDS=Object.keys(PALETTES);
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const div=(a:number,b:number)=>Math.floor(a/b);
const mod=(a:number,b:number)=>a-div(a,b)*b;
const tri=(x:number,p:number)=>p-2*Math.abs(mod(x,p)-div(p,2));
function wave(x:number,p:number,a:number){const t=2*tri(x,p)-p;return div(t*(2*p-Math.abs(t))*a,p*p);}
function hash(a:number,b:number,c:number){let x=(a^Math.imul(b,0x9e3779b1)^Math.imul(c,0x85ebca6b))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d)>>>0;x=Math.imul(x^(x>>>15),0x846ca68b)>>>0;return (x^(x>>>16))>>>0;}
function radius(x:number,y:number){const n=x*x+y*y;let r=Math.floor(Math.sqrt(n));while((r+1)*(r+1)<=n)r++;while(r*r>n)r--;return r;}
// 4096 angular units; rational octant mapping. No transcendental angle calls.
function angle(x:number,y:number){const a=Math.abs(x),b=Math.abs(y);if(!a&&!b)return 0;const m=Math.max(a,b),n=Math.min(a,b),q=div(n*1024,m);const oct=div(q*(640-div(q,8)),1024);const z=a>=b?oct:1024-oct;return mod(x>=0?(y>=0?z:-z):(y>=0?2048-z:2048+z),4096);}
function decode(g:Uint16Array,config:EngineConfig){
  if(g.length!==16)throw Error("Mosaic 2.0.0 requires 16 genes");
  const val=(i:number,lo:number,hi:number)=>lo+div(g[i]*(hi-lo+1),65536);
  const family=typeof config.familyId==="number"&&Number.isInteger(config.familyId)&&config.familyId>=0&&config.familyId<5?config.familyId:val(0,0,4);
  const paletteId=typeof config.paletteId==="string"&&Object.hasOwn(PALETTES,config.paletteId)?config.paletteId:PALETTE_IDS[val(1,0,PALETTE_IDS.length-1)];
  return {family,paletteId,cell:val(2,18,29),grout:val(3,1,2),variation:val(4,3,15),border:val(5,0,2),scale:val(6,275,345),petals:val(7,7,11),phase:val(8,0,4095),ornament:val(9,22,46),accent:val(10,0,1)?4:3,symmetry:val(11,0,1),warp:val(12,1,4),contrast:val(13,4,12),seed:(g[14]|(g[15]<<16))>>>0};
}
type Design=ReturnType<typeof decode>;
type Tile={idX:number;idY:number;u:number;v:number;spanX:number;spanY:number;role:number;group:number};
function rosette(r:number,a:number,R:number,p:Design){
  const t=div(r*1024,R), sector=mod((a+p.phase)*p.petals,4096), lobe=2048-Math.abs(sector-2048);
  if(t>=940)return 1;if(t>=885)return 2;if(t>=825)return 1;
  if(t>=718)return mod(div((a+p.phase)*p.petals*2,4096),2)?2:3;
  if(t>=670)return 1;
  if(t<=110)return 2;if(t<=165)return 1;
  const end=320+div(lobe*360,2048);
  if(t<end){if(t>=end-55||lobe<280)return 1;if(t<250)return 2;return t<end-125?p.accent:5;}
  return t>600?2:0;
}
function star(x:number,y:number,p:Design){
  const period=p.scale,dx=Math.abs(mod(x+div(period,2),period)-div(period,2)),dy=Math.abs(mod(y+div(period,2),period)-div(period,2));
  const v=Math.min(div(Math.max(dx,dy)*1024,76),div((dx+dy)*1024,110));
  if(v<=1150){if(v>=1000)return 1;if(v>=810)return 2;if(v>=660)return 1;if(v>=290)return p.accent;return 5;}
  const corner=Math.abs(dx-div(period,2))+Math.abs(dy-div(period,2));
  if(corner<55)return corner>38?1:3;
  if(Math.min(dx,dy)<10)return 2;return 0;
}
function plant(x:number,y:number,p:Design){
  const period=p.scale, stem=wave(x+div(p.phase,8),period*2,68), dx=mod(x+div(period,2),period)-div(period,2), idx=div(x+div(period,2),period);
  const side=mod(idx+p.symmetry,2)?1:-1, flowerY=side*182, dy=y-flowerY, r=radius(dx,dy), a=angle(dx,dy);
  const lobe=2048-Math.abs(mod((a+p.phase)*5,4096)-2048), outer=45+div(lobe*55,2048);
  if(r<outer+8){if(r>outer)return 1;if(r<17)return 2;if(r<25)return 1;return p.accent;}
  if(Math.abs(dx)<10&&y>=Math.min(stem,flowerY)&&y<=Math.max(stem,flowerY))return 6;
  // Two oblique leaves with a dark outline and central vein.
  for(const direction of [-1,1]){const lx=dx-direction*65,ly=y-stem+side*direction*35;const u=direction*lx+side*ly,v=direction*lx-side*ly;const e=u*u*3+v*v*13;if(e<43000){if(e>35000)return 1;if(Math.abs(v)<7)return 2;return direction===side?3:6;}}
  if(Math.abs(y-stem)<13)return Math.abs(y-stem)<5?2:1;
  return 0;
}
function ribbons(x:number,y:number,p:Design){const period=p.scale*2,offset=wave(x+div(p.phase,6),period,p.ornament+34);const z=mod(y-offset,176);if(z<12)return 1;if(z<28)return 5;if(z<54)return 6;if(z<86)return 3;if(z<104)return 1;if(z<120)return 2;if(z<148)return p.accent;return 3;}
// Figurative emblema: fish silhouettes, fins, eyes and scale arcs on a water field.
function fish(x:number,y:number,p:Design,hw:number){
  const count=hw>700?3:1, spacing=div(hw*2, count+1), half=div(count,2);
  for(let i=-half;i<=half;i++){
    const ox=i*spacing,oy=i===0?0:mod(i+p.symmetry,2)?-105:105;
    const flip=mod(i+p.symmetry,2)?-1:1,xx=(x-ox)*flip,yy=y-oy;
    const body=xx*xx*64+yy*yy*225,limit=1024000;
    if(body<limit){
      if(body>830000)return 1;
      if(radius(xx-75,yy+10)<18)return radius(xx-75,yy+10)<9?1:5;
      if(xx>49)return 2;
      const stripe=Math.abs(mod(xx+div(yy*yy,110)+div(p.phase,64),52)-26);
      if(stripe<8)return 2;
      return yy<0?p.accent:3;
    }
    const tail=-xx-90,ay=Math.abs(yy);
    if(tail>=0&&tail<89&&ay<14+div(tail*3,5)){if(ay>5+div(tail*3,5)||tail>73)return 1;return p.accent;}
    if(xx>-48&&xx<45&&yy<-39&&yy>-94+Math.abs(xx-2)){return yy<-82+Math.abs(xx-2)?1:2;}
  }
  const ripple=mod(y-wave(x+div(p.phase,8),p.scale*2,p.ornament),103);
  return ripple<15?6:ripple<26?3:0;
}
function rectangularTile(x:number,y:number,p:Design,role:(x:number,y:number)=>number,flow:boolean,group:number):Tile{
  const c=p.cell, period=p.scale*2;
  const off=flow?wave(x+div(p.phase,6),period,p.ornament+34):0;
  const drift=wave(x,233,p.warp);const yy=y-off+drift, row=div(yy,c), sy=div(c,2)*mod(row,2);
  const xx=x+sy+wave(row*c,220,p.warp), col=div(xx,c), u=mod(xx,c),v=mod(yy,c);
  const cx=col*c+div(c,2)-sy-wave(row*c,220,p.warp),cy=row*c+div(c,2)-wave(cx,233,p.warp)+(flow?wave(cx+div(p.phase,6),period,p.ornament+34):0);
  return {idX:col,idY:row,u,v,spanX:c,spanY:c,role:role(cx,cy),group};
}
function radialTile(x:number,y:number,R:number,p:Design,group:number):Tile{
  const r=radius(x,y),a=angle(x,y),c=p.cell,ring=div(r,c),mid=ring*c+div(c,2);
  const count=Math.max(1,div(628*mid,100*c)),stagger=mod(ring,2)*2048;
  const at=a*count+stagger,sector=div(at,4096),u=div(mod(at,4096)*c,4096),v=mod(r,c);
  const centerA=mod(div(sector*4096+2048-stagger,count),4096);
  return {idX:mod(sector,count),idY:ring,u,v,spanX:c,spanY:c,role:rosette(mid,centerA,R,p),group};
}
function tileAt(x:number,y:number,hw:number,hh:number,p:Design):Tile{
  const edge=Math.min(hw-Math.abs(x),hh-Math.abs(y)),c=p.cell;
  if(edge<c*4){
    const role=(xx:number,yy:number)=>{const d=Math.min(hw-Math.abs(xx),hh-Math.abs(yy)),band=clamp(div(d,c),0,3),along=hw-Math.abs(xx)<hh-Math.abs(yy)?yy:xx;
      if(band===0||band===3)return 1;if(band===1)return 2;
      return mod(div(along,c)+p.border,4)<(p.border===1?1:2)?p.accent:5;};
    return rectangularTile(x,y,p,role,false,0);
  }
  if(p.family===0){const R=Math.min(p.scale+40,hh-c*5);const avail=hw-c*4-R;const rr=Math.min(div(avail,2)-c,div(R,2));
    if(radius(x,y)<R)return radialTile(x,y,R,p,1);
    if(rr>c*3){const cx=(x<0?-1:1)*(R+div(avail,2));if(radius(x-cx,y)<rr)return radialTile(x-cx,y,rr,p,x<0?2:3);}
    return rectangularTile(x,y,p,(xx,yy)=>mod(div(xx,c*4)+div(yy,c*4),2)?0:5,false,4);
  }
  if(p.family===1)return rectangularTile(x,y,p,(xx,yy)=>star(xx,yy,p),false,5);
  if(p.family===2)return rectangularTile(x,y,p,(xx,yy)=>plant(xx,yy,p),false,6);
  if(p.family===3)return rectangularTile(x,y,p,(xx,yy)=>ribbons(xx,yy,p),true,7);
  return rectangularTile(x,y,p,(xx,yy)=>fish(xx,yy,p,hw),false,8);
}
function shade(t:Tile,p:Design,lod:number,x:number,y:number):RGB{
  const grout=Math.min(p.grout,div(p.cell,5)),du=Math.min(t.u,t.spanX-1-t.u),dv=Math.min(t.v,t.spanY-1-t.v),d=Math.min(du,dv);
  const pal=PALETTES[p.paletteId],base=pal[t.role],n=hash(p.seed^Math.imul(t.group,17),t.idX,t.idY);
  if(d<grout||du+dv<2*grout+(n&1))return p.paletteId==="marine"?[81,91,90]:[102,91,72];
  let delta=mod(n,p.variation*2+1)-p.variation;
  if(d===grout)delta+=(t.u<t.spanX/2&&t.v<t.spanY/2?p.contrast:-p.contrast)*2;
  if(lod>=1)delta+=div((t.spanY-t.v)*p.contrast,t.spanY)-div(p.contrast,2);
  if(lod>=2)delta+=mod(hash(n,div(x,3),div(y,3)),7)-3;
  return [clamp(base[0]+delta,0,255),clamp(base[1]+delta,0,255),clamp(base[2]+delta,0,255)];
}
export const mosaicEngine_v2:CandidateEngine={
 spec(){return {id:"mosaic",version:"2.0.0",displayName:"Mosaic Atelier",genomeLength:16,supports:{palettes:true,palettePhysics:false,longevityVisual:false}};},
 defaultConfig(){return {paletteId:"evolved",familyId:"evolved"};},
 decode,
 async renderRGBA(genome,config,intent){
   const p=decode(genome,config),w=intent.width,h=intent.height,lod=clamp(intent.lod|0,0,2);
   if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>8192||h>8192||Math.max(w,h)>16*Math.min(w,h)||w*h>16_777_216)throw Error("Invalid mosaic dimensions");
   const short=Math.min(w,h),hw=div(w*512,short),hh=div(h*512,short),rgba=new Uint8ClampedArray(w*h*4);
   for(let y=0;y<h;y++){const yy=div((2*y+1-h)*512,short);for(let x=0;x<w;x++){const xx=div((2*x+1-w)*512,short),rgb=shade(tileAt(xx,yy,hw,hh,p),p,lod,xx,yy),i=(y*w+x)*4;rgba[i]=rgb[0];rgba[i+1]=rgb[1];rgba[i+2]=rgb[2];rgba[i+3]=255;}}
   return {rgba,meta:{paletteId:p.paletteId,titleHint:FAMILIES[p.family],tags:[FAMILIES[p.family],"tesserae",`cell:${p.cell}`]}};
 },
 mutate(g,rng,ga){const out=g.slice(),rate=clamp(ga.mutationRate,0,1);for(let i=0;i<out.length;i++){if(rng()>=rate)continue;if(i<2||i===5||i===10||i===11){if(rng()<0.25)out[i]=Math.floor(rng()*65536);}else if(i>=14){if(rng()<0.08)out[i]=Math.floor(rng()*65536);}else {out[i]=clamp(out[i]+Math.floor(rng()*16385)-8192,0,65535);}}return out;},
 crossover(a,b,rng){const out=a.slice();for(const [lo,hi] of [[0,2],[2,6],[6,12],[12,16]])if(rng()<0.5)out.set(b.subarray(lo,hi),lo);return out;}
};
