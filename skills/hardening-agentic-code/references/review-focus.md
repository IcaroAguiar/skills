# Review Focus And Collector Scope

Use this reference when the deterministic packet is noisy, when a finding needs triage, when tuning collector behavior, or when external tools/calibration are in scope.

## Review Focus

Find concrete issues that can cause bugs, regressions, operational risk, or maintainability debt. Do not force criticism when the code is correct.

When deterministic output is noisy, prioritize semantic and behavioral issues over style/context signals. Patch removal semantics, masked error state, enum normalization, unsanitized visual tokens, N+1, concurrency/idempotency, auth/privacy, contract compatibility, and missing runtime proof outrank magic-string and duplicated-literal findings. Magic-string, duplicated-literal, large-file, and SRP signals should become blocking only when verified as logic-bearing, contract-bearing, security-sensitive, or tied to a concrete regression risk; otherwise keep them in checkpoints or `Pontos de atenção adicionais`.

Prioritize:

- correctness and logic errors;
- structural simplification opportunities that preserve behavior while deleting incidental branches, wrappers, modes, or layers;
- maintainability pressure signals: spaghetti branching, unjustified large-file growth, thin abstractions, unsafe casts, layer leaks, duplicated helper logic, and brittle orchestration;
- missing validation at API, DTO, schema, component, command, or integration boundaries;
- authorization, tenant/org scoping, privacy, and sensitive-data handling;
- data consistency, race conditions, duplicate writes, idempotency, and transaction boundaries;
- raw SQL, unsafe query APIs, interpolated SQL, and SQL injection risk;
- unsafe HTML rendering, command execution with dynamic input, path traversal, sensitive-data logging, and other web/runtime security sinks;
- OWASP-style boundary risks: weak crypto, insecure HTTP, permissive CORS, unsafe cookies, SSRF, open redirects, upload validation gaps, webhook signature gaps, and auth endpoints without rate-limit signals;
- REST/API design risks: verb-oriented paths, mutating GET semantics, ambiguous mutation status codes, collection routes without pagination/filter/sort contracts, public APIs without a visible versioning strategy, and missing OpenAPI/consumer compatibility evidence;
- GraphQL/gRPC/WebSocket risks: resolver N+1 and unbounded reads, mutations without boundary controls, subscriptions/realtime streams without scope/backpressure, production introspection, protobuf compatibility/versioning gaps, and realtime handlers without auth/validation/rate limits;
- E2E and contract evidence risks: Cypress/Playwright/Istanbul critical-flow coverage below threshold, unreadable E2E reports, and failing OpenAPI/GraphQL/UI contract reports;
- UI semantics/accessibility risks: missing landmarks, image alternatives, labels, keyboard semantics, and button/link distinction;
- advanced accessibility/i18n risks: positive tabindex, incorrect ARIA, hidden interactive content, missing focus-visible styling, missing skip links, contrast/focus regressions, hardcoded UI strings outside message catalogs, plural/date/currency formatting gaps, and WCAG evidence gaps;
- observability and resilience: structured logs, request correlation IDs propagated through headers/context/logs, redaction, security/audit events, OpenTelemetry/metrics, external-call timeouts, retry/backoff, circuit breakers, and idempotent retry state;
- architecture/layering signals: dependency cycles, sensitive data crossing layers, direct persistence imports from presentation code, missing ports/interfaces, hidden coupling, and circular dependencies;
- async event/serverless behavior: idempotent consumers, deduplication, bounded retries, backoff, concurrency limits, timeout/memory limits, and safe reprocessing;
- runtime visual-contract integrity: enum membership normalization, honest icon/visual-style contracts, and sanitized CSS/branding tokens;
- UI performance risks such as network-on-input without debounce/cancellation, blocking render work, missing lazy/code-split boundaries, and missing bundle-size budgets for heavy dependencies;
- missing or weak regression coverage for the behavior changed.

## Deterministic Collector Scope

The collector is intentionally repository- and language-agnostic. It supports multi-repo packets, common source/test file conventions, package manifests and lockfiles across TypeScript/JavaScript, Python, Go, Ruby, Java/Kotlin, C#, Rust, PHP, Swift, SQL, shell, and related stacks.

It checks for signals, not final proof:

- N+1 and per-item query patterns in common ORMs/query clients;
- raw SQL and interpolated SQL injection risk;
- unsafe HTML/XSS sinks, dynamic shell command execution, user-controlled filesystem paths, and sensitive-data logging;
- weak cryptography, obsolete hash algorithms, insecure HTTP URLs, permissive CORS, cookies missing SameSite/Secure/HttpOnly, SSRF, open redirects, upload validation gaps, webhook endpoints without signature verification, auth boundaries without rate-limit signals, retries without backoff/timeout, and shared mutable state in async/concurrent contexts;
- REST/API route design signals for nouns/resources, method semantics, status codes, pagination/filter contracts, and versioning;
- GraphQL, gRPC/protobuf, and WebSocket/realtime contract signals for auth, pagination/complexity, compatibility, schema evolution, scope, and backpressure;
- UI semantic/a11y signals for landmarks, image alt text, input labels, keyboard-reachable controls, and correct action/navigation elements;
- advanced a11y/i18n signals for ARIA misuse, focus-visible gaps, positive tabindex, missing skip links, low contrast, and hardcoded UI text outside i18n/message APIs;
- observability/resilience signals for logs without correlation/redaction, missing correlation-id middleware/interceptors, security events without audit/metrics, external calls without timeout/retry/circuit breaker, and critical boundaries without instrumentation;
- final-phase detector sentinels for correlation-id boundaries, circuit-breaker signals, i18n extraction, low-contrast color pairs, and calibration feedback insights;
- E2E and contract report signals for Cypress/Playwright/Istanbul critical-flow coverage and OpenAPI/GraphQL/UI contract failures;
- event/serverless signals for consumers without idempotency/deduplication, workers without bounded retry/backoff/concurrency, and functions without timeout/memory/runtime limits;
- repository graph signals for local dependency cycles, sensitive data flowing from boundary files into persistence layers, and route/resolver paths that import query-in-loop behavior;
- documentation/coverage signals from available coverage reports, README, and CONTRIBUTING when API/runtime surfaces need documented endpoints, versioning, environment variables, examples, and review/test policy;
- architecture/layering signals for domain imports from outer layers, presentation importing persistence/data directly, missing port/interface boundaries, and UI rendering mixed with direct data access;
- string-only validation for configurable public fields, visual tokens, enums, statuses, roles, provider names, URLs, modes, or other runtime-controlling values.

The packet normalizes signals into `blocking`, `review-signal`, `runtime-required`, `user-input-checkpoint`, and `informational`. Use `references/maintainability-pressure.md` before turning style-like signals into findings.

## Optional External Toolbelt

Missing tools do not block by themselves. Installed tools are additive evidence and findings still need review against the code.

- `gitleaks`, `trufflehog`, and `git-secrets` for secrets;
- `semgrep` for security/code-smell patterns and Semgrep rule-defined fixes;
- `jscpd` for copy-paste duplication;
- `lizard` for complexity;
- `dependency-cruiser` or `madge` for JS/TS dependency cycles;
- `graphql-inspector` for opt-in GraphQL schema compatibility;
- `buf` for protobuf/gRPC lint and breaking-change checks;
- Java/Kotlin: `spotbugs` and `findsecbugs`;
- UI accessibility: `eslint-jsx-a11y` and opt-in `axe`;
- Docker/IaC: `trivy`, `checkov`, and `regula`;
- performance and DAST tools are opt-in only: `autocannon`, `wrk`, and OWASP `zap-baseline`, requiring `performanceTargets` or `dastTargets` in config and explicit `--external-tool`.

Suggested patches are dry-run review aids. They may come from built-in heuristics or Semgrep rule-defined fixes, but the agent must verify imports, framework conventions, tests, and runtime behavior before applying any patch.

## Project Config And Calibration

Use `.agentic-reviewrc.json` to disable noisy rules, override severity, tune thresholds, ignore generated paths, add business-specific questions, and set external tool timeouts.

Prefer a small `.agentic-reviewrc.json` or the built-in self-scan defaults over manually filtering reports when a repository contains detector fixtures, golden examples, or intentionally vulnerable test cases.

Use `docs/ai/quality-gate/quality-gate.config.json` for CI ratchet thresholds, baseline comparison, report paths, required checks, and repo-specific quality policy.

Important config fields:

- `appType` for adaptive thresholds.
- `domainCatalogs` for built-in LGPD/privacy, finance, health, e-commerce, education, social media, and IoT review questions.
- `customDomainQuestions` to add project-specific catalogs without changing the skill.
- `dastTargets`, `performanceTargets`, and `a11yTargets` only for explicit staging/load-test/accessibility workflows.
- `graphqlBaseSchema`, `graphqlHeadSchema`, and `bundleStatsPath` only with explicit selected tools such as `graphql-inspector` and `webpack-bundle-analyzer`.
- `e2eCoverageReportPaths`, `contractTestReportPaths`, `criticalFlowKeywords`, `e2eCoverageMin`, and `contractPassRateMin` to read Cypress/Playwright/Istanbul and contract test artifacts.
- `coverageLinesMin` to tune coverage-report checkpoints.
- `reviewFeedbackPath` and `--feedback-file` to feed reviewer calibration records.

Use `agentic-code-review calibrate --repo <path> --case <name>:<base>:<head>` to run historical PR/commit windows. Use `--feedback-file <json>` with `templates/reviewer-feedback.example.json` shape to aggregate reviewer-marked false positives, false negatives, and severity mismatches. Use `--json` only when a reviewer, dashboard, or rule-debugging workflow needs the full packet.

When materially changing scanner behavior, record false positives, false negatives, severity mismatches, and calibration feedback insights before changing the skill.

Scanner output must be verified against the real code before becoming a review finding. For concurrency, N+1, unbounded queries, idempotency, rollback, and regression claims, prefer repo-native tests or probes that instrument the real production path and fail when the risk is present.
