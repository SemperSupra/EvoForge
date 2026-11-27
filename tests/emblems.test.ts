import {expect,test} from "vitest";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {getEngine} from "../src/engines/registry";
import {sampleSymbol,decode,layout,SYMBOLS} from "../src/engines/mosaic/emblems.mjs";
import type {RenderIntent} from "../src/core/types";
const data=JSON.parse(readFileSync(new URL("./fixtures/emblem-goldens.json",import.meta.url),"utf8"));
const engine=getEngine("mosaic-emblem","1.0.0"),g=new Uint16Array(data.genome);
test("44 identity-locked emblem and technique exact CPU goldens",async()=>{
 for(const f of data.fixtures){const r=await engine.renderRGBA(g,f.config,data.renderIntent as RenderIntent);expect(createHash("sha256").update(r.rgba).digest("hex")).toBe(f.sha256);expect(r.rgba.every((v,i)=>i%4!==3||v===255)).toBe(true);}
},30000);
test("national flag mask contains fifty separate stars and thirteen stripes",()=>{
 const W=760,H=539,m=new Uint8Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)m[y*W+x]=sampleSymbol("us",x,y)===2?1:0;
 let components=0;
 for(let i=0;i<m.length;i++){if(!m[i])continue;components++;m[i]=0;const queue=[i];for(let k=0;k<queue.length;k++){const n=queue[k],x=n%W,y=Math.floor(n/W);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,j=yy*W+xx;if(xx>=0&&xx<W&&yy>=0&&yy<H&&m[j]){m[j]=0;queue.push(j);}}}}
 expect(components).toBe(50);
 for(const [id,x,bands] of [["us",1000,13],["de",500,3],["th",500,5]] as const){let n=1;for(let y=1;y<1000;y++)if(sampleSymbol(id,x,y)!==sampleSymbol(id,x,y-1))n++;expect(n).toBe(bands);}
});
test("craft mutations preserve every selected identity and frame fit",()=>{
 let s=1234;const rng=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};
 const ga={mutationRate:.35,pickN:4,crossoverRate:.7,newBloodRate:.2,longevityMin:3,longevityMax:7};
 for(const [symbolId] of SYMBOLS)for(let n=0;n<32;n++){const p=decode(engine.mutate(g,rng,ga),{symbolId});expect(p.symbolId).toBe(symbolId);const f=layout(p,640,360);expect(f.width>0&&f.height>0&&f.left>=0&&f.top>=0).toBe(true);}
 expect(()=>decode(g,{symbolId:"unknown"})).toThrow();
});
