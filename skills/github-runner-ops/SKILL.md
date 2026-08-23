---
name: github-runner-ops
description: Provision, onboard, migrate, operate, or troubleshoot GitHub Actions self-hosted runners shared by multiple projects on a Linux host. Use for runner scope, groups, trust labels, registration, routing variables, lifecycle, cleanup, and operational proof; not for generic workflow authoring or ordinary failing-check diagnosis.
---

# GitHub Runner Ops

Operate one Linux runner host across multiple GitHub projects without coupling workflows to a machine name or sharing CI and deployment trust.

## Decide scope before registration

- Use an organization runner only when the operator is an organization owner and an explicit runner group restricts access to reviewed repositories. Never register into an unrestricted default group for convenience.
- GitHub personal accounts do not provide account-wide runners. Register personal repositories individually.
- For an organization where the operator is not an owner, use repository scope only when repository administration permits it.
- Keep CI and deployment as separate runner registrations, containers, configuration volumes, work volumes, labels, and lifecycle decisions. Never give one persistent runner both `local-ci` and `local-deploy`.
- Treat a Docker socket mount as host-root-equivalent access. Admit only trusted workflow code.

Read [references/onboarding.md](references/onboarding.md) before adding a repository or organization. Read [references/security.md](references/security.md) before enabling a public repository, deployment role, or additional concurrent runner.

## Workflow

1. Inspect the target workflow, repository visibility, fork behavior, effective `runs-on`, permissions, environments, service containers, fixed ports, and cleanup paths. Do not expose a self-hosted runner to fork code.
2. Inspect the host with the bundled `runnerctl doctor`. Confirm Linux x64, Docker health, storage, memory, and capacity for the actual job. The bundled image currently supports Linux x64 only.
3. Choose repository or organization scope and a single role. Organization scope requires a pre-existing restricted runner group.
4. Generate a short-lived GitHub registration token on the authenticated control machine and pipe it directly to `runnerctl add`. Never print, store, commit, forward, or place the token in a Docker environment variable.
5. Confirm both control planes before routing work: `runnerctl list --json` must report a healthy container, and the GitHub API must report the intended runner online with the real `Linux` and `X64` default labels plus exactly one custom trust label.
6. Only after that proof, set the repository variable to a JSON label array. Use `ACTIONS_RUNNER_LABELS_CI` or `ACTIONS_RUNNER_LABELS_DEPLOY`; preserve a hosted default in the workflow and the explicit fork guard.
7. Run or rerun one exact workflow and prove the resolved runner name, target SHA, result, artifacts, service cleanup, and post-job hook. A queued job, online runner, green CI, deployment, and production behavior are separate evidence.
8. Keep the registry current. Stop deploy runners outside approved operational windows when the repository contract requires it. Remove registrations with a fresh removal token before deleting their managed volumes.

## Host package

The portable host package is under `assets/runner-host/`. Copy the directory as a unit to the Linux host, keep it user-private, and use:

```sh
./runnerctl doctor
./runnerctl build
./runnerctl list --json
```

The controller stores only non-secret registration metadata. Runner credentials live in distinct Docker configuration volumes; job work lives in distinct work volumes. `runnerctl remove --id ID --yes` is destructive and requires a fresh removal token on standard input.

After rebuilding the image, use `runnerctl recreate --id ID --yes` only on an idle runner. It replaces the exact container while preserving its GitHub registration and scoped volumes.

Run `scripts/validate-runner-host.sh` after changing the host package, then run the catalog validator from the repository root.

## Stop conditions

Stop before mutation when the exact GitHub scope is ambiguous, organization ownership or runner-group access is missing, a public/fork workflow can reach self-hosted labels, the host architecture is unsupported, fixed ports or resource limits can collide, or decisive cleanup cannot be verified. Do not broaden OAuth scopes, repository access, runner-group membership, or production permissions without current authorization.

## Closeout

Report the target scope and role, runner ID/name, default and custom labels, container health, effective repository variable, exact workflow run/SHA, cleanup evidence, retained old registrations, skipped checks, and residual capacity or security risk. Never include registration keys, removal tokens, runner credentials, or secret-bearing diagnostics.
