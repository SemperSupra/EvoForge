import {describe,it,expect} from "vitest";
import {radarClusters} from "../src/ui/radar-clusters";
describe("truthful radar clusters",()=>{
 it("retains every candidate's measured coordinates and stage",()=>{
  const a=[{id:"c",x:10,y:10,ring:2},{id:"b",x:14,y:10,ring:1},{id:"a",x:90,y:90,ring:3}];
  const r=radarClusters(a);expect(r).toHaveLength(2);expect(r.flatMap(c=>c.members).sort((x,y)=>x.id.localeCompare(y.id))).toEqual(a.slice().sort((x,y)=>x.id.localeCompare(y.id)));
  expect(r.find(c=>c.members.length===2)).toMatchObject({x:12,y:10,counts:{1:1,2:1}});
  expect(radarClusters(a.slice().reverse())).toEqual(r);
 });
 it("groups transitive overlaps without duplicate identities or overlapping aggregate centers",()=>{
  const points=Array.from({length:16},(_,i)=>({id:"g0-c"+i,x:100+i*20,y:100,ring:i%3+1}));
  const r=radarClusters(points,32);expect(r.flatMap(x=>x.members)).toHaveLength(16);expect(new Set(r.flatMap(x=>x.members.map(p=>p.id))).size).toBe(16);
  for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++)expect(Math.hypot(r[i].x-r[j].x,r[i].y-r[j].y)).toBeGreaterThanOrEqual(32);
  expect(radarClusters([])).toEqual([]);expect(()=>radarClusters([points[0],points[0]])).toThrow();
 });
});
