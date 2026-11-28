// R89 deterministic generation checkpoint reference. No UI, storage, worker or
// render-state mutation; exact engine implementation must be available to replay.
import { advanceGeneration } from "./ga";
import type {Candidate,CandidateStatus,GASettingsSnapshot} from "./types";
import { getEngine } from "../engines/registry";
import {assertRenderRequest} from "./render-contract.mjs";
import {noveltyKey as motifNoveltyKey} from "../engines/mosaic/motif-lab.mjs";
import {mosaicNoveltyKey} from "../engines/mosaic/v3";

export type CheckpointCandidate={id:string;genomeQ16:number[];status:CandidateStatus;age:number;maxAge:number};
export type Checkpoint={
 schema:1;branch:string;parent:string|null;engineId:string;engineVersion:string;engineConfig:Record<string,unknown>;
 sessionSeed:number;effectiveSessionSeed:number;generationIndex:number;settings:GASettingsSnapshot;candidates:CheckpointCandidate[];
};
const maxBytes=512*1024;
const integer=(x:unknown,lo:number,hi:number):x is number=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const branchValid=(s:unknown):s is string=>typeof s==="string"&&/^[A-Za-z0-9_-]{1,64}$/.test(s);
const statuses=["normal","picked","skipped","retired"] as const;
const fields=["pickN","mutationRate","crossoverRate","newBloodRate","longevityMin","longevityMax"] as const;
function stable(v:unknown):string{
 if(v===null||typeof v==="boolean"||typeof v==="number"||typeof v==="string")return JSON.stringify(v);
 if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
 if(v&&typeof v==="object"){const obj=v as Record<string,unknown>;return "{"+Object.keys(obj).sort().map(k=>JSON.stringify(k)+":"+stable(obj[k])).join(",")+"}";}
 throw Error("non-JSON checkpoint data");
}
function validate(o:Checkpoint):Checkpoint{
 if(!o||o.schema!==1||!branchValid(o.branch)||o.parent!==null&&(typeof o.parent!=="string"||!/^[a-f0-9]{64}$/.test(o.parent)))throw Error("checkpoint identity");
 const engine=getEngine(o.engineId,o.engineVersion),spec=engine.spec(),defaults=engine.defaultConfig();
 if(!integer(o.sessionSeed,0,0xffffffff)||!integer(o.effectiveSessionSeed,0,0xffffffff)||!integer(o.generationIndex,0,1000000))throw Error("checkpoint seed/generation");
 if(!o.settings||Object.keys(o.settings).sort().join(",")!==[...fields].sort().join(","))throw Error("checkpoint GA settings");
 const s=o.settings;if(!integer(s.pickN,1,128)||![s.mutationRate,s.crossoverRate,s.newBloodRate].every(x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=1)||!integer(s.longevityMin,1,10000)||!integer(s.longevityMax,s.longevityMin,10000))throw Error("checkpoint GA limits");
 if(!o.engineConfig||!Object.keys(defaults).every(k=>Object.hasOwn(o.engineConfig,k)))throw Error("explicit engine config required");
 if(!Array.isArray(o.candidates)||o.candidates.length<1||o.candidates.length>128||new Set(o.candidates.map(c=>c.id)).size!==o.candidates.length)throw Error("checkpoint population");
 const candidates=o.candidates.map(c=>{
  if(!c||typeof c.id!=="string"||!/^g[0-9]+-c[0-9]+$/.test(c.id)||!statuses.includes(c.status)||!integer(c.maxAge,1,10000)||!integer(c.age,0,c.maxAge)||!Array.isArray(c.genomeQ16)||c.genomeQ16.length!==spec.genomeLength||!c.genomeQ16.every(x=>integer(x,0,65535)))throw Error("checkpoint candidate");
  const g=Uint16Array.from(c.genomeQ16);assertRenderRequest(spec,g,o.engineConfig,{kind:"thumb",width:64,height:64,lod:0});
  if(c.status==="retired"&&c.age<c.maxAge||c.status!=="retired"&&c.age>=c.maxAge)throw Error("candidate lifecycle");
  return {id:c.id,genomeQ16:Array.from(g),status:c.status,age:c.age,maxAge:c.maxAge};
 });
 // Normalize only data ordering, never fill absent engine config or rewrite a genome.
 return {schema:1,branch:o.branch,parent:o.parent,engineId:o.engineId,engineVersion:o.engineVersion,engineConfig:structuredClone(o.engineConfig),sessionSeed:o.sessionSeed,effectiveSessionSeed:o.effectiveSessionSeed,generationIndex:o.generationIndex,settings:{...s},candidates};
}
export function encodeCheckpoint(cp:Checkpoint):string{const v=stable(validate(cp));if(new TextEncoder().encode(v).length>maxBytes)throw Error("checkpoint byte budget");return v;}
export function decodeCheckpoint(data:string):Checkpoint{if(typeof data!=="string"||data.length>maxBytes||new TextEncoder().encode(data).length>maxBytes)throw Error("checkpoint byte budget");return validate(JSON.parse(data));}
export async function checkpointId(cp:Checkpoint):Promise<string>{
 const bytes=new TextEncoder().encode(encodeCheckpoint(cp)),digest=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
export async function forkCheckpoint(parent:Checkpoint,branch:string,edits:Readonly<Record<string,CandidateStatus>>={}):Promise<Checkpoint>{
 const cp=decodeCheckpoint(encodeCheckpoint(parent));if(!branchValid(branch)||branch===cp.branch)throw Error("distinct branch required");
 const ids=new Set(cp.candidates.map(c=>c.id));
 for(const [id,status] of Object.entries(edits))if(!ids.has(id)||!statuses.includes(status)||status==="retired")throw Error("invalid selection edit");
 for(const c of cp.candidates){if(Object.hasOwn(edits,c.id)){if(c.status==="retired")throw Error("retired immutable");c.status=edits[c.id];}}
 cp.branch=branch;cp.parent=await checkpointId(parent);return decodeCheckpoint(encodeCheckpoint(cp));
}
export async function advanceCheckpoint(input:Checkpoint):Promise<Checkpoint>{
 const cp=decodeCheckpoint(encodeCheckpoint(input)),engine=getEngine(cp.engineId,cp.engineVersion);
 if(cp.generationIndex>=1000000)throw Error("generation limit");
 const legacy=cp.engineId==="mosaic"&&cp.engineVersion==="1.0.0";
 const novelty=cp.engineId==="mosaic-motif"?((g:Uint16Array)=>motifNoveltyKey(g,cp.engineConfig)):cp.engineId==="mosaic"&&cp.engineVersion==="3.0.0"?((g:Uint16Array)=>mosaicNoveltyKey(g,cp.engineConfig)):undefined;
 const candidates:Candidate[]=cp.candidates.map(c=>({...c,genomeQ16:Uint16Array.from(c.genomeQ16)}));
 const out=advanceGeneration({sessionSeed:legacy?cp.sessionSeed:cp.effectiveSessionSeed,generationIndex:cp.generationIndex,candidates,settings:cp.settings,...(!legacy?{engine}:{}),...(novelty?{noveltyKey:novelty}:{})});
 cp.parent=await checkpointId(input);cp.generationIndex++;cp.candidates=out.nextCandidates.map(c=>({...c,genomeQ16:Array.from(c.genomeQ16)}));
 return decodeCheckpoint(encodeCheckpoint(cp));
}
// Bounded append-only in-memory archive. Explicitly reject capacity, missing parent,
// and conflicting identity rather than silently dropping ancestors. Storage UI is future.
export class CheckpointArchive{
 private records=new Map<string,string>();
 constructor(private readonly capacity=64){if(!integer(capacity,1,128))throw Error("archive capacity");}
 get size(){return this.records.size;}
 async add(cp:Checkpoint){const data=encodeCheckpoint(cp),id=await checkpointId(cp);if(this.records.has(id))return id;if(this.records.size>=this.capacity)throw Error("archive full");if(cp.parent!==null&&!this.records.has(cp.parent))throw Error("missing checkpoint parent");this.records.set(id,data);return id;}
 get(id:string){const data=this.records.get(id);if(!data)throw Error("unknown checkpoint");return decodeCheckpoint(data);}
 export(){return JSON.stringify({schema:1,entries:[...this.records].map(([id,data])=>({id,data}))});}
 static async restore(raw:string,capacity=64){if(typeof raw!=="string"||raw.length>64*1024*1024)throw Error("archive bytes");const obj=JSON.parse(raw);if(obj?.schema!==1||!Array.isArray(obj.entries)||obj.entries.length>capacity)throw Error("archive schema");const a=new CheckpointArchive(capacity);for(const e of obj.entries){const cp=decodeCheckpoint(e.data),id=await a.add(cp);if(id!==e.id)throw Error("checkpoint hash mismatch");}return a;}
}
