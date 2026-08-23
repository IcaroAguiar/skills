# Trust, isolation, and capacity

## Admission gate

Self-hosted workflows execute repository code on infrastructure the operator owns. Before enabling a repository:

- external fork pull requests must resolve to a hosted runner before any repository variable is evaluated;
- workflow permissions must remain least-privileged;
- deploy jobs must retain protected environments, approvals, and secret restrictions;
- third-party actions should be pinned according to the repository policy;
- service containers, browser profiles, credentials, and temporary files need unconditional cleanup and verification.

Public repositories require particular care. Do not grant a public repository access through an organization runner group until every reachable workflow has been reviewed for untrusted triggers and label selection.

## Role separation

`local-ci` and `local-deploy` are trust roles, not synonyms for one host. Use separate registrations and volumes even on one physical machine. A deployment runner should have access only to repositories and environments that require deployment. Keep it stopped outside an approved window when the operational contract does not require continuous availability.

## Docker boundary

The bundled runner uses the host Docker socket so GitHub service containers and Docker actions work. That socket is effectively root access to the host. Container filesystem isolation does not make untrusted workflow code safe. Never mount SSH directories, cloud credentials, browser profiles, home directories, or application data into a runner container.

The controller maps `host.docker.internal` to Docker's host gateway so workflows moved from Docker Desktop can still reach explicitly published service ports. This is a compatibility alias, not a trust boundary; jobs must still use isolated ports and release them after every run.

Runner configuration volumes contain durable GitHub registration credentials. Do not inspect or export their contents. Work volumes are separate so cleanup and removal can be scoped to one registration.

## Job cleanup

The bundled image configures GitHub's `ACTIONS_RUNNER_HOOK_JOB_COMPLETED` hook. It deletes only the contents of the current `GITHUB_WORKSPACE` and runner temporary directory, using path guards and a bounded timeout. The workflow remains responsible for its own containers, databases, ports, volumes, browser processes, and failure-path cleanup.

After a real job, verify that:

- the controller reports the runner healthy and idle;
- job service containers and networks are gone;
- fixed ports are released;
- no job process or browser remains;
- no credential or environment file remains in the job workspace or temporary directory.

Do not run broad Docker prune commands or delete unrecognized volumes.

## Capacity

The controller limits each CI container to 6 GiB and 3.5 CPUs and each deploy container to 2 GiB and 1.5 CPUs. These are ceilings, not global scheduling. Multiple online registrations can still accept jobs simultaneously and overcommit the host.

Before adding a runner, inventory the workflow's peak memory, fixed host ports, Docker services, browser load, and expected duration. Use repository concurrency controls or keep selected registrations stopped when cross-project collision is possible. A failed job caused by host contention is not product evidence.
