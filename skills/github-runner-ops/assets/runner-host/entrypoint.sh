#!/usr/bin/env bash
set -euo pipefail

runner_root=/runner

if [[ ! -x "$runner_root/run.sh" ]]; then
  cp -a /opt/actions-runner/. "$runner_root/"
fi

cd "$runner_root"

configure_runner() {
  local registration_token
  local -a runner_group_args=()

  if [[ -f .runner ]]; then
    return
  fi

  IFS= read -r registration_token || true
  if [[ -z "$registration_token" ]]; then
    echo "A registration token is required for first-time configuration." >&2
    exit 64
  fi

  if [[ -n "${RUNNER_GROUP:-}" ]]; then
    runner_group_args=(--runnergroup "$RUNNER_GROUP")
  fi

  ./config.sh \
    --unattended \
    --url "$RUNNER_URL" \
    --token "$registration_token" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    "${runner_group_args[@]}" \
    --work _work

  registration_token=
  printf '%s\n' \
    'ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/opt/runner-hooks/job-completed.sh' \
    > .env
  chmod 0600 .env
}

case "${1:-run}" in
  configure)
    configure_runner
    ;;
  remove)
    if [[ ! -f .runner ]]; then
      echo "Runner is not configured." >&2
      exit 65
    fi
    IFS= read -r removal_token || true
    if [[ -z "$removal_token" ]]; then
      echo "A removal token is required." >&2
      exit 64
    fi
    ./config.sh remove --unattended --token "$removal_token"
    removal_token=
    ;;
  run)
    configure_runner
    exec ./run.sh
    ;;
  *)
    exec "$@"
    ;;
esac
