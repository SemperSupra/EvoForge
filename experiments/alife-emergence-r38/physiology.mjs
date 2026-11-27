const unit=x=>{if(!Number.isFinite(x)||x<0||x>1)throw RangeError('unit state');return x};
export function appearance({age,lifeSpan,health,energy}){
 if(!Number.isFinite(age)||!Number.isFinite(lifeSpan)||age<0||lifeSpan<=0)throw RangeError('age');
 const maturity=Math.min(1,age/lifeSpan),h=unit(health),e=unit(energy);
 const stage=maturity<.2?'juvenile':maturity<.75?'adult':'elder';
 const condition=h<.35?'poor':h<.7?'fair':'good';
 return Object.freeze({stage,condition,ageFraction:maturity,healthFraction:h,
  tint:[.2+.6*maturity,.2+.6*h,.3+.3*(1-maturity)],
  motionScale:(.3+.7*h)*(.4+.6*e)*(1-.45*maturity),
  flexibility:(.4+.6*h)*(1-.5*maturity),
  ageMark:stage==='juvenile'?1:stage==='adult'?2:3,healthMark:condition==='poor'?1:condition==='fair'?2:3});
}
