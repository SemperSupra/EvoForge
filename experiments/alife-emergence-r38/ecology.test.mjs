import test from 'node:test';import assert from 'node:assert/strict';import {createField,seedField,stepField,response} from './ecology.mjs';
const sum=a=>a.reduce((a,b)=>a+b,0);
test('local bounded spreading field and decay; no wrap',()=>{const f=createField(5);seedField(f,5,0,0,1);const g=stepField(f,5);assert.ok(g[1]>0&&g[5]>0&&g[4]===0);assert.ok(Math.abs(sum(g)-.9)<1e-12);assert.equal(f[0],1);assert.ok(g.every(x=>x>=0&&x<=1))});
test('seeded stress and mineral fields give opposing abstract effects',()=>{const state={health:.5,energy:.5};assert.ok(response(state,1,0).health<state.health);assert.ok(response(state,0,1).energy>state.energy);assert.deepEqual(response(state,0,0),state);assert.throws(()=>seedField(createField(3),3,-1,0,1))});
test('identical inputs replay, nonfinite rejected',()=>{const f=createField(5);seedField(f,5,2,2,.8);assert.deepEqual(stepField(f,5),stepField(f,5));f[0]=NaN;assert.throws(()=>stepField(f,5))});
