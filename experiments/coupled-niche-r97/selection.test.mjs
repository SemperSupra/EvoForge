import test from 'node:test';import assert from 'node:assert/strict';import {experiment,ensemble} from './selection.mjs';
test('deterministic matched seed trajectories, explicit generation budget and inherited traits',()=>{
 for(const guild of ['animal','plant']){const a=experiment({guild,seed:42,generations:8}),b=experiment({guild,seed:42,generations:8});assert.deepEqual(a,b);assert.ok(a.trace.every(x=>x.conserved&&x.meanTrait>=0&&x.meanTrait<=100&&x.deepTaken+x.shallowTaken<=192));}
});
for(const guild of ['animal','plant'])test('matched resource gradient arms: '+guild,()=>{
 const r=ensemble(guild);console.log('NICHE '+JSON.stringify({guild,...r}));
 assert.equal(r.noMutation.meanTrait,guild==='animal'?0:20);assert.equal(r.noMutation.meanDeepVisits,0);assert.equal(r.noMutation.meanDeepTaken,0);
 assert.ok(Object.values(r).every(a=>a.runs.length===6&&a.runs.every(v=>v.conserved)));
 // Direction and magnitude are observations, not a required scripted outcome.
});
