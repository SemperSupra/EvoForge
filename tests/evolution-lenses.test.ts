import {describe,it,expect} from "vitest";
import {lensStages,previewMetrics,ringMembership,populationProjection} from "../src/ui/evolution-lenses";
import type {Candidate} from "../src/core/types";
const candidate=(id:string,status:Candidate["status"]):Candidate=>({id,status,age:0,maxAge:5,genomeQ16:new Uint16Array([1])});
const p=(v:number)=>({w:2,h:2,rgba:new Uint8ClampedArray([v,v,v,255,v,v,v,255,v,v,v,255,v,v,v,255]),status:"ready" as const});
describe("live raster lenses",()=>{
 it("uses observed ready images and bounded descriptive measures",()=>{
  const black=previewMetrics(p(0))!,white=previewMetrics(p(255))!;
  expect(black.brightness).toBe(0);expect(white.brightness).toBeCloseTo(1);expect(white.saturation).toBe(0);expect(white.contrast).toBeCloseTo(0);
  expect(previewMetrics({...p(0),status:"gen"})).toBeNull();
 });
 it("records each actual retained and removed identity without changing candidates",()=>{
  const cs=[candidate("a","normal"),candidate("b","picked"),candidate("c","skipped"),candidate("d","normal")];
  const before=cs.map(c=>c.status);const m=new Map([["a",p(0)],["b",p(255)],["c",p(255)]]);
  const s=lensStages(cs,m,[{metric:"brightness",minimum:.5}]);
  expect(s.map(x=>x.ids)).toEqual([["a","b","c","d"],["a","b","c"],["a","b"],["b"],["b"]]);
  expect(s.map(x=>x.removed)).toEqual([[],["d"],["c"],["a"],[]]);expect(cs.map(c=>c.status)).toEqual(before);
 });
});

it("assigns each candidate exactly once to its deepest passed ring",()=>{const cs=[candidate("a","normal"),candidate("b","picked"),candidate("c","skipped"),candidate("d","normal")];const m=new Map([["a",p(0)],["b",p(255)],["c",p(255)]]);const r=ringMembership(lensStages(cs,m,[{metric:"brightness",minimum:.5}]));expect(r).toEqual([{id:"d",ring:0},{id:"c",ring:1},{id:"a",ring:2},{id:"b",ring:4}]);expect(new Set(r.map(x=>x.id)).size).toBe(cs.length);});
it("projects measured dimensions without implying fitness",()=>{const q=populationProjection({brightness:.5,contrast:1,saturation:0,edge:0});expect(q).toEqual({x:1,y:0});expect(populationProjection({brightness:.5,contrast:0,saturation:0,edge:0})).toEqual({x:0,y:0});});
