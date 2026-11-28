import test from 'node:test';import assert from 'node:assert/strict';import {system,totals,act,step,observe} from './coupled.mjs';
const layers=[{id:'rock',bottom:-3,top:-2,matrix:100,hardness:100,permeability:0,poreSize:0,opacity:100},{id:'soil',bottom:-2,top:0,matrix:100,water:50,oxygenGas:50,oxygenWater:20,solute:40,organic:20,hardness:40,permeability:50,poreSize:5,opacity:100,heat:2000},{id:'air',bottom:0,top:2,oxygenGas:200,organic:8,heat:4000}];
const traits={size:10,dig:70,gasResp:70,waterResp:30,root:60};
const body=(id,layer,medium)=>({id,energy:300,traits,parts:[{id:'body',layer,medium}]});
const make=()=>system({width:2,depth:1,columns:[layers,layers.map(l=>({...l,bottom:l.bottom+1,top:l.top+1}))],locals:[{organisms:[body('animal','air','gas'),body('plant','air','gas')]},{organisms:[]}]});
test('shared ledger couples transport, paid excavation, root uptake and feeding',()=>{
 const s=make(),before=totals(s);
 let a=act(s,'animal','excavate',{part:'body',target:'soil',amount:10});a=act(a,'animal','move',{part:'body',target:'soil',medium:'burrow'});
 a=act(a,'animal','feed',{part:'body',requested:5});assert.equal(a.receipt.taken,5);assert.equal(a.columns[0][1].organic,15);assert.equal(a.locals[0].consumedOrganic,5);
 a=act(a,'plant','extendRoot',{parent:'body',newId:'root',target:'soil'});a=act(a,'plant','uptake',{part:'root',requested:5});assert.equal(a.receipt.taken,5);
 for(let t=0;t<20;t++){a=step(a);assert.deepEqual(totals(a),before);}
 assert.equal(observe(a)[0].occupancy.find(x=>x.id==='soil').organisms,2);assert.deepEqual(totals(s),before);
 console.log('COUPLED '+JSON.stringify({steps:20,totals:before,occupancy:observe(a).map(c=>({column:c.column,parts:c.occupancy.map(l=>({layer:l.id,organisms:l.organisms}))})),debris:a.locals[0].debris,consumed:a.locals[0].consumedOrganic}));
});
test('actual adjacent overlapping migration, source and target medium gates, no teleport',()=>{
 const s=make(),before=totals(s),a=act(s,'animal','migrate',{target:1,layer:'air',medium:'gas'});
 assert.equal(a.locals[1].organisms[0].id,'animal');assert.deepEqual(totals(a),before);
 assert.throws(()=>act(s,'animal','migrate',{target:1,layer:'rock',medium:'gas'}),/overlap|inaccessible/);
 const blocked=system({...s,columns:[layers,layers.map(l=>({...l,bottom:l.bottom+5,top:l.top+5}))]});assert.throws(()=>act(blocked,'animal','migrate',{target:1,layer:'air',medium:'gas'}),/overlap/);
 assert.throws(()=>act(s,'animal','migrate',{target:0,layer:'air',medium:'gas'}));
});
test('finite stock and anoxia constrain feeding; failed operations atomic',()=>{
 const s=make(),a=act(s,'animal','feed',{part:'body',requested:100});assert.equal(a.receipt.taken,7);
 const b=act(a,'animal','feed',{part:'body',requested:100});assert.equal(b.receipt.taken,1);
 assert.equal(act(b,'animal','feed',{part:'body',requested:100}).receipt.taken,0);
 const anoxic=system({...s,columns:s.columns.map(c=>c.map(l=>({...l,oxygenGas:0,oxygenWater:0})))});assert.equal(act(anoxic,'animal','feed',{part:'body',requested:5}).receipt.taken,0);
 const before=totals(s);assert.throws(()=>act(s,'animal','excavate',{part:'body',target:'rock',amount:1}));assert.deepEqual(totals(s),before);
});
