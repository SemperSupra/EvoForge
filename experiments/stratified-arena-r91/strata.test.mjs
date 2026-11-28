import test from 'node:test';import assert from 'node:assert/strict';
import {layer,column,inventory,conditions,locate,lightProfile,access,exchange,rootUptake,gasSpace} from './strata.mjs';
import {example} from './fixtures.mjs';
test('deterministic boundaries, ordered distinct horizons, three phases in porous soil',()=>{
 const a=example();assert.equal(locate(a,0).id,'deep-water');assert.equal(locate(a,3).id,'near-air');assert.equal(locate(a,6),null);
 assert.deepEqual(column([...a].reverse()),a);
 const soil=conditions(a,-1);assert.deepEqual([soil.solidFraction,soil.waterFraction,soil.gasFraction],[.5,.3,.2]);assert.ok(soil.nutrient>0&&soil.oxygenGas>0&&soil.oxygenWater>0);
 assert.ok(conditions(a,1).oxygenWater<conditions(a,2.5).oxygenWater);
 const light=lightProfile(a);assert.ok(light['surface-water'].mean>light['deep-water'].mean);assert.equal(light.bedrock.exit,0);
 assert.throws(()=>column([{id:'a',bottom:0,top:1},{id:'b',bottom:2,top:3}]));assert.throws(()=>layer({id:'invalid',bottom:0,top:1,matrix:90,water:20}));
});
test('transport conserves water, solutes, oxygen and heat; impermeable bedrock excludes drainage',()=>{
 const a=example(),before=inventory(a);let layers=a,receipts=[];
 for(let t=0;t<60;t++){const s=exchange(layers,{drain:8,conduct:70,oxygenDiffusion:4});layers=s.layers;receipts.push(...s.receipts);assert.deepEqual(s.inventory,before);}
 assert.ok(receipts.some(x=>x.solute>0));assert.ok(receipts.every(x=>x.to!=='bedrock'));assert.equal(layers[0].water,0);assert.ok(layers.every(x=>gasSpace(x)>=0));
 assert.deepEqual(inventory(a),before);assert.deepEqual(exchange(a),exchange(a));
 console.log('COLUMN '+JSON.stringify({initial:before,final:inventory(layers),transfers:receipts.length,layerConditions:layers.map(l=>conditions(layers,(l.bottom+l.top)/2))}));
});
test('niche access depends on substrate and physiology, not arbitrary species labels',()=>{
 const a=example(),by=id=>a.find(x=>x.id===id);
 const general={size:10,gasResp:60,waterResp:0,dig:10,root:10};
 const swimmer={...general,gasResp:0,waterResp:70};
 const burrower={...general,dig:70};
 const deepRoot={...general,root:70};
 assert.equal(access(by('near-air'),general,'gas').allowed,true);assert.equal(access(by('deep-water'),general,'liquid').allowed,false);
 assert.equal(access(by('deep-water'),swimmer,'liquid').allowed,true);assert.equal(access(by('near-air'),swimmer,'gas').allowed,false);
 assert.equal(access(by('mineral-subsoil'),general,'gas').allowed,false);
 assert.equal(access(by('mineral-subsoil'),burrower,'burrow').allowed,true);assert.equal(access(by('bedrock'),burrower,'burrow').allowed,false);
 assert.equal(rootUptake(a,'mineral-subsoil',general,10).taken,0);
 const u=rootUptake(a,'mineral-subsoil',deepRoot,10);assert.equal(u.taken,7);assert.ok(u.cost>0);assert.equal(inventory(u.layers).solute+u.taken,inventory(a).solute);
});
test('sealed interfaces and anoxic/zero-space negative controls',()=>{
 const a=column([{id:'rock',bottom:0,top:1,matrix:100,permeability:0},{id:'water',bottom:1,top:2,water:100,solute:10}]);const b=exchange(a);assert.equal(b.receipts.length,0);assert.equal(b.layers[0].water,0);
 assert.equal(access(a[1],{size:1,waterResp:100},'liquid').allowed,false);
 assert.throws(()=>layer({id:'bad',bottom:0,top:1,matrix:100,oxygenGas:1}));
 assert.throws(()=>rootUptake(example(),'unknown',{root:100},1));
});
