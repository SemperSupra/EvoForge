// Abstract ALife traits; no real-world animal or linguistic claims.
const unit=(x)=>{if(!Number.isFinite(x)||x<0||x>1)throw RangeError('unit trait');return x};
export function emit(genome,energy){
 const e=unit(energy),voice=unit(genome.voice),trail=unit(genome.trail),band=unit(genome.band);
 const cost=.08*voice+.04*trail, scale=cost===0?0:Math.min(1,e/cost);
 return {voice:voice*scale,trail:trail*scale,band,cost:cost*scale,remaining:Math.max(0,e-cost*scale)};
}
export function perceive(signal,receiver,distance){
 if(!Number.isFinite(distance)||distance<0)throw RangeError('distance');
 const tuning=1-Math.abs(unit(signal.band)-unit(receiver.band));
 return {voice:unit(signal.voice)*unit(receiver.hearing)*tuning/(1+distance*distance),trail:unit(signal.trail)*unit(receiver.chemical)/(1+distance)};
}
export function decayTrail(level,retention,ticks=1){
 if(!Number.isSafeInteger(ticks)||ticks<0||ticks>10000)throw RangeError('ticks');
 return unit(level)*unit(retention)**ticks;
}
export function inherit(a,b,random,mutation=.05){
 const m=unit(mutation),out={};
 for(const key of ['voice','trail','band','hearing','chemical']){
  const x=unit(a[key]),y=unit(b[key]);const r=unit(random()),d=unit(random());
  out[key]=Math.min(1,Math.max(0,(r<.5?x:y)+(2*d-1)*m));
 }
 return out;
}
