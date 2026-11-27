import type { GASettingsSnapshot } from "./types";
import { mixU32 } from "./prng";

export type FavoriteSeedInput = {
  baseSeed: number;
  favorites: Array<{ recipeJson: any }>;
  settings: GASettingsSnapshot;
};

function hashStringU32(s: string): number {
  // FNV-1a 32-bit over UTF-16 code units.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xffff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function stableStringify(v: any): string {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "string") return JSON.stringify(v);
  if (t === "number") return Number.isFinite(v) ? String(v) : "null";
  if (t === "boolean") return v ? "true" : "false";
  if (t !== "object") return "null";

  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";

  const keys = Object.keys(v).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const sv = stableStringify(v[k]);
    parts.push(JSON.stringify(k) + ":" + sv);
  }
  return "{" + parts.join(",") + "}";
}

function recipeFingerprint(recipeJson: any): string {
  // Ignore recipe.createdAt and any provenance fields by selecting stable, replay-critical fields.
  const engineId = String(recipeJson?.engineId ?? "");
  const engineVersion = String(recipeJson?.engineVersion ?? "");
  const recipeFormatVersion = String(recipeJson?.recipeFormatVersion ?? "");

  const genome = recipeJson?.genomeQ16;
  const genomeEnc = String(genome?.encoding ?? "");
  const genomeLen = String(genome?.length ?? "");
  const genomeData = String(genome?.data ?? "");

  const engineConfig = stableStringify(recipeJson?.engineConfig ?? null);

  return [
    engineId,
    engineVersion,
    recipeFormatVersion,
    genomeEnc,
    genomeLen,
    genomeData,
    engineConfig
  ].join("\u0000");
}

export function deriveSessionSeedFromFavorites(input: FavoriteSeedInput): number {
  const baseSeed = input.baseSeed >>> 0;
  const settingsStr = stableStringify(input.settings);

  const fps = input.favorites
    .map(f => recipeFingerprint(f.recipeJson))
    .filter(s => s.length > 0)
    .sort();

  let seed = baseSeed;
  seed = mixU32(seed, hashStringU32(settingsStr));
  seed = mixU32(seed, fps.length >>> 0);
  for (const fp of fps) seed = mixU32(seed, hashStringU32(fp));
  return seed >>> 0;
}
