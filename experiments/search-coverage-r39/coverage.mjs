// Finite, explicitly coarsened design space, independent of raw genome entropy.
export const AXES=Object.freeze({
 emblem:{technique:4,material:3,cell:4,grout:2,frame:3,variance:3},
 motif:{technique:4,material:3,palette:6,background:4,scale:3,variant:3},
 craft:{family:6,palette:6,technique:4,material:3,scale:3,symmetry:2}
});
export function cardinality(axes){return Object.values(axes).reduce((n,k)=>{if(!Number.isSafeInteger(k)||k<1)throw RangeError('invalid axis');return n*BigInt(k)},1n)}
export function* enumerate(axes,offset=0n,limit=10000){
 const total=cardinality(axes),entries=Object.entries(axes);
 if(typeof offset!=='bigint'||offset<0n||!Number.isSafeInteger(limit)||limit<0||limit>10000)throw RangeError('budget');
 for(let rank=offset;rank<total&&rank<offset+BigInt(limit);rank++){let r=rank;const candidate={};for(const [key,k] of entries){candidate[key]=Number(r%BigInt(k));r/=BigInt(k)}yield {rank:rank.toString(),candidate}}
}
export const capacity=(count,seconds=300)=>({count:count.toString(),seconds,requiredPerSecond:Number(count)/seconds});
