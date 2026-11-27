import { describe, expect, it } from "vitest";
import { advanceGeneration } from "../src/core/ga";
import type { Candidate, GASettingsSnapshot } from "../src/core/types";

function u16(vals: number[]): Uint16Array {
  return new Uint16Array(vals.map(v => v & 0xffff));
}

const SETTINGS: GASettingsSnapshot = {
  pickN: 1,
  mutationRate: 0,
  crossoverRate: 0,
  newBloodRate: 0,
  longevityMin: 3,
  longevityMax: 3
};

function mk(id: string, genome: Uint16Array, status: Candidate["status"], age: number, maxAge: number): Candidate {
  return { id, genomeQ16: genome, status, age, maxAge };
}

describe("ga advance", () => {
  it("carries over picked candidates (age increments, status resets)", () => {
    const a = mk("a", u16([1, 2, 3, 4]), "picked", 0, 3);
    const b = mk("b", u16([9, 9, 9, 9]), "normal", 0, 3);

    const out = advanceGeneration({ sessionSeed: 123, generationIndex: 0, candidates: [b, a], settings: SETTINGS }).nextCandidates;
    const carried = out.find(c => c.id === "a");
    expect(carried).toBeTruthy();
    expect(carried!.genomeQ16).toEqual(a.genomeQ16);
    expect(carried!.age).toBe(1);
    expect(carried!.status).toBe("normal");
  });

  it("expires picked candidates into retired for one generation, then replaces them next advance", () => {
    const a = mk("a", u16([1, 1, 1, 1]), "picked", 2, 3);
    const b = mk("b", u16([2, 2, 2, 2]), "normal", 0, 3);

    const g1 = advanceGeneration({ sessionSeed: 123, generationIndex: 0, candidates: [a, b], settings: SETTINGS }).nextCandidates;
    const retired = g1.find(c => c.id === "a")!;
    expect(retired.status).toBe("retired");
    expect(retired.age).toBe(3);

    const g2 = advanceGeneration({ sessionSeed: 123, generationIndex: 1, candidates: g1, settings: SETTINGS }).nextCandidates;
    expect(g2.find(c => c.id === "a")).toBeUndefined();
    expect(g2).toHaveLength(2);
  });

  it("excludes skipped candidates from the parent pool", () => {
    const skipped = mk("a", u16([100, 100, 100, 100]), "skipped", 0, 99);
    const parent = mk("b", u16([200, 200, 200, 200]), "normal", 0, 99);

    const out = advanceGeneration({ sessionSeed: 1, generationIndex: 0, candidates: [skipped, parent], settings: SETTINGS }).nextCandidates;
    for (const c of out) {
      expect(Array.from(c.genomeQ16)).toEqual(Array.from(parent.genomeQ16));
    }
  });

  it("is deterministic for the same inputs", () => {
    const a = mk("a", u16([1, 2, 3, 4]), "picked", 0, 3);
    const b = mk("b", u16([9, 8, 7, 6]), "normal", 0, 3);

    const one = advanceGeneration({ sessionSeed: 999, generationIndex: 7, candidates: [a, b], settings: SETTINGS }).nextCandidates;
    const two = advanceGeneration({ sessionSeed: 999, generationIndex: 7, candidates: [a, b], settings: SETTINGS }).nextCandidates;
    expect(one).toEqual(two);
  });
});

