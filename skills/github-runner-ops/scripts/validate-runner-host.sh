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
grep -Fq 'clean_contents /root/.npm/_logs' "$host_package/job-completed.sh"
grep -Fq 'clean_contents /var/lib/pullfrog' "$host_package/job-completed.sh"
grep -Fq 'clean_pullfrog_temp_dirs()' "$host_package/job-completed.sh"
grep -Fq 'rmdir "$target"' "$host_package/job-completed.sh"

RUNNERCTL_LIB_ONLY=1 source "$host_package/runnerctl"

validate_security_args() {
  local role=$1
  shift
  local rendered
  rendered=$(printf '%s\n' "$@")

  ! grep -Eq -- '(^|[[:space:]])--(privileged|cap-add)([=[:space:]]|$)' <<< "$rendered"
  case "$role" in
    ci)
      [[ "$rendered" == $'--security-opt\nno-new-privileges:true\n--security-opt\nseccomp=unconfined\n--security-opt\napparmor=unconfined' ]]
      ;;
    deploy)
      [[ "$rendered" == $'--security-opt\nno-new-privileges:true' ]]
      ;;
    *) return 64 ;;
  esac
}

ci_security_args=()
while IFS= read -r security_arg; do
  ci_security_args+=("$security_arg")
done < <(security_args_for_role ci)

deploy_security_args=()
while IFS= read -r security_arg; do
  deploy_security_args+=("$security_arg")
done < <(security_args_for_role deploy)
validate_security_args ci "${ci_security_args[@]}"
validate_security_args deploy "${deploy_security_args[@]}"

if validate_security_args ci \
  --security-opt no-new-privileges:true \
  --security-opt seccomp=unconfined \
  --security-opt apparmor=unconfined \
  --privileged; then
  echo "Runner security validation accepted a forbidden privileged CI container." >&2
  exit 1
fi

if validate_security_args ci \
  --security-opt no-new-privileges:true \
  --security-opt seccomp=unconfined \
  --security-opt apparmor=unconfined \
  --cap-add SYS_ADMIN; then
  echo "Runner security validation accepted a forbidden CI capability." >&2
  exit 1
fi

if grep -R -n --exclude=validate-runner-host.sh -E '100\.[0-9]+\.[0-9]+\.[0-9]+|/Users/|BEGIN (OPENSSH|RSA|EC) PRIVATE KEY' "$skill_root"; then
  echo "Private or machine-specific content found in skill package." >&2
  exit 1
fi

echo "github-runner-ops host package: valid"
