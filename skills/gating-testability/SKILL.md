---
name: gating-testability
description: Gating testability for material code, bugfix, UI/browser, auth/permission, API/contract/data/config, shared-library, CI, PR, release, and hardening-agentic-code workflows that need reliable evidence.
---

# Gating Testability

Use this gate to stop optimistic validation. The agent must name what must be testable, run evidence at the right stack level, and state residual risk before claiming code is ready.

This complements `hardening-agentic-code`: hardening finds implementation and maintainability risk; this gate decides whether the changed behavior was proven.

## Reference Router

Read only what the current branch needs:

- `references/obligation-matrix.md`: Test Obligation Matrix, Evidence Ledger, Final Testability Gate Result.
- `references/test-quality-calibration.md`: unit, integration, contract, E2E, coverage, flake, mutation, regression choice.
- `references/browser-visual-evidence.md`: UI, browser, visual, accessibility, responsive, branding, tenant, personalization evidence.
- `references/ci-monorepo-gates.md`: monorepo, microservice, affected graph, full service suite, pipeline hardening.
- `references/agentic-code-review-integration.md`: closeout and review-approval integration.
- `references/pressure-tests.md`: audit whether this skill is being applied correctly.
- `references/research-notes.md`: background only; load when revising the skill, not during ordinary gates.

## Trigger

Activate for material code, tests, config, data, dependency, CI, deploy, API, contract, auth, permission, tenant, browser, UI, visual, branding, personalization, migration, integration, or bugfix work.

If the runtime cannot load this skill, continue manually with the same Test Obligation Matrix, Evidence Ledger, and residual-risk discipline.

## Core Rules

- Create a Test Obligation Matrix before final validation. For production-relevant work, create it before coding or mark the lifecycle gate incomplete.
- Targeted tests are development-loop evidence, not final proof, unless the change is genuinely narrow and low risk.
- Microservice and service-owned changes require the full relevant service suite before closeout unless blocked and reported as residual risk.
- Monorepos require changed packages plus affected dependents; shared libraries, root config, generated clients, build tooling, and cross-cutting behavior expand the gate.
- UI, browser, layout, theme, branding, tenant, personalization, and visual changes require browser evidence; source inspection is not enough.
- Bugfixes need regression evidence or a specific technical reason the regression cannot yet be deterministic.
- Failed, flaky, missing, slow, credential-blocked, or skipped checks must name blocker, substituted evidence, and residual risk.
- Coverage is a signal, not proof. It cannot replace behavior, negative, contract, browser, or migration evidence.
- Do not claim `tested`, `ready`, `PR-ready`, `merge-ready`, or `production-ready` without the final gate result and command evidence.

## Gate Workflow

1. Plan the matrix. Output risk `LOW`, `MEDIUM`, or `HIGH`; changed surfaces; obligations; required new or updated tests; browser/visual decision; final-suite decision; blockers and unknowns. Done when every changed behavior has an obligation or a reason it is not required.
2. Keep the matrix live while coding or fixing review feedback. Prefer test-first or regression-first for bugs and risky behavior. Done when scope changes have updated obligations and unresolved validation is explicit.
3. Run evidence at the risk-appropriate level. Use focused checks for fast feedback, then full package/service/workspace, E2E, browser, contract, migration, or CI checks required by the matrix. Done when each required obligation has execution and result.
4. Promote exploratory/browser findings into deterministic assertions where practical. Done when important findings are either tested, documented as not practical, or blocking.
5. Finalize the Evidence Ledger with exact commands, scopes, results, and artifact paths. Done when a reviewer can rerun or challenge the evidence.
6. Emit `Final Testability Gate Result`: `PASS`, `PASS_WITH_RISK`, `BLOCKED`, or `FAIL`. Done when untested obligations and residual risk are named.

## Risk Minimums

`LOW`: relevant targeted tests or a precise reason none exist; cheap typecheck/build/lint when project-native; exact command evidence.

`MEDIUM`: relevant unit plus integration/component tests; build/typecheck/lint; full package or service suite unless prohibitively large or blocked; browser evidence for user-facing changes.

`HIGH`: deterministic unit tests, integration tests for boundaries, negative/fallback/permission/invalid/regression coverage, full relevant suite, feasible E2E/smoke for critical journeys, browser and visual evidence for user-facing flows, explicit residual risk.

## Hard Stops

Block completion or approval when there is no matrix, no commands and no blocker, targeted-only proof for production-relevant service changes, UI/visual/branding with no browser evidence, contract/data/auth/permission without boundary evidence, unresolved failing required checks, or a final answer without exact commands and results.

## Final Response Contract

When active, final user-facing output must include:

```md
Testability gate: PASS | PASS_WITH_RISK | BLOCKED | FAIL
Risk: LOW | MEDIUM | HIGH
Evidence:
- <command or browser task> -> <scope> -> <result> -> <artifact path if any>
Untested / residual risk:
- <none or named risk>
```

Keep it concise. Do not paste long logs. Report blocker, substituted evidence, and residual risk when exact verification is unavailable.

## After Editing This Skill

Run:
`node ~/.agents/skills/gating-testability/scripts/validate-skill-package.mjs`

Then run pressure scenarios:
`node --test ~/.agents/skills/gating-testability/tests/smoke-pressure-scenarios.test.mjs`
