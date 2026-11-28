import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,sep,extname} from 'node:path';
export async function serve(){
 const root=resolve('dist'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
 const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');let rel=u.pathname.slice(1);if(!rel||rel.endsWith('/'))rel+='index.html';const p=resolve(root,decodeURIComponent(rel));if(!p.startsWith(root+sep))throw Error('path');const bytes=await readFile(p);if(res.destroyed)return;res.writeHead(200,{'content-type':mime[extname(p)]||'application/octet-stream'});res.end(bytes);}catch{if(res.destroyed)return;if(!res.headersSent)res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {base:'http://127.0.0.1:'+server.address().port+'/',close:()=>new Promise(r=>server.close(r))};
}
