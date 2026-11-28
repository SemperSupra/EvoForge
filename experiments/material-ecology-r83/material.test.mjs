import test from 'node:test';import assert from 'node:assert/strict';
import {Ledger,materials,process,burn,processingCapacity} from './material.mjs';
const zero=[0,0,0,0,0,0];
const make=()=>new Ledger({...Object.fromEntries(Object.entries(materials).map(([k,m])=>[k,m.input.map(v=>v*20)])),consumer:[0,0,0,0,0,100],soil:zero,air:zero,heat:zero,char:zero});
const ordinary={soft:100,wood:0,shell:0,rock:0},specialist={soft:25,wood:50,shell:15,rock:10};
test('substrate-specific processing, costly specialization and closed resource budget',()=>{
 const l=make(),total=l.total(),old=l.snapshot();
 assert.equal(process(l,{kind:'wood',traits:ordinary,requested:3}).units,0);assert.deepEqual(l.snapshot(),old);
 const receipt=process(l,{kind:'wood',traits:specialist,requested:3});assert.equal(receipt.units,3);assert.equal(receipt.netChemicalEnergy,24);
 assert.deepEqual(l.total(),total);assert.deepEqual(l.get('wood'),materials.wood.input.map(x=>x*17));
 assert.deepEqual(l.get('soil'),[6,0,3,3,0,0]);assert.equal(l.get('heat')[5],72);
 assert.throws(()=>processingCapacity({soft:100,wood:100,shell:0,rock:0},'wood'));
 assert.equal(process(l,{kind:'wood',traits:specialist,requested:3,oxygen:0}).units,0);
 const rock=process(l,{kind:'rock',traits:specialist,requested:2});assert.equal(rock.units,2);assert.equal(rock.netChemicalEnergy,-4);assert.deepEqual(l.total(),total);
});
test('fuel properties independent of digestion; wet, oxygen-free and inert controls; ash, char and gas conservation',()=>{
 const l=make(),total=l.total(),old=l.snapshot();
 assert.equal(burn(l,{kind:'wood',temperature:90,moisture:90,oxygen:100}),0);
 assert.equal(burn(l,{kind:'wood',temperature:90,moisture:0,oxygen:0}),0);
 assert.equal(burn(l,{kind:'rock',temperature:100,moisture:0,oxygen:100}),0);assert.deepEqual(l.snapshot(),old);
 assert.equal(burn(l,{kind:'wood',temperature:90,moisture:0,oxygen:100,requested:3}),3);
 assert.deepEqual(l.get('char'),[12,0,0,0,0,0]);assert.deepEqual(l.get('soil'),[0,3,3,0,0,0]);assert.deepEqual(l.total(),total);
});
test('atomic underflow/invalid accounts and bounded resource vectors',()=>{
 const l=make(),before=l.snapshot();
 assert.throws(()=>l.apply([{from:'wood',to:'soil',amount:[1,0,0,0,0,0]},{from:'wood',to:'soil',amount:[999999,0,0,0,0,0]}]));
 assert.deepEqual(l.snapshot(),before);assert.throws(()=>l.apply([{from:'rock',to:'missing',amount:zero}]));
 assert.throws(()=>new Ledger({x:[-1,0,0,0,0,0]}));assert.throws(()=>new Ledger({x:[1e9,0,0,0,0,0],y:[1e9,0,0,0,0,0]}));
});
