import type { Candidate } from "../core/types";
type Preview = { w:number; h:number; rgba:Uint8ClampedArray; status:"gen"|"ready"|"err" };
type Metric = "brightness"|"contrast"|"saturation"|"edge";
type Metrics = Record<Metric,number>;
export type LensState = { ringsOpen:boolean; radarOpen:boolean; selected:string|null; filters: {metric:Metric;minimum:number}[]; stage:number };
const names:Record<Metric,string>={brightness:"Brightness",contrast:"Contrast",saturation:"Saturation",edge:"Edge variation"};
const keys=Object.keys(names) as Metric[];
const cache=new WeakMap<Uint8ClampedArray,Metrics>();
export function previewMetrics(p:Preview):Metrics|null {
 if(p.status!=="ready"||p.w<1||p.h<1||p.rgba.length!==p.w*p.h*4)return null;
 const prior=cache.get(p.rgba);if(prior)return prior;
 // Bounded deterministic raster sampling; descriptive only, not critic scores.
 let sum=0,sq=0,sat=0,edge=0,n=0;const step=Math.max(1,Math.floor(Math.sqrt(p.w*p.h/256)));
 const l=(i:number)=>(.2126*p.rgba[i]+.7152*p.rgba[i+1]+.0722*p.rgba[i+2])/255;
 for(let y=0;y<p.h;y+=step)for(let x=0;x<p.w;x+=step){
   const i=(y*p.w+x)*4,v=l(i),max=Math.max(p.rgba[i],p.rgba[i+1],p.rgba[i+2]),min=Math.min(p.rgba[i],p.rgba[i+1],p.rgba[i+2]);
   sum+=v;sq+=v*v;sat+=max===0?0:(max-min)/max;edge+=Math.abs(v-l((y*p.w+Math.min(p.w-1,x+step))*4));n++;
 }
 const clamp=(x:number)=>Math.max(0,Math.min(1,x));
 const m={brightness:clamp(sum/n),contrast:clamp(2*Math.sqrt(Math.max(0,sq/n-(sum/n)**2))),saturation:clamp(sat/n),edge:clamp(edge/n)};
 cache.set(p.rgba,m);return m;
}
export function lensStages(candidates:Candidate[],previews:Map<string,Preview>,filters:LensState["filters"]){
 const stages:{label:string;ids:string[];removed:string[]}[]=[];
 const push=(label:string,ids:string[])=>{const before=stages.at(-1)?.ids??ids;const kept=new Set(ids);stages.push({label,ids,removed:before.filter(id=>!kept.has(id))});};
 push("Exploration",candidates.map(c=>c.id));
 push("Rendered",stages[0].ids.filter(id=>previews.get(id)?.status==="ready"));
 push("Eligible",stages[1].ids.filter(id=>candidates.some(c=>c.id===id&&(c.status==="normal"||c.status==="picked"))));
 for(const f of filters)push(names[f.metric]+" ≥ "+Math.round(f.minimum*100)+"%",stages.at(-1)!.ids.filter(id=>{const p=previews.get(id);const m=p&&previewMetrics(p);return !!m&&m[f.metric]>=f.minimum;}));
 push("Human picks",stages.at(-1)!.ids.filter(id=>candidates.some(c=>c.id===id&&c.status==="picked")));
 return stages;
}
const svgNS="http://www.w3.org/2000/svg";
function svg(tag:string,attrs:Record<string,string|number>){const n=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
export function renderEvolutionLenses(candidates:Candidate[],previews:Map<string,Preview>,state:LensState,onChange:()=>void,onInspect:(id:string)=>void){
 const host=document.createElement("section");host.className="evolution-lenses";host.setAttribute("aria-label","Evolution lenses");
 const make=(tag:string,text:string)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 const button=(label:string,fn:()=>void)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=fn;return b;};
 const details=(label:string,open:boolean,toggle:(v:boolean)=>void)=>{const d=document.createElement("details");d.open=open;d.append(make("summary",label));d.addEventListener("toggle",()=>toggle(d.open));return d;};
 const rings=details("Reality Rings · live selection",state.ringsOpen,v=>state.ringsOpen=v);
 rings.append(make("p","Outer exploration → render readiness → eligibility → optional view filters → human picks. View-only; excluded candidates remain in the population. No automated critic or intent scores."));
 const stages=lensStages(candidates,previews,state.filters);state.stage=Math.min(state.stage,stages.length-1);
 const map=svg("svg",{viewBox:"0 0 220 220",role:"img","aria-label":"Concentric rings of current generation candidate membership"});
 const colors=["#64748b","#0e7490","#0f766e","#b45309","#7c3aed","#be185d","#15803d"];
 stages.forEach((s,i)=>{const radius=96-i*(78/Math.max(1,stages.length-1));map.append(svg("circle",{cx:110,cy:110,r:radius,fill:"none",stroke:colors[i%colors.length],"stroke-width":i===state.stage?5:2}));const n=svg("text",{x:110,y:110-radius+11,"text-anchor":"middle","font-size":9,fill:"currentColor"});n.textContent=String(s.ids.length);map.append(n);});
 rings.append(map);
 const list=document.createElement("div");list.className="lens-stage-list";
 stages.forEach((s,i)=>{const b=button(s.label+" · "+s.ids.length+" · "+s.removed.length+" removed",()=>{state.stage=i;onChange();});b.setAttribute("aria-pressed",String(state.stage===i));list.append(b);});rings.append(list);
 const filterRow=document.createElement("div");filterRow.className="lens-stage-list";
 const metric=document.createElement("select");metric.setAttribute("aria-label","View filter metric");for(const k of keys){const o=document.createElement("option");o.value=k;o.textContent=names[k];metric.append(o);}
 const threshold=document.createElement("input");threshold.type="number";threshold.min="0";threshold.max="100";threshold.value="40";threshold.setAttribute("aria-label","Minimum metric percent");
 filterRow.append(metric,threshold,button("Add filter ring",()=>{const v=Number(threshold.value);if(state.filters.length<3&&Number.isFinite(v)&&v>=0&&v<=100){state.filters.push({metric:metric.value as Metric,minimum:v/100});onChange();}}));
 state.filters.forEach((f,i)=>filterRow.append(button("Remove "+names[f.metric]+" ring "+(i+1),()=>{state.filters.splice(i,1);onChange();})));
 rings.append(filterRow);
 const stage=stages[state.stage];rings.append(make("p","Retained: "+(stage.ids.join(", ")||"none")),make("p","Removed at this ring: "+(stage.removed.join(", ")||"none")));
 const radar=details("Candidate radar · raster diagnostics",state.radarOpen,v=>state.radarOpen=v);
 const ready=candidates.filter(c=>previews.get(c.id)?.status==="ready");
 if(!ready.some(c=>c.id===state.selected))state.selected=ready[0]?.id??null;
 const choose=document.createElement("select");choose.setAttribute("aria-label","Radar candidate");
 for(const c of ready){const o=document.createElement("option");o.value=c.id;o.textContent=c.id+" · "+c.status;choose.append(o);}choose.value=state.selected??"";
 choose.onchange=()=>{state.selected=choose.value;onChange();};radar.append(choose);
 const selected=state.selected,preview=selected?previews.get(selected):undefined,m=preview&&previewMetrics(preview);
 radar.append(make("p","Measured from rendered pixels. Not fitness, preference or intent alignment."));
 if(selected&&m){
   const v=svg("svg",{viewBox:"0 0 240 220",role:"img","aria-label":"Four measured raster metrics for "+selected});
   const pts=(scale:number)=>keys.map((_,i)=>{const a=-Math.PI/2+i*Math.PI/2;return (120+Math.cos(a)*74*scale)+","+(110+Math.sin(a)*74*scale);}).join(" ");
   for(const scale of [.25,.5,.75,1])v.append(svg("polygon",{points:pts(scale),fill:"none",stroke:"currentColor","stroke-opacity":.22}));
   const poly=keys.map((k,i)=>{const a=-Math.PI/2+i*Math.PI/2;return (120+Math.cos(a)*74*m[k])+","+(110+Math.sin(a)*74*m[k]);}).join(" ");
   v.append(svg("polygon",{points:poly,fill:"#0d9488","fill-opacity":.25,stroke:"#0d9488","stroke-width":2}));
   keys.forEach((k,i)=>{const a=-Math.PI/2+i*Math.PI/2,t=svg("text",{x:120+Math.cos(a)*86,y:113+Math.sin(a)*86,"text-anchor":"middle","font-size":10,fill:"currentColor"});t.textContent=names[k];v.append(t);});radar.append(v);
   const values=document.createElement("ul");for(const k of keys)values.append(make("li",names[k]+": "+Math.round(m[k]*100)+"%"));radar.append(values,button("Inspect radar candidate",()=>onInspect(selected)));
 }else radar.append(make("p","Waiting for a completed render."));
 host.append(rings,radar);return host;
}
