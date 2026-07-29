# Reviewer Contract

Use this reference when assembling the independent reviewer packet or interpreting reviewer output.

## User Input Checkpoints

Some review risks are real but context-dependent. If the answer changes whether a finding is blocking, ask before duplicating review work or inventing a conclusion.

Ask for user input when a checkpoint depends on:

- whether a large-file/decomposition or structural simplification refactor is in scope now or should become an explicit follow-up;
- whether repeated literals are intentional domain vocabulary, fixtures, or should become canonical constants/enums/schemas;
- whether backend changes require e2e/integration coverage beyond focused unit tests;
- whether a cross-repo contract has external consumers, compatibility constraints, or a migration window;
- whether API design, OpenAPI compatibility, UI semantics/accessibility, or architecture layering must block this PR or become explicit follow-up;
- whether GraphQL/gRPC/WebSocket compatibility, observability/resilience, advanced accessibility, or UI performance budgets must block this PR or become explicit follow-up;
- whether a generated file, local artifact, or broad diff is intentionally versioned.

If `request_user_input` is available in the current mode, use it for 1-3 short, mutually exclusive questions. In Default mode, ask concise plain-text questions and pause only when the answer materially changes the verdict. Until answered, place the item in `Escopo não revisado` or `Pontos de atenção adicionais`, not as a forced blocking finding.

## Required Reviewer Input

Give the independent reviewer subagent:

- task objective and acceptance criteria;
- risk classification: routine, sensitive, or structural;
- changed repositories, changed files, and diff summary;
- review packet output from `collect-review-context.mjs`;
- Test Obligation Matrix result, final testability result, and untested obligations;
- maintainability pressure notes: simplification, branching, decomposition, abstractions, boundary types, canonical ownership, and orchestration risk;
- tests and runtime probes run, expressed by behavior covered rather than raw command lists;
- production code paths exercised, including route/function/class/hook/adapter/command names when identifiable;
- checks intentionally skipped and residual risk;
- any framework-specific context, such as NestJS, Prisma, React, Next.js, Turborepo, or CI/CD;
- cross-repo contract assumptions when more than one repository changed;
- answered or pending user input checkpoints.

## Reviewer Output Contract

The reviewer subagent should answer in the repository/user's requested language. If no language is specified, use clear, concise technical English.

1. Resumo geral da PR
   - what the change does in a few lines;
   - whether approval looks safe or requires changes before merge.

2. Achados
   For each finding, use exactly:

   **[Titulo do problema]**
   - **Impacto:** practical risk
   - **Onde esta o problema:** file, line, snippet, behavior, or pattern
   - **Por que isso e um problema:** technical reason
   - **Sugestao:** objective correction
   - **Severidade:** baixa, media, or alta

3. Evidencia revisada
   - changed files inspected;
   - deterministic scan signals considered;
   - tests or runtime probes evaluated.

4. Pontos de atencao adicionais
   - important non-blocking observations only.

5. Escopo nao revisado
   - anything relevant that was unavailable or intentionally skipped.

6. Veredito final
   - `Pode aprovar`
   - `Pode aprovar com ressalvas`
   - `Nao aprovar antes de ajustar`

## Escalation

This skill is the routine default gate. Escalate beyond the single independent review only when the changed surface requires it:

- security/auth/secrets/privacy/production/billing/fiscal/critical integration -> `security-reviewer`;
- Web UI, browser, authenticated web smoke, visual, or multi-step runtime UX -> main agent runs browser-use first; escalate to `qa-tester` only when the UI flow is too broad, flaky, accessibility-heavy, device/browser-matrix dependent, or needs independent judgment after main-agent QA evidence exists;
- MCP, connectors, tool schemas, tool-output trust, or approval modes -> `mcp-security-reviewer`;
- prompt-injection risk from external content -> `prompt-injection-reviewer`;
- CI/CD, release, rollback, migrations sequencing, or deploy operations -> `ci-deploy-reviewer`;
- weak or disputed evidence after the reviewer pass -> `test-auditor` or `observability-evaluator`.

Do not add extra reviewers by habit. Escalation needs a concrete trigger.
