import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {buildGoldenPlan,EXPECTED_RENDERS,SUITES} from "../scripts/golden-plan.mjs";
const read=async(p:string)=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
describe("release golden inventory",()=>{
 it("pins every historical suite and canonical render",async()=>{const plan=await buildGoldenPlan(read);expect(EXPECTED_RENDERS).toBe(298);expect(plan.length).toBe(298);expect(SUITES.length).toBe(5);expect(new Set(plan.map(j=>j.id)).size).toBe(298);});
 it("rejects missing and empty suites",async()=>{for(const bad of [undefined,{}])await expect(buildGoldenPlan(async(p:string)=>p===SUITES[0].path?bad:read(p))).rejects.toThrow();});
 it("rejects wrong engine, invalid digest, duplicate and omitted render",async()=>{for(const edit of [(s:any)=>{s.engineVersion="wrong";},(s:any)=>{s.fixtures[0].renders[0].sha256="invalid";},(s:any)=>{s.fixtures[0].renders[1]=s.fixtures[0].renders[0];},(s:any)=>{s.fixtures[0].renders.pop();}])await expect(buildGoldenPlan(async(p:string)=>{const s=await read(p);if(p===SUITES[0].path)edit(s);return s;})).rejects.toThrow();});
});
