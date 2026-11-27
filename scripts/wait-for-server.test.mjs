import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {waitForServer} from './wait-for-server.mjs';
test('rejects remote, credentials, protocols and invalid budgets', async()=>{
  for(const url of ['http://example.com/','http://a:b@127.0.0.1/','https://127.0.0.1/']) await assert.rejects(waitForServer(url,100),/Loopback/);
  for(const t of [0,NaN,120001]) await assert.rejects(waitForServer('http://127.0.0.1/',t),/timeout/);
});
test('waits for successful response, rejects redirect and times out',async()=>{
  let count=0;
  const server=createServer((req,res)=>{
    if(req.url==='/redirect'){res.writeHead(302,{location:'/ready'}).end();return;}
    if(req.url==='/unavailable'){res.writeHead(503).end();return;}
    res.writeHead(++count>=2?200:503).end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    await waitForServer(base+'/ready',3000);assert.ok(count>=2);
    await assert.rejects(waitForServer(base+'/redirect',350),/readiness timeout/);
    await assert.rejects(waitForServer(base+'/unavailable',350),/readiness timeout/);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
