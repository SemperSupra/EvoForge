import test from 'node:test';import assert from 'node:assert/strict';
import {cell,step,totals,temperature,exposure} from './thermal.mjs';
test('finite lava heat and minerals move, shallow steam is mass/energy accounted',()=>{
 const initial=[cell({water:20,heat:2000,lavaHeat:20000,lavaMineral:70}),cell({water:20,heat:400}),cell({water:20,heat:400})];
 const total=totals(initial);let c=initial,steam=0;
 for(let i=0;i<40;i++){const s=step(c,{quench:800,conduct:120,flow:1,weather:3});c=s.cells;steam+=s.emissions.reduce((a,b)=>a+b,0);assert.deepEqual(s.totals,total);}
 assert.ok(steam>0);assert.ok(c[1].solute+c[2].solute>0);assert.ok(temperature(c[2])>20);assert.ok(c[0].lavaHeat<20000);assert.deepEqual(totals(initial),total);
});
test('pressure, dry cell and vent-off controls; direct molten contact distinct from cooling crust',()=>{
 const a=cell({water:10,heat:1900,pressure:1}),b=cell({...a,pressure:15});
 assert.ok(step([a],{quench:0,flow:0}).emissions[0]>0);assert.equal(step([b],{quench:0,flow:0}).emissions[0],0);
 const dry=cell({lavaHeat:9000,lavaMineral:40});assert.equal(step([dry]).emissions[0],0);
 assert.equal(exposure(dry,{directMoltenContact:true,energy:250}).alive,false);
 assert.equal(exposure(cell({lavaHeat:1000}),{directMoltenContact:true,energy:250}).alive,true);
 assert.equal(exposure(cell({water:10,heat:2000}),{energy:250}).reason,'thermal-dose');
 assert.deepEqual(step([cell({water:10,heat:200})],{quench:0,flow:0}).cells,[cell({water:10,heat:200})]);
});
test('input and bound checks',()=>{assert.throws(()=>cell({water:-1}));assert.throws(()=>step(Array(65).fill(cell())));assert.throws(()=>step([cell({water:1})],{flow:-1}));});
