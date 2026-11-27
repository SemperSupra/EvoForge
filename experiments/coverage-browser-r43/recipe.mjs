import * as emblem from '../../src/engines/mosaic/emblems.mjs';
import * as motif from '../../src/engines/mosaic/motif-lab.mjs';
import {mosaicEngine_v3 as craft} from '../../src/engines/mosaic/v3.ts';
export const W=96,H=64,intent={kind:'thumb',width:W,height:H,lod:1};
const center=(i,n)=>Math.floor((i+.5)*65536/n);
const bins=(g,i,n,values,j)=>{g[i]=center(values[j],n)};
export function recipe(lane,c){
 const g=new Uint16Array({emblem:12,motif:16,craft:24}[lane]).fill(32768);
 let config,decode,render;
 if(lane==='emblem'){
  config={symbolId:'us',techniqueId:c.technique,materialId:c.material};g[2]=center([0,5,10,15][c.cell],16);g[3]=center(c.grout,2);g[4]=center([0,4,9][c.variance],10);g[6]=center(c.frame,3);
  g[7]=42;g[8]=0;decode=emblem.decode;render=emblem.render;
 }else if(lane==='motif'){
  config={motifId:'dragon-west',techniqueId:c.technique,materialId:c.material};g[2]=center(c.palette,6);g[13]=center(c.background,4);bins(g,8,25,[0,12,24],c.scale);bins(g,15,25,[0,12,24],c.variant);g[10]=42;g[11]=0;decode=motif.decode;render=motif.render;
 }else{
  config={familyId:c.family,techniqueId:c.technique,materialId:c.material};g[1]=center(c.palette,6);bins(g,6,31,[0,15,30],c.scale);g[11]=center(c.symmetry,2);g[14]=42;g[15]=0;decode=craft.decode;render=craft.renderRGBA;
 }
 return {g,config,decoded:decode(g,config),render};
}
