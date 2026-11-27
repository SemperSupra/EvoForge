// Abstract simulation units only. Bounded intervention and heightfield reference.
export const TICKS_PER_SECOND=30, COUNTDOWN=90, DESCENT=24, MAX_CRATERS=8;
export const PROFILE=Object.freeze({meteor:Object.freeze({radius:2.25,depth:.9,rim:.24,impulse:1.5,heat:1,nutrients:.65}),lightning:Object.freeze({radius:.65,depth:0,rim:0,impulse:.16,heat:.25,nutrients:0})});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const baseHeight=(x,z)=>.35*((x*x+z*z)*.07-1.2)+.14*Math.sin(x*.85+.137)*Math.cos(z*.85-.137);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function terrainDelta(x,z,c){const r=Math.hypot(x-c.x,z-c.z)/c.radius;if(r>=1)return 0;const bowl=-c.depth*(1-smooth(r/.76));const rim=c.rim*Math.max(0,1-Math.abs(r-.80)/.20)**2;return bowl+rim}
export function heightAt(state,x,z){return baseHeight(x,z)+state.craters.reduce((sum,c)=>sum+terrainDelta(x,z,c),0)}
export function fieldsAt(state,x,z){
 let nutrients=0,heat=0,impulse=0;
 for(const c of state.craters){const r=Math.hypot(x-c.x,z-c.z)/c.radius;nutrients+=c.nutrients*Math.max(0,1-r)**2}
 for(const e of state.effects){const r=Math.hypot(x-e.x,z-e.z)/e.radius;const fade=clamp(1-(state.tick-e.tick)/e.duration,0,1);heat+=e.heat*Math.max(0,1-r)*fade;impulse+=e.impulse*Math.max(0,1-r)*fade}
 return {nutrients:clamp(nutrients,0,1),heat:clamp(heat,0,1),impulse};
}
export function createWorld({mode='play',radius=10}={}){
 if(!['play','observe'].includes(mode)||!finite(radius)||radius<4||radius>12)throw Error('world configuration');
 return {mode,radius,epoch:0,tick:0,paused:false,nextId:1,pending:null,craters:[],effects:[],receipts:[],lastLightning:-Infinity};
}
function requirePlay(w){if(w.mode!=='play')throw Error('Observe mode: interventions disabled')}
function target(w,x,z,r){if(!finite(x)||!finite(z)||Math.hypot(x,z)+r>w.radius)throw Error('Target footprint must fit within world');}
function receipt(w,e){w.receipts.push({...e});if(w.receipts.length>64)w.receipts.shift()}
export function armMeteor(w,x,z,{nutrients=true}={}){
 requirePlay(w);if(w.paused)throw Error('Resume before arming');
 target(w,x,z,PROFILE.meteor.radius);
 if(w.craters.length>=MAX_CRATERS)throw Error('Crater capacity reached');
 if(w.pending?.phase==='descent')throw Error('Meteor already descending');
 if(typeof nutrients!=='boolean')throw Error('Invalid payload');
 const id=w.pending?.id??w.nextId++;
 w.pending={id,x,z,phase:'countdown',armedAt:w.tick,launchAt:w.tick+COUNTDOWN,impactAt:w.tick+COUNTDOWN+DESCENT,nutrients};
 receipt(w,{id,type:'armed',tick:w.tick,x,z});return w.pending.id;
}
export function cancelMeteor(w){requirePlay(w);if(!w.pending||w.pending.phase!=='countdown')return false;receipt(w,{id:w.pending.id,type:'cancelled',tick:w.tick});w.pending=null;return true}
function impact(w,type,x,z,id,nutrients){
 const p=PROFILE[type];
 if(type==='meteor')w.craters.push({id,x,z,radius:p.radius,depth:p.depth,rim:p.rim,nutrients:nutrients?p.nutrients:0,tick:w.tick});
 const e={id,type,x,z,radius:p.radius,heat:p.heat,impulse:p.impulse,tick:w.tick,duration:type==='meteor'?30:9};
 w.effects.push(e);receipt(w,{...e,type:type==='meteor'?'meteor-impact':'lightning-impact',payload:type==='meteor'&&nutrients?'mineral':'none'});
}
export function lightning(w,x,z){
 requirePlay(w);if(w.paused)throw Error('Resume before striking');target(w,x,z,PROFILE.lightning.radius);
 if(w.tick-w.lastLightning<12)throw Error('Lightning cooling down');
 w.lastLightning=w.tick;const id=w.nextId++;impact(w,'lightning',x,z,id,false);return id;
}
export function advance(w,count=1){
 if(!Number.isSafeInteger(count)||count<0||count>300)throw Error('Tick budget');
 if(w.paused)return;
 for(let i=0;i<count;i++){
  w.tick++;
  w.effects=w.effects.filter(e=>w.tick-e.tick<e.duration);
  if(w.pending?.phase==='countdown'&&w.tick>=w.pending.launchAt){w.pending.phase='descent';receipt(w,{id:w.pending.id,type:'launched',tick:w.tick})}
  if(w.pending?.phase==='descent'&&w.tick>=w.pending.impactAt){
   const e=w.pending;w.pending=null;
   impact(w,'meteor',e.x,e.z,e.id,e.nutrients);
  }
 }
}
export function reset(w){requirePlay(w);const next=createWorld({mode:w.mode,radius:w.radius});next.epoch=w.epoch+1;Object.assign(w,next)}
export function snapshot(w){return {mode:w.mode,epoch:w.epoch,tick:w.tick,paused:w.paused,pending:w.pending?{...w.pending}:null,craters:w.craters.map(c=>({...c})),effects:w.effects.map(e=>({...e})),receipts:w.receipts.map(e=>({...e}))}}
