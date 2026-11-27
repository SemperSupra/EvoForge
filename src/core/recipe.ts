import type { RenderIntent } from "./types";
import { u16ToBase64LE, base64ToU16LE } from "./genome";

export type Recipe = {
  recipeFormatVersion: number;
  engineId: string;
  engineVersion: string;
  createdAt: string;
  genomeQ16: { encoding: "base64-u16le"; length: number; data: string };
  engineConfig: Record<string, unknown>;
  renderIntent: RenderIntent;
  provenance?: any;
};

export function makeRecipe(args: {
  engineId: string; engineVersion: string; genomeQ16: Uint16Array;
  engineConfig: Record<string, unknown>;
  renderIntent: RenderIntent;
  provenance?: any;
}): Recipe {
  return {
    recipeFormatVersion: 1,
    engineId: args.engineId,
    engineVersion: args.engineVersion,
    createdAt: new Date().toISOString(),
    genomeQ16: { encoding: "base64-u16le", length: args.genomeQ16.length, data: u16ToBase64LE(args.genomeQ16) },
    engineConfig: structuredClone(args.engineConfig),
    renderIntent: args.renderIntent,
    provenance: args.provenance ? structuredClone(args.provenance) : undefined
  };
}

export function parseRecipe(obj: any): Recipe {
  if (!obj || typeof obj !== "object") throw new Error("Invalid recipe");
  if (obj.recipeFormatVersion !== 1) throw new Error(`Unsupported recipeFormatVersion ${obj.recipeFormatVersion}`);
  if (typeof obj.engineId !== "string" || typeof obj.engineVersion !== "string") throw new Error("Missing engineId/engineVersion");
  if (!obj.genomeQ16 || obj.genomeQ16.encoding !== "base64-u16le") throw new Error("Unsupported genome encoding");
  if(!Number.isSafeInteger(obj.genomeQ16.length)||obj.genomeQ16.length<1||obj.genomeQ16.length>4096||typeof obj.genomeQ16.data!=="string")throw Error("Invalid genome descriptor");
  if(!obj.engineConfig||typeof obj.engineConfig!=="object"||Array.isArray(obj.engineConfig))throw Error("Explicit engine configuration required");
  return obj as Recipe;
}

export function recipeGenomeU16(recipe: Recipe): Uint16Array {
  return base64ToU16LE(recipe.genomeQ16.data, recipe.genomeQ16.length);
}
