import {AXES,enumerate,cardinality} from '../search-coverage-r39/coverage.mjs';
export {AXES,cardinality};
export function rowAt(lane,rank){if(!Object.hasOwn(AXES,lane)||!Number.isSafeInteger(rank)||rank<0||BigInt(rank)>=cardinality(AXES[lane]))throw RangeError('rank');return [...enumerate(AXES[lane],BigInt(rank),1)][0];}
export class CoverageIndex{
 constructor(lane){if(!Object.hasOwn(AXES,lane))throw RangeError('engine');this.lane=lane;this.total=Number(cardinality(AXES[lane]));this.ranks=new Set();this.groups=new Map();}
 add(rank,hash){if(!Number.isSafeInteger(rank)||rank<0||rank>=this.total||this.ranks.has(rank)||!(/^[a-f0-9]{64}$/).test(hash))throw Error('invalid or repeated rank');this.ranks.add(rank);const list=this.groups.get(hash)??[];list.push(rank);this.groups.set(hash,list);}
 get count(){return this.ranks.size}
 get complete(){return this.count===this.total}
 get unique(){return this.groups.size}
 page(offset,size){if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(size)||size<1||size>24)throw RangeError('page');return [...this.groups.entries()].map(([hash,ranks])=>({hash,ranks:[...ranks].sort((a,b)=>a-b)})).sort((a,b)=>a.ranks[0]-b.ranks[0]).slice(offset,offset+size);}
 export(){return {schema:1,lane:this.lane,textureSeed:42,resolution:[96,64],lod:1,total:this.total,completed:this.count,complete:this.complete,groups:[...this.groups.entries()].map(([hash,ranks])=>({hash,ranks:[...ranks].sort((a,b)=>a-b)})).sort((a,b)=>a.ranks[0]-b.ranks[0])};}
}
