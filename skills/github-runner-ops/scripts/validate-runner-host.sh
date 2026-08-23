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
grep -Fq 'Organization registrations require --runner-group.' "$host_package/runnerctl"
grep -Fq 'ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/opt/runner-hooks/job-completed.sh' "$host_package/entrypoint.sh"

if grep -R -n --exclude=validate-runner-host.sh -E '100\.[0-9]+\.[0-9]+\.[0-9]+|/Users/|BEGIN (OPENSSH|RSA|EC) PRIVATE KEY' "$skill_root"; then
  echo "Private or machine-specific content found in skill package." >&2
  exit 1
fi

echo "github-runner-ops host package: valid"
