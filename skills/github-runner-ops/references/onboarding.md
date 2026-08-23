# Multi-project onboarding

## Scope selection

| Repository ownership | Registration scope | Required access |
| --- | --- | --- |
| Personal account | Repository | Repository owner |
| Organization with owner role | Organization preferred for multiple reviewed repositories | Organization owner plus restricted runner group |
| Organization without owner role | Repository | Repository admin and organization policy permitting repo runners |

Organization scope reduces duplicate registrations, but it does not authorize every repository automatically. Create a runner group that lists only repositories whose workflows passed the trust review. Keep CI and deploy in separate groups when their repository access differs.

## Workflow selector

Use a repository variable containing a JSON array. Preserve hosted execution when the variable is unset and force fork pull requests onto a hosted runner:

```yaml
runs-on: ${{ fromJSON(github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository && '["ubuntu-latest"]' || vars.ACTIONS_RUNNER_LABELS_CI || '["ubuntu-latest"]') }}
```

Expected Linux x64 values:

```text
ACTIONS_RUNNER_LABELS_CI=["self-hosted","Linux","X64","local-ci"]
ACTIONS_RUNNER_LABELS_DEPLOY=["self-hosted","Linux","X64","local-deploy"]
```

Default labels are assigned by GitHub from the real host. Do not advertise an architecture the host does not satisfy. Labels are cumulative and do not provide automatic fallback when a matching runner is offline.

## Registration token piping

Repository-scoped CI runner:

```sh
gh api --method POST /repos/OWNER/REPO/actions/runners/registration-token --jq .token \
  | ssh RUNNER_HOST 'cd ~/github-runners && ./runnerctl add --scope repo --target OWNER/REPO --role ci'
```

Organization-scoped deployment runner:

```sh
gh api --method POST /orgs/ORG/actions/runners/registration-token --jq .token \
  | ssh RUNNER_HOST 'cd ~/github-runners && ./runnerctl add --scope org --target ORG --role deploy --runner-group trusted-local-deploy'
```

Organization endpoints require organization-owner authority and the appropriate GitHub token permission. Expanding an OAuth or fine-grained-token permission is a separate permission change and needs current authorization.

## Routing and proof

After the controller and GitHub both report the runner online:

```sh
gh variable set ACTIONS_RUNNER_LABELS_CI \
  --repo OWNER/REPO \
  --body '["self-hosted","Linux","X64","local-ci"]'
```

Read the variable back, then dispatch or rerun only the intended workflow. Inspect the job payload or logs to prove the resolved runner name. Do not change production variables, environments, secrets, or approvals as part of runner onboarding.

## Removal

First stop and drain the runner. Generate a fresh removal token from the matching repository or organization endpoint, then pipe it to:

```sh
ssh RUNNER_HOST 'cd ~/github-runners && ./runnerctl remove --id RUNNER_ID --yes'
```

Confirm the GitHub registration is absent, the controller registry no longer lists it, and only that registration's labeled volumes were removed.
