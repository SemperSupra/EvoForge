import type {CandidateEngine} from "../types";
import {decode,render,mutate,crossover} from "./motif-lab.mjs";
export const mosaicMotifEngine:CandidateEngine={
 spec(){return {id:"mosaic-motif",version:"1.0.0",displayName:"Motif & Heraldry Lab",genomeLength:16,supports:{palettes:true,palettePhysics:false,longevityVisual:false}};},
 defaultConfig(){return {motifId:"dragon-west",techniqueId:"evolved",materialId:"evolved",paletteId:"evolved"};},
 decode,async renderRGBA(g,c,i){return render(g,c,i);},mutate,crossover
};
