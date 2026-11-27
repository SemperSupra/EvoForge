// Execute the real application startup and dispatch orchestration against strict test doubles.
// This is not native WGSL compilation, GPU execution, or browser qualification.
export async function testGpuHost(html,Params,clone){
 const script=html.split('<script>')[1].split('</script>')[0],boot='// ARENA_STARTUP_BOUNDARY',checks=[];
 if(script.split(boot).length!==2||!script.split(boot)[1].includes('else beginArena();'))throw Error('startup anchor');
 const assert=(name,ok,detail)=>{if(!ok)throw Error(name+': '+JSON.stringify(detail??null));checks.push(name);};
 const U={STORAGE:1,COPY_DST:2,COPY_SRC:4,MAP_READ:8,UNIFORM:16,RENDER_ATTACHMENT:32};
 async function start(search,options={}){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  const frames=[],buffers=[],writes=[],groups=[],pipes=[],submissions=[],retired=[],events={};let lost;
  const ctx={configure(){},getCurrentTexture(){return{createView(){return{}}}}};
  const elements=Object.fromEntries(ids.map(id=>[id,{id,style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},getContext(k){return k==='webgpu'?ctx:{clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}}}}]));
  const doc={getElementById(id){if(!elements[id])throw Error('missing DOM id '+id);return elements[id]},querySelectorAll(){return Object.values(elements)},body:{classList:{toggle(){}}}};
  const win={innerWidth:960,innerHeight:640,addEventListener(k,fn){events[k]=fn}};
  const noop=()=>{}, makeRender=()=>({setBindGroup:noop,setPipeline:noop,draw:noop,executeBundles:noop,end:noop,finish(){return{}}});
  const device={limits:{maxTextureDimension2D:8192},lost:new Promise(r=>lost=r),destroy(){retired.push('device')},addEventListener:noop,pushErrorScope:noop,async popErrorScope(){return options.validation?new Error('mock validation'):null},
   createBuffer({size,usage}){if(size<=0||size%4)throw Error('invalid size');const b={size,usage,bytes:new Uint8Array(size),mapped:false,async mapAsync(){if(this.mapped||!(usage&U.MAP_READ))throw Error('map invalid');this.mapped=true},getMappedRange(){if(!this.mapped)throw Error('not mapped');return this.bytes.buffer},unmap(){this.mapped=false},destroy:noop};buffers.push(b);return b},
   createShaderModule({code}){return{code,async getCompilationInfo(){return{messages:options.compile?[{type:'error',lineNum:1,message:'mock compile'}]:[]}}}},
   createBindGroupLayout({entries}){return{entries}},
   createBindGroup({layout,entries}){if(layout.entries.length!==entries.length)throw Error('binding count');for(const e of entries){const l=layout.entries.find(x=>x.binding===e.binding);if(!l||!(e.resource.buffer.usage&(l.buffer.type==='uniform'?U.UNIFORM:U.STORAGE)))throw Error('binding usage')}groups.push(entries);return{layout,entries}},
   createPipelineLayout(){return{}},
   createComputePipeline({compute}){if(!compute.module.code.includes('fn '+compute.entryPoint+'('))throw Error('entry point missing');pipes.push(compute.entryPoint);return{entry:compute.entryPoint}},
   createRenderPipeline({vertex,fragment}){if(!vertex.module.code.includes('fn '+vertex.entryPoint+'(')||!fragment.module.code.includes('fn '+fragment.entryPoint+'('))throw Error('render entry missing');return{}},
   createRenderBundleEncoder:makeRender,
   createTexture({size}){if(size.some(x=>!Number.isInteger(x)||x<1||x>8192))throw Error('texture extent');return{destroy:noop,createView(){return{}}}},
   createCommandEncoder(){let calls=[],copies=[],renders=0;return{beginComputePass(){let p;return{setBindGroup:noop,setPipeline(x){p=x.entry},dispatchWorkgroups(n){if(!p||!Number.isInteger(n)||n<1)throw Error('dispatch invalid');calls.push([p,n])},end:noop}},copyBufferToBuffer(src,so,dst,d,size){if(!(src.usage&U.COPY_SRC)||!(dst.usage&U.COPY_DST)||src.mapped||dst.mapped||so+size>src.size||d+size>dst.size)throw Error('copy invalid');copies.push({src,so,dst,d,size})},beginRenderPass(){renders++;return makeRender()},finish(){return{calls,copies,renders}}}},
   queue:{writeBuffer(b,o,data,start=0,size){const stride=ArrayBuffer.isView(data)?data.BYTES_PER_ELEMENT:1;const bytes=ArrayBuffer.isView(data)?new Uint8Array(data.buffer,data.byteOffset,data.byteLength):new Uint8Array(data);const from=start*stride,len=size===undefined?bytes.length-from:size*stride;if(!(b.usage&U.COPY_DST)||o%4||len%4||o+len>b.size||from+len>bytes.length||b.mapped)throw Error('write bounds/usage');b.bytes.set(bytes.subarray(from,from+len),o);writes.push({b,o,len})},submit(cmds){for(const c of cmds){for(const x of c.copies)x.dst.bytes.set(x.src.bytes.subarray(x.so,x.so+x.size),x.d);submissions.push(c)}},async onSubmittedWorkDone(){}}
  };
  const nav=options.noGpu?{}:{gpu:{async requestAdapter(){return{limits:{maxStorageBuffersPerShaderStage:8},async requestDevice(){return device}}},getPreferredCanvasFormat(){return'bgra8unorm'}}};
  const run=new Function('document','window','navigator','location','isSecureContext','URLSearchParams','structuredClone','GPUBufferUsage','GPUTextureUsage','GPUShaderStage','GPUMapMode','requestAnimationFrame','performance','devicePixelRatio',script.split(boot)[0]+'\nreturn {boot:()=>init().catch(error=>failArena(error.message||String(error))),api:window.__ARENA_RPC__,state,experience,buildEcosystem};');
  const h=run(doc,win,nav,{search},false,Params,clone,U,{RENDER_ATTACHMENT:32},{COMPUTE:1,VERTEX:2,FRAGMENT:4},{READ:1},f=>frames.push(f),{now:()=>0},1);
  await h.boot();
  async function drain(){for(let i=0;i<12;i++)await Promise.resolve()}
  async function frame(n=16){if(!frames.length)throw Error('no frame');frames.shift()(n);await drain()}
  return {...h,frames,buffers,writes,groups,pipes,submissions,retired,events,lost,frame,drain,elements};
 }
 const h=await start('?mode=play&profile=smoke&seed=42');
 assert('initialized',h.experience.phase==='running'&&h.pipes.length===11&&h.frames.length===1,{experience:h.experience,pipes:h.pipes,frames:h.frames.length});
 const e=h.buildEcosystem();
 assert('binding counts',h.groups.length===2&&h.groups[0].length===9&&h.groups[1].length===5);
 assert('ABI buffer sizes',h.buffers[0].size===7200*48*3&&h.buffers[3].size===512*128&&h.buffers[4].size===512*32);
 assert('template upload',h.writes.some(w=>w.b===h.buffers[0]&&w.o===e.activeNodes*96&&w.len===e.activeNodes*48));
 await h.frame();
 const cmd=h.submissions.at(-1);
 assert('compute pass sequence',cmd.calls.map(x=>x[0]).join(',')===['clearGrid','updateEcology','reproduce','integrateVerlet','initCarrionClaims',...Array.from({length:4},()=>['clearHash','snapshotNodes','buildSpatialHash','relaxConstraints']).flat(),'finalizeCarrion','collectStats'].join(','),cmd.calls);
 assert('node coverage',cmd.calls.filter(x=>['integrateVerlet','initCarrionClaims','snapshotNodes','buildSpatialHash','relaxConstraints','finalizeCarrion'].includes(x[0])).every(x=>x[1]===Math.ceil(e.activeNodes/64)));
 assert('one render, one scheduled successor',cmd.renders===1&&h.frames.length===1&&h.state.simTick===1);
 const sim=h.buffers.find(b=>b.size===288&&b.usage===18),cam=h.buffers.find(b=>b.size===176&&b.usage===18);
 const su=new Uint32Array(sim.bytes.buffer),cu=new Uint32Array(cam.bytes.buffer);
 assert('uniform offsets',su[0]===e.activeNodes&&su[1]===e.totalCreatures&&su[3]===42&&su[4]===1&&cu[25]===e.activeNodes&&cu[26]===1&&cu[27]===42);
 h.api.setPaused(true);let c=h.submissions.length;await h.frame();
 const pauseRedraw=h.submissions.at(-1);
 const pauseRenderOnly=h.submissions.length===c+1&&pauseRedraw.calls.length===0&&pauseRedraw.copies.length===0&&pauseRedraw.renders===1&&h.state.simTick===1&&h.frames.length===1;
 c=h.submissions.length;await h.frame();
 const idleNoWork=h.submissions.length===c&&h.state.simTick===1&&h.frames.length===1;
 h.elements['cam-right'].onclick();await h.frame();
 const cameraRedraw=h.submissions.at(-1);
 assert('pause freezes compute and tick, permits dirty-view render only, idles when clean',pauseRenderOnly&&idleNoWork&&h.submissions.length===c+1&&cameraRedraw.calls.length===0&&cameraRedraw.copies.length===0&&cameraRedraw.renders===1&&h.state.simTick===1&&h.frames.length===1);
 h.api.setPaused(false);for(let i=0;i<14;i++)await h.frame((i+2)*16);
 assert('telemetry cadence',h.submissions.at(-1).copies.length===1&&h.api.getState().telemetry.tick===15);
 h.api.resetEcosystem();assert('reset tick and stats',h.state.simTick===0&&h.api.getState().telemetry.tick===0&&h.buffers[7].bytes.every(x=>x===0));
 h.events.pagehide({persisted:true});assert('bfcache pause',h.api.getState().phase==='paused');
 h.events.pagehide({persisted:false});assert('navigation releases GPU',h.retired.includes('device'));
 const no=await start('?mode=observe',{noGpu:true});assert('no GPU failure',no.experience.phase==='error'&&!no.elements['arena-message'].hidden&&no.frames.length===0);
 const bad=await start('?mode=play',{compile:true});assert('compile failure stops',bad.experience.phase==='error'&&bad.experience.error.includes('mock compile')&&bad.frames.length===0);
 const val=await start('?mode=play',{validation:true});assert('validation failure stops',val.experience.phase==='error'&&val.frames.length===0);
 const dying=await start('?mode=observe&profile=smoke');dying.lost({message:'mock lost'});await dying.drain();await dying.frame();assert('device loss stops',dying.experience.phase==='error'&&dying.frames.length===0&&dying.submissions.length===0);
 return checks;
}
