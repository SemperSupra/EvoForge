# Reproducing qualification

The repository contains the source, locked dependencies, container tooling, complete test fixtures, and a static-distribution allowlist. No private inputs are required.

## Required ordered gates

Run `EVOFORGE_ZERO_COST=1 bash scripts/rdte-direct.sh "$(git rev-parse HEAD)" /tmp/evoforge-candidate-dist` from a clean checkout on a verified zero-cost Docker executor. The disposable tooling container runs locked installation, Chromium installation, TypeScript checking, unit tests, build, distribution validation, the complete 298-job golden plan, and the built-site Mosaic/ALife smoke. Check `/tmp/evoforge-candidate-dist.evidence/result.txt`, the ordered gates.tsv, native logs and distribution SHA-256 manifest. An absent or failed stage is not acceptance.

The smoke uses a software WebGPU path as a functional bring-up gate; it is not evidence of physical GPU performance. Actual platform browser tests are separate.

## Public source and distribution

Release-source CI runs on standard public hosted Ubuntu. Qualification artifacts are candidate outputs until promotion. Public Pages receives only the validated static distribution, license and version metadata. The source repository is independently buildable. The upstream-intake identity check remains an internal provenance test; the public suite tests the actual shipped arena rather than requiring an excluded raw intake file. No golden expectation was removed or changed.

## Native browser RDTE

The companion browser workflow runs on standard Ubuntu, Windows and macOS. Its canaries distinguish desktop engine, viewport/touch emulation, actual WebGPU execution, adapter and software fallback. Browser availability and functional support are reported, not inferred from runner names. It is a capability experiment, not a substitute for release or physical device qualification.
