import type { Pace, PaceProfile } from "./types";

export function paceProfile(pace: Pace): PaceProfile {
  switch (pace) {
    case "manual": return { pace, autoAdvanceDelayMs: null, thumb: { w: 384, h: 216 }, lod: 2 };
    case "slow":   return { pace, autoAdvanceDelayMs: 2500, thumb: { w: 384, h: 216 }, lod: 2 };
    case "medium": return { pace, autoAdvanceDelayMs: 900,  thumb: { w: 320, h: 180 }, lod: 1 };
    case "fast":   return { pace, autoAdvanceDelayMs: 350,  thumb: { w: 256, h: 144 }, lod: 0 };
    case "ultra":  return { pace, autoAdvanceDelayMs: 120,  thumb: { w: 192, h: 108 }, lod: 0 };
  }
}
