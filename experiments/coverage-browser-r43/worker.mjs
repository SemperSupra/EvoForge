import {rowAt,AXES,cardinality} from './index.mjs';
import {recipe,intent} from './recipe.mjs';
self.onmessage=async({data:m})=>{
 try{
 if(m.type==='scan'){
 const total=Number(cardinality(AXES[m.lane]));const seen=new Set(m.completed??[]);if(seen.size>total||[...seen].some(x=>!Number.isSafeInteger(x)||x<0||x>=total))throw Error('invalid resume ranks');for(let rank=0;rank<total;rank++){if(seen.has(rank))continue;const {g,config,render}=recipe(m.lane,rowAt(m.lane,rank).candidate);const {rgba}=await render(g,config,intent);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',rgba))].map(x=>x.toString(16).padStart(2,'0')).join('');self.postMessage({type:'rank',rank,hash});}self.postMessage({type:'done'});
 }else if(m.type==='page'){for(const rank of m.ranks){const {g,config,decoded,render}=recipe(m.lane,rowAt(m.lane,rank).candidate);const {rgba}=await render(g,config,intent);self.postMessage({type:'preview',rank,rgba,decoded,request:m.request},[rgba.buffer]);}}
 }catch(e){self.postMessage({type:'error',message:String(e)});}
};
