// Release inventory: missing, empty, duplicate or malformed suites fail closed.
// Read is injected to permit independent plan validation without browser startup.
export const SUITES=Object.freeze([
 Object.freeze({path:"tests/golden/mosaic/1.0.0/manifest.json",id:"mosaic",version:"1.0.0",genes:64,fixtures:1,renders:2,kind:"manifest"}),
 Object.freeze({path:"tests/golden/mosaic/2.0.0/manifest.json",id:"mosaic",version:"2.0.0",genes:16,fixtures:5,renders:20,kind:"manifest"}),
 Object.freeze({path:"tests/fixtures/atelier-v3-goldens.json",id:"mosaic",version:"3.0.0",genes:24,fixtures:24,renders:56,kind:"compact"}),
 Object.freeze({path:"tests/fixtures/motif-r1-goldens.json",id:"mosaic-motif",version:"1.0.0",genes:16,fixtures:176,renders:176,kind:"compact"}),
 Object.freeze({path:"tests/fixtures/emblem-goldens.json",id:"mosaic-emblem",version:"1.0.0",genes:12,fixtures:44,renders:44,kind:"compact"})
]);
export const EXPECTED_RENDERS=SUITES.reduce((n,s)=>n+s.renders,0);
const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function encode(genes){
 if(!Array.isArray(genes)||genes.some(v=>!Number.isInteger(v)||v<0||v>65535))throw Error("Invalid fixture gene list");
 const bytes=genes.flatMap(v=>[v&255,v>>>8]);let b64="";
 for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1]??0,c=bytes[i+2]??0;
 b64+=alphabet[a>>>2]+alphabet[(a&3)*16+(b>>>4)]+(i+1<bytes.length?alphabet[(b&15)*4+(c>>>6)]:"=")+(i+2<bytes.length?alphabet[c&63]:"=");}
 return b64;
}
function validGenome(g,n){
 if(!g||g.encoding!=="base64-u16le"||g.length!==n||typeof g.data!=="string"||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(g.data))throw Error("Invalid fixture genome");
 const s=g.data,p=s.endsWith("==")?2:s.endsWith("=")?1:0;
 if(s.length/4*3-p!==n*2||p===2&&(alphabet.indexOf(s.at(-3))&15)!==0||p===1&&(alphabet.indexOf(s.at(-2))&3)!==0)throw Error("Invalid fixture genome size/padding");
}
function renderDescriptor(r){
 if(!r||!["thumb","full"].includes(r.kind)||![r.w,r.h,r.lod].every(Number.isSafeInteger)||r.w<1||r.h<1||r.w>8192||r.h>8192||r.w*r.h>16777216||r.lod<0||r.lod>2||typeof r.sha256!=="string"||! /^[a-f0-9]{64}$/.test(r.sha256))throw Error("Invalid fixture render");
 if(r.kind==="full"&&r.format!==undefined&&!["png","webp"].includes(r.format))throw Error("Invalid fixture format");
 return {kind:r.kind,w:r.w,h:r.h,lod:r.lod,...(r.kind==="full"?{format:r.format??"png"}:{}),sha256:r.sha256};
}
export async function buildGoldenPlan(read){
 const jobs=[],keys=new Set();
 for(const s of SUITES){
  const suite=await read(s.path);
  if(!suite||suite.engineId!==s.id||suite.engineVersion!==s.version||!Array.isArray(suite.fixtures)||suite.fixtures.length!==s.fixtures)throw Error("Golden suite inventory mismatch: "+s.path);
  const start=jobs.length;
  for(const [i,f] of suite.fixtures.entries()){
   let recipe,renders;
   if(s.kind==="manifest"){
    if(typeof f.recipePath!=="string"||! /^fixtures\/[a-zA-Z0-9_-]+\.json$/.test(f.recipePath))throw Error("Invalid recipe path");
    recipe=await read(s.path.slice(0,s.path.lastIndexOf("/")+1)+f.recipePath);
    renders=f.renders;
   }else{
    const genes=f.genome??suite.genome, data=f.base64??encode(genes);
    if(genes&&genes.length!==s.genes)throw Error("Compact fixture gene length");
    const r=f.render??suite.renderIntent;
    renders=f.renders??[{kind:r?.kind,w:r?.width,h:r?.height,lod:r?.lod,sha256:f.sha256}];
    recipe={recipeFormatVersion:1,engineId:s.id,engineVersion:s.version,createdAt:"2026-11-26T00:00:00Z",genomeQ16:{encoding:"base64-u16le",length:s.genes,data},engineConfig:f.config};
   }
   if(!recipe||recipe.recipeFormatVersion!==1||recipe.engineId!==s.id||recipe.engineVersion!==s.version||!recipe.engineConfig||typeof recipe.engineConfig!=="object"||Array.isArray(recipe.engineConfig))throw Error("Fixture recipe mismatch: "+s.path);
   validGenome(recipe.genomeQ16,s.genes);
   if(!Array.isArray(renders)||!renders.length)throw Error("Empty fixture renders");
   for(const raw of renders){
    const render=renderDescriptor(raw),key=JSON.stringify([s.id,s.version,recipe.genomeQ16.data,recipe.engineConfig,render.kind,render.w,render.h,render.lod,render.format??null]);
    if(keys.has(key))throw Error("Duplicate canonical golden render");
    keys.add(key);
    const intent={kind:render.kind,width:render.w,height:render.h,lod:render.lod,...(render.kind==="full"?{format:render.format}:{})};
    jobs.push({id:s.id+"@"+s.version+":"+i+":"+render.kind+":"+render.w+"x"+render.h+":"+render.lod,recipe:{...recipe,renderIntent:intent},render});
   }
  }
  if(jobs.length-start!==s.renders)throw Error("Golden render inventory mismatch: "+s.path);
 }
 if(jobs.length!==EXPECTED_RENDERS)throw Error("Golden total mismatch");
 return jobs;
}
