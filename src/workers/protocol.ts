import type { RenderIntent } from "../core/types";

export type RenderSlot = "thumb" | "focus" | "aux";

export type RenderJob = {
  type: "render";
  jobId: string;
  generationId: number;
  renderIntentId: number;
  candidateId: string;
  slot: RenderSlot;
  engineId: string;
  engineVersion: string;
  genomeQ16: Uint16Array;
  engineConfig: Record<string, unknown>;
  intent: RenderIntent;
};

export type RenderResult = {
  type: "result";
  jobId: string;
  generationId: number;
  renderIntentId: number;
  candidateId: string;
  slot: RenderSlot;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  meta: { paletteId?: string; tags?: string[]; titleHint?: string };
};

export type RenderError = {
  type: "error";
  jobId: string;
  generationId: number;
  renderIntentId: number;
  candidateId: string;
  slot: RenderSlot;
  message: string;
};

export type WorkerMessage = RenderJob;
export type MainMessage = RenderResult | RenderError;
