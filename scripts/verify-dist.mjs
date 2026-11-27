import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, join, sep } from 'node:path';
const root=resolve(process.argv[2]||'dist');
const required=new Set(['index.html','experiences.json','experiences/alife/index.html','experiences/alife/manifest.webmanifest','experiences/alife/sw.js']);
const seen=new Set();
async function walk(dir){
  for(const name of await readdir(dir)){
    const p=join(dir,name), rel=relative(root,p).split(sep).join('/'), st=await lstat(p);
    if(st.isSymbolicLink())throw Error('Symlink forbidden: '+rel);
    if(st.isDirectory()){if(!['assets','experiences','experiences/alife'].includes(rel))throw Error('Unexpected directory '+rel);await walk(p);continue;}
    if(!st.isFile()||(!required.has(rel)&&!/^assets\/[A-Za-z0-9_.-]+\.(js|css|wasm|png|svg|webp|woff2?)$/.test(rel)))throw Error('Unexpected artifact '+rel);
    seen.add(rel);
  }
}
await walk(root);
for(const p of required)if(!seen.has(p))throw Error('Missing artifact '+p);
if(![...seen].some(x=>/^assets\/.*\.js$/.test(x)))throw Error('Missing compiled launcher');
const catalog=JSON.parse(await readFile(join(root,'experiences.json'),'utf8'));
if(catalog.schemaVersion!==1||catalog.experiences.map(x=>x.id).join(',')!=='mosaic,alife')throw Error('Catalog mismatch');
const html=await readFile(join(root,'experiences/alife/index.html'),'utf8');
if(!html.includes('0.1.0-rdte.5'))throw Error('Unexpected arena version');
console.log('PASS: '+seen.size+' allowlisted static artifacts; no upstream, tests, DLE or source maps');
