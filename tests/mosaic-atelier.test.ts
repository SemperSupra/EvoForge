import { test, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getEngine } from "../src/engines/registry";
import { recipeGenomeU16, parseRecipe } from "../src/core/recipe";
import { XorShift32 } from "../src/core/prng";
import type { RenderIntent } from "../src/core/types";
const root=new URL("./golden/mosaic/",import.meta.url);
const read=(p:string)=>JSON.parse(readFileSync(new URL(p,root),"utf8"));
const hash=(a:Uint8ClampedArray)=>createHash("sha256").update(a).digest("hex");
const engine=getEngine("mosaic","2.0.0");
test("both old and new exact CPU goldens remain pinned",async()=>{
  for(const version of ["1.0.0","2.0.0"]){
    const manifest=read(version+"/manifest.json");
    for(const f of manifest.fixtures){
      const recipe=parseRecipe(read(version+"/"+f.recipePath));
      const g=recipeGenomeU16(recipe),e=getEngine(recipe.engineId,recipe.engineVersion);
      for(const r of f.renders){
        const intent={kind:r.kind,width:r.w,height:r.h,lod:r.lod,...(r.kind==="full"?{format:r.format??"png"}:{})} as RenderIntent;
        const a=await e.renderRGBA(g,recipe.engineConfig,intent);
        expect(hash(a.rgba)).toBe(r.sha256);
        expect(a.rgba.length).toBe(r.w*r.h*4);
      }
    }
  }
},30000);
test("five design families, random genomes and legal extents",async()=>{
  const rng=new XorShift32(0x12345678);
  for(let i=0;i<32;i++){
    const g=Uint16Array.from({length:16},()=>rng.nextU32()&0xffff);
    const a=await engine.renderRGBA(g,engine.defaultConfig(),{kind:"thumb",width:192,height:108,lod:i%3});
    expect(a.rgba.length).toBe(192*108*4);
    expect(a.rgba.every((v,j)=>j%4!==3||v===255)).toBe(true);
  }
  for(const value of [0,65535])for(let familyId=0;familyId<5;familyId++){
    const a=await engine.renderRGBA(new Uint16Array(16).fill(value),{familyId,paletteId:"evolved"},{kind:"thumb",width:192,height:108,lod:2});
    expect(a.rgba.every((v,j)=>j%4!==3||v===255)).toBe(true);
  }
  await expect(engine.renderRGBA(new Uint16Array(64),{}, {kind:"thumb",width:320,height:180,lod:1})).rejects.toThrow();
  for(const [width,height] of [[0,10],[1,20],[8193,1],[Infinity,10]])await expect(engine.renderRGBA(new Uint16Array(16),{}, {kind:"thumb",width,height,lod:1})).rejects.toThrow();
},30000);
test("mutations are bounded, reproducible and normally preserve the design family",()=>{
  const base=recipeGenomeU16(parseRecipe(read("2.0.0/fixtures/medallion.json")));
  const settings={pickN:4,mutationRate:.22,crossoverRate:.7,newBloodRate:.2,longevityMin:3,longevityMax:7};
  const a=new XorShift32(42),b=new XorShift32(42);
  let retained=0,changed=0;
  for(let i=0;i<256;i++){
    const c=engine.mutate(base,()=>a.nextFloat01(),settings);
    expect(c).toEqual(engine.mutate(base,()=>b.nextFloat01(),settings));
    expect(c.length).toBe(16);
    if((engine.decode(c,{}) as {family:number}).family===(engine.decode(base,{}) as {family:number}).family)retained++;
    if(c.some((v,j)=>v!==base[j]))changed++;
  }
  expect(retained).toBeGreaterThan(220);
  expect(changed).toBeGreaterThan(180);
});
