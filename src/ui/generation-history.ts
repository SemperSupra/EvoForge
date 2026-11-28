// R95: immutable snapshots of the actual pre-advance GA inputs. No worker/render mutation.
// Persistence is best effort, local-only and conflict-detecting; export remains available.
import {CheckpointArchive,encodeCheckpoint,decodeCheckpoint,forkCheckpoint,advanceCheckpoint,type Checkpoint} from "../core/evolution-history";
import type {Candidate,CandidateStatus,GASettingsSnapshot} from "../core/types";
export type LiveGeneration={engineId:string;engineVersion:string;engineConfig:Record<string,unknown>;sessionSeed:number;effectiveSessionSeed:number;generationIndex:number;settings:GASettingsSnapshot;candidates:Candidate[]};
export type HistoryRow={id:string;branch:string;generationIndex:number;count:number;picked:number;engineId:string;engineVersion:string};
type StorageLike=Pick<Storage,"getItem"|"setItem">;
const keyFor=(id:string,version:string)=>"evoforge:generation-history:v1:"+id+"@"+version;
const maxBytes=2*1024*1024;
export class GenerationHistory{
 private archive=new CheckpointArchive(64);
 private parents=new Map<string,string>();
 private queue:Promise<void>;
 private saved:string|null=null;
 private fault:string|null=null;
 private readonly key:string;
 constructor(private readonly engineId:string,private readonly engineVersion:string,private readonly storage:StorageLike|null){
  this.key=keyFor(engineId,engineVersion);
  this.queue=this.restore();
 }
 private async restore(){
  if(!this.storage){this.fault="Storage unavailable; export history manually.";return;}
  try{this.saved=this.storage.getItem(this.key);if(this.saved){
   if(new TextEncoder().encode(this.saved).length>maxBytes)throw Error("history storage budget");
   const restored=await CheckpointArchive.restore(this.saved,64);
   for(const row of this.readRows(restored))if(row.engineId!==this.engineId||row.engineVersion!==this.engineVersion)throw Error("history engine mismatch");
   this.archive=restored;
  }}catch(e){this.fault="Existing history could not be restored; not overwritten: "+String(e);}
 }
 private readRows(a=this.archive):HistoryRow[]{
  const records=JSON.parse(a.export()).entries as {id:string;data:string}[];
  return records.map(r=>{const c=decodeCheckpoint(r.data);return {id:r.id,branch:c.branch,generationIndex:c.generationIndex,count:c.candidates.length,picked:c.candidates.filter(x=>x.status==="picked").length,engineId:c.engineId,engineVersion:c.engineVersion};});
 }
 private persist(){
  if(!this.storage||this.fault)return;
  try{if(this.storage.getItem(this.key)!==this.saved)throw Error("history changed in another tab");
   const raw=this.archive.export();if(new TextEncoder().encode(raw).length>maxBytes)throw Error("history storage budget");
   this.storage.setItem(this.key,raw);this.saved=raw;
  }catch(e){this.fault="Local save stopped; export history manually: "+String(e);}
 }
 record(branch:string,live:LiveGeneration):Promise<string>{
  // Snapshot synchronously before asynchronous hashing or subsequent live state changes.
  const snapshot:Checkpoint={schema:1,branch,parent:null,engineId:live.engineId,engineVersion:live.engineVersion,engineConfig:structuredClone(live.engineConfig),sessionSeed:live.sessionSeed,effectiveSessionSeed:live.effectiveSessionSeed,generationIndex:live.generationIndex,settings:{...live.settings},candidates:live.candidates.map(c=>({...c,genomeQ16:Array.from(c.genomeQ16)}))};
  const operation=this.queue.then(async()=>{
   if(snapshot.engineId!==this.engineId||snapshot.engineVersion!==this.engineVersion)throw Error("history engine mismatch");
   snapshot.parent=this.parents.get(branch)??null;
   const id=await this.archive.add(snapshot);this.parents.set(branch,id);this.persist();return id;
  });
  this.queue=operation.then(()=>{},e=>{this.fault="History recording stopped or incomplete: "+String(e);});
  return operation;
 }
 async settled(){await this.queue;}
 rows(){return this.readRows();}
 get warning(){return this.fault;}
 get(id:string){return this.archive.get(id);}
 export(){return this.archive.export();}
 // Create a separate, explicit branch from an immutable recorded checkpoint.
 // Queue with ordinary capture; never mutate the historical record.
 createFork(id:string,branch:string,edits:Readonly<Record<string,CandidateStatus>>):Promise<{id:string;checkpoint:Checkpoint}>{
  const operation=this.queue.then(async()=>{
   if(this.readRows().some(r=>r.branch===branch))throw Error("branch already exists");
   const parent=this.archive.get(id),checkpoint=await forkCheckpoint(parent,branch,edits);
   const forkId=await this.archive.add(checkpoint);this.parents.set(branch,forkId);this.persist();
   return {id:forkId,checkpoint:this.archive.get(forkId)};
  });
  this.queue=operation.then(()=>{},e=>{this.fault="Fork not recorded: "+String(e);});
  return operation;
 }
 async compare(id:string,branch:string,edits:Readonly<Record<string,CandidateStatus>>){
  await this.queue;const original=this.archive.get(id),baseline=await advanceCheckpoint(original);
  const fork=await forkCheckpoint(original,branch,edits),alternative=await advanceCheckpoint(fork);
  // Comparison is deliberately a preview; do not commit a fork or touch live population.
  return {originalId:id,baseline,alternative,changedSlots:baseline.candidates.filter((c,i)=>JSON.stringify(c)!==JSON.stringify(alternative.candidates[i])).length};
 }
}
