import test from 'node:test';import assert from 'node:assert/strict';
import {cell,totals,temperature} from '../material-ecology-r83/thermal.mjs';import {field,advance} from './thermal-field.mjs';
test('2D geothermal transport and closed finite reservoirs',()=>{
 const initial=field(5,5,Array.from({length:25},(_,i)=>cell({water:30,heat:600,lavaHeat:i===12?40000:0,lavaMineral:i===12?200:0})));
 const before=totals(initial.cells);let world=initial,boiled=0,condensed=0;
 for(let t=0;t<80;t++){world=advance(world,{quench:800,conduct:150,waterFlow:1,vaporFlow:2,weather:4,condense:2});boiled+=world.receipt.boiled;condensed+=world.receipt.condensed;assert.deepEqual(world.receipt.totals,before);}
 assert.ok(boiled>0);assert.ok(condensed>0);assert.ok(world.cells[13].solute+world.cells[14].solute>0);assert.ok(temperature(world.cells[7])>20);
 console.log('THERMAL_FIELD '+JSON.stringify({boiled,condensed,total:before,remainingLava:world.cells[12].lavaHeat,heat:world.cells.map(temperature),solute:world.cells.map(c=>c.solute)}));
 assert.deepEqual(totals(initial.cells),before);
});
test('no row wrap, no artificial boil, condensation transfers latent energy',()=>{
 const a=field(2,2,[cell({water:20,heat:400}),cell({water:20,heat:400,vapor:2,vaporHeat:1280}),cell({water:20,heat:400}),cell({water:20,heat:400})]);
 const b=advance(a,{quench:0,conduct:0,waterFlow:0,vaporFlow:1,weather:0,condense:0});
 assert.equal(b.cells[2].vapor,0);assert.equal(b.cells[1].vapor,2);
 const c=advance(a,{quench:0,conduct:0,waterFlow:0,vaporFlow:0,weather:0,condense:1});assert.equal(c.receipt.condensed,1);assert.equal(c.cells[1].heat,1040);assert.equal(c.cells[1].vaporHeat,640);
 assert.equal(c.receipt.boiled,0);assert.deepEqual(c.receipt.totals,totals(a.cells));assert.throws(()=>field(17,1,[]));
});
test('deterministic pair exchanges do not overshoot in a two-cell closed case',()=>{
 const a=field(2,1,[cell({water:10,heat:900}),cell({water:10,heat:100})]);const options={quench:0,conduct:10000,waterFlow:0,vaporFlow:0,condense:0,weather:0,wind:'none'};
 const b=advance(a,options);assert.deepEqual(b,advance(a,options));assert.equal(temperature(b.cells[0]),50);assert.equal(temperature(b.cells[1]),50);
});
