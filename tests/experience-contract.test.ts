import { describe,it,expect } from "vitest";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { EXPERIENCES, resolveExperience } from "../src/experiences";
import { DEMOS, filterDemos } from "../src/ui/launcher";
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
