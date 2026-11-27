export type GoldenJob={id:string;recipe:Record<string,unknown>;render:{kind:"thumb"|"full";w:number;h:number;lod:number;format?:"png"|"webp";sha256:string}};
export const SUITES:ReadonlyArray<Readonly<{path:string;id:string;version:string;genes:number;fixtures:number;renders:number;kind:string}>>;
export const EXPECTED_RENDERS:number;
export function buildGoldenPlan(read:(path:string)=>Promise<unknown>):Promise<GoldenJob[]>;
