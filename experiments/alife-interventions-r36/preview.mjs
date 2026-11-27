import {createWorld,armMeteor,cancelMeteor,advance,lightning,reset,heightAt,fieldsAt,PROFILE,COUNTDOWN,DESCENT,TICKS_PER_SECOND,snapshot} from './interventions.mjs';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d'),manual=new URLSearchParams(location.search).has('manual'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const w=createWorld();let selection='meteor',message='',triangles=[],last=0;
function project(x,y,z){const a=.67,rx=x*Math.cos(a)-z*Math.sin(a),rz=x*Math.sin(a)+z*Math.cos(a);return [500+rx*35,320+rz*14-y*34,rz]}
const ground=(x,z)=>project(x,heightAt(w,x,z),z);
function path(pts,fill,stroke,width=1){if(!pts.length)return;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))ctx.lineTo(p[0],p[1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function ring(x,z,r,color,width=2){const pts=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return ground(x+Math.cos(a)*r,z+Math.sin(a)*r)});path(pts,null,color,width)}
function line(pts,color,width){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))ctx.lineTo(p[0],p[1]);ctx.lineCap='round';ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function circle(p,r,fill){ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
function label(text,p,color){ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,p[0],p[1])}
function paint(){
 const bg=ctx.createLinearGradient(0,0,0,620);bg.addColorStop(0,'#172932');bg.addColorStop(1,'#101c22');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,620);
 triangles=[];const step=.5;
 for(let x=-10;x<10;x+=step)for(let z=-10;z<10;z+=step){
  const points=[[x,z],[x+step,z],[x+step,z+step],[x,z+step]];
  if(points.some(([a,b])=>Math.hypot(a,b)>w.radius))continue;
  const pts=points.map(([a,b])=>ground(a,b)),cx=x+step/2,cz=z+step/2,f=fieldsAt(w,cx,cz);
  const slope=(heightAt(w,cx+.25,cz)-heightAt(w,cx-.25,cz))*14;
  const crater=w.craters.some(c=>Math.hypot(cx-c.x,cz-c.z)<c.radius);
  const tone=crater?[115,93,72]:[61,111,82];const mineral=$('overlay').checked?f.nutrients:0;
  const color='rgb('+tone.map((v,i)=>Math.round(Math.max(0,Math.min(255,v+slope+(i===1?mineral*100:0)+f.heat*(i===0?100:35))))).join(',')+')';
  triangles.push({pts:[pts[0],pts[1],pts[2]],world:[points[0],points[1],points[2]],depth:(pts[0][2]+pts[1][2]+pts[2][2])/3,color});
  triangles.push({pts:[pts[0],pts[2],pts[3]],world:[points[0],points[2],points[3]],depth:(pts[0][2]+pts[2][2]+pts[3][2])/3,color});
 }
 triangles.sort((a,b)=>a.depth-b.depth);for(const t of triangles)path(t.pts,t.color,'rgba(10,26,24,.15)',.55);
 for(const c of w.craters)ring(c.x,c.z,c.radius*.80,'rgba(225,175,117,.5)',1);
 if(w.pending){const e=w.pending,p=ground(e.x,e.z);ring(e.x,e.z,PROFILE.meteor.radius,'#ffd083',2);line([[p[0]-10,p[1]],[p[0]+10,p[1]]],'#ffe5ac',2);line([[p[0],p[1]-10],[p[0],p[1]+10]],'#ffe5ac',2);
 if(e.phase==='countdown')label('IMPACT TARGET · '+((e.launchAt-w.tick)/TICKS_PER_SECOND).toFixed(1)+' s',[p[0],p[1]-20],'#ffe5ac');
 else {const f=Math.min(1,(w.tick-e.launchAt)/DESCENT),h=heightAt(w,e.x,e.z),m=project(e.x-(1-f)*1.1,h+(1-f)*8,e.z-(1-f)*.6);if(!reduced)line([[m[0]-18,m[1]-55],m],'#ef9b55',13);circle(m,10,'#e9a25c');circle(m,5,'#fff1ac');label('METEOR DESCENDING',[p[0],p[1]-18],'#ffe5ac');}}
 for(const e of w.effects){const p=ground(e.x,e.z),t=(w.tick-e.tick)/e.duration;
 if(e.type==='meteor'){ring(e.x,e.z,e.radius*Math.max(.2,t),'#f8bf70',4);circle(p,reduced?8:6+12*(1-t),'#ffcd79');if(!reduced){for(let i=0;i<12;i++){const a=i*Math.PI/6;circle([p[0]+Math.cos(a)*t*52,p[1]+Math.sin(a)*t*22-t*28],2,'#f5bb79')}}label('IMPACT',[p[0],p[1]-18],'#ffe1a6')}
 else {const h=heightAt(w,e.x,e.z),pts=[project(e.x-.12,h+6,e.z),project(e.x+.25,h+4.6,e.z),project(e.x-.18,h+3.3,e.z),project(e.x+.16,h+1.8,e.z),p];line(pts,'#a5dfff',reduced?2:5);line(pts,'#f0fbff',2);ring(e.x,e.z,e.radius,'#9bdcff',2);label('LIGHTNING',[p[0]+35,p[1]-14],'#c8edff')}}
 ctx.textAlign='left';ctx.fillStyle='#c5ded5';ctx.font='14px system-ui';ctx.fillText('2.5D reference · persistent terrain and field state',18,24);
 const pending=w.pending;const phase=pending?pending.phase+' · '+(pending.phase==='countdown'?((pending.launchAt-w.tick)/TICKS_PER_SECOND).toFixed(1)+' s to launch':'committed'):'no pending meteor';
 $('status').textContent='Tick '+w.tick+' | '+phase+' | Craters '+w.craters.length+' | '+(w.paused?'paused':'running')+(message?' · '+message:'');
 $('receipt').textContent=JSON.stringify(w.receipts.slice(-4),null,2);
 $('cancel').disabled=pending?.phase!=='countdown';$('pause').textContent=w.paused?'Resume':'Pause';
}
function select(type){selection=type;for(const t of ['meteor','lightning'])$(t).setAttribute('aria-pressed',String(t===type));paint()}
function strike(x,z){try{if(selection==='meteor'){armMeteor(w,x,z,{nutrients:$('mineral').checked});message='Target placed; cancel or reposition before launch.'}else{lightning(w,x,z);message='Local lightning strike.'}}catch(e){message=e.message}paint()}
function bary(p,a,b,c){const v0=[b[0]-a[0],b[1]-a[1]],v1=[c[0]-a[0],c[1]-a[1]],v2=[p[0]-a[0],p[1]-a[1]],det=v0[0]*v1[1]-v0[1]*v1[0];if(Math.abs(det)<1e-9)return null;const v=(v2[0]*v1[1]-v2[1]*v1[0])/det,t=(v0[0]*v2[1]-v0[1]*v2[0])/det,u=1-v-t;return Math.min(u,v,t)>=-1e-6?[u,v,t]:null}
canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),p=[(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];for(let i=triangles.length-1;i>=0;i--){const t=triangles[i],b=bary(p,...t.pts);if(b){const x=b.reduce((s,n,j)=>s+n*t.world[j][0],0),z=b.reduce((s,n,j)=>s+n*t.world[j][1],0);$('x').value=x.toFixed(2);$('z').value=z.toFixed(2);strike(x,z);return}}message='Choose a point on the terrain.';paint()};
$('meteor').onclick=()=>select('meteor');$('lightning').onclick=()=>select('lightning');$('target').onclick=()=>strike(Number($('x').value),Number($('z').value));$('cancel').onclick=()=>{cancelMeteor(w);message='Meteor cancelled.';paint()};$('pause').onclick=()=>{w.paused=!w.paused;paint()};$('step').onclick=()=>{advance(w);paint()};$('step30').onclick=()=>{advance(w,30);paint()};$('reset').onclick=()=>{reset(w);message='World reset.';paint()};$('overlay').onchange=paint;
window.interventionReference=Object.freeze({snapshot:()=>snapshot(w),sample:(x,z)=>({height:heightAt(w,x,z),...fieldsAt(w,x,z)})});
paint();if(!manual){function frame(now){if(now-last>=1000/TICKS_PER_SECOND){advance(w);last=now;paint()}requestAnimationFrame(frame)}requestAnimationFrame(frame)}
