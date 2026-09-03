#!/usr/bin/env bash
set -euo pipefail

skill_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
host_package="$skill_root/assets/runner-host"

for file in Dockerfile entrypoint.sh job-completed.sh runnerctl; do
  [[ -f "$host_package/$file" ]] || {
    echo "Missing host package file: $file" >&2
    exit 1
  }
done

bash -n \
  "$host_package/entrypoint.sh" \
  "$host_package/job-completed.sh" \
  "$host_package/runnerctl"

grep -Fq 'RUNNER_VERSION=2.336.0' "$host_package/Dockerfile"
grep -Fq '04cf0be1aff4c3ec3554466c39124ca250e3effd8873bb7e8d68535aa9505d5d' "$host_package/Dockerfile"
grep -Fq 'NODE_VERSION=24.14.0' "$host_package/Dockerfile"
grep -Fq '41cd79bb7877c81605a9e68ec4c91547774f46a40c67a17e34d7179ef11729df' "$host_package/Dockerfile"
grep -Fq 'PNPM_VERSION=10.31.0' "$host_package/Dockerfile"
grep -Fq 'tar --extract --xz --file /tmp/node.tar.xz --directory /usr/local --strip-components=1' "$host_package/Dockerfile"
grep -Fq 'corepack enable pnpm' "$host_package/Dockerfile"
grep -Fq 'corepack prepare "pnpm@${PNPM_VERSION}" --activate' "$host_package/Dockerfile"
grep -Fq 'test "$(node --version)" = "v${NODE_VERSION}"' "$host_package/Dockerfile"
grep -Fq 'npm --version >/dev/null' "$host_package/Dockerfile"
grep -Fq 'npx --version >/dev/null' "$host_package/Dockerfile"
grep -Fq 'corepack --version >/dev/null' "$host_package/Dockerfile"
grep -Fq 'test "$(pnpm --version)" = "${PNPM_VERSION}"' "$host_package/Dockerfile"
grep -Fq 'Organization registrations require --runner-group.' "$host_package/runnerctl"
grep -Fq 'ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/opt/runner-hooks/job-completed.sh' "$host_package/entrypoint.sh"
grep -Fq 'clean_contents /runner/_work/.pnpm-store' "$host_package/job-completed.sh"
grep -Fq 'clean_contents /runner/_work/_update' "$host_package/job-completed.sh"
grep -Fq 'clean_contents /root/.npm/_cacache' "$host_package/job-completed.sh"
grep -Fq 'clean_contents /root/.npm/_npx' "$host_package/job-completed.sh"
grep -Fq 'clean_contents /var/lib/pullfrog' "$host_package/job-completed.sh"
grep -Fq 'for pullfrog_temp in /tmp/pullfrog-*; do' "$host_package/job-completed.sh"

if grep -R -n --exclude=validate-runner-host.sh -E '100\.[0-9]+\.[0-9]+\.[0-9]+|/Users/|BEGIN (OPENSSH|RSA|EC) PRIVATE KEY' "$skill_root"; then
  echo "Private or machine-specific content found in skill package." >&2
  exit 1
fi

echo "github-runner-ops host package: valid"
