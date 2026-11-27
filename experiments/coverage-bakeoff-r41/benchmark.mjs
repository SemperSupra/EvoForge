import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {AXES,enumerate,cardinality} from '../search-coverage-r39/coverage.mjs';
import * as emblem from '../../src/engines/mosaic/emblems.mjs';
import * as motif from '../../src/engines/mosaic/motif-lab.mjs';
import {mosaicEngine_v3 as craft} from '../../src/engines/mosaic/v3.ts';
const W=96,H=64,intent={kind:'thumb',width:W,height:H,lod:1};
const center=(i,n)=>Math.floor((i+.5)*65536/n);
const bins=(g,i,n,values,j)=>{g[i]=center(values[j],n)};
function recipe(lane,c){
 const g=new Uint16Array({emblem:12,motif:16,craft:24}[lane]).fill(32768);
 let config,decode,render;
 if(lane==='emblem'){
  config={symbolId:'us',techniqueId:c.technique,materialId:c.material};g[2]=center([0,5,10,15][c.cell],16);g[3]=center(c.grout,2);g[4]=center([0,4,9][c.variance],10);g[6]=center(c.frame,3);
  g[7]=42;g[8]=0;decode=emblem.decode;render=emblem.render;
 }else if(lane==='motif'){
  config={motifId:'dragon-west',techniqueId:c.technique,materialId:c.material};g[2]=center(c.palette,6);g[13]=center(c.background,4);bins(g,8,25,[0,12,24],c.scale);bins(g,15,25,[0,12,24],c.variant);g[10]=42;g[11]=0;decode=motif.decode;render=motif.render;
 }else{
  config={familyId:c.family,techniqueId:c.technique,materialId:c.material};g[1]=center(c.palette,6);bins(g,6,31,[0,15,30],c.scale);g[11]=center(c.symmetry,2);g[14]=42;g[15]=0;decode=craft.decode;render=craft.renderRGBA;
 }
 return {g,config,decoded:decode(g,config),render};
}
const hash=b=>createHash('sha256').update(b).digest('hex');
function signature(rgba){
 // Coarse RGB cell means at fixed resolution, quantized to 4 bits/channel.
 // Not a perceptual-equivalence oracle: bin collisions and boundary splits possible.
 const result=[];for(let by=0;by<8;by++)for(let bx=0;bx<12;bx++){const sum=[0,0,0];for(let y=by*8;y<(by+1)*8;y++)for(let x=bx*8;x<(bx+1)*8;x++){const at=(y*W+x)*4;for(let c=0;c<3;c++)sum[c]+=rgba[at+c]}for(const v of sum)result.push(Math.min(15,Math.floor(v/(64*16))).toString(16));}return result.join('');
}
function png(width,height,rgba){
 const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0};
 const chunk=(name,data)=>{const type=Buffer.from(name),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([len,type,data,sum]);};
 const head=Buffer.alloc(13);head.writeUInt32BE(width);head.writeUInt32BE(height,4);head[8]=8;head[9]=6;
 const scan=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)Buffer.from(rgba.subarray(y*width*4,(y+1)*width*4)).copy(scan,y*(width*4+1)+1);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
}
if(!isMainThread){
 const {lane,rows,deadline,sampleStride}=workerData;for(const row of rows){
  if(Date.now()>=deadline)break;const t=performance.now();const {g,config,decoded,render}=recipe(lane,row.candidate);
  const {rgba}=await render(g,config,intent);assert.equal(rgba.length,W*H*4);
  parentPort.postMessage({rank:row.rank,hash:hash(rgba),signature:signature(rgba),decodedHash:hash(JSON.stringify(decoded)),ms:performance.now()-t,preview:Number(row.rank)%sampleStride===0?rgba:null});
 }
}else{
 const lane=process.argv[2];assert.ok(Object.hasOwn(AXES,lane));const count=Number(cardinality(AXES[lane]));const rows=[...enumerate(AXES[lane])];assert.equal(rows.length,count);
 const workers=4,budget=300000,deadline=Date.now()+budget,start=performance.now(),results=[],sampleStride=Math.max(1,Math.floor(count/32));
 await Promise.all(Array.from({length:workers},(_,i)=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{lane,rows:rows.filter((_,j)=>j%workers===i),deadline,sampleStride}});w.on('message',row=>results.push(row));w.on('error',reject);w.on('exit',code=>code===0?resolve():reject(Error('worker '+code)));})));
 results.sort((a,b)=>Number(a.rank)-Number(b.rank));assert.equal(new Set(results.map(x=>x.rank)).size,results.length);
 const elapsed=(performance.now()-start)/1000,out='coverage-evidence';await mkdir(out,{recursive:true});
 const unique=k=>new Set(results.map(r=>r[k])).size;
 const summary={lane,count,completed:results.length,complete:results.length===count,elapsedSeconds:elapsed,withinFiveMinutes:results.length===count&&elapsed<=300,renderPerSecond:results.length/elapsed,uniqueDecoded:unique('decodedHash'),uniquePixelHashes:unique('hash'),uniqueCoarseSignatures:unique('signature'),resolution:[W,H],lod:1,workers,budgetSeconds:300,textureSeed:42,scope:'explicit coarse grid, fixed subject for emblem/motif, exact real renderer outputs; signature is not validated perceptual metric'};
 const samples=results.filter(x=>x.preview),cols=4,rowsN=Math.ceil(samples.length/cols);if(rowsN){const sheet=new Uint8ClampedArray(cols*W*rowsN*H*4);for(let i=0;i<samples.length;i++){for(let y=0;y<H;y++){const dst=((Math.floor(i/cols)*H+y)*cols*W+(i%cols)*W)*4;sheet.set(samples[i].preview.subarray(y*W*4,(y+1)*W*4),dst);}}await writeFile(out+'/contact-sheet.png',png(cols*W,rowsN*H,sheet));}
 await writeFile(out+'/sample-ranks.json',JSON.stringify(samples.map(x=>x.rank)));
 await writeFile(out+'/results.json',JSON.stringify(results.map(({preview,...x})=>x)));
 await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
 assert.ok(results.length>0);
}
