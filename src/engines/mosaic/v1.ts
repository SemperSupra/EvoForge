import type { CandidateEngine, EngineConfig, EngineSpec, CandidateMetadata } from "../types";
import type { GASettingsSnapshot, RenderIntent } from "../../core/types";

export const mosaicEngine_v1: CandidateEngine = {
  spec(): EngineSpec {
    return {
      id: "mosaic",
      displayName: "Mosaic",
      version: "1.0.0",
      genomeLength: 64,
      supports: { palettes: true, palettePhysics: true, longevityVisual: true }
    };
  },
  defaultConfig(): EngineConfig {
    return { paletteId: "neon", paletteAttract: 0.6, paletteRepel: 0.2, stability: 0.7 };
  },
  decode(genomeQ16: Uint16Array, config: EngineConfig): unknown {
    return { paletteId: String(config.paletteId ?? "neon"), g0: genomeQ16[0] ?? 0 };
  },
  async renderRGBA(genomeQ16: Uint16Array, config: EngineConfig, intent: RenderIntent) {
    const w = intent.width, h = intent.height, lod = intent.lod|0;
    const cell = lod >= 2 ? 8 : (lod === 1 ? 12 : 18);

    const paletteId = String(config.paletteId ?? "neon");
    const attract = clamp01(Number(config.paletteAttract ?? 0.6));
    const repel = clamp01(Number(config.paletteRepel ?? 0.2));
    const stability = clamp01(Number(config.stability ?? 0.7));

    const pal = getPalette(paletteId);
    const out = new Uint8ClampedArray(w*h*4);

    const seedA = (genomeQ16[0] ?? 0) | ((genomeQ16[1] ?? 0) << 16);
    const seedB = (genomeQ16[2] ?? 0) | ((genomeQ16[3] ?? 0) << 16);

    for (let y=0; y<h; y++) {
      const cy = (y / cell) | 0;
      for (let x=0; x<w; x++) {
        const cx = (x / cell) | 0;
        const n = hash32(seedA, seedB, cx, cy);

        const i0 = n & 7;
        const i1 = (n >>> 3) & 7;

        const tRaw = (n >>> 16) & 0xff;
        const t = lerpU8(128, tRaw, 255 - ((stability * 255) | 0));

        const c0 = pal[i0], c1 = pal[i1];
        const blend = lerpU8(t, 128, (attract * 255) | 0);
        const edgeBoost = (repel * 64) | 0;

        const r = clampU8((((c0[0] * (255 - blend) + c1[0] * blend) / 255) | 0) + edgeBoost);
        const g = clampU8((((c0[1] * (255 - blend) + c1[1] * blend) / 255) | 0) + edgeBoost);
        const b = clampU8((((c0[2] * (255 - blend) + c1[2] * blend) / 255) | 0) + edgeBoost);

        const idx = (y*w + x) * 4;
        out[idx] = r; out[idx+1] = g; out[idx+2] = b; out[idx+3] = 255;
      }
    }

    const meta: CandidateMetadata = { paletteId, tags: [`lod:${lod}`, `cell:${cell}`] };
    return { rgba: out, meta };
  },
  mutate(genomeQ16: Uint16Array, rngFloat01: () => number, ga: GASettingsSnapshot) {
    const out = genomeQ16.slice();
    const rate = clamp01(ga.mutationRate);
    for (let i=0;i<out.length;i++) {
      if (rngFloat01() < rate) {
        const delta = ((rngFloat01() * 1024) | 0) - 512;
        out[i] = (out[i] + delta) & 0xffff;
      }
    }
    return out;
  },
  crossover(a: Uint16Array, b: Uint16Array, rngFloat01: () => number, _ga: GASettingsSnapshot) {
    const len = Math.min(a.length, b.length);
    const out = new Uint16Array(len);
    const cut = (rngFloat01() * len) | 0;
    for (let i=0;i<len;i++) out[i] = i < cut ? a[i] : b[i];
    return out;
  }
};

function clamp01(x:number){ return x<0?0:x>1?1:x; }
function clampU8(x:number){ return x<0?0:x>255?255:x; }
function lerpU8(a:number,b:number,t:number){ return ((a*(255-t)+b*t)/255)|0; }

function hash32(a:number,b:number,x:number,y:number): number {
  let h = (a ^ (x * 374761393)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h + (b ^ (y * 668265263))) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

type RGB = [number,number,number];
function getPalette(id:string): RGB[] {
  switch(id){
    case "calm":
      return [[22,52,82],[38,90,120],[66,134,150],[102,170,160],[170,210,200],[220,240,230],[240,220,200],[200,180,160]];
    case "mono":
      return [[20,20,20],[40,40,40],[60,60,60],[90,90,90],[120,120,120],[150,150,150],[180,180,180],[220,220,220]];
    case "neon":
    default:
      return [[10,20,30],[0,120,255],[255,0,160],[0,255,220],[255,220,0],[160,0,255],[255,60,0],[30,255,80]];
  }
}
