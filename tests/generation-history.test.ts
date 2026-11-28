import {describe,it,expect} from "vitest";
import {GenerationHistory,type LiveGeneration} from "../src/ui/generation-history";
import {getEngine} from "../src/engines/registry";
import {randomGenome} from "../src/core/ga";
import {XorShift32} from "../src/core/prng";
function store(){const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)}};}
function live():LiveGeneration{const e=getEngine("mosaic","3.0.0"),r=new XorShift32(42);return {engineId:"mosaic",engineVersion:"3.0.0",engineConfig:e.defaultConfig(),sessionSeed:1,effectiveSessionSeed:2,generationIndex:0,settings:{pickN:4,mutationRate:.2,crossoverRate:.7,newBloodRate:.1,longevityMin:3,longevityMax:7},candidates:Array.from({length:16},(_,i)=>({id:"g0-c"+i,genomeQ16:randomGenome(r,e.spec().genomeLength),status:"normal",age:0,maxAge:5}))};}
describe("live generation history adapter",()=>{
 it("captures synchronous input, ordered ancestry and persists across reload",async()=>{
  const storage=store(),h=new GenerationHistory("mosaic","3.0.0",storage),l=live(),original=l.candidates[0].genomeQ16[0];
  const one=h.record("session-a",l);l.candidates[0].genomeQ16[0]=(original+1)%65536;l.generationIndex=1;
  const two=h.record("session-a",l);const id1=await one,id2=await two;
  expect(h.get(id1).candidates[0].genomeQ16[0]).toBe(original);expect(h.get(id2).parent).toBe(id1);expect(h.rows().map(x=>x.generationIndex)).toEqual([0,1]);
  const restored=new GenerationHistory("mosaic","3.0.0",storage);await restored.settled();expect(restored.rows()).toEqual(h.rows());
  await restored.record("session-b",live());expect(restored.rows()).toHaveLength(3);expect(restored.get(restored.rows()[2].id).parent).toBeNull();
 });
 it("compares a historical alternative without changing live or archive",async()=>{
  const h=new GenerationHistory("mosaic","3.0.0",store()),l=live(),id=await h.record("session-a",l),before=h.export(),original=l.candidates.map(c=>Array.from(c.genomeQ16));
  const r=await h.compare(id,"preview-a",{"g0-c1":"picked"});expect(r.changedSlots).toBeGreaterThan(0);expect(r.baseline.generationIndex).toBe(1);expect(r.alternative.branch).toBe("preview-a");expect(h.export()).toBe(before);expect(l.candidates.map(c=>Array.from(c.genomeQ16))).toEqual(original);
 });
 it("creates a separate explicit branch with immutable parent and recorded lineage",async()=>{
  const h=new GenerationHistory("mosaic","3.0.0",store()),l=live(),id=await h.record("session-a",l),original=h.get(id);
  const f=await h.createFork(id,"branch-b",{"g0-c1":"picked"});expect(f.checkpoint.parent).toBe(id);expect(f.checkpoint.branch).toBe("branch-b");expect(f.checkpoint.candidates[1].status).toBe("picked");
  expect(h.get(id)).toEqual(original);expect(h.rows()).toHaveLength(2);
  l.generationIndex=1;const next=await h.record("branch-b",l);expect(h.get(next).parent).toBe(f.id);
  await expect(h.createFork(id,"branch-b",{})).rejects.toThrow("branch already exists");
 });
 it("fails safely on storage conflict; retains in-memory export",async()=>{
  const storage=store(),a=new GenerationHistory("mosaic","3.0.0",storage),b=new GenerationHistory("mosaic","3.0.0",storage);
  await Promise.all([a.settled(),b.settled()]);await a.record("session-a",live());await b.record("session-b",live());
  expect(b.warning).toMatch(/another tab/);expect(b.rows()).toHaveLength(1);
  const c=new GenerationHistory("mosaic","3.0.0",storage);await c.settled();expect(c.rows()[0].branch).toBe("session-a");
 });
});
