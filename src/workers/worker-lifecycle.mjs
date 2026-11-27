// Bounded worker ownership and terminal results. Native Worker construction
// lives in pool.ts; this kernel is independently testable without a browser.
export class WorkerLifecycle {
 constructor(count,factory){
  if(!Number.isSafeInteger(count)||count<1||count>8)throw Error("Worker count");
  this.closed=false;this.slots=[];this.pending=new Map();this.rr=0;this.cb=()=>{};
  for(let i=0;i<count;i++){
   try{
    const w=factory(),slot={w,live:true,jobs:new Map()};this.slots.push(slot);
    w.onmessage=ev=>this.receive(slot,ev.data);
    w.onerror=ev=>{ev.preventDefault?.();this.fail(slot,"Worker failed: "+String(ev.message??"unknown error"));};
    w.onmessageerror=()=>this.fail(slot,"Worker message could not be decoded");
   }catch{ /* unavailable slots are not admitted; post fails visibly if none */ }
  }
 }
 onMessage(cb){if(typeof cb!=="function")throw Error("Worker callback");this.cb=cb;}
 error(job,message){return {type:"error",jobId:job.jobId,generationId:job.generationId,renderIntentId:job.renderIntentId,candidateId:job.candidateId,slot:job.slot,message};}
 emit(message){queueMicrotask(()=>this.cb(message));}
 forget(slot,id){slot.jobs.delete(id);this.pending.delete(id);}
 fail(slot,message){
  if(!slot.live)return;slot.live=false;
  const jobs=[...slot.jobs.values()];for(const job of jobs){this.forget(slot,job.jobId);this.emit(this.error(job,message));}
  try{slot.w.terminate();}catch{/* preserve failure */}
 }
 receive(slot,msg){
  if(!slot.live||this.closed)return;
  if(!msg||typeof msg!=="object"||typeof msg.jobId!=="string"){this.fail(slot,"Invalid worker message");return;}
  const job=slot.jobs.get(msg.jobId);if(!job)return;
  const identity=msg.generationId===job.generationId&&msg.renderIntentId===job.renderIntentId&&msg.candidateId===job.candidateId&&msg.slot===job.slot;
  const valid=msg.type==="error"?typeof msg.message==="string":msg.type==="result"&&msg.width===job.intent.width&&msg.height===job.intent.height&&msg.rgba instanceof Uint8ClampedArray&&msg.rgba.length===job.intent.width*job.intent.height*4&&!!msg.meta&&typeof msg.meta==="object";
  if(!identity||!valid){this.fail(slot,"Worker result contract violation");return;}
  this.forget(slot,job.jobId);this.emit(msg);
 }
 post(job){
  if(this.pending.has(job.jobId))throw Error("Duplicate outstanding render job: "+job.jobId);
  if(this.closed||this.pending.size>=128){this.emit(this.error(job,this.closed?"Worker pool closed":"Render queue limit reached"));return;}
  let slot=null;
  for(let i=0;i<this.slots.length;i++){const k=(this.rr+i)%this.slots.length;if(this.slots[k].live){slot=this.slots[k];this.rr=(k+1)%this.slots.length;break;}}
  if(!slot){this.emit(this.error(job,"No live render worker"));return;}
  slot.jobs.set(job.jobId,job);this.pending.set(job.jobId,slot);
  try{const genomeQ16=job.genomeQ16.slice();slot.w.postMessage({...job,genomeQ16},[genomeQ16.buffer]);}
  catch(e){this.forget(slot,job.jobId);this.emit(this.error(job,"Render submission failed: "+String(e?.message??e)));}
 }
 terminate(){
  if(this.closed)return;this.closed=true;
  for(const slot of this.slots)this.fail(slot,"Render cancelled: worker pool replaced");
 }
 stats(){return {pending:this.pending.size,live:this.slots.filter(s=>s.live).length,closed:this.closed};}
}
