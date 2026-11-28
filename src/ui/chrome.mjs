// Original, small SVG command symbols. No third-party font, network or icon library.
// The same implementation is embedded in the standalone arena; contract test checks exact parity.
const efPaths={
 settings:'<polygon points="19.56,9.71 22.45,10.97 22.45,13.03 19.56,14.29 18.97,15.72 20.12,18.66 18.66,20.12 15.72,18.97 14.29,19.56 13.03,22.45 10.97,22.45 9.71,19.56 8.28,18.97 5.34,20.12 3.88,18.66 5.03,15.72 4.44,14.29 1.55,13.03 1.55,10.97 4.44,9.71 5.03,8.28 3.88,5.34 5.34,3.88 8.28,5.03 9.71,4.44 10.97,1.55 13.03,1.55 14.29,4.44 15.72,5.03 18.66,3.88 20.12,5.34 18.97,8.28"/><circle cx="12" cy="12" r="3"/>',
 system:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
 moon:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
 play:'<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
 pause:'<path d="M8 4v16m8-16v16" stroke-width="3.5"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 leftPanel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m-3-11h1m-1 4h1"/>',
 rightPanel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16m2-11h1m-1 4h1"/>',
 panels:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16m8-16v16"/>',
 orbit:'<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><path d="m20 5 1 4-4-1"/>',
 pan:'<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
 left:'<path d="M20 12H4m7-7-7 7 7 7"/>',
 right:'<path d="M4 12h16m-7-7 7 7-7 7"/>',
 up:'<path d="M12 20V4m-7 7 7-7 7 7"/>',
 down:'<path d="M12 4v16m-7-7 7 7 7-7"/>',
 zoomIn:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6m-3-3v6"/>',
 zoomOut:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6"/>',
 top:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 7v10M7 12h10"/><circle cx="12" cy="12" r="2"/>',
 reset:'<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7"/>',
 cursor:'<path d="m5 3 14 10-7 1-3 7-4-18Z"/>',
 next:'<path d="m5 5 10 7-10 7Z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
 library:'<path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4-1 3 15-4 1Z"/>',
 radar:'<path d="M12 3 21 10 17 21H7L3 10Z M12 7l5 4-2 6H9l-2-6Z M12 3v9m9-2-9 2m5 9-5-9m-5 9 5-9M3 10l9 2"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m3 17 6-5 4 3 3-4 5 6"/>',
 save:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 volume:'<path d="M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="M3 9h4l5-4v14l-5-4H3Zm13 0 5 6m0-6-5 6"/>'
};
const efKey="evoforge.appearance.v1";
const efCss=`
:root[data-ef-theme=light]{color-scheme:light;--ef-surface:#f6f8fa;--ef-ink:#18222d;--ef-border:#a8b1bc;--ef-active:#d4e8f5;--ef-accent:#075d9a}
:root[data-ef-theme=dark]{color-scheme:dark;--ef-surface:#202832;--ef-ink:#f0f4f8;--ef-border:#677888;--ef-active:#284b63;--ef-accent:#9edbff}
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.ef-icon{display:inline-flex!important;align-items:center;justify-content:center;gap:0;box-sizing:border-box;min-inline-size:36px!important;min-block-size:36px!important;padding:5px 7px!important;font-size:0!important;line-height:1!important;flex:0 0 auto!important;text-decoration:none!important;position:relative}
.ef-icon::before,.ef-symbol::before{content:"";display:block;width:20px;height:20px;flex:none;background:currentColor;mask:var(--ef-symbol) center/contain no-repeat;-webkit-mask:var(--ef-symbol) center/contain no-repeat}
.ef-icon::after{content:attr(data-ef-label);display:none;font-size:13px;line-height:1.2}
:root[data-ef-labels=shown] .ef-icon{gap:6px}
:root[data-ef-labels=shown] .ef-icon::after{display:block}
.ef-icon:focus-visible,.ef-settings-dialog button:focus-visible,.ef-settings-dialog input:focus-visible{outline:2px solid var(--ef-accent)!important;outline-offset:2px}
.ef-icon[aria-pressed=true],.ef-icon[aria-expanded=true]{background:var(--ef-active)!important;color:var(--ef-ink)!important;border-color:var(--ef-accent)!important}
.ef-icon:disabled{opacity:.45}
.ef-settings-trigger{background:var(--ef-surface);color:var(--ef-ink);border:1px solid var(--ef-border);border-radius:8px}
.ef-settings-dialog{position:fixed;inset:0;margin:auto;color:var(--ef-ink);background:var(--ef-surface);border:1px solid var(--ef-border);border-radius:12px;width:min(400px,calc(100% - 28px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px;user-select:text;font:14px/1.45 system-ui,sans-serif}
.ef-settings-dialog::backdrop{background:rgba(0,0,0,.45)}
.ef-settings-dialog h2{display:block;margin:0 0 12px;font-size:19px;color:inherit}
.ef-settings-dialog p{margin:10px 0;color:inherit}
.ef-settings-dialog fieldset{border:1px solid var(--ef-border);border-radius:8px;margin:12px 0;padding:8px}
.ef-settings-dialog legend{font-weight:600;padding:0 4px}
.ef-settings-dialog label{display:flex;align-items:center;gap:9px;min-height:44px;padding:3px 7px;box-sizing:border-box;cursor:pointer}
.ef-settings-dialog input{accent-color:var(--ef-accent)}
.ef-settings-dialog .ef-symbol{display:inline-flex;color:var(--ef-ink)}
.ef-settings-dialog button{font:inherit;background:var(--ef-active);color:var(--ef-ink);border:1px solid var(--ef-border);border-radius:7px;min-height:44px;padding:6px 14px}
.ef-settings-dialog details{margin:8px 0}.ef-settings-dialog summary{cursor:pointer;min-height:36px}
.ef-tooltip{position:fixed;z-index:9999;padding:6px 9px;border-radius:6px;border:1px solid var(--ef-border);background:var(--ef-surface);color:var(--ef-ink);font:12px/1.35 system-ui,sans-serif;max-width:calc(100vw - 16px);pointer-events:auto;box-shadow:0 4px 12px #0003}
.ef-tooltip[hidden]{display:none}
.experience-nav.ef-chrome-host{display:flex;align-items:center;justify-content:space-between;gap:8px}
.launcher-header.ef-chrome-host{display:flex;align-items:center;justify-content:space-between;gap:8px}
@media(pointer:coarse){.ef-icon{min-inline-size:44px!important;min-block-size:44px!important}.ef-icon::before{width:22px;height:22px}}
@media(max-width:600px){.ef-icon{min-inline-size:44px!important;min-block-size:44px!important}}
:root[data-ef-arena=true][data-ef-theme=light]{--bg:#e9eef2;--panel:rgba(246,248,250,.97);--border:#9ba8b4;--text:#17252e;--muted:#475967}
:root[data-ef-arena=true] #experience-toolbar{height:auto;min-height:48px;display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;overflow:visible;padding:5px;gap:4px}
:root[data-ef-arena=true] #experience-toolbar .ef-settings-trigger{margin-inline-start:auto}
:root[data-ef-arena=true] #experience-toolbar a{color:var(--ef-accent)}
:root[data-ef-arena=true] #experience-mode{font-size:11px;flex:1;min-width:64px}
:root[data-ef-arena=true] #camera-controls .ef-icon{border-radius:7px}
:root[data-ef-arena=true][data-ef-theme=light] :is(#hud-left,#hud-right,#experience-toolbar,#camera-controls,#world-tool-dock,#panel-controls){color:var(--text)}
:root[data-ef-arena=true][data-ef-theme=light] :is(h1,h2,.faction-stat b,#e-fauna){color:var(--text)!important}
:root[data-ef-arena=true][data-ef-theme=light] :is(.faction-card,.guild-pill,.event-log){background:#e5ebf0;border-color:#aeb9c3}
:root[data-ef-arena=true][data-ef-theme=light] :is(button,.faction-card){color:var(--text);border-color:var(--border)}
:root[data-ef-arena=true][data-ef-theme=light] button:not(.ef-settings-dialog button){background:#e4ebf1}
:root[data-ef-arena=true][data-ef-theme=light] :is(button.active,button[aria-pressed=true],button[aria-expanded=true],.faction-card[aria-pressed=true]){color:var(--text)!important;background:#d4e8f5!important;border-color:#075d9a!important}
:root[data-ef-arena=true][data-ef-theme=light] :is(#env-telemetry,#seed-label,#e-flora,#e-carcass,#director-advice,.guild-pill>div){color:#324e64!important}
:root[data-ef-arena=true][data-ef-theme=light] .badge{color:#24583c;border-color:#4f855e}
:root[data-ef-arena=true][data-ef-theme=light] .badge.agent{color:#633d87;border-color:#8b6ba8}
:root[data-ef-arena=true][data-ef-theme=light] #mobile-start{background:var(--ef-surface)!important;color:var(--ef-ink)!important}
:root[data-ef-arena=true][data-ef-theme=light] #mobile-start a{color:var(--ef-accent)!important}
:root[data-ef-arena=true][data-ef-theme=light] #arena-message{background:var(--ef-surface);color:var(--ef-ink)}
:root[data-ef-arena=true][data-ef-theme=light] #arena-message a{color:var(--ef-accent)}
@media(forced-colors:active){.ef-icon::before,.ef-symbol::before{forced-color-adjust:none;background:ButtonText}}
`;
function efSymbol(el,name){
 const body=efPaths[name];if(!body)return;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
 el.style.setProperty('--ef-symbol','url("data:image/svg+xml,'+encodeURIComponent(svg)+'")');
}
function efIcon(el,name,label){
 if(!el||!efPaths[name]||!label)return;
 el.classList.add('ef-icon');efSymbol(el,name);el.dataset.efLabel=label;el.setAttribute('aria-label',label);
 if(!el.title||el.dataset.efManagedTitle==='true'){el.title=label;el.dataset.efManagedTitle='true';}
}
export function decorateMosaicChrome(root){
 const icons={'Play':'play','Pause':'pause','Next':'next','Hold':'pause','Pick':'check','Unpick':'check','Skip':'close','Unskip':'close','Favorite':'star','Library':'library','Radar':'radar','Image':'image','Close':'close'};
 for(const b of root.querySelectorAll('.controls button,.advance-strip button,.card button,.modalHead button')){
  const label=b.getAttribute('aria-label')||b.textContent.trim();
  if(icons[label])efIcon(b,icons[label],label);
 }
}
export function installChrome(host,arena=false){
 if(!host||document.getElementById('ef-chrome-style'))return;
 const root=document.documentElement,style=document.createElement('style');style.id='ef-chrome-style';style.textContent=efCss;document.head.append(style);
 root.dataset.efArena=String(arena);host.classList.add('ef-chrome-host');
 const media=matchMedia('(prefers-color-scheme: dark)');
 function load(){try{const p=JSON.parse(localStorage.getItem(efKey)||'{}');return {theme:['system','light','dark'].includes(p.theme)?p.theme:'system',labels:p.labels==='shown'?'shown':'compact'};}catch{return {theme:'system',labels:'compact'};}}
 let prefs=load();
 function apply(){const theme=prefs.theme==='system'?(media.matches?'dark':'light'):prefs.theme;root.dataset.efTheme=theme;root.dataset.efThemePreference=prefs.theme;root.dataset.efLabels=prefs.labels;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#202832':'#f6f8fa');}
 function update(){apply();try{localStorage.setItem(efKey,JSON.stringify(prefs));}catch{}}
 apply();
 const trigger=document.createElement('button');trigger.id='ef-settings-trigger';trigger.type='button';trigger.className='ef-settings-trigger';trigger.textContent='Settings';efIcon(trigger,'settings','Settings');host.append(trigger);
 const dialog=document.createElement('dialog');dialog.id='ef-settings-dialog';dialog.className='ef-settings-dialog';dialog.setAttribute('aria-labelledby','ef-settings-heading');
 const heading=document.createElement('h2');heading.id='ef-settings-heading';heading.textContent='Appearance and controls';dialog.append(heading);
 function field(title,group,choices,read,write){
  const fs=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=title;fs.append(legend);
  const sync=[];
  for(const [value,label,icon] of choices){const row=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name=group;input.value=value;input.checked=read()===value;row.append(input);if(icon){const symbol=document.createElement('span');symbol.className='ef-symbol';symbol.setAttribute('aria-hidden','true');efSymbol(symbol,icon);row.append(symbol);}row.append(document.createTextNode(label));input.addEventListener('change',()=>{if(input.checked){write(value);update();}});fs.append(row);sync.push(()=>input.checked=read()===value);}
  dialog.append(fs);return ()=>sync.forEach(f=>f());
 }
 const syncTheme=field('Theme','ef-theme',[['system','System','system'],['light','Light','sun'],['dark','Dark','moon']],()=>prefs.theme,v=>prefs.theme=v);
 const syncLabels=field('Toolbar labels','ef-labels',[['compact','Icons only for familiar commands',''],['shown','Icons and text labels','']],()=>prefs.labels,v=>prefs.labels=v);
 const help=document.createElement('p');help.textContent='Hover or focus on a command to see its name. On touchscreens, choose icons and text labels whenever you need more guidance. Specialized and consequential actions retain text.';dialog.append(help);
 const done=document.createElement('button');done.type='button';done.textContent='Done';done.addEventListener('click',()=>dialog.close());dialog.append(done);document.body.append(dialog);
 trigger.setAttribute('aria-haspopup','dialog');trigger.addEventListener('click',()=>{syncTheme();syncLabels();dialog.showModal();});
 dialog.addEventListener('close',()=>trigger.focus());
 media.addEventListener?.('change',()=>{if(prefs.theme==='system')apply();});
 window.addEventListener('storage',e=>{if(e.key===efKey||e.key===null){prefs=load();apply();syncTheme();syncLabels();}});
 const tip=document.createElement('div');tip.className='ef-tooltip';tip.hidden=true;tip.setAttribute('aria-hidden','true');document.body.append(tip);
 let activeTip=null,tipTimer=0;
 function hideTip(){clearTimeout(tipTimer);tip.hidden=true;activeTip=null;}
 function scheduleHide(){clearTimeout(tipTimer);tipTimer=window.setTimeout(()=>{if(activeTip&&(activeTip.matches(':hover')||document.activeElement===activeTip)||tip.matches(':hover'))return;hideTip();},160);}
 function showTip(target){const b=target instanceof Element?target.closest('.ef-icon'):null;if(!b||b.disabled||!b.dataset.efLabel||dialog.open)return;clearTimeout(tipTimer);activeTip=b;tip.textContent=b.dataset.efLabel;tip.hidden=false;const r=b.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+(r.width-w)/2))+'px';tip.style.top=(r.bottom+h+8<innerHeight?r.bottom+5:Math.max(4,r.top-h-5))+'px';}
 document.addEventListener('focusin',e=>showTip(e.target));document.addEventListener('focusout',scheduleHide);document.addEventListener('pointerover',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'){if(tip.contains(e.target))clearTimeout(tipTimer);else showTip(e.target);}});document.addEventListener('pointerout',scheduleHide);document.addEventListener('pointerdown',hideTip,true);document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});window.addEventListener('resize',hideTip);document.addEventListener('scroll',hideTip,true);
 
 if(arena){
  const ids={'btn-pause':['pause','Pause'],'panel-life':['leftPanel','Life panel'],'panel-world':['rightPanel','World panel'],'hud-toggle':['panels','Hide panels'],'cam-orbit':['orbit','Orbit'],'cam-pan':['pan','Pan'],'cam-left':['left','Rotate camera left'],'cam-right':['right','Rotate camera right'],'cam-up':['up','Tilt camera up'],'cam-down':['down','Tilt camera down'],'cam-in':['zoomIn','Zoom in'],'cam-out':['zoomOut','Zoom out'],'cam-top':['top','Top view'],'cam-under':['down','Underside (mythic illustration)'],'cam-home':['reset','Reset view'],'tool-navigate':['cursor','Navigate'],'btn-export-json':['save','Export snapshot'],'btn-audio':['mute','Audio off']};
  for(const [id,[icon,label]] of Object.entries(ids)){const el=document.getElementById(id);if(!el)continue;const refresh=()=>{const value=el.textContent.trim();if(id==='btn-pause'){efIcon(el,value==='Resume'?'play':'pause',value);}else if(id==='hud-toggle'){efIcon(el,'panels',value);}else if(id==='btn-audio'){efIcon(el,el.getAttribute('aria-pressed')==='true'?'volume':'mute',value);}else efIcon(el,icon,label);};refresh();if(['btn-pause','hud-toggle','btn-audio'].includes(id))new MutationObserver(refresh).observe(el,{childList:true,characterData:true,subtree:true,attributes:id==='btn-audio',attributeFilter:id==='btn-audio'?['aria-pressed']:undefined});}
  for(const a of host.querySelectorAll('a')){const label=a.textContent.trim();if(label==='All experiences')efIcon(a,'home',label);if(label==='Observe')efIcon(a,'eye',label);if(label==='Play')efIcon(a,'play',label);}
  const measure=()=>root.style.setProperty('--toolbar-height',Math.ceil(host.getBoundingClientRect().height)+'px');if(typeof ResizeObserver!=='undefined')new ResizeObserver(measure).observe(host);measure();
 }
}
