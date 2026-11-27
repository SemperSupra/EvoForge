import {CoverageIndex} from './index.mjs';
import {W,H} from './recipe.mjs';
const $=id=>document.getElementById(id);let scan=null,render=null,index=null,offset=0,request=0;
const size=()=>innerWidth<=640?8:innerWidth<=1200?12:24;
const storageKey='evoforge-r44-index-v1';
function checkpoint(){if(!index)return;try{localStorage.setItem(storageKey,JSON.stringify(index.export()));}catch(e){$('progress').textContent+=' · local save unavailable';}}
function resumeState(){$('resume').disabled=!!scan||!index||index.complete;$('import').disabled=!!scan;}
function stop(){scan?.terminate();scan=null;render?.terminate();render=null;request++;$('start').disabled=false;$('cancel').disabled=true;$('engine').disabled=false;}
function status(text){$('progress').textContent=text;$('bar').max=index?.total??1;$('bar').value=index?.count??0;}
function refresh(){const pageSize=size(),rows=index?.page(offset,pageSize)??[],total=index?.unique??0,tag=++request;
 $('gallery').replaceChildren();$('page').textContent=total?(offset+1)+'–'+(offset+rows.length)+' of '+total:'0 of 0';$('prev').disabled=!offset;$('next').disabled=offset+pageSize>=total;$('export').disabled=!index?.count;
 for(const row of rows){const article=document.createElement('article');article.dataset.rank=String(row.ranks[0]);const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.setAttribute('aria-label','Candidate '+row.ranks[0]);article.append(canvas);const title=document.createElement('p');title.textContent='Rank '+row.ranks[0]+' · '+row.ranks.length+' recipe'+(row.ranks.length===1?'':'s');article.append(title);const b=document.createElement('button');b.textContent='Inspect';b.onclick=()=>{$('receipt').textContent=JSON.stringify({lane:index.lane,previewHash:row.hash,representative:row.ranks[0],aliasRanks:row.ranks},null,2);$('detail').showModal();};article.append(b);$('gallery').append(article);}
 render?.terminate();render=null;if(!rows.length)return;render=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});render.onmessage=({data:m})=>{if(m.type==='preview'&&m.request===tag&&tag===request){const canvas=$('gallery').querySelector('[data-rank="'+m.rank+'"] canvas');if(canvas){canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(m.rgba),W,H),0,0);canvas.dataset.ready='true';}}else if(m.type==='error'){status('Preview failed: '+m.message);}};render.postMessage({type:'page',lane:index.lane,ranks:rows.map(r=>r.ranks[0]),request:tag});
}
function begin(fresh){stop();if(fresh){index=new CoverageIndex($('engine').value);offset=0;}refresh();$('engine').disabled=true;$('start').disabled=true;$('cancel').disabled=false;status('Exploring…');const active=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});scan=active;resumeState();
 active.onmessage=({data:m})=>{if(scan!==active)return;if(m.type==='rank'){index.add(m.rank,m.hash);if(index.count%32===0||index.complete){status(index.count+'/'+index.total+' explored · '+index.unique+' unique previews');checkpoint();}}
 else if(m.type==='done'){stop();status(index.count+'/'+index.total+' explored · '+index.unique+' unique previews · complete');checkpoint();resumeState();refresh();}
 else if(m.type==='error'){stop();status('Incomplete: '+m.message);refresh();}};active.onerror=e=>{if(scan===active){stop();status('Incomplete: '+e.message);refresh();}};active.postMessage({type:'scan',lane:index.lane,completed:[...index.ranks]});}
$('start').onclick=()=>begin(true);$('resume').onclick=()=>begin(false);
$('cancel').onclick=()=>{stop();status(index.count+'/'+index.total+' explored · cancelled');checkpoint();resumeState();refresh();};
$('prev').onclick=()=>{offset=Math.max(0,offset-size());refresh();};$('next').onclick=()=>{offset+=size();refresh();};$('close').onclick=()=>$('detail').close();
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(index.export(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='evoforge-coverage-'+index.lane+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let prior=size();addEventListener('resize',()=>{if(size()!==prior){prior=size();if(index){offset=Math.floor(offset/prior)*prior;refresh();}}});

function restore(raw){const next=CoverageIndex.restore(raw);stop();index=next;offset=0;$('engine').value=index.lane;status(index.count+'/'+index.total+' explored · '+index.unique+' unique previews · '+(index.complete?'complete':'paused'));resumeState();refresh();}
$('import').onclick=()=>$('import-file').click();$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('index exceeds 2 MiB');restore(JSON.parse(await file.text()));checkpoint();}catch(e){status('Import rejected: '+e.message);}finally{$('import-file').value='';}};
try{const raw=localStorage.getItem(storageKey);if(raw)restore(JSON.parse(raw));}catch(e){status('Saved index rejected: '+e.message);}
addEventListener('pagehide',()=>checkpoint());
