export type Pace = "manual" | "slow" | "medium" | "fast" | "ultra";
export type Playback = "playing" | "paused";
export type CandidateStatus = "normal" | "picked" | "skipped" | "retired";

export type RenderIntent =
  | { kind: "thumb"; width: number; height: number; lod: number }
  | { kind: "full"; width: number; height: number; lod: number; format: "png" | "webp" };

export type GASettingsSnapshot = {
  pickN: number;
  mutationRate: number;
  crossoverRate: number;
  newBloodRate: number;
  longevityMin: number;
  longevityMax: number;
};

export type PaceProfile = {
  pace: Pace;
  autoAdvanceDelayMs: number | null;
  thumb: { w: number; h: number };
  lod: number;
};

export type CandidateId = string;

export type Candidate = {
  id: CandidateId;
  genomeQ16: Uint16Array;
  status: CandidateStatus;
  age: number;
  maxAge: number;
};

export type GenerationState = {
  generationId: number;
  renderIntentId: number;
  candidates: Candidate[];
};
