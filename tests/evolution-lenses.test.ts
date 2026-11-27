import {describe,it,expect} from "vitest";
import {lensStages,previewMetrics} from "../src/ui/evolution-lenses";
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
