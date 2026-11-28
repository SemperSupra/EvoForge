import {describe,it,expect} from "vitest";
import {presentedStage,presentationComplete,stageDwell,clampDwell,nextStageTime,advanceDisplayedStage,StageJournal} from "../src/ui/lens-presentation";
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

describe("reversible presentation journal",()=>{
 it("clamps independent stage pacing and cannot bypass a real rendered dwell",()=>{
   expect(clampDwell(0)).toBe(250);expect(clampDwell(100001)).toBe(10000);expect(clampDwell(NaN)).toBe(1100);
   const record={readyAt:5000,renderedAt:undefined as number|undefined};
   expect(nextStageTime(false,record,0,250,0)).toBeNull();
   expect(advanceDisplayedStage(false,record,100000,0,250,0)).toBe(0);
   expect(advanceDisplayedStage(true,record,4999,0,250,0)).toBe(0);
   expect(advanceDisplayedStage(true,record,10000,0,250,0)).toBe(1);
   expect(record.renderedAt).toBe(10000);
   expect(advanceDisplayedStage(true,record,10249,0,250,1)).toBe(1);
   expect(advanceDisplayedStage(true,record,10250,0,250,1)).toBe(2);
 });
 it("replays exact distinct snapshots, never overwrites the live frontier, and bounds memory",()=>{
   const j=new StageJournal<Readonly<{stage:number}>>(3);
   expect(j.append("0",Object.freeze({stage:0}))).toBe(true);
   expect(j.append("0",{stage:999})).toBe(false);
   j.append("1",Object.freeze({stage:1}));j.append("2",Object.freeze({stage:2}));
   expect(j.current?.stage).toBe(2);j.step(-1);expect(j.reviewing).toBe(true);expect(j.current?.stage).toBe(1);
   j.step(-1);j.step(-1);expect(j.current?.stage).toBe(0);
   j.step(1);expect(j.current?.stage).toBe(1);
   j.append("3",Object.freeze({stage:3}));expect(j.length).toBe(3);expect(j.current?.stage).toBe(1);
   j.seek(999);expect(j.current?.stage).toBe(3);expect(j.atEnd).toBe(true);
   j.seek(-99);expect(j.current?.stage).toBe(1);j.live();expect(j.reviewing).toBe(false);expect(j.current?.stage).toBe(3);
   j.clear();expect(j.length).toBe(0);expect(j.current).toBeUndefined();expect(j.reviewing).toBe(false);
 });
});
