import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { qualifyArenaHost } from './helpers/arena-host.mjs';
test('actual ALife host initialization, lifecycle, seed and ABI contracts (no GPU)',()=>{
  const result=qualifyArenaHost(readFileSync(new URL('../public/experiences/alife/index.html',import.meta.url),'utf8'),readFileSync(new URL('../public/experiences/alife/sw.js',import.meta.url),'utf8'),URLSearchParams,structuredClone);
  expect(result.length).toBe(23);
});
