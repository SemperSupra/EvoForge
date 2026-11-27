import {readdir,lstat,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [rootArg,manifestArg]=process.argv.slice(2);
assert.ok(rootArg&&manifestArg,'Usage: verify-artifact.mjs ROOT MANIFEST');
const root=resolve(rootArg), expected=new Map(),actual=new Map();
assert.ok((await lstat(root)).isDirectory(),'Root must be real directory');
for(const line of (await readFile(manifestArg,'utf8')).trimEnd().split('\n')){
  const match=/^([a-f0-9]{64})  (\.\/[A-Za-z0-9_./-]+)$/.exec(line);
  assert.ok(match,'Invalid manifest record');
  const [,hash,path]=match;
  assert.ok(path.slice(2).split('/').every(x=>x!==''&&x!=='.'&&x!=='..'),'Unsafe path');
  assert.ok(!expected.has(path),'Duplicate manifest path');
  expected.set(path,hash);
}
assert.ok(expected.size>0,'Empty manifest');
async function walk(dir,rel){
  for(const name of await readdir(dir)){
    const p=join(dir,name),r=rel+'/'+name,s=await lstat(p);
    if(s.isDirectory())await walk(p,r);
    else {assert.ok(s.isFile()&&!s.isSymbolicLink(),'Nonregular artifact '+r);actual.set(r,createHash('sha256').update(await readFile(p)).digest('hex'));}
  }
}
await walk(root,'.');
assert.equal(actual.size,expected.size,'File count mismatch');
for(const [p,h] of expected)assert.equal(actual.get(p),h,'Artifact hash mismatch: '+p);
console.log(JSON.stringify({gate:'artifact-integrity',files:actual.size,pass:true}));
