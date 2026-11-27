import {readFileSync} from 'node:fs';
import {test,expect} from 'vitest';
import {testGpuHost} from './helpers/arena-gpu-host.mjs';
import {testArenaNumerics} from './helpers/arena-numerics.mjs';
const html=readFileSync(new URL('../public/experiences/alife/index.html',import.meta.url),'utf8');
test('direct mock GPU host orchestration',async()=>{expect((await testGpuHost(html,URLSearchParams,structuredClone)).length).toBe(17);});
test('source-bound numerical and WGSL lexical invariants',()=>{const r=testArenaNumerics(html);expect(r.checks.length).toBe(13);expect(r.correctedMisses).toBe(0);});
