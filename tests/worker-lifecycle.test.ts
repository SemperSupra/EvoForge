import {describe,it,expect} from "vitest";
import {WorkerLifecycle} from "../src/workers/worker-lifecycle.mjs";
import type {RenderJob,MainMessage} from "../src/workers/protocol";
class Fake {
 onmessage:((e:{data:unknown})=>void)|null=null;onerror:((e:unknown)=>void)|null=null;onmessageerror:(()=>void)|null=null;
 sent:RenderJob[]=[];terminated=0;throwPost=false;
 postMessage(j:RenderJob,transfer:Transferable[]){if(this.throwPost)throw Error("send failure");this.sent.push(structuredClone(j,{transfer}));}
 terminate(){this.terminated++;}
}
const job=(i:number):RenderJob=>({type:"render",jobId:"j"+i,generationId:1,renderIntentId:1,candidateId:"c"+i,slot:"thumb",engineId:"mosaic",engineVersion:"2.0.0",genomeQ16:new Uint16Array([123,456]),engineConfig:{},intent:{kind:"thumb",width:2,height:2,lod:0}});
const result=(j:RenderJob):MainMessage=>({type:"result",jobId:j.jobId,generationId:j.generationId,renderIntentId:j.renderIntentId,candidateId:j.candidateId,slot:j.slot,rgba:new Uint8ClampedArray(16),width:2,height:2,meta:{}});
const tick=()=>Promise.resolve();
function setup(n=2){const workers:Fake[]=[],messages:MainMessage[]=[];const p=new WorkerLifecycle(n,()=>{const w=new Fake();workers.push(w);return w as unknown as Worker;});p.onMessage(m=>messages.push(m));return {p,workers,messages};}
describe("worker lifecycle",()=>{
 it("copies genome, returns each job once and ignores duplicate results",async()=>{const {p,workers,messages}=setup();const j=job(1);p.post(j);expect(j.genomeQ16).toEqual(new Uint16Array([123,456]));workers[0].onmessage!({data:result(j)});workers[0].onmessage!({data:result(j)});await tick();expect(messages).toHaveLength(1);expect(p.stats().pending).toBe(0);});
 it("fails outstanding work on startup/runtime failure, retains healthy worker",async()=>{const {p,workers,messages}=setup();p.post(job(1));p.post(job(2));p.post(job(3));workers[0].onerror!({message:"startup"});await tick();expect(messages.map(m=>m.jobId)).toEqual(["j1","j3"]);expect(messages.every(m=>m.type==="error")).toBe(true);p.post(job(4));workers[1].onmessage!({data:result(job(2))});workers[1].onmessage!({data:result(job(4))});await tick();expect(messages.length).toBe(4);expect(p.stats().pending).toBe(0);});
 it("rejects corrupted worker results and all affected outstanding work",async()=>{const {p,workers,messages}=setup(1);p.post(job(1));p.post(job(2));workers[0].onmessage!({data:{...result(job(1)),width:3}});await tick();expect(messages.length).toBe(2);expect(messages.every(m=>m.type==="error")).toBe(true);expect(p.stats().live).toBe(0);});
 it("cancellation, failed submissions and no live workers are explicit",async()=>{const {p,workers,messages}=setup(1);workers[0].throwPost=true;p.post(job(1));workers[0].throwPost=false;p.post(job(2));p.terminate();p.post(job(3));await tick();expect(messages.map(m=>m.jobId)).toEqual(["j1","j2","j3"]);expect(messages.every(m=>m.type==="error")).toBe(true);expect(p.stats()).toEqual({pending:0,live:0,closed:true});});
 it("bounds outstanding queue and rejects duplicate ids",async()=>{const {p,messages}=setup(1);for(let i=0;i<128;i++)p.post(job(i));expect(()=>p.post(job(0))).toThrow();p.post(job(128));await tick();expect(messages).toHaveLength(1);expect(messages[0].type).toBe("error");expect(p.stats().pending).toBe(128);p.terminate();});
});
