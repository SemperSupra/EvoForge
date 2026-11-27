import type {RenderJob,MainMessage} from "./protocol";
export class WorkerLifecycle {
 constructor(count:number,factory:()=>Worker);
 onMessage(cb:(msg:MainMessage)=>void):void;
 post(job:RenderJob):void;
 terminate():void;
 stats():{pending:number;live:number;closed:boolean};
}
