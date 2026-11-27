import type { GASettingsSnapshot, RenderIntent } from "../core/types";

export type EngineId = string;

export type EngineSpec = {
  id: EngineId;
  displayName: string;
  version: string;
  genomeLength: number;
  supports: { palettes: boolean; palettePhysics: boolean; longevityVisual: boolean };
};

export type CandidateMetadata = { paletteId?: string; tags?: string[]; titleHint?: string };
export type EngineConfig = Record<string, unknown>;

export interface CandidateEngine {
  spec(): EngineSpec;
  defaultConfig(): EngineConfig;
  decode(genomeQ16: Uint16Array, config: EngineConfig): unknown;

  renderRGBA(
    genomeQ16: Uint16Array,
    config: EngineConfig,
    intent: RenderIntent
  ): Promise<{ rgba: Uint8ClampedArray; meta: CandidateMetadata }>;

  mutate(genomeQ16: Uint16Array, rngFloat01: () => number, ga: GASettingsSnapshot): Uint16Array;
  crossover(a: Uint16Array, b: Uint16Array, rngFloat01: () => number, ga: GASettingsSnapshot): Uint16Array;
  repair?(genomeQ16: Uint16Array): Uint16Array;
}
