import type { Candidate } from "../core/types";
type Preview = { w:number; h:number; rgba:Uint8ClampedArray; status:"gen"|"ready"|"err" };
type Metric = "brightness"|"contrast"|"saturation"|"edge";
type Metrics = Record<Metric,number>;
export type LensState = { ringsOpen:boolean; radarOpen:boolean; selected:string|null; filters: {metric:Metric;minimum:number}[]; stage:number; angleMetric?:Metric; radiusMetric?:Metric };
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
export function ringMembership(stages:ReturnType<typeof lensStages>){
 return stages.flatMap((s,i)=>{const next=new Set(stages[i+1]?.ids??[]);return s.ids.filter(id=>!next.has(id)).map(id=>({id,ring:i}));});
}
export function populationProjection(m:Metrics,angleMetric:Metric="brightness",radiusMetric:Metric="contrast"){
 // Angle has a seam; use a 270 degree sweep to distinguish minimum and maximum.
 const angle=(-135+270*m[angleMetric])*Math.PI/180;
 return {x:Math.cos(angle)*m[radiusMetric],y:Math.sin(angle)*m[radiusMetric]};
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
 const map=svg("svg",{viewBox:"0 0 320 320",role:"group","aria-label":"Concentric rings of current generation candidate membership"});
 const colors=["#64748b","#0e7490","#0f766e","#b45309","#7c3aed","#be185d","#15803d"];
 const memberships=ringMembership(stages);
 const radiusAt=(i:number)=>142-i*(116/Math.max(1,stages.length-1));
 const inspectMarker=(chart:SVGElement,id:string,x:number,y:number,color:string,label:string)=>{
   const g=svg("g",{transform:"translate("+x+" "+y+")",role:"button",tabindex:0,"aria-label":label,"data-candidate-id":id});
   const t=svg("title",{});t.textContent=label;g.append(t);
   g.append(svg("circle",{r:12,fill:"transparent",stroke:"none"}),svg("circle",{r:7,fill:color,stroke:"white","stroke-width":1}));
   const n=svg("text",{x:0,y:3,"text-anchor":"middle","font-size":7,fill:"white","pointer-events":"none"});n.textContent=String(candidates.findIndex(c=>c.id===id)+1);g.append(n);
   g.addEventListener("click",()=>onInspect(id));g.addEventListener("keydown",e=>{const key=(e as KeyboardEvent).key;if(key==="Enter"||key===" "){e.preventDefault();onInspect(id);}});chart.append(g);
 };
 stages.forEach((s,i)=>{const radius=radiusAt(i);map.append(svg("circle",{cx:160,cy:160,r:radius,fill:"none",stroke:colors[i%colors.length],"stroke-width":i===state.stage?3:1.5}));
  const members=memberships.filter(m=>m.ring===i);members.forEach((m,j)=>{const angle=-Math.PI/2+(j+.5)*2*Math.PI/Math.max(1,members.length);const r=i===stages.length-1?radius*.65:(radius+radiusAt(i+1))/2;inspectMarker(map,m.id,160+Math.cos(angle)*r,160+Math.sin(angle)*r,colors[i%colors.length],m.id+" · "+s.label);});
 });
 rings.append(map,make("p","Each numbered marker is one candidate at the deepest stage it passed. Select a marker to inspect its image."));
 const list=document.createElement("div");list.className="lens-stage-list";
 stages.forEach((s,i)=>{const b=button(s.label+" · "+s.ids.length+" · "+s.removed.length+" removed",()=>{state.stage=i;onChange();});b.setAttribute("aria-pressed",String(state.stage===i));list.append(b);});rings.append(list);
 const filterRow=document.createElement("div");filterRow.className="lens-stage-list";
 const metric=document.createElement("select");metric.setAttribute("aria-label","View filter metric");for(const k of keys){const o=document.createElement("option");o.value=k;o.textContent=names[k];metric.append(o);}
 const threshold=document.createElement("input");threshold.type="number";threshold.min="0";threshold.max="100";threshold.value="40";threshold.setAttribute("aria-label","Minimum metric percent");
 filterRow.append(metric,threshold,button("Add filter ring",()=>{const v=Number(threshold.value);if(state.filters.length<3&&Number.isFinite(v)&&v>=0&&v<=100){state.filters.push({metric:metric.value as Metric,minimum:v/100});onChange();}}));
 state.filters.forEach((f,i)=>filterRow.append(button("Remove "+names[f.metric]+" ring "+(i+1),()=>{state.filters.splice(i,1);onChange();})));
 rings.append(filterRow);
 const stage=stages[state.stage];const resident=document.createElement("div");resident.className="lens-stage-list";for(const m of memberships.filter(m=>m.ring===state.stage))resident.append(button(String(candidates.findIndex(c=>c.id===m.id)+1)+" · "+m.id,()=>onInspect(m.id)));rings.append(make("p","Residents at this ring: "+memberships.filter(m=>m.ring===state.stage).length),resident,make("p","Passed this stage: "+stage.ids.length));
 const radar=details("Population radar · raster diagnostics",state.radarOpen,v=>state.radarOpen=v);
 const ready=candidates.filter(c=>previews.get(c.id)?.status==="ready");
 const selectors=document.createElement("div");selectors.className="lens-stage-list";
 const axis=(label:string,value:Metric,change:(k:Metric)=>void)=>{const s=document.createElement("select");s.setAttribute("aria-label",label);for(const k of keys){const o=document.createElement("option");o.value=k;o.textContent=label+": "+names[k];s.append(o);}s.value=value;s.onchange=()=>{change(s.value as Metric);onChange();};return s;};
 const angle=state.angleMetric??"brightness",radius=state.radiusMetric??"contrast";
 selectors.append(axis("Angle",angle,k=>state.angleMetric=k),axis("Radius",radius,k=>state.radiusMetric=k));radar.append(selectors);
 radar.append(make("p","Each marker is one rendered candidate. Angle and distance from center represent the selected measured dimensions; not a critic score. Overlapping markers indicate similar values."));
 const chart=svg("svg",{viewBox:"0 0 320 320",role:"group","aria-label":"Population radar candidate positions"});
 for(const f of [.25,.5,.75,1])chart.append(svg("circle",{cx:160,cy:160,r:130*f,fill:"none",stroke:"currentColor","stroke-opacity":.25}));
 for(const f of [0,.25,.5,.75,1]){const a=(-135+270*f)*Math.PI/180;chart.append(svg("line",{x1:160,y1:160,x2:160+130*Math.cos(a),y2:160+130*Math.sin(a),stroke:"currentColor","stroke-opacity":.25}));const t=svg("text",{x:160+145*Math.cos(a),y:164+145*Math.sin(a),"text-anchor":"middle","font-size":9,fill:"currentColor"});t.textContent=String(f*100);chart.append(t);}
 const roster=document.createElement("div");roster.className="lens-stage-list";
 for(const c of ready){const p=previews.get(c.id)!,m=previewMetrics(p);if(!m)continue;const q=populationProjection(m,angle,radius);inspectMarker(chart,c.id,160+130*q.x,160+130*q.y,c.status==="picked"?"#15803d":"#0e7490",c.id+" · "+names[angle]+" "+Math.round(m[angle]*100)+"% · "+names[radius]+" "+Math.round(m[radius]*100)+"%");roster.append(button(String(candidates.findIndex(v=>v.id===c.id)+1)+" · "+c.id,()=>onInspect(c.id)));}
 radar.append(chart,make("p",ready.length+" of "+candidates.length+" rendered"),roster);
 host.append(rings,radar);return host;
}

export function renderCandidateRadar(p:Preview|undefined){
 const host=document.createElement("section");host.className="focus-radar";host.setAttribute("aria-label","Candidate raster radar");
 const m=p&&previewMetrics(p);if(!m){host.textContent="Waiting for rendered image.";return host;}
 const v=svg("svg",{viewBox:"0 0 280 240",role:"img","aria-label":"Measured candidate raster metrics"});
 const pts=(scale:number)=>keys.map((_,i)=>{const a=-Math.PI/2+i*Math.PI/2;return (140+Math.cos(a)*78*scale)+","+(120+Math.sin(a)*78*scale);}).join(" ");
 for(const scale of [.25,.5,.75,1])v.append(svg("polygon",{points:pts(scale),fill:"none",stroke:"currentColor","stroke-opacity":.25}));
 const poly=keys.map((k,i)=>{const a=-Math.PI/2+i*Math.PI/2;return (140+Math.cos(a)*78*m[k])+","+(120+Math.sin(a)*78*m[k]);}).join(" ");
 v.append(svg("polygon",{points:poly,fill:"#0d9488","fill-opacity":.25,stroke:"#0d9488","stroke-width":2}));
 keys.forEach((k,i)=>{const a=-Math.PI/2+i*Math.PI/2,t=svg("text",{x:140+Math.cos(a)*98,y:123+Math.sin(a)*98,"text-anchor":"middle","font-size":10,fill:"currentColor"});t.textContent=names[k];v.append(t);});
 host.append(v);const ul=document.createElement("ul");for(const k of keys){const li=document.createElement("li");li.textContent=names[k]+": "+Math.round(m[k]*100)+"%";ul.append(li);}host.append(ul);return host;
}
