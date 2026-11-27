import { describe, it, expect } from "vitest";
import { XorShift32 } from "../src/core/prng";

describe("XorShift32", () => {
  it("deterministic for same seed", () => {
    const a = new XorShift32(123);
    const b = new XorShift32(123);
    const outA = Array.from({length: 10}, () => a.nextU32());
    const outB = Array.from({length: 10}, () => b.nextU32());
    expect(outA).toEqual(outB);
  });
});
