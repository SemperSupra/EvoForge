import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
export async function waitForServer(raw='http://127.0.0.1:5173/', timeout=60000) {
  const url=new URL(raw);
  if(url.protocol!=='http:' || url.hostname!=='127.0.0.1' || url.username || url.password) throw Error('Loopback HTTP only');
  if(!Number.isSafeInteger(timeout)||timeout<1||timeout>120000) throw Error('Invalid timeout');
  const end=performance.now()+timeout;
  while(performance.now()<end) {
    try {
      const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(1000,Math.ceil(end-performance.now()))))});
      await response.body?.cancel();
      if(response.ok && performance.now()<=end) return;
    } catch {}
    await sleep(Math.max(0,Math.min(250,end-performance.now())));
  }
  throw Error('Server readiness timeout: '+url.origin);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  await waitForServer(process.argv[2],process.argv[3]===undefined?60000:Number(process.argv[3]));
}
