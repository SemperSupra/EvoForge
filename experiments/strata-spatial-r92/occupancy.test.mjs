import test from 'node:test';import assert from 'node:assert/strict';
import {system,totals,move,excavate,extendRoot,uptake,breathe,occupancy} from './occupancy.mjs';
const traits={size:10,dig:70,gasResp:50,waterResp:40,root:70};
const layers=[
{id:'bedrock',bottom:-3,top:-2,matrix:100,hardness:100,permeability:0,poreSize:0},
{id:'subsoil',bottom:-2,top:-1,matrix:70,water:20,oxygenWater:4,oxygenGas:8,solute:40,hardness:65,permeability:20,poreSize:3},
{id:'soil',bottom:-1,top:0,matrix:60,water:20,oxygenWater:5,oxygenGas:12,solute:50,hardness:25,permeability:70,poreSize:15},
{id:'air',bottom:0,top:1,oxygenGas:100}
];
const sample=()=>system({layers,organisms:[{id:'animal',energy:300,traits,parts:[{id:'body',layer:'soil',medium:'burrow'}]},{id:'plant',energy:200,traits,parts:[{id:'leaf',layer:'air',medium:'gas'}]}]});
test('paid excavated matrix transfers to debris; no teleport through blocked layers',()=>{
 const s=sample(),before=totals(s);assert.throws(()=>move(s,'animal','body','subsoil','burrow'),/inaccessible/);
 assert.throws(()=>excavate(s,'animal','body','bedrock',10));assert.throws(()=>move(s,'animal','body','bedrock','burrow'),/nonadjacent/);
 const dug=excavate(s,'animal','body','subsoil',10);assert.equal(dug.debris,10);assert.equal(dug.layers[1].matrix,60);assert.equal(dug.receipt.cost,80);
 const moved=move(dug,'animal','body','subsoil','burrow');assert.equal(moved.organisms[0].parts[0].layer,'subsoil');assert.deepEqual(totals(moved),before);
 assert.equal(s.debris,0);assert.equal(s.organisms[0].parts[0].layer,'soil');
});
test('connected roots span different strata with paid nutrient uptake',()=>{
 const s=sample(),before=totals(s);assert.throws(()=>extendRoot(s,'plant','leaf','deep','subsoil'),/root access/);
 const a=extendRoot(s,'plant','leaf','root','soil'),b=extendRoot(a,'plant','root','deep','subsoil'),c=uptake(b,'plant','deep',10);
 assert.equal(c.receipt.taken,7);assert.equal(c.organisms[1].nutrients,7);assert.equal(c.layers[1].solute,33);
 assert.equal(occupancy(c).filter(l=>l.parts.some(p=>p.organism==='plant')).length,3);assert.deepEqual(totals(c),before);
 assert.throws(()=>uptake(s,'plant','leaf',10),/root required/);
});
test('phase-specific oxygen transfer and exhausted energy controls',()=>{
 const s=sample(),before=totals(s);const a=breathe(s,'animal','body',8);assert.equal(a.receipt.used,5);assert.equal(a.receipt.satisfied,false);assert.equal(a.layers[2].oxygenGas,7);assert.equal(a.respiredOxygen,5);assert.deepEqual(totals(a),before);
 const b=system({...s,organisms:s.organisms.map(o=>({...o,energy:0}))});assert.throws(()=>excavate(b,'animal','body','subsoil',10),/insufficient energy/);
 assert.deepEqual(totals(s),before);
 console.log('OCCUPANCY '+JSON.stringify({respired:a.respiredOxygen,conserved:before,parts:occupancy(a)}));
});
