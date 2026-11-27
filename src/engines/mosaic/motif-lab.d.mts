import type {EngineConfig,CandidateMetadata} from "../types";
import type {GASettingsSnapshot,RenderIntent} from "../../core/types";
export const CATALOG: readonly (readonly [string,string,string])[];
export const HERALDRY_OPTIONS: Readonly<Record<string,readonly string[]>>;
export const TECHNIQUES: readonly string[];
export const MATERIALS: readonly string[];
export const PALETTES: readonly string[];
export interface MotifDesign {
 id:string;title:string;domain:string;technique:number;material:number;palette:number;
 heraldry:Readonly<Record<string,string>>|null;
 cell:number;detail:number;grout:number;variance:number;border:number;scale:number;offset:number;seed:number;light:number;background:number;accent:number;variant:number;
}
export function decode(g:Uint16Array,c?:EngineConfig):MotifDesign;
export function roleMask(g:Uint16Array,c:EngineConfig):{W:number;H:number;mask:Uint8Array;fine:Uint8Array};
export function render(g:Uint16Array,c:EngineConfig,i:RenderIntent):{rgba:Uint8ClampedArray;meta:CandidateMetadata};
export function mutate(g:Uint16Array,rng:()=>number,ga:GASettingsSnapshot):Uint16Array;
export function crossover(a:Uint16Array,b:Uint16Array,rng:()=>number):Uint16Array;
export function noveltyKey(g:Uint16Array,c:EngineConfig):string;
