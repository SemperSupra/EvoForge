import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const html=readFileSync(new URL("../public/experiences/alife/index.html",import.meta.url),"utf8");
const block=html.split("// R104_VIEW_LENS_BEGIN")[1].split("// R104_VIEW_LENS_END")[0];
const {arenaViewLens,homeCameraDistance}=new Function(block+"\nreturn {arenaViewLens,homeCameraDistance};")() as {arenaViewLens:(a:number)=>{aspect:number;verticalHalfTan:number;fovy:number};homeCameraDistance:(r:number,a:number,smoke?:boolean)=>number};
describe("standalone Arena camera lens",()=>{
 it("preserves landscape optics and home distance",()=>{
  const a=arenaViewLens(1.6);expect(a.fovy).toBeCloseTo(Math.PI/4,12);expect(homeCameraDistance(14,1.6)).toBeCloseTo(33.6);expect(homeCameraDistance(9.5,1.6,true)).toBe(21);
 });
 it("fits the narrow horizontal axis and shares the inverse ray scale",()=>{
  for(const a of [.32,390/844,820/1180,.999]){
   const l=arenaViewLens(a);expect(l.verticalHalfTan*a).toBeCloseTo(Math.tan(Math.PI/8),12);
   expect(Math.tan(l.fovy/2)).toBeCloseTo(l.verticalHalfTan,12);
   const d=homeCameraDistance(9.5,a,true);expect(d).toBeGreaterThan(21);
   // Conservative horizontal tangent bound for any point on a flat circular surface at default pitch.
   const bound=9.5/Math.sqrt(d*d-(9.5*Math.cos(.72))**2);
   expect(bound/l.verticalHalfTan/a).toBeLessThan(.95);
  }
 });
 it("handles invalid and extreme viewport dimensions without nonfinite projection",()=>{
  for(const a of [0,NaN,Infinity,-1,.01,10]){const l=arenaViewLens(a);expect(Number.isFinite(l.fovy)).toBe(true);expect(l.fovy).toBeGreaterThan(0);expect(l.fovy).toBeLessThan(Math.PI);}
 });
});
