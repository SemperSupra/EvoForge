// Deterministic rank traversal, independent of completion order.
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function* scheduledRanks(total,seed,completed=[],limit=total){
 if(!Number.isSafeInteger(total)||total<1||total>10000||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!Number.isSafeInteger(limit)||limit<0||limit>total)throw RangeError('schedule bounds');
 const seen=new Set(completed);if(seen.size>total||[...seen].some(r=>!Number.isSafeInteger(r)||r<0||r>=total))throw RangeError('completed ranks');
 let stride=1+(seed%Math.max(1,total-1));while(gcd(stride,total)!==1)stride=stride%total+1;
 const offset=(Math.imul(seed,2654435761)>>>0)%total;let emitted=0;
 for(let i=0;i<total&&emitted<limit;i++){const rank=(offset+i*stride)%total;if(!seen.has(rank)){yield rank;emitted++;}}
}
