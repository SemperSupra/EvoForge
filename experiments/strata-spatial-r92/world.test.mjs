import test from 'node:test';import assert from 'node:assert/strict';
import {world,at,contacts,advance,totals} from './world.mjs';
import {example} from '../stratified-arena-r91/fixtures.mjs';
const slice=(bottom,top,raw={})=>({id:'sediment',bottom,top,matrix:0,water:0,heat:0,...raw});
test('terrain-following columns with actual overlapping interfaces',()=>{
 const a=[slice(-2,0,{water:100,heat:1000})],b=[slice(-1,2,{water:30,heat:900})];
 const w=world(2,1,[a,b]);assert.deepEqual(contacts(a,b),[{i:0,j:0,depth:1}]);
 assert.equal(at(w,0,0,-1).layer,'sediment');assert.equal(at(w,1,0,-1.5),null);
 assert.throws(()=>at(w,2,0,0));assert.throws(()=>world(17,1,[]));
 const r=advance(w,{vertical:false});assert.ok(r.receipt.transfers.some(x=>x.kind==='lateral'&&x.water>0));assert.deepEqual(r.receipt.totals,totals(w.columns));
});
test('closed spatial exchange conserves inventories over 100 steps',()=>{
 const a=example(),b=example().map(x=>({...x,bottom:x.bottom+1,top:x.top+1})),c=example().map(x=>({...x,bottom:x.bottom-1,top:x.top-1}));
 const w=world(2,2,[a,b,c,a]);let v=w,count=0;const before=totals(w.columns);
 for(let i=0;i<100;i++){v=advance(v);count+=v.receipt.transfers.length;assert.deepEqual(v.receipt.totals,before);}
 assert.ok(count>0);assert.deepEqual(totals(w.columns),before);assert.deepEqual(advance(w),advance(w));
 console.log('SPATIAL '+JSON.stringify({steps:100,transfers:count,totals:before}));
});
test('sealed, nonoverlapping and no-wrap controls',()=>{
 const a=[slice(0,1,{water:70,solute:30,heat:700,permeability:0})],b=[slice(0,1,{water:1,heat:10})];
 const r=advance(world(2,1,[a,b]),{vertical:false,lateralHeat:0});assert.equal(r.receipt.transfers.length,0);
 const no=advance(world(2,1,[a,[slice(1,2,{heat:900})]]),{vertical:false});assert.equal(no.receipt.transfers.length,0);
 const x=world(2,2,[[slice(5,6)],a,b,[slice(5,6)]]);assert.equal(advance(x,{vertical:false}).receipt.transfers.length,0);
});
