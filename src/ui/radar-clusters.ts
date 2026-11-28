// R100 deterministic display-only grouping. Preserve each measured coordinate
// and stage; a cluster is a labeled aggregate, never an altered metric value.
export type RadarPoint={id:string;x:number;y:number;ring:number};
export type RadarCluster={id:string;x:number;y:number;members:RadarPoint[];counts:Record<number,number>};
const ordered=(a:RadarPoint,b:RadarPoint)=>a.id<b.id?-1:a.id>b.id?1:0;
const near=(a:{x:number;y:number},b:{x:number;y:number},d:number)=>Math.hypot(a.x-b.x,a.y-b.y)<d;
function aggregate(members:RadarPoint[]):RadarCluster{
 const points=members.slice().sort(ordered),counts:Record<number,number>={};
 for(const p of points)counts[p.ring]=(counts[p.ring]??0)+1;
 return {id:points.map(p=>p.id).join("|"),x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length,members:points,counts};
}
export function radarClusters(input:readonly RadarPoint[],distance=32):RadarCluster[]{
 if(input.length>128||!Number.isFinite(distance)||distance<=0||distance>80||new Set(input.map(p=>p.id)).size!==input.length||input.some(p=>!p.id||![p.x,p.y].every(Number.isFinite)||!Number.isInteger(p.ring)||p.ring<0))throw Error("radar cluster bounds");
 let clusters=input.slice().sort(ordered).map(p=>aggregate([{...p}]));
 // Merge nearby actual points or aggregate centers. Re-evaluate after each
 // merge to prevent overlapping aggregate labels; bounded by input length.
 for(;;){
  let merged=false;
  outer:for(let i=0;i<clusters.length;i++)for(let j=i+1;j<clusters.length;j++){
   const a=clusters[i],b=clusters[j];
   if(near(a,b,distance)||a.members.some(p=>b.members.some(q=>near(p,q,distance)))){
    clusters[i]=aggregate([...a.members,...b.members]);clusters.splice(j,1);merged=true;break outer;
   }
  }
  if(!merged)break;
 }
 return clusters;
}
