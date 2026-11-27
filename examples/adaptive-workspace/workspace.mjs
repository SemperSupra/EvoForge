// Presentation state only. No evolution, policy or candidate mutation authority.
export function normalize(raw,ids){
 if(!Array.isArray(ids)||!ids.length||ids.length>24||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=="string"||!/^[a-z][a-z0-9-]{0,39}$/.test(x)))throw Error("PANEL_IDS");
 const p=raw&&raw.schema===1?raw:{};
 const order=Array.isArray(p.order)?[...new Set(p.order.filter(x=>ids.includes(x)))]:[];
 for(const id of ids)if(!order.includes(id))order.push(id);
 const panels=Object.fromEntries(ids.map(id=>[id,{folded:p.panels?.[id]?.folded===true,hidden:p.panels?.[id]?.hidden===true,wide:p.panels?.[id]?.wide===true}]));
 const focus=ids.includes(p.focus)&&!panels[p.focus].hidden?p.focus:null;
 return {schema:1,theme:["system","light","dark"].includes(p.theme)?p.theme:"system",scale:[100,125,150,200].includes(p.scale)?p.scale:100,layout:p.layout==="single"?"single":"auto",focus,order,panels};
}
export function mountWorkspace({root,controls,panes,key="evoforge-workspace-v1",storage,defaults}){
 const ids=panes.map(x=>x.id),byId=new Map(panes.map(x=>[x.id,x])),doc=root.ownerDocument,win=doc.defaultView;
 if(storage===undefined)try{storage=win.localStorage}catch{storage=null}
 let data;try{data=JSON.parse(storage?.getItem(key)||"null")}catch{}
 let state=normalize(data??defaults,ids);
 const make=(tag,text,attrs={})=>{const e=doc.createElement(tag);if(text!==null)e.textContent=text;for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e};
 const b=(label,fn)=>{const x=make("button",label,{type:"button"});x.onclick=fn;return x};
 const status=make("p","",{role:"status",class:"ws-status"}),bar=make("div",null,{class:"ws-toolbar"}),settings=make("details",null,{class:"ws-settings"});settings.append(make("summary","Appearance and layout"));
 const wrap=(label,control)=>{const l=make("label",label);l.append(control);return l};
 const select=(label,options,onchange)=>{const x=make("select",null,{"aria-label":label});for(const [v,t] of options)x.append(make("option",t,{value:v}));x.onchange=()=>onchange(x.value);return x};
 const theme=select("Appearance",[["system","System"],["light","Light"],["dark","Dark"]],v=>change(s=>s.theme=v,"Appearance changed"));
 const scale=select("Text size",[100,125,150,200].map(v=>[String(v),v+"%"]),v=>change(s=>s.scale=Number(v),"Text size changed"));
 const layout=select("Layout",[["auto","Adaptive columns"],["single","Single column"]],v=>change(s=>s.layout=v,"Layout changed"));
 const chooser=select("Focus lens",[["","All visible panels"],...panes.map(p=>[p.id,p.label])],v=>change(s=>{if(v){s.panels[v].hidden=false;s.panels[v].folded=false}s.focus=v||null},"Workspace view changed"));
 const show=select("Show hidden panel",ids.map(id=>[id,byId.get(id).label]),()=>{});
 const showBtn=b("Show panel",()=>{const id=show.value;change(s=>{s.panels[id].hidden=false;s.panels[id].folded=false;s.focus=null},"Panel restored");focusHeader(id)});
 const all=b("Show all panels",()=>change(s=>{s.focus=null;for(const p of Object.values(s.panels)){p.hidden=false;p.folded=false}},"All panels shown"));
 settings.append(wrap("Appearance ",theme),wrap("Text size ",scale),wrap("Layout ",layout),b("Reset layout and appearance",()=>{state=normalize(defaults,ids);sync("Defaults restored")}));
 bar.append(wrap("Focus lens ",chooser),wrap("Restore ",show),showBtn,all,settings);
 controls.append(bar,status);root.classList.add("ws-grid");
 const nodes=new Map();
 for(const p of panes){
  const section=make("section",null,{class:"ws-pane","aria-labelledby":"ws-title-"+p.id,"data-lens":p.id}),head=make("div",null,{class:"ws-pane-head"}),title=make("h2",p.label,{id:"ws-title-"+p.id,tabindex:"-1"}),actions=make("div",null,{class:"ws-actions"}),body=make("div",null,{id:"ws-body-"+p.id,class:"ws-body"});
  const fold=b("Collapse",()=>{const v=!state.panels[p.id].folded;change(s=>s.panels[p.id].folded=v,p.label+(v?" collapsed":" expanded"))});
  fold.setAttribute("aria-controls",body.id);
  const width=b("Widen",()=>change(s=>s.panels[p.id].wide=!s.panels[p.id].wide,p.label+" width changed"));
  const focus=b("Focus",()=>{change(s=>{s.focus=s.focus===p.id?null:p.id;s.panels[p.id].folded=false},p.label+" view changed");focusHeader(p.id)});
  const move=delta=>{const index=state.order.indexOf(p.id),j=index+delta;if(j<0||j>=ids.length)return;change(s=>{[s.order[index],s.order[j]]=[s.order[j],s.order[index]]},p.label+" moved");focusHeader(p.id)};
  const up=b("Earlier",()=>move(-1)),down=b("Later",()=>move(1)),hide=b("Hide",()=>{change(s=>{s.panels[p.id].hidden=true;if(s.focus===p.id)s.focus=null},p.label+" hidden");chooser.focus()});
  for(const x of [fold,width,focus,up,down,hide])actions.append(x);
  head.append(title,actions);body.append(p.element);section.append(head,body);root.append(section);
  nodes.set(p.id,{section,head,title,body,fold,width,focus,up,down,hide});
 }
 function focusHeader(id){nodes.get(id)?.title.focus()}
 function sync(message){
  state=normalize(state,ids);const active=doc.activeElement;
  doc.documentElement.dataset.wsTheme=state.theme;doc.documentElement.style.setProperty("--ws-font-scale",state.scale+"%");
  root.dataset.layout=state.layout;theme.value=state.theme;scale.value=String(state.scale);layout.value=state.layout;chooser.value=state.focus??"";
  // Reorder actual DOM, not just CSS visual order. Avoid moving already ordered nodes.
  for(let i=0;i<state.order.length;i++){const node=nodes.get(state.order[i]).section;if(root.children[i]!==node)root.insertBefore(node,root.children[i]??null)}
  for(const [id,n] of nodes){
   const p=state.panels[id],label=byId.get(id).label;n.section.hidden=p.hidden||Boolean(state.focus&&state.focus!==id);n.section.dataset.wide=String(p.wide||state.focus===id);
   n.body.hidden=p.folded;n.fold.textContent=p.folded?"Expand":"Collapse";n.fold.setAttribute("aria-expanded",String(!p.folded));n.fold.setAttribute("aria-label",(p.folded?"Expand ":"Collapse ")+label);
   n.width.textContent=p.wide?"Normal width":"Widen";n.width.setAttribute("aria-label",n.width.textContent+" "+label);n.width.setAttribute("aria-pressed",String(p.wide));
   n.focus.textContent=state.focus===id?"Unfocus":"Focus";n.focus.setAttribute("aria-label",n.focus.textContent+" "+label);n.focus.setAttribute("aria-pressed",String(state.focus===id));
   n.up.setAttribute("aria-label","Move "+label+" earlier");n.down.setAttribute("aria-label","Move "+label+" later");n.hide.setAttribute("aria-label","Hide "+label);
   n.up.disabled=state.order[0]===id;n.down.disabled=state.order.at(-1)===id;
  }
  if(active&&active!==doc.body){if(active.closest?.("[hidden]"))chooser.focus();else if(active.isConnected&&doc.activeElement!==active)active.focus()}
  let saved=true;try{if(!storage)throw Error();storage.setItem(key,JSON.stringify(state))}catch{saved=false}
  status.textContent=(message||"Workspace ready")+(saved?"":" · Settings are session-only");
 }
 function change(fn,message){const next=JSON.parse(JSON.stringify(state));fn(next);state=next;sync(message)}
 sync("Workspace ready");
 return Object.freeze({getState:()=>JSON.parse(JSON.stringify(state)),reveal(id,{focus=false}={}){if(!ids.includes(id))throw Error("PANEL");change(s=>{s.panels[id].hidden=false;s.panels[id].folded=false;if(s.focus&&s.focus!==id)s.focus=id},"Panel revealed");if(focus)focusHeader(id)}});
}
export function qualifyModel(){
 const ids=["rings","gallery","inspector"],a=(v,m)=>{if(!v)throw Error(m);checks++};let checks=0;
 const d=normalize(null,ids);a(d.theme==="system"&&d.scale===100&&d.order.join()==ids.join(),"defaults");
 const n=normalize({schema:1,order:["gallery","invalid","gallery"],theme:"dark",scale:150,focus:"rings",panels:{rings:{hidden:true},gallery:{wide:true}}},ids);
 a(n.order.join()==="gallery,rings,inspector","stable order");a(n.focus===null&&n.panels.rings.hidden,"hidden focus");a(n.panels.gallery.wide&&n.scale===150&&n.theme==="dark","prefs");
 a(normalize({schema:9,theme:"dark"},ids).theme==="system","version");a(normalize({schema:1,scale:999,theme:"bad",layout:"bad"},ids).scale===100,"bounds");a(JSON.stringify(normalize(n,ids))===JSON.stringify(n),"idempotence");
 return {checks,scope:"presentation state only"};
}
