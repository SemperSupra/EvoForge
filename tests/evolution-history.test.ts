import {describe,it,expect} from "vitest";
import {CheckpointArchive,encodeCheckpoint,decodeCheckpoint,checkpointId,forkCheckpoint,advanceCheckpoint,type Checkpoint} from "../src/core/evolution-history";
import {getEngine,ENGINE_REGISTRY} from "../src/engines/registry";
import {randomGenome,advanceGeneration} from "../src/core/ga";
import {XorShift32} from "../src/core/prng";
import {noveltyKey as motifNoveltyKey} from "../src/engines/mosaic/motif-lab.mjs";
import {mosaicNoveltyKey} from "../src/engines/mosaic/v3";
function fixture(key:string):Checkpoint{
 const [engineId,engineVersion]=key.split("@"),engine=getEngine(engineId,engineVersion),rng=new XorShift32(42),settings={pickN:4,mutationRate:.22,crossoverRate:.7,newBloodRate:.15,longevityMin:3,longevityMax:7};
 const candidates=Array.from({length:16},(_,i)=>({id:"g0-c"+i,genomeQ16:Array.from(randomGenome(rng,engine.spec().genomeLength)),status:"normal" as const,age:0,maxAge:5}));
 return {schema:1,branch:"main",parent:null,engineId,engineVersion,engineConfig:engine.defaultConfig(),sessionSeed:123,effectiveSessionSeed:456,generationIndex:0,settings,candidates};
}
describe("versioned generation checkpoint",()=>{
 for(const key of Object.keys(ENGINE_REGISTRY))it("replay matches actual GA for "+key,async()=>{
  const cp=fixture(key),bytes=encodeCheckpoint(cp),next=await advanceCheckpoint(cp),again=await advanceCheckpoint(decodeCheckpoint(bytes));
  expect(encodeCheckpoint(next)).toBe(encodeCheckpoint(again));expect(encodeCheckpoint(cp)).toBe(bytes);
  expect(next.parent).toBe(await checkpointId(cp));
  const engine=getEngine(cp.engineId,cp.engineVersion),legacy=key==="mosaic@1.0.0",novelty=cp.engineId==="mosaic-motif"?((g:Uint16Array)=>motifNoveltyKey(g,cp.engineConfig)):key==="mosaic@3.0.0"?((g:Uint16Array)=>mosaicNoveltyKey(g,cp.engineConfig)):undefined;
  const actual=advanceGeneration({sessionSeed:legacy?cp.sessionSeed:cp.effectiveSessionSeed,generationIndex:0,candidates:cp.candidates.map(c=>({...c,genomeQ16:Uint16Array.from(c.genomeQ16)})),settings:cp.settings,...(!legacy?{engine}:{}),...(novelty?{noveltyKey:novelty}:{})});
  expect(next.candidates).toEqual(actual.nextCandidates.map(c=>({...c,genomeQ16:Array.from(c.genomeQ16)})));
 });
 it("forks alternative selections without mutating original history",async()=>{
  const base=fixture("mosaic@3.0.0"),original=encodeCheckpoint(base),a=await forkCheckpoint(base,"A",{"g0-c0":"picked"}),b=await forkCheckpoint(base,"B",{"g0-c1":"picked"});
  const na=await advanceCheckpoint(a),nb=await advanceCheckpoint(b);
  expect(a.parent).toBe(b.parent);expect(na.candidates).not.toEqual(nb.candidates);expect(encodeCheckpoint(base)).toBe(original);
  await expect(forkCheckpoint(base,"main")).rejects.toThrow();await expect(forkCheckpoint(base,"bad",{"unknown":"picked"})).rejects.toThrow();
  const archive=new CheckpointArchive(5),id=await archive.add(base);await archive.add(a);await archive.add(b);await archive.add(na);await archive.add(nb);
  const restored=await CheckpointArchive.restore(archive.export(),5);expect(restored.size).toBe(5);expect(encodeCheckpoint(restored.get(id))).toBe(original);
  await expect(archive.add(await advanceCheckpoint(na))).rejects.toThrow("archive full");
  const exported=JSON.parse(archive.export());exported.entries[0].id="0".repeat(64);await expect(CheckpointArchive.restore(JSON.stringify(exported))).rejects.toThrow("hash mismatch");
 });
 it("fails closed on wrong engine, invalid genomes or implicit configuration",()=>{
  const cp=fixture("mosaic@1.0.0");
  expect(()=>encodeCheckpoint({...cp,engineVersion:"99.0.0"})).toThrow("Missing engine");
  expect(()=>encodeCheckpoint({...cp,candidates:[{...cp.candidates[0],genomeQ16:[-1]}]})).toThrow();
  const craft=fixture("mosaic@3.0.0");expect(()=>encodeCheckpoint({...craft,engineConfig:{}})).toThrow("explicit engine config");
  expect(()=>decodeCheckpoint(" ".repeat(600000))).toThrow("byte budget");
 });
});
