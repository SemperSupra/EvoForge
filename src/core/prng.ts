export class XorShift32 {
  private state: number;
  constructor(seed: number) {
    const s = (seed >>> 0) || 0x9e3779b9;
    this.state = s >>> 0;
  }
  nextU32(): number {
    let x = this.state >>> 0;
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    this.state = x >>> 0;
    return this.state;
  }
  nextFloat01(): number {
    const u = this.nextU32() >>> 8;
    return u / 0x01000000;
  }
  fork(salt: number): XorShift32 {
    return new XorShift32(mixU32(this.state, salt >>> 0));
  }
}
export function mixU32(a: number, b: number): number {
  let x = (a ^ (b + 0x9e3779b9 + ((a << 6) >>> 0) + (a >>> 2))) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x >>> 0;
}
