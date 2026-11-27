// Deterministic synthetic CPU/WebGPU matrix multiplication-style canary; no learned weights or network access.
export function fixture(n){
 if(!Number.isSafeInteger(n)||n<1||n>4096)throw Error("SIZE");
 const input=Float32Array.from({length:n*16},(_,i)=>((i*17+13)%31-15)/16);
 const weights=Float32Array.from({length:145},(_,i)=>((i*11+5)%19-9)/32);
 return {n,input,weights};
}
export function reference({n,input,weights}){
 const result=new Float32Array(n);
 for(let j=0;j<n;j++){
  let total=weights[144];
  for(let h=0;h<8;h++){
   let value=weights[128+h];
   for(let i=0;i<16;i++)value=Math.fround(value+Math.fround(input[j*16+i]*weights[h*16+i]));
   total=Math.fround(total+Math.fround(Math.max(0,value)*weights[136+h]));
  }
  result[j]=total;
 }
 return result;
}
const WGSL="@group(0) @binding(0) var<storage,read> input: array<f32>;\n@group(0) @binding(1) var<storage,read> weights: array<f32>;\n@group(0) @binding(2) var<storage,read_write> output: array<f32>;\n@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) {\n let j=id.x; if(j>=arrayLength(&output)){return;}\n var total=weights[144u];\n for(var h=0u;h<8u;h++){\n  var value=weights[128u+h];\n  for(var i=0u;i<16u;i++){value+=input[j*16u+i]*weights[h*16u+i];}\n  total+=max(0.0,value)*weights[136u+h];\n }\n output[j]=total;\n}";
export async function gpuBatch(g,device,f){
 const U=g.GPUBufferUsage,bufs=[];let read,mapped=false,scope=true;
 function alloc(size,usage){const b=device.createBuffer({size,usage});bufs.push(b);return b;}
 device.pushErrorScope("validation");
 try{
  const input=alloc(f.input.byteLength,U.STORAGE|U.COPY_DST),weights=alloc(f.weights.byteLength,U.STORAGE|U.COPY_DST),out=alloc(f.n*4,U.STORAGE|U.COPY_SRC);
  read=alloc(f.n*4,U.COPY_DST|U.MAP_READ);
  device.queue.writeBuffer(input,0,f.input);device.queue.writeBuffer(weights,0,f.weights);
  const shader=device.createShaderModule({code:WGSL}),pipeline=await device.createComputePipelineAsync({layout:"auto",compute:{module:shader,entryPoint:"main"}});
  const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:input}},{binding:1,resource:{buffer:weights}},{binding:2,resource:{buffer:out}}]});
  const enc=device.createCommandEncoder(),pass=enc.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(f.n/64));pass.end();enc.copyBufferToBuffer(out,0,read,0,f.n*4);device.queue.submit([enc.finish()]);
  await read.mapAsync(g.GPUMapMode.READ);mapped=true;const actual=new Float32Array(read.getMappedRange()).slice();read.unmap();mapped=false;
  const err=await device.popErrorScope();scope=false;if(err)throw Error("GPU_VALIDATION");
  return actual;
 }finally{if(mapped)try{read.unmap();}catch{}for(const b of bufs)try{b.destroy();}catch{}if(scope)try{await device.popErrorScope();}catch{}}
}
export function qualification(){
 let checks=0;const a=(x,m)=>{checks++;if(!x)throw Error(m)};
 const f=fixture(1);const synthetic={n:1,input:new Float32Array(16),weights:new Float32Array(145)};synthetic.input[0]=.5;synthetic.weights[0]=2;synthetic.weights[128]=-.25;synthetic.weights[136]=3;synthetic.weights[144]=.5;
 a(reference(synthetic)[0]===2.75,"independent simple oracle");
 for(const n of [1,16,64,256,1024,4096]){const b=fixture(n),v=reference(b);a(v.length===n&&v.every(Number.isFinite),"finite shape");a(v[0]===reference(f)[0],"batch prefix");const again=reference(b);a(v.every((x,i)=>x===again[i]),"replay deterministic values");}
 return {checks,knownAnswer:2.75,scope:"CPU only; no browser GPU execution"};
}
