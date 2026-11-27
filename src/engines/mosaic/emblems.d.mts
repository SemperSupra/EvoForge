import type { EngineConfig, CandidateMetadata } from "../types";
import type { GASettingsSnapshot, RenderIntent } from "../../core/types";
export const SYMBOLS: readonly (readonly [string,string,string,number,number])[];
export const TECHNIQUES: readonly string[];
export const MATERIALS: readonly string[];
export interface EmblemDesign { symbolId:string; title:string; kind:string; aspect:[number,number]; technique:number; material:number; frame:number; cell:number; detail:number; }
export function decode(g:Uint16Array,config?:EngineConfig):EmblemDesign;
export function sampleSymbol(id:string,x:number,y:number):number;
export function layout(p:EmblemDesign,w:number,h:number):{left:number;top:number;width:number;height:number};
export function render(g:Uint16Array,config:EngineConfig,intent:RenderIntent):{rgba:Uint8ClampedArray;meta:CandidateMetadata};
export function mutate(g:Uint16Array,rng:()=>number,ga:GASettingsSnapshot):Uint16Array;
export function crossover(a:Uint16Array,b:Uint16Array,rng:()=>number):Uint16Array;
