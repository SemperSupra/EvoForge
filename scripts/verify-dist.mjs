import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, join, sep } from 'node:path';
const root=resolve(process.argv[2]||'dist');
const required=new Set(['LICENSE','release.json','index.html','experiences.json','experiences/alife/index.html','experiences/alife/manifest.webmanifest','experiences/alife/sw.js']);
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
// Candidate-specific exact identity, not an arbitrary accepted version range.
const expectedArena='0.1.0-rdte.8';
const declarations=[...html.matchAll(/const experience = \{ id: 'alife', version: '([^']+)'/g)];
if(declarations.length!==1||declarations[0][1]!==expectedArena)throw Error('Unexpected arena version: '+(declarations[0]?.[1]??'missing'));
const sw=await readFile(join(root,'experiences/alife/sw.js'),'utf8');
const caches=[...sw.matchAll(/const CACHE = PREFIX \+ '([^']+)'/g)];
if(caches.length!==1||caches[0][1]!==expectedArena)throw Error('Arena cache version mismatch');
const release=JSON.parse(await readFile(join(root,'release.json'),'utf8'));
if(release.arenaVersion!==expectedArena||release.channel!=='release-candidate'||release.qualification!=='pending')throw Error('Arena candidate provenance mismatch');
console.log('PASS: '+seen.size+' allowlisted static artifacts; no upstream, tests, DLE or source maps');
