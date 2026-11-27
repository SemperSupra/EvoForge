import {describe,it,expect} from "vitest";
import {assertRenderRequest} from "../src/core/render-contract.mjs";
import {base64ToU16LE,u16ToBase64LE} from "../src/core/genome";
const spec={id:"mosaic",version:"2.0.0",displayName:"test",genomeLength:16,supports:{palettes:true,palettePhysics:false,longevityVisual:false}},g=new Uint16Array(16),intent={kind:"full" as const,width:3840,height:2160,lod:2,format:"png" as const};
describe("bounded exact render inputs",()=>{
 it("explicit little endian byte vector and offset view",()=>{const a=new Uint16Array([0x9999,0x1234,0xabcd,0xffff]);expect(u16ToBase64LE(a.subarray(1))).toBe("NBLNq///");expect(Array.from(base64ToU16LE("NBLNq///",3))).toEqual([0x1234,0xabcd,0xffff]);});
 it("rejects malformed encodings and length mismatch",()=>{for(const v of ["","AA==","AAA","AA A=","AB==","AAAA==="])expect(()=>base64ToU16LE(v,1)).toThrow();expect(()=>base64ToU16LE("NBI=",2)).toThrow();});
 it("admits exact 4K request and rejects allocation/intent failures",()=>{expect(()=>assertRenderRequest(spec,g,{},intent)).not.toThrow();for(const i of [{...intent,width:7680,height:4320},{...intent,width:0},{...intent,width:1.5},{...intent,lod:3},{...intent,format:undefined},{...intent,kind:"invalid"}])expect(()=>assertRenderRequest(spec,g,{},i as any)).toThrow();});
 it("rejects missing config, wrong genome length, nonfinite and cyclic data",()=>{const cyclic:any={};cyclic.a=cyclic;for(const c of [null,[],{a:NaN},{a:undefined},cyclic,JSON.parse('{"__proto__":1}')])expect(()=>assertRenderRequest(spec,g,c as any,intent)).toThrow();expect(()=>assertRenderRequest(spec,new Uint16Array(64),{},intent)).toThrow();});
});
