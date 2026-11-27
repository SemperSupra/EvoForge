import {test,expect} from "vitest";
import {atelierParents,initialAtelierGenome,ATELIER_FAMILIES} from "../src/engines/mosaic/studio";
import {getEngine} from "../src/engines/registry";
import {XorShift32} from "../src/core/prng";
import {advanceGeneration} from "../src/core/ga";
import {makeRecipe} from "../src/core/recipe";
import type {Candidate} from "../src/core/types";
const engine=getEngine("mosaic","2.0.0");
const settings={pickN:1,mutationRate:.22,crossoverRate:1,newBloodRate:0,longevityMin:3,longevityMax:7};
const recipe=(g:Uint16Array,familyId:number,paletteId:string)=>makeRecipe({engineId:"mosaic",engineVersion:"2.0.0",genomeQ16:g,engineConfig:{familyId,paletteId},renderIntent:{kind:"thumb",width:320,height:180,lod:1}});
test("favorites are actual normalized and deduplicated ancestry, independent of input order",()=>{
 const g=new Uint16Array(16).fill(999), a=recipe(g,3,"marine"),b=recipe(g,0,"ravenna");
 const parents=atelierParents([a,b,a,{...a,engineVersion:"1.0.0"},null]);
 expect(parents).toEqual(atelierParents([b,a]));
 expect(parents.length).toBe(2);
 expect((engine.decode(parents[0],{}) as any).family).toBe(0);
 expect((engine.decode(parents[1],{}) as any).family).toBe(3);
 expect((engine.decode(parents[1],{}) as any).paletteId).toBe("marine");
 expect(initialAtelierGenome(new XorShift32(1),1,parents,16)).toEqual(parents[1]);
 const families=new Set(Array.from({length:14},(_,i)=>(engine.decode(initialAtelierGenome(new XorShift32(i),i+2,parents,16),{}) as any).family));
 expect(families.size).toBe(ATELIER_FAMILIES.length);
});
test("GA dispatches semantic engine operators and preserves picked parent",()=>{
 const g=new Uint16Array(16).fill(123),a:Candidate={id:"a",genomeQ16:g,status:"picked",age:0,maxAge:5},b:Candidate={id:"b",genomeQ16:new Uint16Array(16).fill(444),status:"normal",age:0,maxAge:5};
 let cross=0,mutate=0;
 const out=advanceGeneration({sessionSeed:42,generationIndex:0,candidates:[a,b],settings,engine:{crossover(x,y,r,s){cross++;return engine.crossover(x,y,r,s)},mutate(x,r,s){mutate++;return engine.mutate(x,r,s)}}});
 expect(cross).toBe(1);expect(mutate).toBe(1);expect(out.nextCandidates[0].genomeQ16).toEqual(g);expect(out.nextCandidates[1].genomeQ16.length).toBe(16);
});
