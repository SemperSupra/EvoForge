import { installGoldenHook } from './golden-hook';
export function maybeInstallGoldenHook(){ if(location.hash==='#golden') installGoldenHook(); }
