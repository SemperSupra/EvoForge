// Display-only timeline for real generation/render receipts. No worker or GA mutation.
export type PresentationStage = 0 | 1 | 2;
export type PresentationRecord = {readyAt:number};
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
