// Explicit little-endian serialization, independent of host byte order.
const MAX_GENES=4096;
export function u16ToBase64LE(u16: Uint16Array): string {
  if(!(u16 instanceof Uint16Array)||u16.length<1||u16.length>MAX_GENES)throw Error("Invalid genome length");
  let bin="";
  for(const v of u16)bin+=String.fromCharCode(v&255,v>>>8);
  return btoa(bin);
}
export function base64ToU16LE(b64: string, expectedLen?: number): Uint16Array {
  if(typeof b64!=="string"||b64.length<4||b64.length>Math.ceil(MAX_GENES*2/3)*4||!(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).test(b64))throw Error("Invalid canonical base64");
  if(expectedLen!==undefined&&(!Number.isSafeInteger(expectedLen)||expectedLen<1||expectedLen>MAX_GENES))throw Error("Invalid expected genome length");
  const bin=atob(b64);
  if(btoa(bin)!==b64||bin.length%2!==0||bin.length<2||bin.length>MAX_GENES*2)throw Error("Invalid u16le base64 length or padding");
  const u16=new Uint16Array(bin.length/2);
  if(expectedLen!==undefined&&u16.length!==expectedLen)throw Error("Length mismatch");
  for(let i=0;i<u16.length;i++)u16[i]=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);
  return u16;
}
