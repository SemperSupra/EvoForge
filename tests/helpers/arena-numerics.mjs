// Source-bound mathematical checks. No GPU execution or shader compilation is implied.
export function testArenaNumerics(html){
 const checks=[],assert=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 const compute=html.split('const WGSL_COMPUTE = /* wgsl */'+'\x60')[1].split('\x60;')[0];
 const render=html.split('const WGSL_RENDER = /* wgsl */'+'\x60')[1].split('\x60;')[0];
 const number=name=>Number(html.match(new RegExp('const '+name+' = (\\d+(?:\\.\\d+)?);'))?.[1]);
 const cell=number('CELL_SIZE'),sense=number('SENSE_RADIUS');
 assert('cell width covers sense radius',cell>=sense&&sense===.87);
 assert('shader uses independent radius, uniform slot 10 and frozen query',compute.includes('let senseRadiusSq = params.senseRadius * params.senseRadius;')&&compute.includes('let diff = queryP - pOther;')&&html.includes('f32[10] = SENSE_RADIUS;'));
 const a=.599,b=1.201;
 assert('legacy grid misses valid nearby pair',Math.abs(a-b)<sense&&Math.abs(Math.floor(a/.6)-Math.floor(b/.6))===2);
 assert('corrected grid covers counterexample',Math.abs(Math.floor(a/cell)-Math.floor(b/cell))<=1);
 let x=0x13456789;function rnd(){x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}
 let tested=0,legacyMisses=0;
 for(let i=0;i<100000;i++){
   const p=[0,0,0].map(()=>rnd()*24-12);
   const d=[0,0,0].map(()=>2*rnd()*sense-sense);
   if(Math.hypot(...d)>sense)continue;
   const q=p.map((v,j)=>v+d[j]);tested++;
   if(p.some((v,j)=>Math.abs(Math.floor(v/.6)-Math.floor(q[j]/.6))>1))legacyMisses++;
   if(p.some((v,j)=>Math.abs(Math.floor(v/cell)-Math.floor(q[j]/cell))>1))throw Error('corrected spatial coverage failure');
 }
 assert('seeded geometric stress covers all valid samples',tested>50000&&legacyMisses>0);
 assert('dense truncation instrumented not silently treated as complete',compute.includes('atomicAdd(&stats[22u],1u)')&&html.includes('neighborTruncations = arr[22]'));
 // WGSL reserved identifiers per W3C WGSL CRD 2026-10-21 section 16.2.
 const reserved=new Set('NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become cast catch class co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit export extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut mutable namespace new nil noexcept noinline nointerpolation non_coherent noncoherent noperspective null nullptr of operator package packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof smooth snorm static static_assert static_cast std subroutine super target template this thread_local throw trait try type typedef typeid typename typeof union unless unorm unsafe unsized use using varying virtual volatile wgsl where with writeonly yield'.split(' '));
 for(const [name,code] of [['compute',compute],['render',render]]){
   const tokens=(code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'').match(/\b[A-Za-z_][A-Za-z_0-9]*\b/g)||[]).filter(t=>reserved.has(t));
   assert(name+' has no reserved-word tokens ('+tokens.join(',')+')',tokens.length===0);
 }
 assert('fragment derivative is evaluated before discard',render.indexOf('let gridWidth = max(fwidth')<render.indexOf('if (r > cam.arena.radius + 0.2) { discard; }'));
 assert('degenerate SDF gradient guarded',compute.includes('if(dot(gradient,gradient)<1e-12)'));
 return {checks,tested,legacyMisses,correctedMisses:0};
}
