import { describe, it, expect } from "vitest";
import { u16ToBase64LE, base64ToU16LE } from "../src/core/genome";

describe("genome encoding", () => {
  it("roundtrips", () => {
    const g = new Uint16Array([0,1,2,65535,12345,54321]);
    const b64 = u16ToBase64LE(g);
    const back = base64ToU16LE(b64, g.length);
    expect(Array.from(back)).toEqual(Array.from(g));
  });
});
