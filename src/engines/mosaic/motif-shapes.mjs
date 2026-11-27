// Original, stylized motif geometries. No museum/source imagery is embedded.
export const CATALOG = [
 ['dragon-west','European-inspired dragon','Mythology'],['dragon-china','Chinese-inspired dragon and pearl','Mythology'],['dragon-japan','Japanese-inspired water dragon','Mythology'],['phoenix','Phoenix','Mythology'],['griffin','Griffin','Mythology'],['unicorn','Unicorn','Mythology'],['pegasus','Pegasus','Mythology'],['serpent','Sea serpent','Mythology'],
 ['horse','Horse','Animals'],['cow','Cow','Animals'],['sheep','Sheep','Animals'],['goat','Goat','Animals'],['pig','Pig','Animals'],['rooster','Rooster','Animals'],['duck','Duck','Animals'],['rabbit','Rabbit','Animals'],
 ['trex','Tyrannosaurus','Prehistoric'],['triceratops','Triceratops','Prehistoric'],['stegosaurus','Stegosaurus','Prehistoric'],['sauropod','Sauropod','Prehistoric'],
 ['oak','Oak','Trees and crops'],['olive','Olive tree','Trees and crops'],['cherry','Cherry blossom','Trees and crops'],['pine','Pine','Trees and crops'],['wheat','Wheat','Trees and crops'],['rice','Rice','Trees and crops'],['corn','Maize','Trees and crops'],['lotus','Lotus','Trees and crops'],['bamboo','Bamboo','Trees and crops'],
 ['christmas','Christmas tree','Holidays'],['easter','Decorated Easter eggs','Holidays'],['pumpkin','Halloween pumpkin','Holidays'],['harvest','Harvest','Holidays'],['lantern','Festival lantern','Holidays'],['heart','Heart and roses','Holidays'],
 ['cross','Decorative cross','Sacred symbols'],['dove','Dove and olive','Sacred symbols'],['fish','Ichthys-inspired fish','Sacred symbols'],['menorah','Seven-branched lamp','Sacred symbols'],['wheel','Eight-spoked wheel','Sacred symbols'],['crescent','Crescent and star','Sacred symbols'],['heraldry','Custom heraldic composition','Heraldry'],['rosette','Harmonic rosette','Parametric art'],['branching','Recursive branching','Parametric art']
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sin=q=>{q=((q%4096)+4096)%4096;const t=q<2048?q:q-2048;return (q<2048?1:-1)*Math.floor(4*t*(2048-t)*1024/4194304)};
const cos=q=>sin(q+1024);
export const SHIELDS=['heater','round','lozenge'];
export const FIELDS=['plain','per-pale','per-fess','quarterly','chevron'];
export const CHARGES=['dragon-west','horse','phoenix','cross','lotus','oak','fish','rosette'];
export const CRESTS=['none','crown','helmet'];
export const SUPPORTERS=['none','horse','dragon'];
const TINCTURES=['azure','gules','vert','sable','or','argent'];
const FONT={A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01111/10000/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',I:'11111/00100/00100/00100/00100/00100/11111',J:'00111/00010/00010/00010/00010/10010/01100',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',W:'10001/10001/10001/10101/10101/11011/10001',X:'10001/10001/01010/00100/01010/10001/10001',Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111'};
export const HERALDRY_OPTIONS={shield:SHIELDS,field:FIELDS,charge:CHARGES,crest:CRESTS,supporters:SUPPORTERS,tincture:TINCTURES};
export function validateHeraldry(c={}){
 const p={shield:c.shield??'heater',field:c.field??'quarterly',charge:c.charge??'dragon-west',crest:c.crest??'crown',supporters:c.supporters??'none',tincture:c.tincture??'azure'};
 for(const [k,values] of Object.entries(HERALDRY_OPTIONS))if(!values.includes(p[k]))throw Error('Invalid heraldry '+k);
 const motto=c.motto??'';if(typeof motto!=='string'||! /^[A-Z ]{0,14}$/.test(motto))throw Error('Motto must be up to 14 uppercase Latin letters/spaces');return {...p,motto};
}
export function shapes(id,config={},variant=0){
 const out=[]; let transform=[0,0,100,1];
 const xy=(x,y)=>[transform[0]+Math.floor(x*transform[2]*transform[3]/100),transform[1]+Math.floor(y*transform[2]/100)];
 const ell=(r,x,y,a,b)=>{const [u,v]=xy(x,y);out.push(['e',r,u,v,Math.max(1,Math.floor(a*transform[2]/100)),Math.max(1,Math.floor(b*transform[2]/100))]);};
 const poly=(r,...pts)=>out.push(['p',r,pts.map(([x,y])=>xy(x,y))]);
 const line=(r,w,...pts)=>out.push(['l',r,Math.max(1,Math.floor(w*transform[2]/100)),pts.map(([x,y])=>xy(x,y))]);
 const withT=(x,y,s,flip,fn)=>{const prev=transform;const [u,v]=xy(x,y);transform=[u,v,Math.floor(s*prev[2]/100),flip*prev[3]];fn();transform=prev;};
 const star=(r,x,y,a,n=5)=>{const pts=[];for(let k=0;k<2*n;k++){const q=Math.floor(k*4096/(2*n))-1024,rad=k%2?Math.floor(a*45/100):a;pts.push([x+Math.floor(cos(q)*rad/1024),y+Math.floor(sin(q)*rad/1024)]);}poly(r,...pts);};
 const leaf=(x,y,dir,r=3)=>{poly(r,[x,y],[x+dir*45,y-34],[x+dir*62,y-49],[x+dir*52,y-11],[x+dir*23,y+8]);line(6,3,[x,y],[x+dir*45,y-30]);};
 const wing=()=>{poly(1,[-15,-7],[-90,-153],[-24,-139],[68,-153],[132,-116],[74,-95],[100,-42],[29,-64],[49,0]);poly(4,[-9,-9],[-77,-139],[-19,-124],[64,-137],[116,-115],[57,-93],[81,-54],[15,-76],[34,-10]);line(2,4,[-9,-9],[-19,-124]);line(2,4,[-9,-9],[64,-137]);line(2,4,[-9,-9],[81,-54]);};
 function hoof(kind){const cow=kind==='cow',sheep=kind==='sheep',goat=kind==='goat',pig=kind==='pig';const body=pig?4:cow?5:sheep?5:2;
  line(1,13,[-100,3],[-106,68],[-126,112]);line(1,13,[51,10],[75,73],[68,112]);line(body,18,[-69,12],[-45,53],[-65,84],[-78,116]);line(body,18,[43,12],[47,59],[55,116]);line(1,8,[-88,116],[-65,116]);line(1,8,[48,116],[71,116]);
  if(pig){line(4,8,[-111,-20],[-139,-36],[-149,-20],[-138,-11]);}else{line(1,9,[-124,-29],[-145,-1],[-147,32],[-163,64]);line(2,4,[-144,7],[-142,33],[-157,61]);}
  poly(1,[-135,-35],[-97,-66],[-39,-60],[18,-46],[67,-55],[86,-8],[69,35],[10,48],[-70,38],[-124,13]);poly(body,[-129,-33],[-96,-59],[-39,-54],[18,-40],[63,-49],[80,-8],[64,29],[10,42],[-70,32],[-119,9]);ell(6,-29,-25,64,17);
  if(sheep){for(let i=0;i<7;i++){ell(1,-111+i*26,-40+(i%2)*10,24,27);ell(5,-111+i*26,-40+(i%2)*10,21,24);}ell(5,-26,16,95,32);for(let i=0;i<6;i++)line(2,3,[-102+i*28,13],[-95+i*28,20],[-85+i*28,16]);}
  if(cow){ell(1,-82,-14,31,41);ell(1,23,-29,30,29);ell(1,-7,25,24,14);}
  if(!cow&&!sheep&&!pig){poly(1,[45,1],[31,-43],[59,-95],[77,-121],[102,-104],[91,-56],[75,-13]);poly(body,[50,-4],[40,-42],[65,-93],[79,-108],[96,-97],[84,-55],[69,-14]);line(1,11,[71,-112],[48,-76],[38,-40]);poly(1,[42,-43],[24,-28],[38,-70],[61,-110]);}
  const hy=pig?-29:sheep?-56:cow?-57:-105;
  ell(1,99,hy,43,28);ell(body,99,hy,38,23);ell(pig?4:6,128,hy+8,22,14);ell(1,103,hy-8,5,5);
  if(pig){poly(4,[78,hy-14],[72,hy-42],[103,hy-18]);ell(1,132,hy+7,4,3);}
  else if(cow||goat){line(2,7,[87,hy-16],[70,hy-38],[65,hy-50]);line(2,7,[111,hy-17],[130,hy-37],[133,hy-49]);if(goat){line(1,8,[82,hy-16],[53,hy-60],[71,hy-87]);line(2,4,[82,hy-16],[53,hy-60],[71,hy-87]);line(1,8,[107,hy-17],[124,hy-64],[147,hy-79]);line(2,4,[107,hy-17],[124,hy-64],[147,hy-79]);poly(1,[106,hy+17],[121,hy+50],[101,hy+36]);}}
  else{poly(body,[82,hy-18],[77,hy-45],[99,hy-21]);if(kind==='unicorn'){poly(1,[99,hy-16],[146,hy-83],[119,hy-10]);poly(5,[105,hy-18],[142,hy-75],[115,hy-14]);}}
 }
 function bird(kind){const phoenix=kind==='phoenix',duck=kind==='duck',dove=kind==='dove';
  if(phoenix||dove){
   for(let i=0;i<7;i++){const x=-74+i*24,end=phoenix?139-Math.abs(i-3)*7:105-Math.abs(i-3)*6;line(1,13,[0,22],[x,80],[x-12,end]);line(phoenix?4:5,8,[0,22],[x,80],[x-12,end]);if(phoenix)ell(2,x-12,end-6,5,9);}
   for(const d of [-1,1]){poly(1,[d*9,6],[d*46,-60],[d*105,-118],[d*163,-120],[d*135,-66],[d*157,-32],[d*112,-32],[d*111,0],[d*68,10]);poly(phoenix?4:5,[d*17,3],[d*51,-55],[d*105,-109],[d*153,-113],[d*125,-63],[d*144,-36],[d*106,-39],[d*105,-6],[d*67,4]);for(let j=0;j<5;j++){const x=49+j*19,y=-48-j*13;line(phoenix?2:6,4,[d*31,-3],[d*x,y],[d*(x+12),y-16]);}}
  } else if(kind==='rooster'){for(let i=0;i<5;i++){line(1,17,[-44,4],[-100-i*8,-55-i*6],[-130-i*3,-87+i*10],[-138-i*2,-27]);line(i%2?3:4,10,[-44,4],[-100-i*8,-55-i*6],[-130-i*3,-87+i*10],[-138-i*2,-27]);}}
  else if(duck)poly(3,[-62,-9],[-135,-26],[-103,25],[-57,35]);
  ell(1,-13,3,67,53);ell(phoenix?4:duck?3:dove?5:2,-13,0,62,48);ell(phoenix?2:dove?6:3,-24,8,36,23);ell(1,34,-57,31,36);ell(phoenix?4:dove?5:3,34,-57,26,31);ell(1,43,-64,5,5);poly(2,[59,-66],[100,-51],[61,-42]);
  if(kind==='rooster'){ell(4,25,-91,12,17);ell(4,42,-95,12,15);ell(4,56,-88,11,14);ell(4,57,-31,11,16);}
  if(duck){line(3,7,[-140,57],[-90,51],[-39,58],[20,51],[94,56],[143,50]);}else if(!dove&&!phoenix){line(2,7,[-25,42],[-31,97],[-55,107]);line(2,7,[6,42],[17,97],[43,107]);}
 }
 function dragon(kind){if(kind==='dragon-west'){poly(1,[-56,-25],[-119,-126],[-56,-157],[28,-125],[86,-71],[41,-81],[55,-11],[-8,-47]);poly(4,[-49,-29],[-106,-119],[-54,-145],[23,-113],[72,-74],[31,-88],[43,-24],[-9,-58]);line(2,4,[-49,-29],[-54,-145]);line(2,4,[-49,-29],[23,-113]);
  line(1,24,[-47,18],[-110,38],[-139,95],[-92,109],[-70,84]);line(3,16,[-47,18],[-110,38],[-139,95],[-92,109],[-70,84]);ell(1,-9,19,78,46);ell(3,-9,19,72,40);line(1,28,[37,12],[59,-46],[89,-67]);line(3,20,[37,12],[59,-46],[89,-67]);ell(1,111,-72,36,25);ell(3,111,-72,30,19);poly(2,[91,-90],[80,-120],[109,-97]);poly(2,[117,-89],[141,-111],[136,-79]);ell(5,122,-79,5,5);line(1,12,[-36,48],[-22,81],[-53,100]);line(1,12,[38,46],[63,80],[100,79]);poly(4,[141,-68],[166,-85],[158,-68],[186,-56],[143,-57]);return;}
  const sea=kind==='serpent',japan=kind==='dragon-japan';const pts=[];for(let i=0;i<=40;i++){const q=Math.floor(i*4096/40);pts.push([-145+Math.floor(i*255/40),Math.floor(sin(q*(japan?2:1)+300)*(japan?53:72)/1024)]);}line(1,42,...pts);line(japan?3:sea?6:4,34,...pts);line(2,5,...pts.map(([x,y])=>[x,y+9]));for(let i=3;i<pts.length-4;i+=4){const [x,y]=pts[i];ell(6,x,y-6,7,6);}
  const [ex,ey]=pts.at(-1);ell(1,ex+14,ey-4,37,27);ell(japan?3:4,ex+14,ey-4,31,22);poly(2,[ex-2,ey-20],[ex-15,ey-52],[ex+17,ey-28],[ex+30,ey-55],[ex+37,ey-20]);ell(5,ex+26,ey-10,6,6);ell(1,ex+27,ey-10,3,3);line(2,4,[ex+37,ey+3],[ex+60,ey+27],[ex+40,ey+47]);if(!sea){poly(1,[ex+16,ey+1],[ex+64,ey-6],[ex+60,ey+19],[ex+20,ey+18]);poly(japan?3:4,[ex+18,ey+4],[ex+60,ey-2],[ex+57,ey+15],[ex+23,ey+14]);line(2,3,[ex+46,ey+8],[ex+75,ey+28],[ex+85,ey+12]);line(5,4,[ex+11,ey+1],[ex-11,ey+35],[ex+8,ey+25]);}
  if(!sea){for(const i of [11,29]){const [x,y]=pts[i];line(1,12,[x,y],[x-14,y+30],[x+12,y+48]);line(2,5,[x+12,y+48],[x+29,y+42]);}if(japan){line(5,6,[-145,110],[-108,82],[-71,108],[-31,81],[8,110],[48,82],[88,110],[129,81],[163,108]);}else{ell(2,140,-114,20,20);ell(5,135,-121,7,7);line(5,5,[-122,-112],[-91,-119],[-62,-105]);}} }
 function tree(kind){const pine=kind==='pine',cherry=kind==='cherry',olive=kind==='olive';line(1,24,[0,130],[5,35],[-5,-57]);line(2,15,[0,130],[5,35],[-5,-57]);if(pine){for(let i=0;i<4;i++){const y=-145+i*48,a=40+i*22;poly(1,[0,y],[-a,y+73],[a,y+73]);poly(3,[0,y+7],[-a+8,y+67],[a-8,y+67]);}return;}
  for(let i=0;i<7;i++){const q=-2048+Math.floor(i*2048/6),x=Math.floor(cos(q)*111/1024),y=-26+Math.floor(sin(q)*102/1024);line(2,11,[0,28],[Math.floor(x/2),y+32],[x,y]);ell(cherry?4:3,x,y,olive?43:54,olive?35:46);ell(cherry?5:6,x-9,y-12,25,17);if(cherry)for(let j=0;j<3;j++)star(5,x-20+j*18,y-3,9,5);if(olive)ell(1,x+12,y+15,6,10);}
 }
 function crop(kind){for(let i=-2;i<=2;i++){const x=i*48,top=-130+Math.abs(i)*20;line(3,8,[x,134],[x+8,top+38],[x,top]);if(kind==='bamboo'){for(let j=0;j<5;j++){line(2,3,[x-7,top+j*48],[x+8,top+j*48]);leaf(x,top+j*45,j%2?1:-1,3);}}else if(kind==='corn'){ell(2,x,top+50,22,58);for(let k=0;k<6;k++)line(5,3,[x-17,top+14+k*14],[x+17,top+14+k*14]);leaf(x,top+90,-1);leaf(x,top+115,1);}else{for(let j=0;j<5;j++){const y=top+j*22;if(kind==='rice'){line(6,3,[x,y],[x+25,y+20]);ell(2,x+27,y+23,9,13);}else{poly(2,[x,y+20],[x-24,y+8],[x-21,y-10],[x,y+4]);poly(5,[x,y+20],[x+24,y+8],[x+21,y-10],[x,y+4]);}}leaf(x,55,i%2?1:-1);}} }
 function dino(kind){const sau=kind==='sauropod',rex=kind==='trex',tri=kind==='triceratops';poly(1,[-49,24],[-178,-20],[-117,38],[-47,53]);poly(3,[-48,29],[-154,-10],[-112,34],[-48,47]);ell(1,-21,20,94,54);ell(3,-21,20,87,47);ell(6,-31,1,58,23);for(const x of rex?[-35,21]:[-70,-37,32,63]){line(1,21,[x,40],[x-9,83],[x+12,113]);line(3,14,[x,40],[x-9,83],[x+12,113]);line(1,6,[x+9,113],[x+34,113]);}
  if(sau){line(1,36,[51,0],[83,-67],[90,-133]);line(3,28,[51,0],[83,-67],[90,-133]);ell(3,111,-136,35,21);ell(1,122,-140,5,5);}
  else if(rex){line(3,34,[53,3],[77,-62]);poly(1,[60,-86],[156,-91],[174,-55],[150,-19],[75,-29]);poly(3,[65,-81],[150,-85],[166,-56],[145,-32],[80,-34]);line(5,6,[114,-53],[163,-53]);ell(1,125,-72,6,6);line(3,7,[61,10],[89,32],[103,20]);}
  else if(tri){ell(1,76,-22,48,56);ell(4,76,-22,41,48);ell(3,113,2,39,29);poly(5,[99,-22],[120,-70],[122,-22]);poly(5,[129,-10],[159,-45],[148,-4]);poly(5,[143,5],[180,-10],[156,17]);ell(1,123,-4,5,5);}
  else{for(let i=0;i<6;i++){const x=-93+i*30;poly(1,[x,-17],[x-11,-64-i%2*17],[x+13,-89+i%3*11],[x+28,-22]);poly(4,[x+3,-25],[x-3,-61-i%2*17],[x+13,-80+i%3*11],[x+20,-25]);}ell(3,93,24,34,19);ell(1,108,19,5,5);}}
 function design(k){switch(k){
 case 'dragon-west':case 'dragon-china':case 'dragon-japan':case 'serpent':dragon(k);break;
 case 'horse':case 'cow':case 'sheep':case 'goat':case 'pig':case 'unicorn':hoof(k);break;
 case 'pegasus':withT(-26,-28,85,1,wing);hoof('horse');break;
 case 'griffin':withT(-20,-26,80,1,wing);hoof('horse');ell(2,101,-105,32,29);poly(5,[119,-115],[156,-98],[126,-91]);ell(1,110,-112,5,5);break;
 case 'phoenix':case 'rooster':case 'duck':case 'dove':bird(k);if(k==='dove'){line(3,4,[94,-47],[143,-30]);leaf(122,-40,1);}break;
 case 'rabbit':ell(1,-23,38,83,64);ell(2,-23,36,78,59);ell(5,-104,27,25,25);ell(1,70,-28,39,42);ell(2,70,-28,35,38);ell(2,57,-99,17,61);ell(2,88,-95,17,58);ell(4,57,-104,7,42);ell(4,88,-100,7,40);ell(1,84,-36,6,6);ell(5,26,89,54,15);break;
 case 'trex':case 'triceratops':case 'stegosaurus':case 'sauropod':dino(k);break;
 case 'oak':case 'olive':case 'cherry':case 'pine':tree(k);break;
 case 'wheat':case 'rice':case 'corn':case 'bamboo':crop(k);break;
 case 'lotus':for(let i=-3;i<=3;i++){const x=i*33;poly(i%2?4:5,[0,68],[x-26,5],[x,-94+Math.abs(i)*21],[x+26,5]);}ell(2,0,30,27,15);line(3,8,[0,69],[0,131]);leaf(0,112,1);leaf(0,127,-1);break;
 case 'christmas':tree('pine');star(2,0,-150,22);for(let i=0;i<12;i++)ell(i%2?4:2,((i*73)%117)-58,-75+i*11,9,9);break;
 case 'easter':for(let i=-1;i<=1;i++){const x=i*88,y=i===0?-26:31;ell(1,x,y,47,70);ell(i===0?4:3,x,y,43,66);for(let j=-2;j<=2;j++)line(j%2?5:2,6,[x-31,y+j*16],[x,y+j*16+6],[x+31,y+j*16]);}break;
 case 'pumpkin':for(let i=-2;i<=2;i++)ell(i%2?2:4,i*34,24,51,75-Math.abs(i)*7);line(3,18,[0,-45],[9,-80],[30,-94]);poly(1,[-68,5],[-44,-25],[-19,5]);poly(1,[20,5],[47,-25],[69,5]);poly(1,[-57,37],[-27,52],[0,39],[28,52],[57,37],[41,69],[-40,69]);break;
 case 'harvest':withT(-72,-6,72,1,()=>crop('wheat'));withT(81,22,67,1,()=>design('pumpkin'));break;
 case 'lantern':ell(1,0,0,107,111);ell(4,0,0,101,104);for(let i=-2;i<=2;i++){const x=i*34;line(2,5,[x/2,-96],[x,-58],[x,58],[x/2,96]);}poly(2,[-62,-109],[62,-109],[43,-134],[-43,-134]);poly(2,[-62,99],[62,99],[45,120],[-45,120]);line(2,8,[0,120],[0,159]);break;
 case 'heart':ell(4,-54,-33,63,62);ell(4,54,-33,63,62);poly(4,[-115,-11],[115,-11],[0,134]);for(let i=0;i<5;i++){const x=-88+i*44,y=5+Math.abs(i-2)*7;ell(2,x,y,14,14);ell(4,x,y,10,10);ell(5,x-3,y-3,5,5);}break;
 case 'cross':poly(1,[-39,-146],[39,-146],[39,-49],[119,-49],[119,27],[39,27],[39,146],[-39,146],[-39,27],[-119,27],[-119,-49],[-39,-49]);poly(2,[-28,-135],[28,-135],[28,-38],[108,-38],[108,16],[28,16],[28,135],[-28,135],[-28,16],[-108,16],[-108,-38],[-28,-38]);star(5,0,-11,24,8);break;
 case 'fish':{const a=[];for(let i=0;i<=24;i++)a.push([-130+i*11,Math.floor(sin(i*2048/24)*65/1024)]);line(2,11,...a);line(2,11,...a.map(([x,y])=>[x,-y]));line(2,11,[123,0],[165,46]);line(2,11,[123,0],[165,-46]);break;}
 case 'menorah':line(2,12,[0,-118],[0,107]);for(let i=1;i<=3;i++)for(const d of [-1,1]){const x=i*45*d;line(2,9,[0,62-i*13],[x,23-i*10],[x,-114]);}line(2,13,[-65,117],[65,117]);for(let i=-3;i<=3;i++)ell(4,i*45,-139,8,15);break;
 case 'wheel':ell(2,0,0,143,143);ell(7,0,0,128,128);for(let i=0;i<8;i++){const q=i*512;line(2,13,[0,0],[Math.floor(cos(q)*133/1024),Math.floor(sin(q)*133/1024)]);}ell(1,0,0,29,29);ell(2,0,0,18,18);break;
 case 'crescent':ell(2,-16,0,112,112);ell(7,34,-28,102,102);star(2,87,-29,44);break;
 case 'rosette':{const n=5+variant%5;for(let i=0;i<n;i++){const pts=[];for(let k=0;k<=128;k++){const q=k*32,r=72+Math.floor(cos(q*n+Math.floor(i*4096/n))*61/1024);pts.push([Math.floor(cos(q)*r/1024),Math.floor(sin(q)*r/1024)]);}line(i%2?2:3,3,...pts);}ell(2,0,0,12,12);break;}
 case 'branching':{const recur=(x,y,q,len,depth)=>{const X=x+Math.floor(cos(q)*len/1024),Y=y+Math.floor(sin(q)*len/1024);line(depth%2?3:2,Math.max(2,depth*3),[x,y],[X,Y]);if(depth>0){const t=280+variant%5*45;recur(X,Y,q-t,Math.floor(len*68/100),depth-1);recur(X,Y,q+t,Math.floor(len*68/100),depth-1);}else ell(4,X,Y,5,5);};recur(0,145,-1024,117,5);break;}
 case 'heraldry':{const p=validateHeraldry(config);const shield=p.shield==='round'?[[-110,-104],[110,-104],[110,58],[73,116],[0,143],[-73,116],[-110,58]]:p.shield==='lozenge'?[[0,-124],[117,0],[0,142],[-117,0]]:[[-108,-108],[108,-108],[100,30],[68,92],[0,140],[-68,92],[-100,30]];const base=[3,4,6,1,2,5][TINCTURES.indexOf(p.tincture)],alt=base===2||base===5?3:2;
  if(p.supporters!=='none')for(const d of [-1,1])withT(d*141,38,44,-d,()=>design(p.supporters==='dragon'?'dragon-west':'horse'));
  poly(1,...shield);poly(base,...shield.map(([x,y])=>[Math.floor(x*93/100),Math.floor(y*93/100)]));
  // field divisions and charges are clipped to the shield by the renderer, not overlaid on its edge.
  out.push(['field',alt,p.field,shield.map(([x,y])=>xy(Math.floor(x*93/100),Math.floor(y*93/100)))]);
  const clipStart=out.length;withT(0,8,49,1,()=>design(p.charge));for(let i=clipStart;i<out.length;i++)out[i].clip=shield.map(([x,y])=>xy(Math.floor(x*91/100),Math.floor(y*91/100)));
  poly(1,[-112,149],[-130,162],[-109,179],[109,179],[130,162],[112,149]);poly(2,[-108,153],[-120,162],[-106,175],[106,175],[120,162],[108,153]);const step=2,left=-Math.floor(p.motto.length*6*step/2);for(let i=0;i<p.motto.length;i++){const f=FONT[p.motto[i]]?.split('/');if(!f)continue;for(let j=0;j<7;j++)for(let k=0;k<5;k++)if(f[j][k]==='1'){const x=left+i*6*step+k*step,y=157+j*step;poly(1,[x,y],[x+step,y],[x+step,y+step],[x,y+step]);}}if(p.crest==='crown'){poly(1,[-67,-118],[-81,-184],[-38,-154],[0,-197],[38,-154],[81,-184],[67,-118]);poly(2,[-60,-124],[-72,-174],[-38,-146],[0,-185],[38,-146],[72,-174],[60,-124]);ell(4,0,-144,9,9);}else if(p.crest==='helmet'){ell(1,0,-154,44,48);ell(5,0,-157,39,43);line(1,8,[-31,-158],[30,-158]);line(1,6,[0,-157],[0,-129]);}break;}
 default:throw Error('Unknown motif '+k);
 }}
 design(id);return out;
}
