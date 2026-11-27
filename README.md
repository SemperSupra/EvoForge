# EvoForge

EvoForge is a local-first browser laboratory for evolutionary art and artificial-life simulations. No account or backend is required.

**This branch is the reproducible 0.2.0-rc.1 release candidate, not a stable release.** The live site is [EvoForge](https://sempersupra.github.io/EvoForge/). It remains on its previously published version until a qualified candidate is promoted.

## Start here

Use a Linux/WSL amd64 Docker engine, Git, Bash, curl, GNU coreutils and tar. No project toolchains need to be installed on the host.

```sh
git clone --branch release-source https://github.com/SemperSupra/EvoForge.git
cd EvoForge
bash scripts/build-alpine-candidate.sh /tmp/evoforge-candidate
```

Serve the generated `/tmp/evoforge-candidate/site` directory over HTTP using a local static web server. Do not open the HTML as a file URL. The builder resolves exact public pinned inputs, performs two network-isolated application builds after dependency prefetch, and checks the reference manifest. See the [reproduction guide](docs/QUALIFICATION.md).

## Experiences in this candidate

- Craft Lab, Motif & Heraldry Lab, Emblems & Flags, Mosaic Atelier and Legacy Mosaic: select, compare, evolve and save deterministic CPU-rendered artwork. Recipes include an exact engine version. Canonical RGBA replay and golden hashes are tested separately from encoded images.
- ALife Creature Arena: experimental WebGPU simulation. Observe is read-only; Play exposes validated interventions. A supported WebGPU device is required; the arena is not a bit-exact cross-device simulator. The launcher remains available without WebGPU.

See [user guide](docs/USAGE.md) and [reproduction guide](docs/QUALIFICATION.md).

## Qualification

The primary public qualification uses an optimized Alpine compiler, a separate isolated Alpine Chromium profile, and native Apple Metal. The workflow builds the exact reviewed source, scans the actual tool images, performs deterministic and production checks, and signs the verified distribution. It does not deploy. No failed, missing or skipped gate is acceptance. Older Debian tooling and optional manual browser/runtime diagnostics are retained for comparison, not as the release qualification authority.

The [Actions runs](https://github.com/SemperSupra/EvoForge/actions) retain qualification evidence. Mobile emulation is not physical mobile testing.

## Source and license

This is a curated release snapshot, not a research notebook or development-history mirror. The MIT license applies to the included project source. The arena incorporates an owner-supplied generated prototype with project adaptations; raw intake artifacts are deliberately not needed to build or test the shipped implementation. Preserve the license and notices in redistributions. Dependencies have their own licenses.

Contributions are invite-only under the repository's existing contribution policy. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
