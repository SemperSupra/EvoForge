// Fictional abstract stress field; not a biological pathogen model.
const unit=x=>{if(!Number.isFinite(x)||x<0||x>1)throw RangeError('unit value');return x};
export function createField(size){
 if(!Number.isSafeInteger(size)||size<3||size>128)throw RangeError('grid size');
 return new Float64Array(size*size);
}
export function seedField(field,size,x,y,amount){
 if(field.length!==size*size||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=size||y>=size)throw RangeError('cell');
 const i=y*size+x;field[i]=Math.min(1,unit(field[i])+unit(amount));
}
export function stepField(field,size,{diffusion=.2,retention=.9}={}){
 if(field.length!==size*size||size<3||size>128||!Number.isInteger(size))throw RangeError('grid');
 const d=unit(diffusion),r=unit(retention),next=createField(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,v=unit(field[i]);let neighbors=0;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;neighbors+=nx<0||ny<0||nx>=size||ny>=size?v:unit(field[ny*size+nx]);
  }
  next[i]=r*((1-d)*v+d*neighbors/4);
 }
 return next;
}
export function response({health,energy},stress,nutrient){
 const h=unit(health),e=unit(energy),s=unit(stress),n=unit(nutrient);
 return {health:Math.max(0,Math.min(1,h-.02*s+.01*n)),energy:Math.max(0,Math.min(1,e-.01*s+.03*n))};
}
