import { parseRecipe, recipeGenomeU16 } from "../core/recipe";
import { getEngine } from "../engines/registry";
import type { RenderIntent } from "../core/types";
import {assertRenderRequest} from "../core/render-contract.mjs";

declare global {
  interface Window {
    __evoforgeGoldenRender?: (payload: { recipe: any; render: any }) => Promise<string>;
  }
}

async function sha256Hex(bytes: Uint8ClampedArray): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  const u8 = new Uint8Array(buf);
  return Array.from(u8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function installGoldenHook() {
  window.__evoforgeGoldenRender = async ({ recipe, render }) => {
    const r = parseRecipe(recipe);
    const eng = getEngine(r.engineId, r.engineVersion);
    const genome = recipeGenomeU16(r);
    const intent: RenderIntent = {
      kind: render.kind,
      width: render.w,
      height: render.h,
      lod: render.lod,
      ...(render.kind === "full" ? { format: render.format ?? "png" } : {})
    } as any;

    assertRenderRequest(eng.spec(),genome,r.engineConfig,intent);
    const { rgba } = await eng.renderRGBA(genome, r.engineConfig, intent);
    return await sha256Hex(rgba);
  };
}
