import { parseRecipe, recipeGenomeU16 } from "../../core/recipe";
import { randomGenome } from "../../core/ga";
import { XorShift32 } from "../../core/prng";

export const ATELIER_FAMILIES = ["Medallion","Star and Cross","Botanical","Tidal Ribbons","Marine Life"] as const;
export const ATELIER_PALETTES = ["ravenna","pompeii","andalusian","celadon","marine"] as const;
const center=(index:number,count:number)=>Math.floor((index+.5)*65536/count);

export function atelierParents(recipes: readonly unknown[]): Uint16Array[] {
  const seen=new Map<string,Uint16Array>();
  for(const raw of recipes){
    try {
      const r=parseRecipe(raw);
      if(r.engineId!=="mosaic"||r.engineVersion!=="2.0.0"||r.genomeQ16.length!==16)continue;
      const g=recipeGenomeU16(r);
      const family=r.engineConfig?.familyId, palette=r.engineConfig?.paletteId;
      if(typeof family==="number"&&Number.isInteger(family)&&family>=0&&family<ATELIER_FAMILIES.length)g[0]=center(family,ATELIER_FAMILIES.length);
      if(typeof palette==="string"){
        const i=ATELIER_PALETTES.findIndex(p=>p===palette);
        if(i>=0)g[1]=center(i,ATELIER_PALETTES.length);
      }
      const key=Array.from(g,v=>v.toString(16).padStart(4,"0")).join("");
      seen.set(key,g);
    } catch { /* invalid/incompatible saved recipes never seed the new engine */ }
  }
  return [...seen.keys()].sort().map(key=>seen.get(key)!);
}

export function initialAtelierGenome(rng:XorShift32, index:number, parents:readonly Uint16Array[], population:number):Uint16Array {
  const inherited=Math.min(parents.length,Math.floor(population/2));
  if(index<inherited)return parents[index].slice();
  const g=randomGenome(rng,16);
  g[0]=center((index-inherited)%ATELIER_FAMILIES.length,ATELIER_FAMILIES.length);
  return g;
}
