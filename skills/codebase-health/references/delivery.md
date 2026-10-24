# Delivery: test tiers, hooks vs CI, deploy gate

Goal: ship faster with confidence. The PR gate is short and trustworthy, slower checks run where they still catch problems, and production is checked right after deploy.

## Where each check runs

| Place | Budget | What belongs there |
| --- | --- | --- |
| pre-commit | under 5 s | formatter and linter on staged files, secret scan on staged files |
| pre-push | under 60 s | typecheck and tests related to the changed files; path-conditional checks (design lint, contracts, infra config); dead-code check against regressions |
| PR gate | target under 8 min | lint, typecheck and build of affected packages; unit tests of affected packages; database tests only when the data layer changed; the browser smoke tier |
| main, before deploy | as short as possible | only what the PR could not prove; skip entirely when main's tree equals the validated PR tree |
| nightly | any | the full suite and the slow tiers, **with an alert that someone reads** |
| after deploy | under 30 s | read-only smoke against production for what only production shows: domains, cookies, CORS, proxy, MIME types |

Hooks give fast feedback; CI stays the authority. Hooks can be skipped, so anything that protects production also runs in CI. Bloated-but-necessary checks move to hooks only when CI keeps an equivalent, cheaper guard.

## Browser end-to-end tiers

Inventory every spec: which script runs it, when (PR, main, nightly, never), mocked or real API, test count, the journey it protects, and whether lower layers already cover its assertions. Then place each:

- **Tier 0, smoke:** the few journeys whose breakage in production is severe and that only a browser plus the real API can catch (auth and session across origins, the main submission flow, privacy and permission gates). Target under 90 s, with the stack started once for all specs.
- **Tier 1, by path:** runs on the PR only when its paths change; map globs to specs in the change-detection script.
- **Tier 2, nightly:** extra viewports, long flows, rare branches.
- **Convert:** unit logic written as browser tests becomes unit tests; API-only checks become API tests or scripts.
- **Delete:** duplicated or obsolete specs, with the reason.

Count browser-step failures by cause: infrastructure, outdated test after an intended change, test defect, real regression. When real regressions are rare and outdated tests dominate, the suite costs more than it protects at its current size.

## Deploy gate

Prefer: the PR gate (with Tier 0) is the effective gate; main skips revalidation when the tree is unchanged; deploy runs right after; a read-only smoke checks production; automatic rollback covers code only and only when the release has no non-additive migration. Blocking the deploy on a second full suite on a non-production stack duplicates the PR gate and slows every delivery.

## Stability before speed

Fix infrastructure failures first: ports shared with developer servers, images or tools that disappear on reboot, refs that vanish in stacked PRs, runners without capacity, superseded runs not cancelled. Each one costs a full rerun, which outweighs any per-step optimization.
