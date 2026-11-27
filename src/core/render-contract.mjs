// Common admitted raster envelope; existing canonical renderers unchanged.
export function assertRenderRequest(spec,genome,config,intent){
 if(!spec||typeof spec.id!=="string"||typeof spec.version!=="string"||!Number.isSafeInteger(spec.genomeLength)||!(genome instanceof Uint16Array)||genome.length!==spec.genomeLength)throw Error("Engine genome length mismatch");
 if(!config||typeof config!=="object"||Array.isArray(config)||Object.getPrototypeOf(config)!==Object.prototype&&Object.getPrototypeOf(config)!==null)throw Error("Explicit engine configuration required");
 let nodes=0;
 function data(v,depth){
  if(++nodes>4096||depth>16)throw Error("Configuration budget exceeded");
  if(v===null||typeof v==="boolean")return;
  if(typeof v==="string"){if(v.length>4096)throw Error("Configuration string budget");return;}
  if(typeof v==="number"){if(!Number.isFinite(v))throw Error("Non-finite configuration");return;}
  if(!v||typeof v!=="object"||!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw Error("Configuration must be JSON data");
  for(const k of Object.keys(v)){if(k.length>256||["__proto__","prototype","constructor"].includes(k))throw Error("Invalid configuration key");data(v[k],depth+1);}
 }
 data(config,0);
 if(!intent||!["thumb","full"].includes(intent.kind)||![intent.width,intent.height,intent.lod].every(Number.isSafeInteger)||intent.lod<0||intent.lod>2)throw Error("Invalid render intent");
 const {width:w,height:h}=intent,min=spec.id==="mosaic"?1:32,aspect=spec.id==="mosaic-emblem"?8:16;
 if(w<min||h<min||w>8192||h>8192||w*h>16777216||Math.max(w,h)>Math.min(w,h)*aspect)throw Error("Render extent outside admitted budget");
 if(intent.kind==="full"&&!["png","webp"].includes(intent.format))throw Error("Explicit full render format required");
}
