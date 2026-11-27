import test from 'node:test';import assert from 'node:assert/strict';
import {emit,perceive,decayTrail,inherit} from './communication.mjs';
const a={voice:.8,trail:.6,band:.2,hearing:1,chemical:1};
test('emission pays energy and cannot overspend',()=>{const s=emit(a,.01);assert.ok(s.cost<=.01);assert.equal(s.remaining,0);assert.ok(s.voice<a.voice);assert.equal(emit(a,0).voice,0)});
test('distance, tuning, channel loss and trail decay',()=>{const s=emit(a,1);assert.ok(perceive(s,a,1).voice>perceive(s,a,4).voice);assert.ok(perceive(s,a,1).voice>perceive(s,{...a,band:.9},1).voice);assert.equal(perceive(s,{...a,hearing:0,chemical:0},1).voice,0);assert.equal(decayTrail(1,.5,3),.125)});
test('heritable bounded traits and deterministic replay',()=>{const make=()=>{let n=0;return()=>[.2,.9,.8,.1][n++%4]};assert.deepEqual(inherit(a,a,make()),inherit(a,a,make()));assert.ok(Object.values(inherit(a,a,make())).every(x=>x>=0&&x<=1));assert.throws(()=>emit({...a,voice:NaN},1))});
