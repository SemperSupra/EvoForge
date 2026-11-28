import { EXPERIENCES } from "../experiences";
import { RESEARCH_ARTICLES, RESEARCH_SOURCES } from "./research-encyclopedia";
import { DEMO_LIMITATIONS } from "./research-limitations";
import { mountTeachingModel } from "./research-visuals";

type Action = {readonly label:string;readonly href:string};
export type Demo = {id:string;title:string;category:"life"|"art"|"archive";description:string;features:readonly string[];requirement:string;preview:"arena"|"craft"|"motif"|"emblem"|"mosaic"|"legacy";actions:readonly Action[]};
const art=EXPERIENCES[0].actions,life=EXPERIENCES[1].actions;
export const DEMOS:readonly Demo[]=[
 {id:"arena",title:"ALife Creature Arena",category:"life",description:"Watch artificial creatures evolve, explore seven environments, or intervene directly in the ecosystem.",features:["Artificial life","Evolution","World simulation"],requirement:"WebGPU required · experimental",preview:"arena",actions:life},
 {id:"craft",title:"Craft Lab",category:"art",description:"Explore material, construction and mosaic design families through evolutionary selection.",features:["Materials","Procedural design","Evolution"],requirement:"CPU rendering",preview:"craft",actions:[art[0]]},
 {id:"motif",title:"Motif & Heraldry Lab",category:"art",description:"Evolve artistic motifs and heraldic compositions while preserving subject identity.",features:["Motifs","Heraldry","Design"],requirement:"CPU rendering",preview:"motif",actions:[art[1]]},
 {id:"emblem",title:"Emblems & flags",category:"art",description:"Explore artistic interpretations of fixed emblem and flag identities using different construction techniques.",features:["Emblems","Flags","Artistic interpretation"],requirement:"CPU rendering",preview:"emblem",actions:[art[2]]},
 {id:"mosaic",title:"Mosaic Atelier 2.0",category:"art",description:"Explore the earlier mosaic evolution workflow and its retained versioned recipes.",features:["Mosaics","Selection","Recipe replay"],requirement:"CPU rendering",preview:"mosaic",actions:[art[3]]},
 {id:"legacy",title:"Legacy Mosaic 1.0.0",category:"archive",description:"Run the original mosaic experience for comparison and continuity with historical recipes.",features:["Legacy","Reproducibility","Comparison"],requirement:"CPU rendering · retained version",preview:"legacy",actions:[art[4]]}
];
export const CATEGORIES=[["all","All demos"],["life","Artificial life"],["art","Generative art"],["archive","Archive"]] as const;
export type Category=typeof CATEGORIES[number][0];
export function filterDemos(category:Category,query:string){const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return DEMOS.filter(d=>(category==="all"||d.category===category)&&words.every(w=>[d.title,d.description,d.requirement,...d.features,...d.actions.map(a=>a.label),...RESEARCH_ARTICLES[d.id].terms].join(" ").toLowerCase().includes(w)));}

// Inline, lightweight illustrative covers, not screenshots or proof of live output.
function cover(d:Demo):string{
 const frame=(body:string)=>'<svg viewBox="0 0 360 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><rect width="360" height="200" fill="#14232c"/>'+body+'</svg>';
 if(d.preview==="arena"){let trees="",creatures="";for(let i=0;i<13;i++){const x=60+(i*73)%238,y=50+(i*31)%105;creatures+='<path d="M'+x+' '+y+'q7 -11 15 0" stroke="'+["#ebba77","#77be9e","#80b3d4"][i%3]+'" stroke-width="5" stroke-linecap="round" fill="none"/>';}return frame('<ellipse cx="180" cy="104" rx="145" ry="78" fill="#3f604b" stroke="#7c9982" stroke-width="2"/><path d="M43 98Q95 53 150 94T317 89L305 136Q249 159 182 125T49 133Z" fill="#487e95"/>'+trees+creatures+'<ellipse cx="180" cy="104" rx="100" ry="53" fill="none" stroke="#9ac6a6" stroke-opacity=".4" stroke-dasharray="4 5"/>');}
 const palette=d.preview==="emblem"?["#c7a66b","#224b62","#dfdfce","#9c4b3d"]:d.preview==="motif"?["#ac7da8","#d6b67a","#365b70","#243744"]:["#d5b57d","#417d76","#ba785c","#345064","#91b6ad"];
 let tiles="";for(let y=0;y<10;y++)for(let x=0;x<18;x++){const cx=x*20+10,cy=y*20+10;const ring=Math.floor(Math.hypot(x-8.5,y-4.5));const idx=d.preview==="legacy"?(x*7+y*11)%palette.length:d.preview==="emblem"?(Math.abs(x-8.5)<3&&y>1&&y<8?0:(x+y)%3+1):d.preview==="motif"?(Math.floor(Math.abs(x-8.5)+Math.abs(y-4.5))%palette.length):d.preview==="craft"?((x^y)+ring)%palette.length:ring%palette.length;tiles+='<rect x="'+(cx-9)+'" y="'+(cy-9)+'" width="18" height="18" rx="'+(d.preview==="craft"?3:1)+'" fill="'+palette[idx]+'"/>';}
 return frame(tiles);
}
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,cls?:string,value?:string)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
export function mountLauncher(root:HTMLElement){
 const shell=node("main","launcher-shell"),heading=node("h1",undefined,"EvoForge"),intro=node("p","launcher-intro","Explore evolving worlds and generative design. Choose a demo and launch it in your browser.");
 const header=node("header","launcher-header"),brand=node("div");brand.append(heading,intro);header.append(brand);
 const workspace=node("div","launcher-workspace"),nav=node("nav","launcher-categories");nav.setAttribute("aria-label","Demo categories");
 const body=node("section","launcher-content");body.setAttribute("aria-label","Demo catalog");
 const toolbar=node("div","launcher-toolbar"),label=node("label",undefined,"Search demos"),search=node("input");search.type="search";search.id="demo-search";search.placeholder="Search by name or capability";label.htmlFor=search.id;label.append(search);
 const count=node("output","launcher-count");count.setAttribute("aria-live","polite");toolbar.append(label,count);
 const grid=node("div","launcher-grid"),detail=node("section","launcher-detail");detail.setAttribute("aria-label","Selected demo details");
 let category:Category="all",selected=DEMOS[0].id;
 const categoryButtons=new Map<Category,HTMLButtonElement>();
 for(const [id,name] of CATEGORIES){const b=node("button",undefined,name);b.type="button";b.setAttribute("aria-pressed",String(id===category));b.onclick=()=>{category=id;refresh();};nav.append(b);categoryButtons.set(id,b);}
 const cardButtons=new Map<string,HTMLButtonElement>();
 const research=node("section","launcher-research");research.hidden=true;research.setAttribute("aria-label","Research encyclopedia");
 let previousFocus:HTMLElement|null=null;
 let stopTeaching:(()=>void)|undefined;
 function showResearch(d:Demo,trigger:HTMLElement){
   stopTeaching?.();previousFocus=trigger;const article=RESEARCH_ARTICLES[d.id];research.replaceChildren();research.hidden=false;workspace.hidden=true;
   const top=node("div","research-top"),back=node("button",undefined,"Back to demos");back.onclick=()=>{stopTeaching?.();research.hidden=true;workspace.hidden=false;previousFocus?.focus();};top.append(back);
   const h=node("h2",undefined,article.title);h.tabIndex=-1;const lead=node("p","research-lead",article.lead);const links=node("div","launcher-actions");for(const a of d.actions)links.append(actionLink(a));research.append(top,h,lead,links);
   const concept=node("p","research-terms","Explore concepts: "+article.terms.join(" · "));research.append(concept);
   const ids=[...new Set(article.sections.flatMap(s=>s.refs))],numbers=new Map(ids.map((id,i)=>[id,i+1]));
   for(const s of article.sections){const section=node("details","research-section"),title=node("summary",undefined,s.heading),body=node("p",undefined,s.body);section.append(title,body);if(s.refs.length){const line=node("p","research-citations","Original and related research: ");for(const id of s.refs){const source=RESEARCH_SOURCES[id],link=node("a",undefined,"["+numbers.get(id)+"] "+source.author.split(",")[0]+" ("+source.year+")");link.href=source.url;line.append(link,document.createTextNode(" "));}section.append(line);}research.append(section);}
   const teaching=mountTeachingModel(d.id);stopTeaching=teaching.stop;research.append(teaching.element);
   const challenge=node("section","research-challenge"),ct=node("h3",undefined,"Investigate it yourself"),q=node("p",undefined,article.challenge.question),steps=node("ol");for(const step of article.challenge.steps)steps.append(node("li",undefined,step));challenge.append(ct,q,steps,node("p",undefined,article.challenge.next));research.append(challenge);
   const scope=node("section","research-scope");scope.append(node("h3",undefined,"What EvoForge actually implements"),node("p",undefined,article.scope));research.append(scope);
   const limits=node("section","research-limitations");limits.append(node("h3",undefined,"Limitations and why they exist"),node("p",undefined,"Use these boundaries to interpret the demo as an experiment rather than as a perfect model."));for(const item of DEMO_LIMITATIONS[d.id]){const entry=node("details","research-section");entry.append(node("summary",undefined,item.title),node("p",undefined,"Why: "+item.why),node("p",undefined,"What this means: "+item.effect),node("p",undefined,"How to investigate: "+item.investigate));limits.append(entry);}research.append(limits);
   const bibliography=node("section","research-references");bibliography.append(node("h3",undefined,"Original publications and primary sources"));const ol=node("ol");for(const id of ids){const s=RESEARCH_SOURCES[id],li=node("li"),a=node("a",undefined,s.author+" ("+s.year+"). "+s.title+". "+s.venue+".");a.href=s.url;li.append(a,node("p",undefined,s.why));ol.append(li);}bibliography.append(ol);research.append(bibliography);
   const code=node("details","research-section");code.append(node("summary",undefined,"Inspect the implementation"));for(const path of article.paths){const a=node("a",undefined,path);a.href="https://github.com/SemperSupra/EvoForge/blob/rdte/experimental-preview-r106/"+path;const line=node("p");line.append(a);code.append(line);}research.append(code);
   h.focus();window.scrollTo(0,0);
 }
 function actionLink(action:Action){const a=node("a","launcher-launch",action.label);a.href=action.href;return a;}
 function updateDetail(list:readonly Demo[]){detail.replaceChildren();const d=list.find(x=>x.id===selected);if(!d){detail.hidden=true;return;}detail.hidden=false;const title=node("h2",undefined,d.title),description=node("p",undefined,d.description),requirement=node("p","launcher-requirement",d.requirement),tags=node("div","launcher-tags");for(const f of d.features)tags.append(node("span",undefined,f));detail.append(title,description,tags,requirement);if(d.id==="arena"&&!(navigator as Navigator & {gpu?:unknown}).gpu)detail.append(node("p","launcher-compatibility","WebGPU is not exposed by this browser. The arena may be unavailable; CPU demos remain available."));const note=node("p","launcher-detail-note",d.id==="arena"?"Choose Observe for read-only exploration or Play to modify the world.":"Launch the demo from its card above.");detail.append(note);for(const [id,b] of cardButtons)b.setAttribute("aria-pressed",String(id===selected));}
 function refresh(){const list=filterDemos(category,search.value);for(const [id,b] of categoryButtons)b.setAttribute("aria-pressed",String(id===category));if(!list.some(d=>d.id===selected))selected=list[0]?.id??"";count.textContent=list.length+" "+(list.length===1?"demo":"demos");grid.replaceChildren();cardButtons.clear();if(!list.length){grid.append(node("p","launcher-empty","No demos match. Try a different search or category."));updateDetail(list);return;}
 for(const d of list){const card=node("article","launcher-card");card.dataset.demo=d.id;const preview=node("div","launcher-cover");preview.innerHTML=cover(d);const select=node("button","launcher-select",d.title);select.type="button";select.setAttribute("aria-pressed",String(d.id===selected));select.onclick=()=>{selected=d.id;updateDetail(list);};cardButtons.set(d.id,select);const summary=node("p","launcher-summary",d.description);const req=node("p","launcher-requirement",d.requirement);const actions=node("div","launcher-actions");for(const a of d.actions)actions.append(actionLink(a));const science=node("button","launcher-research-link","Explore the science");science.type="button";science.onclick=()=>showResearch(d,science);card.append(preview,select,summary,req,actions,science);grid.append(card);}
 updateDetail(list);}
 search.addEventListener("input",refresh);
 body.append(toolbar,grid,detail);workspace.append(nav,body);
 const footer=node("footer","launcher-footer"),api=node("a",undefined,"Machine-readable experience catalog");api.href="./experiences.json";footer.append(node("span",undefined,"Illustrative demo covers · no simulation starts until launched"),api);
 shell.append(header,workspace,research,footer);root.append(shell);refresh();
}
