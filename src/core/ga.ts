import type { Candidate, GASettingsSnapshot } from "./types";
import { XorShift32, mixU32 } from "./prng";
import type { CandidateEngine } from "../engines/types";

export type AdvanceInput = {
  sessionSeed: number;
  generationIndex: number;
  candidates: Candidate[];
  settings: GASettingsSnapshot;
  engine?: Pick<CandidateEngine, "mutate" | "crossover" | "repair">;
  noveltyKey?: (genome:Uint16Array)=>string;
};
export type AdvanceOutput = { nextCandidates: Candidate[] };

function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }

export function randomGenome(rng: XorShift32, len: number): Uint16Array {
  const g = new Uint16Array(len);
  for (let i = 0; i < len; i++) g[i] = (rng.nextU32() & 0xffff) >>> 0;
  return g;
}

export function advanceGeneration(input: AdvanceInput): AdvanceOutput {
  const { sessionSeed, generationIndex, candidates, settings, engine, noveltyKey } = input;
  const compare = (a: Candidate,b: Candidate) => engine ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.id.localeCompare(b.id);
  const rng = new XorShift32(mixU32(sessionSeed >>> 0, generationIndex >>> 0));

  const popSize = candidates.length;
  const genomeLen = candidates[0]?.genomeQ16?.length ?? 64;
  const next: Candidate[] = [];

  const alive = candidates.filter(c => c.status !== "retired");
  const picked = alive.filter(c => c.status === "picked").slice().sort(compare);
  const normals = alive.filter(c => c.status === "normal");
  const pool = (picked.length ? picked : (normals.length ? normals : alive))
    .filter(c => c.status !== "skipped")
    .slice()
    .sort(compare);

  // Carry over picked candidates with longevity (age/maxAge). Picks are per-generation and are reset.
  for (const c of picked) {
    const age2 = (c.age | 0) + 1;
    if (age2 >= (c.maxAge | 0)) next.push({ ...c, status: "retired", age: age2 });
    else next.push({ ...c, status: "normal", age: age2 });
    if (next.length >= popSize) break;
  }

  const seen=new Set(noveltyKey?next.map(c=>noveltyKey(c.genomeQ16)):[]);
  for (let i = next.length; i < popSize; i++) {
    const r = rng.fork(i);
    const immigrant = r.nextFloat01() < clamp01(settings.newBloodRate);
    let genome: Uint16Array;

    if (immigrant || pool.length === 0) {
      genome = randomGenome(r, genomeLen);
    } else {
      const a = pool[(r.nextU32() % pool.length) | 0];
      const b = pool[(r.nextU32() % pool.length) | 0];
      const doCross = r.nextFloat01() < clamp01(settings.crossoverRate);
      const nextFloat = () => r.nextFloat01();
      genome = doCross ? (engine ? engine.crossover(a.genomeQ16,b.genomeQ16,nextFloat,settings) : crossover(r, a.genomeQ16, b.genomeQ16)) : a.genomeQ16.slice();
      genome = engine ? engine.mutate(genome,nextFloat,settings) : mutate(r, genome, clamp01(settings.mutationRate));
      if(engine?.repair)genome=engine.repair(genome);
    }

    if(noveltyKey){
      let key=noveltyKey(genome);
      for(let attempt=0;attempt<8&&seen.has(key);attempt++){
        genome=attempt===7?randomGenome(r,genomeLen):engine?engine.mutate(genome,()=>r.nextFloat01(),settings):mutate(r,genome,clamp01(settings.mutationRate));
        if(engine?.repair)genome=engine.repair(genome);
        key=noveltyKey(genome);
      }
      seen.add(key);
    }
    next.push({
      id: `g${generationIndex+1}-c${i}`,
      genomeQ16: genome,
      status: "normal",
      age: 0,
      maxAge: sampleLongevity(r, settings.longevityMin, settings.longevityMax)
    });
  }

  return { nextCandidates: next };
}

export function crossover(r: XorShift32, a: Uint16Array, b: Uint16Array): Uint16Array {
  const len = Math.min(a.length, b.length);
  const out = new Uint16Array(len);
  const cut = (r.nextFloat01() * len) | 0;
  for (let i = 0; i < len; i++) out[i] = (i < cut) ? a[i] : b[i];
  return out;
}
export function mutate(r: XorShift32, g: Uint16Array, rate01: number): Uint16Array {
  const out = g.slice();
  for (let i = 0; i < out.length; i++) {
    if (r.nextFloat01() < rate01) {
      const delta = (r.nextU32() & 0x3ff) - 0x200;
      out[i] = (out[i] + delta) & 0xffff;
    }
  }
  return out;
}
export function sampleLongevity(r: XorShift32, min: number, max: number): number {
  const lo = Math.max(1, min|0);
  const hi = Math.max(lo, max|0);
  const t = r.nextFloat01();
  return lo + ((t * (hi - lo + 1)) | 0);
}
