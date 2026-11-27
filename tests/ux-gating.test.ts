import { describe, expect, it } from "vitest";
import { canAutoAdvance, canManualNext, shouldShowReadyLatch } from "../src/core/ux-gating";

describe("ux gating", () => {
  it("shows latch only when playing, non-manual, open, and ready", () => {
    expect(shouldShowReadyLatch({ playback: "playing", pace: "medium", gate: "open", readyToAdvance: true })).toBe(true);
    expect(shouldShowReadyLatch({ playback: "paused", pace: "medium", gate: "open", readyToAdvance: true })).toBe(false);
    expect(shouldShowReadyLatch({ playback: "playing", pace: "manual", gate: "open", readyToAdvance: true })).toBe(false);
    expect(shouldShowReadyLatch({ playback: "playing", pace: "medium", gate: "hold_refine", readyToAdvance: true })).toBe(false);
    expect(shouldShowReadyLatch({ playback: "playing", pace: "medium", gate: "focus_open", readyToAdvance: true })).toBe(false);
    expect(shouldShowReadyLatch({ playback: "playing", pace: "medium", gate: "open", readyToAdvance: false })).toBe(false);
  });

  it("auto-advance uses current render readiness, independent of parent selection", () => {
    const a = { playback: "playing" as const, pace: "fast" as const, gate: "open" as const, readyToAdvance: true };
    expect(canAutoAdvance(a)).toBe(true);
    expect(canAutoAdvance({ ...a, readyToAdvance: false })).toBe(false);
  });

  it("manual next is allowed only in manual pace or paused, and never during focus/refine", () => {
    expect(canManualNext({ playback: "playing", pace: "manual", gate: "open" })).toBe(true);
    expect(canManualNext({ playback: "paused", pace: "medium", gate: "open" })).toBe(true);

    expect(canManualNext({ playback: "playing", pace: "medium", gate: "open" })).toBe(false);
    expect(canManualNext({ playback: "paused", pace: "medium", gate: "focus_open" })).toBe(false);
    expect(canManualNext({ playback: "paused", pace: "manual", gate: "hold_refine" })).toBe(false);
  });
});

