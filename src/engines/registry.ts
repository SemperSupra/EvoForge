import type { CandidateEngine } from "./types";
import { mosaicEngine_v1 } from "./mosaic/v1";
import { mosaicEngine_v2 } from "./mosaic/v2";
import { mosaicEmblemEngine } from "./mosaic/emblem-engine";
import { mosaicEngine_v3 } from "./mosaic/v3";
import { mosaicMotifEngine } from "./mosaic/motif-engine";

export const ENGINE_REGISTRY: Record<string, CandidateEngine> = {
  "mosaic@1.0.0": mosaicEngine_v1,
  "mosaic@2.0.0": mosaicEngine_v2,
  "mosaic-emblem@1.0.0": mosaicEmblemEngine,
  "mosaic@3.0.0": mosaicEngine_v3,
  "mosaic-motif@1.0.0": mosaicMotifEngine
};

export function getEngine(engineId: string, engineVersion: string): CandidateEngine {
  const key = `${engineId}@${engineVersion}`;
  const eng = ENGINE_REGISTRY[key];
  if (!eng) throw new Error(`Missing engine ${key}`);
  return eng;
}
