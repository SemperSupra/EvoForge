import {describe,it,expect} from "vitest";
import {presentedStage,presentationComplete,stageDwell} from "../src/ui/lens-presentation";
import {lensStages,ringMembership} from "../src/ui/evolution-lenses";
import type {Candidate} from "../src/core/types";
describe("truthful Mosaic presentation",()=>{
 it("requires actual receipt and a readable exploration and rendered dwell",()=>{
  const d=stageDwell(20);expect(d).toBe(1100);expect(presentedStage(false,{readyAt:0},99999,0,d)).toBe(0);
  expect(presentedStage(true,undefined,99999,0,d)).toBe(0);
  expect(presentedStage(true,{readyAt:0},d-1,0,d)).toBe(0);
  expect(presentedStage(true,{readyAt:0},d,0,d)).toBe(1);
  expect(presentedStage(true,{readyAt:0},2*d-1,0,d)).toBe(1);
  expect(presentedStage(true,{readyAt:0},2*d,0,d)).toBe(2);
  expect(presentedStage(true,{readyAt:4000},4000,0,d)).toBe(1);
  expect(presentedStage(true,{readyAt:4000},4000+d-1,0,d)).toBe(1);
  expect(presentedStage(true,{readyAt:0},d,15,d)).toBe(0);
  expect(stageDwell(1)).toBeGreaterThanOrEqual(600);
 });
 it("keeps one marker per candidate and does not grant eligibility to skipped or failed candidates",()=>{
  const candidates:Candidate[]=[{id:"a",genomeQ16:new Uint16Array(),status:"normal",age:0,maxAge:5},{id:"b",genomeQ16:new Uint16Array(),status:"skipped",age:0,maxAge:5},{id:"c",genomeQ16:new Uint16Array(),status:"normal",age:0,maxAge:5}];
  const previews=new Map([["a",{w:1,h:1,rgba:new Uint8ClampedArray([0,0,0,255]),status:"ready" as const}],["b",{w:1,h:1,rgba:new Uint8ClampedArray([0,0,0,255]),status:"ready" as const}],["c",{w:1,h:1,rgba:new Uint8ClampedArray(4),status:"err" as const}]]);
  const stages=new Map<string,0|1|2>([["a",1],["b",2],["c",2]]);
  expect(ringMembership(lensStages(candidates,previews,[],stages))).toEqual([{id:"c",ring:0},{id:"a",ring:1},{id:"b",ring:1}]);
  stages.set("a",2);expect(ringMembership(lensStages(candidates,previews,[],stages))).toEqual([{id:"c",ring:0},{id:"b",ring:1},{id:"a",ring:2}]);
  expect(presentationComplete(["a","b"],stages)).toBe(true);
  expect(presentationComplete(["missing"],stages)).toBe(false);
 });
});
