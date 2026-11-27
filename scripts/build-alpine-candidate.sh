#!/usr/bin/env bash
# Rebuild reviewed public source with a pinned, disposable Alpine compiler.
# Requires local linux/amd64 Docker, Git, Bash, curl, GNU coreutils and tar.
set -euo pipefail
[[ $# == 1 || $# == 2 ]] || { echo 'Usage: bash scripts/build-alpine-candidate.sh NEW_OUTPUT_DIRECTORY [GIT_REVISION]' >&2; exit 2; }
src="$(git rev-parse --verify "${2:-HEAD}^{commit}")"
out="$(realpath -m "$1")"
test ! -e "$out"
mkdir -p "$out/evidence" "$out/site" "$out/package" "$out/image-export"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
base=alpine@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf
npm_sha=fa0711dd513fa1386bbad3962a292cb813461cb57dedf07d6eb7efe76dffe897
manifest_sha=f60a0f7e8d0ff594bd6c6d927324e152925576217a5700097341ce51a9cc8bd9
printf '%s\n' "$src" > "$out/evidence/source.txt"
mkdir "$tmp/context" "$tmp/cache" "$tmp/prefetch"
git show "$src:containers/alpine/Dockerfile.compiler" > "$tmp/context/Dockerfile"
curl -fsSL --proto '=https' --retry 3 https://registry.npmjs.org/npm/-/npm-12.2.3.tgz -o "$tmp/context/npm.tgz"
printf '%s  %s\n' "$npm_sha" "$tmp/context/npm.tgz" | sha256sum -c -
docker build --platform linux/amd64 --no-cache --build-arg BASE="$base" --iidfile "$out/evidence/compiler-id.txt" -f "$tmp/context/Dockerfile" "$tmp/context"
image="$(cat "$out/evidence/compiler-id.txt")"
docker image inspect "$image" > "$out/evidence/compiler-image.json"
docker run --rm --network none --platform linux/amd64 --entrypoint sh "$image" -ec 'apk info -v | sort; node --version; npm --version; sha256sum /usr/bin/node; find /usr/local/lib/node_modules/npm -type f -exec sha256sum {} + | sort' > "$out/evidence/compiler-inventory.txt"
git archive "$src" | tar -x -C "$tmp/prefetch"
(cd "$tmp/prefetch" && printf '%s  %s\n' 7552f1df20b233b04da2040c36eb5a992a262d7558149d1092c6deb9bb8e5812 package.json 65b6c770ed63455930bdc84c42aa9d00bd57f66ce6dd13943aa6af5baf2f8214 package-lock.json | sha256sum -c -)
common=(--rm --platform linux/amd64 --user "$(id -u):$(id -g)" --cap-drop ALL --security-opt no-new-privileges -e HOME=/tmp -w /workspace --entrypoint sh)
docker run "${common[@]}" -v "$tmp/prefetch:/workspace" -v "$tmp/cache:/npm-cache" "$image" -ec 'test "$(node --version)" = v24.22.3; test "$(npm --version)" = 12.2.3; npm ci --ignore-scripts --no-audit --cache /npm-cache' 2>&1 | tee "$out/evidence/prefetch.log"
docker run "${common[@]}" -v "$tmp/prefetch:/workspace" "$image" -ec 'npm audit --audit-level=low --json' > "$out/evidence/npm-audit.json"
# Preserve exact runtime license text, not just a registry metadata label.
printf '%s  %s\n' 873a2f333fda393ec3464f4579209b019d98e97c3bf498b10e85f630162fd708 "$tmp/prefetch/node_modules/idb/LICENSE" | sha256sum -c -
docker run --network none "${common[@]}" -v "$tmp/prefetch:/workspace:ro" "$image" -ec 'node --input-type=module -e "import{readFileSync}from \"node:fs\";import{strict as a}from \"node:assert\";a.ok(readFileSync(\"public/LICENSE\").includes(readFileSync(\"node_modules/idb/LICENSE\")))"'
tar -czf "$tmp/cache.tar.gz" -C "$tmp/cache" _cacache
for i in 1 2; do
  mkdir "$tmp/src-$i" "$tmp/cache-$i"
  git archive "$src" | tar -x -C "$tmp/src-$i"
  tar -xzf "$tmp/cache.tar.gz" -C "$tmp/cache-$i"
  docker run --network none "${common[@]}" -v "$tmp/src-$i:/workspace" -v "$tmp/cache-$i:/npm-cache" "$image" -ec 'npm ci --offline --ignore-scripts --no-audit --cache /npm-cache; npm run typecheck; npm test -- --exclude scripts/wait-for-server.test.mjs; node --test scripts/wait-for-server.test.mjs; npm run build; npm run verify:dist' 2>&1 | tee "$out/evidence/build-$i.log"
  (cd "$tmp/src-$i/dist" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum) > "$out/evidence/dist-$i.sha256"
done
cmp "$out/evidence/dist-1.sha256" "$out/evidence/dist-2.sha256"
sha256sum "$out/evidence/dist-1.sha256" | tee "$out/evidence/manifest-observed.sha256"
printf '%s  %s\n' "$manifest_sha" "$out/evidence/dist-1.sha256" | sha256sum -c -
cp -a "$tmp/src-1/dist/." "$out/site/"
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -cf "$out/package/evoforge-site.tar" -C "$out/site" .
(cd "$out/package" && sha256sum evoforge-site.tar > SHA256SUMS)
docker tag "$image" evoforge-alpine-compiler:node24-npm12
docker save evoforge-alpine-compiler:node24-npm12 | gzip -n > "$out/image-export/compiler.docker.tar.gz"
(cd "$out/image-export" && sha256sum compiler.docker.tar.gz > SHA256SUMS)
cp "$out/evidence/compiler-id.txt" "$out/image-export/image-1.txt"
cp "$out/evidence/source.txt" "$out/image-export/"
printf '%s\n' 'PASS_BUILD_ONLY' > "$out/evidence/build-result.txt"
printf 'Built reviewed source %s; output %s. Browser, scanner, provenance and promotion are separate gates.\n' "$src" "$out"
