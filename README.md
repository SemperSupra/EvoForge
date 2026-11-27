# EvoForge

EvoForge is a local-first browser laboratory for evolutionary art and artificial-life simulations. No account or backend is required.

**This branch is the reproducible 0.2.0-rc.1 release candidate, not a stable release.** The live site is [EvoForge](https://sempersupra.github.io/EvoForge/). It remains on its previously published version until a qualified candidate is promoted.

## Start here

Requirements: Git, Docker with Compose, and a modern browser. Clone this branch explicitly:

```sh
git clone --branch release-source https://github.com/SemperSupra/EvoForge.git
cd EvoForge
npm run container:install
npm run container:dev
```

If Node/npm is not installed on your machine, use `bash scripts/container-npm.sh install` and `bash scripts/container-npm.sh run dev` instead. Open http://localhost:5173. Project dependencies are installed inside the tooling container; do not install them on the host.

## Experiences in this candidate

- Craft Lab, Motif & Heraldry Lab, Emblems & Flags, Mosaic Atelier and Legacy Mosaic: select, compare, evolve and save deterministic CPU-rendered artwork. Recipes include an exact engine version. Canonical RGBA replay and golden hashes are tested separately from encoded images.
- ALife Creature Arena: experimental WebGPU simulation. Observe is read-only; Play exposes validated interventions. A supported WebGPU device is required; the arena is not a bit-exact cross-device simulator. The launcher remains available without WebGPU.

See [user guide](docs/USAGE.md) and [reproduction guide](docs/QUALIFICATION.md).

## Test and develop

The source, lockfile, five golden suites (298 render jobs), tests and container tooling are included. A clean checkout is sufficient; no private repository, API key, AI tool or proprietary service is needed.

```sh
EVOFORGE_ZERO_COST=1 bash scripts/rdte-direct.sh "$(git rev-parse HEAD)" /tmp/evoforge-candidate-dist
```

Only use the zero-cost acknowledgement on a verified no-incremental-cost executor. The command executes the ordered native gates in a disposable Debian tooling container, creates a new candidate output directory and a separate evidence directory. It does not publish. Output directories must not already exist.

The public [Actions](https://github.com/SemperSupra/EvoForge/actions) runs are the qualification record. A failed, missing or skipped gate is not a pass. Browser and device qualification are reported separately; mobile emulation is not a physical mobile test. No claim of broad device support is implied by this candidate.

## Source and license

This is a curated release snapshot, not a research notebook or development-history mirror. The MIT license applies to the included project source. The arena incorporates an owner-supplied generated prototype with project adaptations; raw intake artifacts are deliberately not needed to build or test the shipped implementation. Preserve the license and notices in redistributions. Dependencies have their own licenses.

Contributions are invite-only under the repository's existing contribution policy. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
