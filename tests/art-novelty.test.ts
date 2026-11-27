import {expect,test} from "vitest";
import {advanceGeneration,randomGenome} from "../src/core/ga";
import {XorShift32} from "../src/core/prng";
import {getEngine} from "../src/engines/registry";
import {decode,noveltyKey} from "../src/engines/mosaic/motif-lab.mjs";
import type {Candidate,GASettingsSnapshot} from "../src/core/types";
const settings:GASettingsSnapshot={pickN:4,mutationRate:.22,crossoverRate:.7,newBloodRate:.2,longevityMin:3,longevityMax:7};
test("bounded novelty and fixed identity, deterministic replay",()=>{
 const engine=getEngine("mosaic-motif","1.0.0"),cfg={motifId:"heraldry",heraldry:{charge:"cross",motto:"FORTIS"}},key=(g:Uint16Array)=>noveltyKey(g,cfg);
 const rng=new XorShift32(42);
 const candidates:Candidate[]=Array.from({length:16},(_,i)=>({id:"c"+i,genomeQ16:randomGenome(rng,16),status:i<4?"picked":"normal",age:0,maxAge:7}));
 const input={sessionSeed:42,generationIndex:0,candidates,settings,engine,noveltyKey:key};
 const a=advanceGeneration(input).nextCandidates,b=advanceGeneration(input).nextCandidates;
 expect(a).toEqual(b);expect(a.length).toBe(16);expect(a.slice(0,4).map(c=>c.genomeQ16)).toEqual(candidates.slice(0,4).map(c=>c.genomeQ16));
 expect(a.every(c=>decode(c.genomeQ16,cfg).id==="heraldry")).toBe(true);
 expect(new Set(a.map(c=>key(c.genomeQ16))).size).toBe(16);
 const impossible=advanceGeneration({...input,noveltyKey:()=>"one"}).nextCandidates;
 expect(impossible.length).toBe(16);
});
