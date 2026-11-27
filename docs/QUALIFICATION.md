# Reproducing the EvoForge release candidate

The source, locked dependencies, deterministic renderer fixtures, distribution allowlist and pinned Alpine compiler recipe are included. No private repository or previous GitHub Actions artifact is required.

## Build locally (Linux/WSL, amd64)

Prerequisites: Git, a local Docker-compatible Docker engine, Bash, curl, GNU coreutils and tar. The image is qualified for linux/amd64; no arm64 compiler qualification is asserted. On Windows use a supported WSL Linux engine rather than requiring Docker Desktop. The script downloads public pinned compiler inputs and the lockfile dependencies, then performs two independent network-isolated builds and verifies their exact 13-file distribution hash. A missing historical version in an upstream repository fails closed; do not substitute a newer package silently.

```sh
git clone --branch release-source https://github.com/SemperSupra/EvoForge.git
cd EvoForge
bash scripts/build-alpine-candidate.sh /tmp/evoforge-candidate
```

The output includes the built site, deterministic site tar, compiler export, dependency and build receipts. This is build-only evidence; it is not release approval or permission to redistribute the compiler. Serve the static directory with an HTTP server, not a file URL. The live site is https://sempersupra.github.io/EvoForge/.

## Mandatory release qualification

The public qualification workflow builds exact reviewed source from public inputs, runs fresh compiler OS and npm language coverage and zero high/critical checks, and separately audits the application's locked dependencies. It builds twice with networking disabled after online prefetch. It verifies the application distribution allowlist and exact reviewed manifest, including the original MIT license and idb ISC notice.

The independent Linux browser job restores the compiler image from that same run, installs the pinned system Chromium and full ICU data in a separate image, scans that image and exercises the full 298-job source golden oracle and actual production routes in an isolated container. It verifies the site before and after testing. The native macOS ARM64 job executes the full built-site native WebGPU smoke using Apple Metal without a software fallback. It checks both modes, all seven families and responsive interactions. Physical mobile testing is separate. Hosted runner inventory and custom system Chromium support limitations are distinct from scanner clearance of the container images.

After all jobs pass, the workflow signs and independently verifies the exact deterministic build archive and source/manifest receipts. The qualification workflow does not deploy. Publication requires a separate guarded promotion of the same verified artifact; no skipped, failed or unavailable gate is acceptance. Earlier Debian tooling scripts remain diagnostic/legacy and do not determine this release's qualification.

The browser/runtime RDTE workflows are optional manual diagnostics; their reports do not replace the mandatory qualification.
