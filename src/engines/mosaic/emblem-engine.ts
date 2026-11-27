import type { CandidateEngine } from "../types";
import {decode,render,mutate,crossover} from "./emblems.mjs";
export const mosaicEmblemEngine:CandidateEngine={
 spec(){return {id:"mosaic-emblem",version:"1.0.0",displayName:"Emblems & Heraldry",genomeLength:12,supports:{palettes:false,palettePhysics:false,longevityVisual:false}};},
 defaultConfig(){return {symbolId:"us",techniqueId:"evolved",materialId:"evolved"};},
 decode,async renderRGBA(g,c,i){return render(g,c,i);},mutate,crossover
};
