import type { Candidate } from "../core/types";
import type { PresentationStage } from "./lens-presentation";
type Preview = { w:number; h:number; rgba:Uint8ClampedArray; status:"gen"|"ready"|"err" };
type Metric = "brightness"|"contrast"|"saturation"|"edge";
type Metrics = Record<Metric,number>;
export type LensState = { ringsOpen:boolean; radarOpen:boolean; selected:string|null; filters: {metric:Metric;minimum:number}[]; stage:number; angleMetric?:Metric; radiusMetric?:Metric; layout?:'auto'|'stages'|'lanes'|'rings'; radarPlot?:boolean; leftWidth?:number;rightWidth?:number;combined?:boolean;pipelineMode?:'walkthrough'|'live' };
const names:Record<Metric,string>={brightness:"Brightness",contrast:"Contrast",saturation:"Saturation",edge:"Edge variation"};
const keys=Object.keys(names) as Metric[];
const cache=new WeakMap<Uint8ClampedArray,Metrics>();
const thumbnailCache=new WeakMap<Uint8ClampedArray,string>();
function markerImage(p:Preview|undefined):string|null{
 if(!p||p.status!=="ready")return null;const hit=thumbnailCache.get(p.rgba);if(hit)return hit;
 const src=document.createElement("canvas"),dst=document.createElement("canvas");src.width=p.w;src.height=p.h;dst.width=32;dst.height=18;
 const a=src.getContext("2d"),b=dst.getContext("2d");if(!a||!b)return null;
 a.putImageData(new ImageData(new Uint8ClampedArray(p.rgba),p.w,p.h),0,0);b.drawImage(src,0,0,32,18);
 const url=dst.toDataURL("image/png");thumbnailCache.set(p.rgba,url);return url;
}
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
export function lensStages(candidates:Candidate[],previews:Map<string,Preview>,filters:LensState["filters"],presentation?:ReadonlyMap<string,PresentationStage>){
 const stages:{label:string;ids:string[];removed:string[]}[]=[];
 const push=(label:string,ids:string[])=>{const before=stages.at(-1)?.ids??ids;const kept=new Set(ids);stages.push({label,ids,removed:before.filter(id=>!kept.has(id))});};
 push("Exploration",candidates.map(c=>c.id));
 push("Rendered",stages[0].ids.filter(id=>previews.get(id)?.status==="ready"&&(!presentation||(presentation.get(id)??0)>=1)));
 push("Eligible",stages[1].ids.filter(id=>(!presentation||(presentation.get(id)??0)>=2)&&candidates.some(c=>c.id===id&&(c.status==="normal"||c.status==="picked"))));
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
const panelKey="evoforge:mosaic-lens-layout-v1";
export function readLensLayout():Partial<LensState>{
 try{const x=JSON.parse(localStorage.getItem(panelKey)||'{}');const size=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(220,Math.min(640,v)):320;
 return {leftWidth:size(x.leftWidth),rightWidth:size(x.rightWidth),combined:x.combined===true,pipelineMode:x.pipelineMode==='live'?'live':'walkthrough',...(typeof x.ringsOpen==='boolean'?{ringsOpen:x.ringsOpen}:{}),...(typeof x.radarOpen==='boolean'?{radarOpen:x.radarOpen}:{})};}catch{return {};}
}
function saveLayout(s:LensState){try{localStorage.setItem(panelKey,JSON.stringify({leftWidth:s.leftWidth,rightWidth:s.rightWidth,ringsOpen:s.ringsOpen,radarOpen:s.radarOpen,combined:s.combined,pipelineMode:s.pipelineMode}));}catch{/* storage is optional */}}
export function renderEvolutionLenses(candidates:Candidate[],previews:Map<string,Preview>,state:LensState,onChange:()=>void,onInspect:(id:string)=>void,viewer?:HTMLElement,presentation?:ReadonlyMap<string,PresentationStage>){
 const host=document.createElement("section");host.className="evolution-lenses mosaic-workspace";host.setAttribute("aria-label","Evolution lenses");
 const make=(tag:string,text:string)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 const button=(label:string,fn:()=>void)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=fn;return b;};
 const compact=()=>window.matchMedia("(max-width: 999px)").matches;
 const setOpen=(side:"left"|"right",v:boolean)=>{if(side==="left"){state.ringsOpen=v;if(v&&compact())state.radarOpen=false;}else{state.radarOpen=v;if(v){state.combined=false;if(compact())state.ringsOpen=false;}}saveLayout(state);onChange();};
 if(compact()&&state.ringsOpen&&state.radarOpen)state.radarOpen=false;
 const details=(label:string,side:"left"|"right",open:boolean)=>{const d=document.createElement("details");d.open=open;d.className="lens-pane lens-pane-"+side;d.id="mosaic-lens-"+side;d.setAttribute("aria-label",label);const summary=make("summary",label);summary.dataset.lensFocus=side+"-summary";d.append(summary);summary.addEventListener("click",event=>{event.preventDefault();setOpen(side,!d.open);});return d;};
 const rings=details("Reality Rings", "left",state.ringsOpen);
 rings.append(make("p","Outer exploration → rendered → eligible → view filters → human picks. View-only; not critic scores."));
 const presentationControl=document.createElement("select");presentationControl.setAttribute("aria-label","Pipeline presentation");presentationControl.dataset.lensFocus="pipeline-mode";
 for(const [value,label] of [["walkthrough","Watch stages"],["live","Live / instant"]]){const o=document.createElement("option");o.value=value;o.textContent=label;presentationControl.append(o);}
 presentationControl.value=state.pipelineMode??"walkthrough";presentationControl.onchange=()=>{state.pipelineMode=presentationControl.value==="live"?"live":"walkthrough";saveLayout(state);onChange();};
 const combined=button(state.combined?"Separate rings and radar":"Combined rings + radar",()=>{state.combined=!state.combined;if(state.combined)state.radarOpen=false;else if(!compact())state.radarOpen=true;saveLayout(state);onChange();});combined.dataset.lensFocus="combined";combined.setAttribute("aria-pressed",String(!!state.combined));
 const modeRow=document.createElement("div");modeRow.className="lens-mode-row";modeRow.append(presentationControl,combined);rings.append(modeRow);
 const stages=lensStages(candidates,previews,state.filters,presentation);state.stage=Math.max(0,Math.min(state.stage,stages.length-1));
 rings.dataset.layout=state.combined?"rings":state.layout??"auto";rings.dataset.combined=String(!!state.combined);
 const layout=document.createElement("select");layout.setAttribute("aria-label","Reality Rings layout");
 for(const [value,label] of [["auto","Automatic layout"],["stages","Stage browser"],["lanes","Stage lanes"],["rings","Concentric rings"]]){const o=document.createElement("option");o.value=value;o.textContent=label;layout.append(o);}
 layout.value=state.layout??"auto";layout.disabled=!!state.combined;layout.dataset.lensFocus="ring-layout";layout.onchange=()=>{state.layout=layout.value as LensState["layout"];onChange();};rings.append(layout);
 const map=svg("svg",{viewBox:"0 0 320 320",role:"group","aria-label":"Concentric rings of current generation candidate membership"});
 const colors=["#64748b","#0e7490","#0f766e","#b45309","#7c3aed","#be185d","#15803d"];
 const memberships=ringMembership(stages);
 const radiusAt=(i:number)=>142-i*(116/Math.max(1,stages.length-1));
 const inspectMarker=(chart:SVGElement,id:string,x:number,y:number,color:string,label:string,ring?:number,metricSize=1)=>{
   const g=svg("g",{transform:"translate("+x+" "+y+") scale("+metricSize+")",role:"button",tabindex:0,"aria-label":label,"data-candidate-id":id,"data-lens-focus":(chart===map?"ring-":"radar-")+id});if(ring!==undefined){g.setAttribute("data-ring",String(ring));g.setAttribute("data-x",String(x));g.setAttribute("data-y",String(y));}
   const t=svg("title",{});t.textContent=label;g.append(t);
   g.append(svg("circle",{r:12,fill:"transparent",stroke:"none"}),svg("circle",{r:7,fill:color,stroke:"white","stroke-width":1}));
   const img=ring===0?null:markerImage(previews.get(id));
   if(img){g.append(svg("rect",{x:-13,y:-8,width:26,height:16,rx:2,fill:color,stroke:color,"stroke-width":2}),svg("image",{x:-12,y:-7,width:24,height:14,href:img,"pointer-events":"none"}));}
   else{const n=svg("text",{x:0,y:3,"text-anchor":"middle","font-size":7,fill:"white","pointer-events":"none"});n.textContent=String(candidates.findIndex(c=>c.id===id)+1);g.append(n);}
   g.addEventListener("click",()=>onInspect(id));g.addEventListener("keydown",e=>{const key=(e as KeyboardEvent).key;if(key==="Enter"||key===" "){e.preventDefault();onInspect(id);}});chart.append(g);
 };
 const angleMetric=state.angleMetric??"brightness",radiusMetric=state.radiusMetric??"contrast";
 const points:{x:number;y:number;id:string}[]=[];
 if(state.combined){for(const f of [0,.25,.5,.75,1]){const a=(-135+270*f)*Math.PI/180;map.append(svg("line",{x1:160,y1:160,x2:160+145*Math.cos(a),y2:160+145*Math.sin(a),stroke:"currentColor","stroke-opacity":.16}));}}
 stages.forEach((s,i)=>{const radius=radiusAt(i);map.append(svg("circle",{cx:160,cy:160,r:radius,fill:"none",stroke:colors[i%colors.length],"stroke-width":i===state.stage?3:1.5}));});
 // Constant candidate azimuth in the separate rings view, so stages move radially, not around the circle.
 for(const m of memberships){const i=m.ring,idx=candidates.findIndex(c=>c.id===m.id),p=previews.get(m.id),metrics=i>0&&p?previewMetrics(p):null;
  const angle=state.combined&&metrics?(-135+270*metrics[angleMetric])*Math.PI/180:-Math.PI/2+(idx+.5)*2*Math.PI/Math.max(1,candidates.length);
  const radius=radiusAt(i),r=i===stages.length-1?radius*.65:(radius+radiusAt(i+1))/2;
  const x=160+Math.cos(angle)*r,y=160+Math.sin(angle)*r;
  const spacing=2*Math.PI*r/Math.max(1,candidates.length);
  const fit=Math.max(.48,Math.min(1,spacing/29));
  const size=fit*(state.combined&&metrics ? .70+.45*metrics[radiusMetric] : 1);
  const description=m.id+" · "+stages[i].label+(state.combined&&metrics?" · "+names[angleMetric]+" "+Math.round(metrics[angleMetric]*100)+"% · "+names[radiusMetric]+" "+Math.round(metrics[radiusMetric]*100)+"%":"");
  inspectMarker(map,m.id,x,y,colors[i%colors.length],description,i,size);points.push({x,y,id:m.id});
 }
 let crowded=0;for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)<26)crowded++;
 map.dataset.closePairs=String(crowded);map.dataset.view=state.combined?"combined":"separate";
 const ringView=document.createElement("div");ringView.className="ring-visual";ringView.append(map,make("p",state.combined?"Combined: radius = pipeline stage; angle = "+names[angleMetric]+"; marker size = "+names[radiusMetric]+". "+crowded+" close marker pairs at 320-unit view.":"Each candidate appears once, at its deepest displayed stage. "+crowded+" close marker pairs at 320-unit view."));rings.append(ringView);if(presentation)rings.append(make("p","Watch stages: replaying actual render receipts at a readable pace; gallery shows live results."));
 const cardFor=(id:string,detail?:string)=>{const c=candidates.find(c=>c.id===id)!;const b=button("",()=>onInspect(id));b.className="lens-candidate";b.dataset.lensCandidate=id;b.setAttribute("aria-label","Inspect "+id+" · "+c.status+(detail?" · "+detail:""));
 const uri=!detail&&memberships.find(m=>m.id===id)?.ring===0?null:markerImage(previews.get(id));if(uri){const img=document.createElement("img");img.src=uri;img.alt="";b.append(img);}else{const placeholder=make("span",previews.get(id)?.status==="err"?"Render failed":"Exploration / awaiting display");placeholder.className="lens-placeholder";b.append(placeholder);}
 b.append(make("span",id+" · "+c.status));if(detail)b.append(make("small",detail));return b;};
 const compactStage=document.createElement("div");compactStage.className="ring-compact";
 const stageSelect=document.createElement("select");stageSelect.setAttribute("aria-label","Browse ring stage");stageSelect.dataset.lensFocus="ring-stage";
 stages.forEach((s,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=s.label+" · "+memberships.filter(m=>m.ring===i).length+" here";stageSelect.append(o);});stageSelect.value=String(state.stage);stageSelect.onchange=()=>{state.stage=Number(stageSelect.value);onChange();};
 const navigation=document.createElement("div");navigation.className="ring-navigation";const prev=button("Outer",()=>{state.stage--;onChange();}),next=button("Inner",()=>{state.stage++;onChange();});prev.disabled=state.stage===0;next.disabled=state.stage===stages.length-1;navigation.append(prev,stageSelect,next);compactStage.append(navigation);
 const residents=memberships.filter(m=>m.ring===state.stage);const cards=document.createElement("div");cards.className="ring-cards";for(const m of residents)cards.append(cardFor(m.id));if(!residents.length)cards.append(make("p","No candidates currently in this stage."));compactStage.append(cards);rings.append(compactStage);
 const lanes=document.createElement("div");lanes.className="ring-lanes";for(const [i,s] of stages.entries()){const lane=document.createElement("section");lane.className="ring-lane";const here=memberships.filter(m=>m.ring===i);lane.append(make("h3",s.label+" · "+here.length));for(const m of here)lane.append(cardFor(m.id));if(!here.length)lane.append(make("p","Empty"));lanes.append(lane);}rings.append(lanes);
 const list=document.createElement("div");list.className="lens-stage-list ring-stage-legend";
 stages.forEach((s,i)=>{const b=button(s.label+" · "+s.ids.length+" · "+s.removed.length+" removed",()=>{state.stage=i;onChange();});b.setAttribute("aria-pressed",String(state.stage===i));list.append(b);});rings.append(list);
 const filterRow=document.createElement("div");filterRow.className="lens-stage-list";
 const metric=document.createElement("select");metric.setAttribute("aria-label","View filter metric");metric.dataset.lensFocus="filter-metric";for(const k of keys){const o=document.createElement("option");o.value=k;o.textContent=names[k];metric.append(o);}
 const threshold=document.createElement("input");threshold.type="number";threshold.min="0";threshold.max="100";threshold.value="40";threshold.setAttribute("aria-label","Minimum metric percent");threshold.dataset.lensFocus="filter-threshold";
 filterRow.append(metric,threshold,button("Add filter ring",()=>{const v=Number(threshold.value);if(state.filters.length<3&&Number.isFinite(v)&&v>=0&&v<=100){state.filters.push({metric:metric.value as Metric,minimum:v/100});onChange();}}));
 state.filters.forEach((f,i)=>filterRow.append(button("Remove "+names[f.metric]+" ring "+(i+1),()=>{state.filters.splice(i,1);onChange();})));
 rings.append(filterRow);
 const stage=stages[state.stage];const resident=document.createElement("div");resident.className="lens-stage-list ring-stage-legend";for(const m of memberships.filter(m=>m.ring===state.stage))resident.append(button(String(candidates.findIndex(c=>c.id===m.id)+1)+" · "+m.id,()=>onInspect(m.id)));rings.append(make("p","Residents at this ring: "+memberships.filter(m=>m.ring===state.stage).length),resident,make("p","Passed this stage: "+stage.ids.length));
 const radar=details("Population radar","right",state.radarOpen);
 const ready=candidates.filter(c=>previews.get(c.id)?.status==="ready");
 const selectors=document.createElement("div");selectors.className="lens-stage-list";
 const axis=(label:string,value:Metric,change:(k:Metric)=>void)=>{const s=document.createElement("select");s.setAttribute("aria-label",label);s.dataset.lensFocus="metric-"+label;for(const k of keys){const o=document.createElement("option");o.value=k;o.textContent=label+": "+names[k];s.append(o);}s.value=value;s.onchange=()=>{change(s.value as Metric);onChange();};return s;};
 const angle=state.angleMetric??"brightness",radius=state.radiusMetric??"contrast";
 selectors.append(axis("Angle",angle,k=>state.angleMetric=k),axis(state.combined?"Marker size":"Radius",radius,k=>state.radiusMetric=k));(state.combined?rings:radar).append(selectors);
 radar.append(make("p","Each marker is one rendered candidate. Angle and distance from center represent the selected measured dimensions; not a critic score. Overlapping markers indicate similar values."));
 const chart=svg("svg",{viewBox:"0 0 320 320",role:"group","aria-label":"Population radar candidate positions"});
 for(const f of [.25,.5,.75,1])chart.append(svg("circle",{cx:160,cy:160,r:130*f,fill:"none",stroke:"currentColor","stroke-opacity":.25}));
 for(const f of [0,.25,.5,.75,1]){const a=(-135+270*f)*Math.PI/180;chart.append(svg("line",{x1:160,y1:160,x2:160+130*Math.cos(a),y2:160+130*Math.sin(a),stroke:"currentColor","stroke-opacity":.25}));const t=svg("text",{x:160+145*Math.cos(a),y:164+145*Math.sin(a),"text-anchor":"middle","font-size":9,fill:"currentColor"});t.textContent=String(f*100);chart.append(t);}
 const roster=document.createElement("div");roster.className="lens-stage-list";
 for(const c of ready){const p=previews.get(c.id)!,m=previewMetrics(p);if(!m)continue;const q=populationProjection(m,angle,radius);inspectMarker(chart,c.id,160+130*q.x,160+130*q.y,c.status==="picked"?"#15803d":"#0e7490",c.id+" · "+names[angle]+" "+Math.round(m[angle]*100)+"% · "+names[radius]+" "+Math.round(m[radius]*100)+"%");roster.append(button(String(candidates.findIndex(v=>v.id===c.id)+1)+" · "+c.id,()=>onInspect(c.id)));}
 const plotSwitch=button(state.radarPlot?"Hide plot":"Show plot",()=>{state.radarPlot=!state.radarPlot;onChange();});plotSwitch.className="radar-plot-toggle";plotSwitch.setAttribute("aria-expanded",String(!!state.radarPlot));
 chart.classList.add("population-plot");radar.dataset.showPlot=String(!!state.radarPlot);roster.classList.add("radar-roster");
 const mobileRoster=document.createElement("div");mobileRoster.className="radar-cards";for(const c of ready){const m=previewMetrics(previews.get(c.id)!);if(m)mobileRoster.append(cardFor(c.id,names[angle]+" "+Math.round(m[angle]*100)+"% · "+names[radius]+" "+Math.round(m[radius]*100)+"%"));}
 radar.append(plotSwitch,chart,make("p",ready.length+" of "+candidates.length+" rendered"),roster,mobileRoster);
 const dock=document.createElement("div");dock.className="lens-dock";
 const dockButton=(side:"left"|"right",label:string,open:boolean)=>{const b=button(label,()=>setOpen(side,!open));b.dataset.lensFocus=side+"-dock";b.setAttribute("aria-expanded",String(open));b.setAttribute("aria-controls","mosaic-lens-"+side);return b;};
 dock.append(dockButton("left","Reality Rings",state.ringsOpen),dockButton("right","Population radar",state.radarOpen));
 const layoutWidths=()=>{const w=Math.max(0,host.clientWidth||window.innerWidth);const count=Number(state.ringsOpen)+Number(state.radarOpen);const cap=Math.min(640,Math.max(220,(w-340-(2-count)*44-48)/Math.max(1,count)));return [Math.min(state.leftWidth??320,cap),Math.min(state.rightWidth??320,cap)];};
 const applyWidths=()=>{const [l,r]=layoutWidths();host.style.setProperty("--lens-left",(state.ringsOpen?l:44)+"px");host.style.setProperty("--lens-right",(state.radarOpen?r:44)+"px");return [l,r];};
 const separator=(side:"left"|"right",open:boolean)=>{const sep=document.createElement("div");sep.className="lens-divider lens-divider-"+side;sep.tabIndex=open?0:-1;sep.hidden=!open;sep.setAttribute("role","separator");sep.setAttribute("aria-orientation","vertical");sep.setAttribute("aria-label","Resize "+(side==="left"?"Reality Rings":"population radar"));sep.setAttribute("aria-controls","mosaic-lens-"+side);sep.dataset.lensFocus=side+"-divider";
  const key=side==="left"?"leftWidth":"rightWidth";const resize=(v:number)=>{state[key]=Math.max(220,Math.min(640,v));const widths=applyWidths();const value=Math.round(widths[side==="left"?0:1]);sep.setAttribute("aria-valuemin","220");sep.setAttribute("aria-valuemax","640");sep.setAttribute("aria-valuenow",String(value));sep.setAttribute("aria-valuetext",value+" pixels");};
  let drag:{id:number;x:number;w:number}|null=null;
  sep.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();sep.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,w:layoutWidths()[side==="left"?0:1]};};
  sep.onpointermove=e=>{if(drag?.id===e.pointerId)resize(drag.w+(side==="left"?1:-1)*(e.clientX-drag.x));};
  const finish=()=>{if(drag){drag=null;saveLayout(state);}};sep.onpointerup=finish;sep.onpointercancel=finish;sep.onlostpointercapture=finish;
  sep.onkeydown=e=>{const value=layoutWidths()[side==="left"?0:1];let next:number;if(e.key==="Home")next=220;else if(e.key==="End")next=640;else if(e.key==="ArrowLeft"||e.key==="ArrowRight")next=value+(e.key==="ArrowRight"?1:-1)*(side==="left"?1:-1)*(e.shiftKey?64:16);else return;e.preventDefault();resize(next);saveLayout(state);};
  sep.ondblclick=()=>{resize(320);saveLayout(state);};const value=layoutWidths()[side==="left"?0:1];sep.setAttribute("aria-valuemin","220");sep.setAttribute("aria-valuemax","640");sep.setAttribute("aria-valuenow",String(Math.round(value)));return sep;
 };
 host.dataset.leftOpen=String(state.ringsOpen);host.dataset.rightOpen=String(state.radarOpen);applyWidths();
 if(viewer){viewer.classList.add("mosaic-viewer");host.append(dock,rings,separator("left",state.ringsOpen),viewer,separator("right",state.radarOpen),radar);}
 else host.append(rings,radar);
 return host;
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
