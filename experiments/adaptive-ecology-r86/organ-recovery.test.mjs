import test from 'node:test';import assert from 'node:assert/strict';
import {organ,injury,lift} from '../material-ecology-r83/gas-organ.mjs';import {system,total,advance} from './organ-recovery.mjs';
test('shock leakage, costly recovery and shared gas reservoir',()=>{
 const damaged=injury(organ(),{electrical:.75,mechanical:.3}).organ;
 const initial=system({organ:damaged,environmentGas:50,energy:1600});let s=initial,leaked=0,filled=0,repaired=0;
 for(let i=0;i<30;i++){s=advance(s,{repair:30,refill:8});leaked+=s.receipt.leaked;filled+=s.receipt.filled;repaired+=s.receipt.repaired;assert.deepEqual(total(s),total(initial));}
 assert.ok(leaked>0&&filled>0&&repaired>0);assert.ok(s.organ.integrity>damaged.integrity);assert.ok(s.energy<initial.energy);assert.ok(lift(s.organ)>0);
 console.log('ORGAN_RECOVERY '+JSON.stringify({leaked,filled,repaired,gas:s.organ.gas,integrity:s.organ.integrity,energy:s.energy,lift:s.receipt.lift,total:total(s)}));
});
test('dead host releases gas; finite energy or absent gas prevents recovery/refill',()=>{
 const a=system({organ:organ({gas:50,integrity:.7}),environmentGas:0,energy:5});const b=advance(a,{repair:500,refill:50});assert.equal(b.receipt.repaired,0);assert.equal(b.receipt.filled,0);
 const dead=advance(system({...a,alive:false}),{repair:500,refill:50});assert.equal(dead.organ.gas,0);assert.equal(dead.environmentGas,50);assert.equal(dead.receipt.repaired,0);assert.equal(dead.receipt.filled,0);assert.deepEqual(total(dead),total(a));
 const intact=system({organ:organ({gas:25}),environmentGas:0,energy:100});assert.equal(advance(intact,{refill:25}).receipt.filled,0);
 assert.throws(()=>advance(a,{vent:-1}));
});
