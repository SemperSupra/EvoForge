#!/usr/bin/env bash
set -euo pipefail
# An isolated clean release-source checkout is required. No bind-mounted writable source,
# host npm install, secrets, Docker socket, release or public repo writes.
if [[ "$#" != 2 ]]; then
  echo 'Usage: EVOFORGE_ZERO_COST=1 bash scripts/rdte-direct.sh <full-source-sha> <new-dist-output-directory>' >&2; exit 2
fi
if [[ "${EVOFORGE_ZERO_COST:-}" != 1 ]]; then
  echo 'Zero-cost executor must be verified before starting.' >&2; exit 2
fi
phase="${EVOFORGE_QUALIFICATION_PHASE:-full}"
[[ "$phase" = full || "$phase" = container ]] || exit 2
sha="$1"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Require full SHA' >&2; exit 2; }
root="$(git rev-parse --show-toplevel)"
[[ "$(git -C "$root" rev-parse HEAD)" = "$sha" ]] || { echo 'Checkout SHA mismatch' >&2; exit 2; }
[[ -z "$(git -C "$root" status --porcelain)" ]] || { echo 'Require clean checkout' >&2; exit 2; }
out="$2"
[[ -n "$out" && ! -e "$out" && ! -L "$out" ]] || { echo 'Require a new output directory' >&2; exit 2; }
evidence="${out}.evidence"
[[ ! -e "$evidence" && ! -L "$evidence" ]] || { echo 'Require a new evidence directory' >&2; exit 2; }
command -v docker >/dev/null || { echo 'Docker required by tooling policy' >&2; exit 2; }
# Create host-owned scratch; the container receives a copy of the archive,
# rather than a writable bind mount. docker cp defaults to the invoking uid/gid
# when copying out, so root-owned npm files never escape the disposable container.
scratch="$(mktemp -d)"
cid=""
image=""
cleanup(){
  rc=$?
  trap - EXIT
  if [[ -n "$cid" ]]; then docker rm -f "$cid" >/dev/null 2>&1 || echo 'WARNING: container cleanup failed' >&2; fi
  rm -rf -- "$scratch"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -- "$evidence"
printf 'source=%s\n' "$sha" > "$evidence/source.txt"
printf 'NOT_RUN\n' > "$evidence/result.txt"
mkdir "$scratch/source"
git -C "$root" archive "$sha" | tar -x -C "$scratch/source"
docker version > "$evidence/docker-version.txt" 2>&1
# Use image ID, not a globally mutable tag. Do not remove shared image caches.
if ! docker build --iidfile "$scratch/image.id" -f "$scratch/source/Dockerfile.tooling" "$scratch/source" > "$evidence/build.log" 2>&1; then
  printf 'FAIL docker-build\n' > "$evidence/result.txt"; exit 1
fi
image="$(cat "$scratch/image.id")"
[[ "$image" =~ ^sha256:[a-f0-9]{64}$ ]] || { echo 'Invalid image identity' >&2; exit 1; }
printf '%s\n' "$image" > "$evidence/image-id.txt"
docker image inspect "$image" --format '{{.Id}} {{.Os}}/{{.Architecture}} {{json .RepoDigests}}' > "$evidence/image-info.txt"
cid="$(docker create --init --shm-size=1gb -e CI=1 -e "EVOFORGE_SOURCE_SHA=$sha" -e "EVOFORGE_QUALIFICATION_PHASE=$phase" -w /workspace "$image" bash scripts/rdte-container.sh)"
[[ "$cid" =~ ^[a-f0-9]{64}$ ]] || { echo 'Invalid container identity' >&2; exit 1; }
docker cp "$scratch/source/." "$cid:/workspace"
# Save both successful and failed gate evidence. Inspect actual terminal
# container status rather than treating the attach command alone as authority.
set +e
docker start -a "$cid" 2>&1 | tee "$evidence/native.log"
attach_status=("${PIPESTATUS[@]}")
attach_rc="${attach_status[0]}"
tee_rc="${attach_status[1]}"
set -e
state="$(docker inspect "$cid" --format '{{.State.Status}} {{.State.ExitCode}}')"
printf 'attach=%s\ntee=%s\nstate=%s\n' "$attach_rc" "$tee_rc" "$state" > "$evidence/container-state.txt"
if ! docker cp "$cid:/tmp/evoforge-native-evidence/." "$evidence/"; then
  printf 'FAIL missing-gate-evidence\n' > "$evidence/result.txt"; exit 1
fi
if [[ "$attach_rc" != 0 || "$tee_rc" != 0 || "$state" != "exited 0" ]]; then
  printf 'FAIL native-container\n' > "$evidence/result.txt"; exit 1
fi
# A successful exit without the complete ordered pass record is not a pass.
expected=$'install\tPASS\nchromium\tPASS\ntypecheck\tPASS\nunit\tPASS\nbuild\tPASS\ndist\tPASS\ngolden\tPASS'
if [[ "$phase" = full ]]; then expected+=$'\nsmoke\tPASS'; fi
[[ "$(cat "$evidence/native-source.txt")" == "source=$sha" ]] || { printf 'FAIL source-identity\n' > "$evidence/result.txt"; exit 1; }
[[ "$(cat "$evidence/gates.tsv")" == "$expected" ]] || { printf 'FAIL incomplete-gates\n' > "$evidence/result.txt"; exit 1; }
mkdir "$scratch/qualified-dist"
docker cp "$cid:/workspace/dist/." "$scratch/qualified-dist/"
[[ -s "$scratch/qualified-dist/index.html" ]] || { printf 'FAIL missing-dist\n' > "$evidence/result.txt"; exit 1; }
# Recheck destinations before publication to a new local artifact path.
mkdir -- "$out"
cp -R "$scratch/qualified-dist/." "$out/"
(cd "$out" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum) > "$evidence/dist-sha256.txt"
if [[ "$phase" = full ]]; then
  printf 'PASS source=%s\n' "$sha" > "$evidence/result.txt"
  echo "QUALIFICATION_PASS source=$sha evidence=$evidence"
else
  printf 'CONTAINER_PASS_AWAITING_NATIVE_SMOKE source=%s\n' "$sha" > "$evidence/result.txt"
  echo "CONTAINER_PASS_AWAITING_NATIVE_SMOKE source=$sha evidence=$evidence"
fi
