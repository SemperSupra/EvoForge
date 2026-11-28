import {column} from './strata.mjs';
// Same seven-layer model can be parameterized into dry, wet, anoxic, or mixed columns.
export const example=()=>column([
 {id:'bedrock',bottom:-4,top:-3,matrix:100,hardness:100,permeability:0,poreSize:0,opacity:100,heat:1800},
 {id:'mineral-subsoil',bottom:-3,top:-2,matrix:65,water:20,oxygenWater:4,oxygenGas:10,solute:40,hardness:65,permeability:20,poreSize:5,opacity:100,heat:1600},
 {id:'organic-soil',bottom:-2,top:0,matrix:100,water:60,oxygenWater:15,oxygenGas:40,solute:50,organic:80,hardness:25,permeability:70,poreSize:20,opacity:100,heat:4000},
 {id:'deep-water',bottom:0,top:2,water:190,oxygenWater:10,oxygenGas:0,solute:70,opacity:80,heat:2400},
 {id:'surface-water',bottom:2,top:3,water:100,oxygenWater:80,solute:10,opacity:20,heat:2400},
 {id:'near-air',bottom:3,top:4,oxygenGas:100,opacity:5,heat:2500},
 {id:'upper-air',bottom:4,top:6,oxygenGas:180,opacity:0,heat:3600}
]);
