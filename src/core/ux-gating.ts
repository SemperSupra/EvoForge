import type { Pace, Playback } from "./types";

export type AdvanceGate = "open" | "paused" | "focus_open" | "hold_refine";

export function shouldShowReadyLatch(args: {
  playback: Playback;
  pace: Pace;
  gate: AdvanceGate;
  readyToAdvance: boolean;
}): boolean {
  if (args.playback !== "playing") return false;
  if (args.pace === "manual") return false;
  if (args.gate !== "open") return false;
  return args.readyToAdvance;
}

export function canAutoAdvance(args: {
  playback: Playback;
  pace: Pace;
  gate: AdvanceGate;
  readyToAdvance: boolean;
}): boolean {
  // Readiness is completed current-generation rendering, not a manual pick quota.
  return shouldShowReadyLatch(args);
}

export function canManualNext(args: { playback: Playback; pace: Pace; gate: AdvanceGate }): boolean {
  // Manual advancement is allowed only when explicitly non-auto (manual pace) or paused.
  // Focus view and refine-hold both suspend advancement.
  if (args.gate === "focus_open") return false;
  if (args.gate === "hold_refine") return false;
  return args.pace === "manual" || args.playback === "paused";
}

