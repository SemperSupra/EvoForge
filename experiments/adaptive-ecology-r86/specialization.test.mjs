import test from 'node:test';import assert from 'node:assert/strict';
import {experiment,ensemble} from './specialization.mjs';
test('deterministic heritable allocation and conserved per-generation budget',()=>{
 const a=experiment({seed:42,generations:20}),b=experiment({seed:42,generations:20});assert.deepEqual(a,b);
 assert.ok(a.trace.every(r=>r.residual.every(x=>x===0)&&r.meanWood>=0&&r.meanWood<=100&&r.lineages<=32&&r.consumedWood<=320&&r.consumedSoft<=64));
 assert.throws(()=>experiment({seed:-1}));assert.throws(()=>experiment({population:65}));
});
test('matched-seed mutation, substrate availability and cost controls; report every seed',()=>{
 const r=ensemble();console.log('SPECIALIZATION '+JSON.stringify(r));
 assert.equal(r.noMutation.meanWood,0);assert.equal(r.noMutation.meanConsumption,0);assert.equal(r.noWood.meanConsumption,0);
 assert.ok(r.woodAvailable.meanConsumption>0);
 assert.ok(r.woodAvailable.meanWood>r.noWood.meanWood,'directional adaptation in this specific illustrative environment');
 assert.ok(Object.values(r).every(a=>a.runs.length===8&&a.runs.every(v=>v.residual.every(x=>x===0))));
});
