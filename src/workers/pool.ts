import {WorkerLifecycle} from "./worker-lifecycle.mjs";
export class WorkerPool extends WorkerLifecycle {
 constructor(count:number){super(count,()=>new Worker(new URL("./worker.ts",import.meta.url),{type:"module"}));}
}
