import { describe,it,expect } from "vitest";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { EXPERIENCES, resolveExperience } from "../src/experiences";
import { DEMOS, filterDemos } from "../src/ui/launcher";
import { RESEARCH_ARTICLES, RESEARCH_SOURCES } from "../src/ui/research-encyclopedia";
import { DEMO_LIMITATIONS } from "../src/ui/research-limitations";
import { VISUAL_IDS, nearestSite, voronoiCell, rayCrossings, fitRatio, mixRgb, constraintPair } from "../src/ui/research-visuals";
const read = (path:string) => readFileSync(new URL("../"+path,import.meta.url),"utf8");
describe("multi-experience contract",()=>{
  it("defaults to launcher, preserves Mosaic and golden routes",()=>{
    expect(resolveExperience("","")).toBe("launcher");
    expect(resolveExperience("?experience=mosaic","")).toBe("mosaic");
    expect(resolveExperience("?experience=mosaic-legacy","")).toBe("mosaic-legacy");
    for(const id of ["mosaic-craft","mosaic-motifs","mosaic-emblems"])expect(resolveExperience("?experience="+id,"")).toBe(id);
    expect(resolveExperience("?experience=invalid","")).toBe("launcher");
    expect(resolveExperience("?experience=invalid","#golden")).toBe("golden");
  });
  it("keeps machine-readable catalog synchronized",()=>{
    expect(JSON.parse(read("public/experiences.json")).experiences).toEqual(EXPERIENCES);
  });
  it("exposes each existing launch action once and filters demos without starting runtimes",()=>{
    expect(DEMOS.flatMap(d=>d.actions.map(a=>a.href)).sort()).toEqual(EXPERIENCES.flatMap(e=>e.actions.map(a=>a.href)).sort());
    expect(filterDemos("life","").map(d=>d.id)).toEqual(["arena"]);
    expect(filterDemos("art","heraldry").map(d=>d.id)).toEqual(["motif"]);
    expect(filterDemos("all","unmatched-keyword")).toEqual([]);
    expect(filterDemos("archive","legacy").map(d=>d.id)).toEqual(["legacy"]);
  });
  it("gives every demo an accessible research article with resolved primary references and investigation",()=>{
    expect(Object.keys(RESEARCH_ARTICLES).sort()).toEqual(DEMOS.map(d=>d.id).sort());
    for(const a of Object.values(RESEARCH_ARTICLES)){expect(a.sections.length).toBeGreaterThanOrEqual(5);expect(a.challenge.steps.length).toBeGreaterThanOrEqual(3);expect(a.scope.length).toBeGreaterThan(30);expect(a.paths.length).toBeGreaterThan(0);for(const s of a.sections)for(const id of s.refs)expect(RESEARCH_SOURCES[id]?.url).toMatch(/^https:\/\//);}
    expect(filterDemos("all","spatial hashing").map(d=>d.id)).toEqual(["arena"]);
  });
  it("links every demo to explicit limitations and a teaching model",()=>{
    expect([...VISUAL_IDS].sort()).toEqual(DEMOS.map(d=>d.id).sort());
    expect(Object.keys(DEMO_LIMITATIONS).sort()).toEqual(DEMOS.map(d=>d.id).sort());
    for(const l of Object.values(DEMO_LIMITATIONS)){expect(l.length).toBeGreaterThanOrEqual(3);for(const q of l)expect([q.why,q.effect,q.investigate].every(x=>x.length>20)).toBe(true);}
  });
  it("checks the actual mathematics in the teaching models",()=>{
    const sites=[[50,40],[270,40],[160,150]] as const;
    expect(nearestSite([53,45],sites)).toBe(0);
    for(let i=0;i<sites.length;i++)for(const p of voronoiCell(sites,i))for(const q of sites)expect((p[0]-sites[i][0])**2+(p[1]-sites[i][1])**2).toBeLessThanOrEqual((p[0]-q[0])**2+(p[1]-q[1])**2+1e-7);
    const square=[[0,0],[10,0],[10,10],[0,10]] as const;
    expect(rayCrossings([5,5],square).length%2).toBe(1);
    expect(rayCrossings([-5,5],square).length%2).toBe(0);
    expect(fitRatio(3,2,90,120)).toEqual({width:90,height:60});
    expect(mixRgb([0,120,255],[255,60,0],.5)).toEqual([128,90,128]);
    expect(constraintPair(220,100,1).remaining).toBe(100);
  });
  it("parses shipped JavaScript and constrains GPU bindings",()=>{
    const arena=read("public/experiences/alife/index.html");
    const js=arena.split("<script>")[1].split("</script>")[0];
    expect(()=>new Script(js)).not.toThrow();
    expect(()=>new Script(read("public/experiences/alife/sw.js"))).not.toThrow();
    const compute=arena.split("const WGSL_COMPUTE = /* wgsl */"+"\x60")[1].split("\x60;")[0];
    expect(compute.match(/var<storage,/g)?.length).toBe(8);
    expect(compute).not.toMatch(/\bmeta\b|xz\.z|@binding\(9\)/);
    expect(js).not.toContain("Math.random()");
    expect(JSON.parse(read("public/experiences/alife/manifest.webmanifest")).scope).toBe("./");
  });
});
