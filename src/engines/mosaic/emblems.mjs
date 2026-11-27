// Deterministic mosaic emblem renderer. Design masks are immutable; genes govern craftsmanship.
export const SYMBOLS = [
 ['us','United States flag','national',19,10], ['de','Germany flag','national',5,3],
 ['th','Thailand flag','national',3,2], ['jp','Japan flag','national',3,2], ['fr','France flag','national',3,2],
 ['eagle','Eagle and shield','heraldic',4,3], ['crown','Crown and fleur-de-lis','royal-inspired',4,3],
 ['anchor','Anchor and laurel','naval-inspired',4,3], ['compass','Compass and wings','military-inspired',4,3],
 ['chevrons','Chevrons and shield','military-inspired',4,3], ['lily','Fleur-de-lis shield','royal-inspired',4,3]
];
export const TECHNIQUES=['Tesserae','Polygon inlay','Broken ceramic','Byzantine courses'];
export const MATERIALS=['Stone','Glazed ceramic','Glass and gold'];
const C=[[30,34,42],[185,36,47],[240,235,216],[28,55,103],[223,171,44],[25,23,26],[132,33,41],[25,38,74],[42,99,81],[196,183,150]];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)), div=(a,b)=>Math.floor(a/b), mod=(a,b)=>a-div(a,b)*b;
const abs=Math.abs, hash=(s,x,y)=>{let n=(s^Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca6b))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;};
const inside=(x,y,v)=>{let yes=false;for(let i=0,j=v.length-1;i<v.length;j=i++){const [a,b]=v[i],[c,d]=v[j];if((b>y)!==(d>y)){const z=(c-a)*(y-b)-(x-a)*(d-b);if(d>b?z>0:z<0)yes=!yes;}}return yes;};
const oval=(x,y,a,b,rx,ry)=>{const u=x-a,v=y-b;return u*u*ry*ry+v*v*rx*rx<=rx*rx*ry*ry;};
const star=[ [0,-100],[24,-32],[95,-31],[38,12],[59,81],[0,40],[-59,81],[-38,12],[-95,-31],[-24,-32] ];
const isStar=(x,y,r)=>inside(div(x*100,r),div(y*100,r),star);
const shield=[[-340,-310],[340,-310],[320,95],[250,215],[0,390],[-250,215],[-320,95]];
const eagleWing=[[0,75],[64,-154],[105,-232],[161,-275],[333,-335],[293,-230],[350,-243],[309,-161],[365,-174],[311,-91],[342,-94],[273,-15],[291,2],[194,54],[122,140]];
const crown=[[-285,110],[-340,-170],[-200,-49],[-125,-225],[0,-76],[125,-225],[200,-49],[340,-170],[285,110]];
const fleurHalf=[[0,120],[39,78],[57,28],[75,0],[137,-29],[164,-4],[173,42],[221,-15],[219,-80],[187,-127],[130,-147],[79,-110],[43,-44],[44,-100],[27,-177],[0,-245]];
const fleur=(x,y)=>inside(abs(x),y,fleurHalf)||abs(x)<94&&y>=108&&y<148||abs(x)<42&&y>=148&&y<220;
const gold=4;
function flag(id,x,y,w){ // x in [0,w), y in [0,1000)
 if(id==='de')return y<334?5:y<667?1:gold;
 if(id==='th')return y<167||y>=833?6:y<334||y>=666?2:7;
 if(id==='jp')return oval(x,y,div(w,2),500,300,300)?1:2;
 if(id==='fr')return x*3<w?3:x*3<2*w?2:1;
 if(id==='us'){
  if(x<760&&y*13<7000){
   // 9 alternating 6/5 rows = 50 stars; field geometry follows standard construction proportions.
   const nearest=div(y+27,54)-1;
   for(let row=Math.max(0,nearest-1);row<=Math.min(8,nearest+1);row++){
    const cy=(row+1)*54,count=row%2?5:6,offset=row%2?126:63,col=clamp(div(x-offset+63,126),0,count-1),cx=offset+col*126;
    if(abs(x-cx)<32&&abs(y-cy)<32&&isStar(x-cx,y-cy,31))return 2;
   }return 3;
  }
  return div(y*13,1000)%2?2:1;
 }
 return 0;
}
function motif(id,x,y){
 const inShield=inside(x,y,shield),ax=abs(x);
 if(id==='eagle'){
  if(inside(ax,y,eagleWing)||oval(x,y,0,-10,63,164)||oval(x,y,28,-199,60,54)||inside(x,y,[[57,-220],[135,-207],[75,-182]])||inside(x,y,[[-110,151],[110,151],[60,265],[0,222],[-60,265]]))return gold;
  if(inShield)return 3;
 } else if(id==='crown'){
  if(inside(x,y,crown)||ax<=285&&y>=110&&y<190){if(y>110&&y<144)return 2;if(oval(mod(x+55,110)-55,y,0,158,19,15))return 1;return gold;}
  if(fleur(x*2,(y+330)*2))return gold;
  if(inShield)return 7;
 }else if(id==='lily'){
  if(fleur(x,y-25))return gold;
  if(inShield)return 3;
 }else if(id==='anchor'){
  const r=x*x+(y+194)*(y+194);if(r<58*58&&r>32*32||ax<25&&y>-162&&y<222||ax<112&&abs(y+108)<22)return gold;
  const a=x*x+(y-47)*(y-47);if(y>45&&a>194*194&&a<242*242||inside(ax,y,[[155,95],[273,32],[251,179]]))return gold;
  for(let i=0;i<5;i++){const cy=220-i*85,cx=310+((i===0||i===4)?-24:0);if(oval(ax,y,cx,cy,24,47))return 8;}
  if(inShield)return 7;
 }else if(id==='compass'){
  if(inside(ax,y,[[78,-40],[335,-200],[306,-111],[361,-120],[319,-47],[345,-52],[267,12],[104,64]]))return gold;
  if(inside(x,y,[[0,-245],[33,-38],[160,0],[33,38],[0,245],[-33,38],[-160,0],[-33,-38]]))return 2;
  if(oval(x,y,0,0,85,85))return 4;
  if(inShield)return 3;
 }else if(id==='chevrons'){
  if(inShield){for(let k=0;k<3;k++)if(ax<250&&abs(y-(-166+k*132+div(ax,2)))<34)return gold;if(isStar(x,y-275,48))return 2;return 8;}
 }
 if(inShield)return 3;
 return 0;
}
export function sampleSymbol(id,x,y){const s=SYMBOLS.find(q=>q[0]===id);if(!s)throw Error("Unknown symbol");const w=div(1000*s[3],s[4]);return s[2]==="national"?flag(id,x,y,w):motif(id,div((x*2-w)*500,w),y-500);}
export function decode(g,config={}){
 if(g.length!==12)throw Error('Emblem 1.0.0 requires 12 genes');
 const symbol=SYMBOLS.find(s=>s[0]===(config.symbolId??'us'));if(!symbol)throw Error('Unknown symbol');const q=(i,a,b)=>a+div(g[i]*(b-a+1),65536),lock=(k,n,f)=>Number.isInteger(config[k])&&config[k]>=0&&config[k]<n?config[k]:f;
 return {symbolId:symbol[0],title:symbol[1],kind:symbol[2],aspect:[symbol[3],symbol[4]],technique:lock('techniqueId',4,q(0,0,3)),material:lock('materialId',3,q(1,0,2)),cell:q(2,18,33),grout:q(3,1,2),variance:q(4,3,12),bevel:q(5,3,9),frame:q(6,0,2),seed:(g[7]|g[8]<<16)>>>0,light:q(9,0,3),detail:q(10,5,10),fragment:q(11,18,35)};
}
function geometry(x,y,c,p){
 const s=p.seed,t=p.technique;
 if(t===1){const k=c*2,a=x+y,b=x-y,i=div(a,k),j=div(b,k),u=mod(a,k),v=mod(b,k);return [hash(s,i,j*2+(u>v?1:0)),div(Math.min(u,k-1-u,v,k-1-v,abs(u-v)),2),u,v,k];}
 if(t===2){let a=Infinity,b=Infinity,h=0,u=0,v=0;const i=div(x,c),j=div(y,c),jitter=div(c,4);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=hash(s,i+dx,j+dy),cx=(i+dx)*c+div(c,2)+mod(k,jitter*2+1)-jitter,cy=(j+dy)*c+div(c,2)+mod(k>>>12,jitter*2+1)-jitter,X=x-cx,Y=y-cy,d=X*X+Y*Y;if(d<a){b=a;a=d;h=k;u=X+div(c,2);v=Y+div(c,2);}else if(d<b)b=d;}return [h,div(b-a,c*3),u,v,c];}
 const drift=t===3?div(abs(mod(x,240)-120),8):0,row=div(y+drift,c),v=mod(y+drift,c),xx=x+mod(row,2)*div(c,2),col=div(xx,c),u=mod(xx,c);return [hash(s,col,row),Math.min(u,c-1-u,v,c-1-v),u,v,c];
}
export function layout(p,w,h){const inset=div(Math.min(w,h)*(7+p.frame*2),100),aw=w-2*inset,ah=h-2*inset,[a,b]=p.aspect,fw=Math.min(aw,div(ah*a,b)),fh=Math.min(ah,div(aw*b,a));return {left:div(w-fw,2),top:div(h-fh,2),width:fw,height:fh};}
export function render(g,config,intent){
 const p=decode(g,config),w=intent.width,h=intent.height,lod=clamp(intent.lod|0,0,2);
 if(!Number.isInteger(w)||!Number.isInteger(h)||Math.min(w,h)<32||w>8192||h>8192||w*h>16777216||Math.max(w,h)>Math.min(w,h)*8)throw Error('Invalid emblem dimensions');
 const f=layout(p,w,h),worldW=div(1000*p.aspect[0],p.aspect[1]),rgba=new Uint8ClampedArray(w*h*4),national=p.kind==='national';
 const role=(X,Y)=>national?flag(p.symbolId,X,Y,worldW):motif(p.symbolId,div((X*2-worldW)*500,worldW),Y-500);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const X=div((x-f.left)*worldW,f.width),Y=div((y-f.top)*1000,f.height),inField=X>=0&&X<worldW&&Y>=0&&Y<1000;let r,c;
  if(inField){r=role(X,Y);const near=role(X+p.cell,Y)!==r||role(X-p.cell,Y)!==r||role(X,Y+p.cell)!==r||role(X,Y-p.cell)!==r;c=near?p.detail:(p.technique===2?p.fragment:p.cell);if(p.symbolId==='us'&&X<760&&Y<539)c=p.detail;}
  else{const d=Math.min(abs(x-f.left),abs(x-f.left-f.width+1),abs(y-f.top),abs(y-f.top-f.height+1));const thick=Math.max(2,div(Math.min(w,h),85));r=d<thick&&x>=f.left-thick&&x<f.left+f.width+thick&&y>=f.top-thick&&y<f.top+f.height+thick?4:0;c=p.cell;}
  const [n,edge,u,v,size]=geometry(X,Y,c,p),base=C[r],gap=c<12?1:p.grout;
  let delta=mod(n,p.variance*2+1)-p.variance;if(lod>0){delta+=div((size-(p.light%2?u:v))*p.bevel,size)-div(p.bevel,2);if(edge<gap+1)delta+=u+v<size?p.bevel:-p.bevel;if(p.material===2&&r===gold)delta+=mod(n>>>16,30)-8;if(p.material===1&&u+2*v<size/2)delta+=12;}
  if(lod>1)delta+=mod(hash(n,X>>1,Y>>1),5)-2;
  const joint=edge<gap;const idx=(y*w+x)*4;
  // Color-keyed joints preserve small stars, flag colors and the fixed silhouette.
  for(let k=0;k<3;k++)rgba[idx+k]=clamp(joint?div(base[k]*3+42,4):base[k]+delta,0,255);rgba[idx+3]=255;
 }
 return {rgba,meta:{titleHint:p.title,paletteId:national?'identity-locked':'heraldic',tags:[p.kind,TECHNIQUES[p.technique],MATERIALS[p.material]]}};
}
export function mutate(g,rng,ga){const out=g.slice(),rate=clamp(ga.mutationRate,0,1);for(let i=0;i<out.length;i++)if(rng()<rate)out[i]=i===0||i===1||i===6||i===7||i===8?div(rng()*65536,1):clamp(out[i]+div(rng()*24577,1)-12288,0,65535);return out;}
export function crossover(a,b,rng){const out=a.slice();for(let i=0;i<12;i+=2)if(rng()<.5)out.set(b.subarray(i,i+2),i);return out;}
