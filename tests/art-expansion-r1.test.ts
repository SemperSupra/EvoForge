import {expect,test} from "vitest";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {getEngine} from "../src/engines/registry";
import {decode,CATALOG,roleMask} from "../src/engines/mosaic/motif-lab.mjs";
import {base64ToU16LE} from "../src/core/genome";
import type {RenderIntent} from "../src/core/types";
const hash=(rgba:Uint8ClampedArray)=>createHash("sha256").update(rgba).digest("hex");
const motif=JSON.parse(readFileSync(new URL("./fixtures/motif-r1-goldens.json",import.meta.url),"utf8"));
const craft=JSON.parse(readFileSync(new URL("./fixtures/atelier-v3-goldens.json",import.meta.url),"utf8"));
test("176 motif/technique exact golden renders, fixed identities and opaque complete output",async()=>{
 const e=getEngine(motif.engineId,motif.engineVersion);
 expect(CATALOG.length).toBe(44);expect(new Set(CATALOG.map(x=>x[0])).size).toBe(44);
 expect(motif.fixtures.length).toBe(176);
 for(const f of motif.fixtures){const g=Uint16Array.from(f.genome);const r=await e.renderRGBA(g,f.config,f.render);expect(hash(r.rgba),f.id+":"+f.technique).toBe(f.sha256);expect(r.rgba.length).toBe(f.render.width*f.render.height*4);expect(r.rgba.every((v,i)=>i%4!==3||v===255)).toBe(true);expect(decode(g,f.config).id).toBe(f.id);expect(new Set(roleMask(g,f.config).mask).size).toBeGreaterThanOrEqual(3);}
},60000);
test("56 Mosaic Atelier v3 exact golden renders",async()=>{
 const e=getEngine(craft.engineId,craft.engineVersion);expect(craft.fixtures.flatMap((f:any)=>f.renders).length).toBe(56);
 for(const f of craft.fixtures){const g=base64ToU16LE(f.base64,24);for(const r of f.renders){const i={kind:r.kind,width:r.w,height:r.h,lod:r.lod,...(r.kind==="full"?{format:"png"}:{})} as RenderIntent;const v=await e.renderRGBA(g,f.config,i);expect(hash(v.rgba),f.name).toBe(r.sha256);}}
},60000);
test("invalid motifs and malformed heraldry fail closed",()=>{const g=new Uint16Array(16);for(const c of [{motifId:"nope"},{motifId:"heraldry",heraldry:{charge:"nope"}},{motifId:"heraldry",heraldry:{motto:"<X>"}}])expect(()=>decode(g,c)).toThrow();});
