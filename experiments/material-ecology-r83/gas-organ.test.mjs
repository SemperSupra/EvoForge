import test from 'node:test';import assert from 'node:assert/strict';import {organ,volume,lift,injury,leak} from './gas-organ.mjs';
test('intact and damaged bladder, gas conserved and buoyancy changes without assumed combustion',()=>{
 const original=organ(),a=injury(original,{electrical:1,thermal:.3,mechanical:.5});
 assert.equal(a.combustion,false);assert.equal(a.organ.gas,original.gas);assert.ok(a.organ.integrity<original.integrity);
 let o=a.organ,released=0;for(let i=0;i<40;i++){const r=leak(o);o=r.organ;released+=r.released;}
 assert.equal(o.gas+released,original.gas);assert.ok(lift(original)>0);assert.ok(lift(o)<0);assert.equal(leak(original).released,0);
 assert.ok(injury(original,{electrical:1,resistance:.8}).injuryDose<a.injuryDose);
});
test('pressure/temperature and medium change volume and exposure independently',()=>{
 const a=organ(),b=organ({...a,ambientPressure:3});assert.ok(volume(b)<volume(a));
 assert.ok(injury(organ({...a,ambientPressure:.3,temperature:2})).pressureDamage>0);
 assert.ok(lift(a,{density:.0012})<0);assert.equal(lift(a,{gravity:0}),0);
 assert.throws(()=>organ({gas:-1}));assert.throws(()=>injury(a,{electrical:2}));
});
