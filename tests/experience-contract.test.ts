import { describe,it,expect } from "vitest";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { EXPERIENCES, resolveExperience } from "../src/experiences";
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
