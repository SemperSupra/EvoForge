// Display-only timeline for real generation/render receipts. No worker or GA mutation.
export type PresentationStage = 0 | 1 | 2;
export type PresentationRecord = {readyAt:number;renderedAt?:number};
export const stageDwell = (reviewSeconds:number) => Math.round(Math.max(600, Math.min(1600, reviewSeconds*55)));
export function presentedStage(ready:boolean, record:PresentationRecord|undefined, elapsed:number, index:number, dwell:number):PresentationStage {
  if(!ready||!record)return 0;
  // Four small cohorts reduce full-view churn while retaining individual identities.
  const reveal=Math.max(record.readyAt,dwell+Math.floor(index/4)*180);
  if(elapsed<reveal)return 0;
  if(elapsed<reveal+dwell)return 1;
  return 2;
}
export function presentationComplete(ids:readonly string[],stages:ReadonlyMap<string,PresentationStage>):boolean{
  return ids.length>0&&ids.every(id=>stages.get(id)===2);
}

// A bounded current-generation/render-intent journal of displayed states, not a GA rollback.
export const MAX_STAGE_FRAMES=96;
export const clampDwell=(ms:number)=>Number.isFinite(ms)?Math.round(Math.max(250,Math.min(10000,ms))/50)*50:1100;
export type JournalFrame<T>={key:string;value:T};
export class StageJournal<T>{
 private frames:JournalFrame<T>[]=[];
 private cursor:number|null=null;
 constructor(private readonly limit=MAX_STAGE_FRAMES){if(!Number.isInteger(limit)||limit<2)throw Error("journal limit");}
 get length(){return this.frames.length;}
 get index(){return this.cursor??Math.max(0,this.frames.length-1);}
 get reviewing(){return this.cursor!==null;}
 get current(){return this.frames[this.index]?.value;}
 get atEnd(){return this.index>=this.length-1;}
 clear(){this.frames=[];this.cursor=null;}
 append(key:string,value:T){
  if(this.frames.at(-1)?.key===key)return false;
  this.frames.push({key,value});
  if(this.frames.length>this.limit){this.frames.shift();if(this.cursor!==null)this.cursor=Math.max(0,this.cursor-1);}
  return true;
 }
 seek(index:number){if(this.length&&Number.isFinite(index))this.cursor=Math.max(0,Math.min(this.length-1,Math.trunc(index)));}
 step(delta:-1|1){this.seek(this.index+delta);}
 live(){this.cursor=null;}
}
export function nextStageTime(ready:boolean,record:PresentationRecord|undefined,index:number,dwell:number,stage:PresentationStage):number|null{
 if(!ready||!record||stage===2)return null;
 const reveal=Math.max(record.readyAt,dwell+Math.floor(index/4)*180);
 return stage===0?reveal:(record.renderedAt??reveal)+dwell;
}

 // Never skip the Rendered frame when dwell is edited or a timer is delayed.
export function advanceDisplayedStage(ready:boolean,record:PresentationRecord|undefined,elapsed:number,index:number,dwell:number,stage:PresentationStage):PresentationStage{
 const next=nextStageTime(ready,record,index,dwell,stage);
 if(!ready||!record)return 0;
 if(next===null||elapsed<next)return stage;
 if(stage===0){record.renderedAt=elapsed;return 1;}
 return 2;
}
