import { describe, expect, it } from "vitest";
import { deriveSessionSeedFromFavorites } from "../src/core/session-seed";

describe("deriveSessionSeedFromFavorites", () => {
  const settings = {
    pickN: 4,
    mutationRate: 0.08,
    crossoverRate: 0.7,
    newBloodRate: 0.15,
    longevityMin: 3,
    longevityMax: 7
  };

  function fav(recipeJson: any) {
    return { recipeJson };
  }

  it("is order-insensitive over favorites", () => {
    const baseSeed = 123;
    const a = fav({
      recipeFormatVersion: 1,
      engineId: "mosaic",
      engineVersion: "1.0.0",
      createdAt: "2026-01-01T00:00:00.000Z",
      genomeQ16: { encoding: "base64-u16le", length: 2, data: "AQAAAA==" },
      engineConfig: { paletteId: "neon", stability: 0.7 },
      renderIntent: { kind: "full", width: 1, height: 1, lod: 2, format: "png" },
      provenance: { sessionSeed: 1 }
    });
    const b = fav({
      recipeFormatVersion: 1,
      engineId: "mosaic",
      engineVersion: "1.0.0",
      createdAt: "2026-01-02T00:00:00.000Z",
      genomeQ16: { encoding: "base64-u16le", length: 2, data: "AgAAAA==" },
      engineConfig: { paletteId: "neon", stability: 0.7 },
      renderIntent: { kind: "full", width: 1, height: 1, lod: 2, format: "png" },
      provenance: { sessionSeed: 2 }
    });

    const s1 = deriveSessionSeedFromFavorites({ baseSeed, favorites: [a, b], settings });
    const s2 = deriveSessionSeedFromFavorites({ baseSeed, favorites: [b, a], settings });
    expect(s1).toBe(s2);
  });

  it("changes when favorites change", () => {
    const baseSeed = 123;
    const a = fav({
      recipeFormatVersion: 1,
      engineId: "mosaic",
      engineVersion: "1.0.0",
      genomeQ16: { encoding: "base64-u16le", length: 2, data: "AQAAAA==" },
      engineConfig: { paletteId: "neon", stability: 0.7 }
    });
    const b = fav({
      recipeFormatVersion: 1,
      engineId: "mosaic",
      engineVersion: "1.0.0",
      genomeQ16: { encoding: "base64-u16le", length: 2, data: "AgAAAA==" },
      engineConfig: { paletteId: "neon", stability: 0.7 }
    });

    const s1 = deriveSessionSeedFromFavorites({ baseSeed, favorites: [a], settings });
    const s2 = deriveSessionSeedFromFavorites({ baseSeed, favorites: [b], settings });
    expect(s1).not.toBe(s2);
  });

  it("changes when GA settings change", () => {
    const baseSeed = 123;
    const a = fav({
      recipeFormatVersion: 1,
      engineId: "mosaic",
      engineVersion: "1.0.0",
      genomeQ16: { encoding: "base64-u16le", length: 2, data: "AQAAAA==" },
      engineConfig: { paletteId: "neon", stability: 0.7 }
    });

    const s1 = deriveSessionSeedFromFavorites({ baseSeed, favorites: [a], settings });
    const s2 = deriveSessionSeedFromFavorites({
      baseSeed,
      favorites: [a],
      settings: { ...settings, mutationRate: settings.mutationRate + 0.01 }
    });
    expect(s1).not.toBe(s2);
  });
});
