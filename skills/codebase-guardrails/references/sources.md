# Sources and evidence strength

Research compiled on 2026-10-12. "Consensus" means the main practitioner references agree; it does not mean a controlled study exists.

| Rule | Evidence | Sources |
|---|---|---|
| Test behavior, not methods; prefer state verification over interaction verification | Strong practitioner consensus | Google, *Software Engineering at Google*, ch. 12: https://abseil.io/resources/swe-book/html/ch12.html. Fowler, *Mocks Aren't Stubs*: https://martinfowler.com/articles/mocksArentStubs.html |
| Implementation-detail tests cause false negatives and false positives | Consensus | Kent C. Dodds: https://kentcdodds.com/blog/testing-implementation-details |
| Real database for the ORM layer; mock only the network | Vendor guidance and consensus | Prisma integration testing: https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing. MSW philosophy: https://mswjs.io/docs/philosophy/ |
| Test shape: pyramid, trophy or honeycomb; define the terms per team | Contested ratios, no controlled study | Fowler: https://martinfowler.com/articles/practical-test-pyramid.html. Dodds: https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications. Spotify: https://engineering.atspotify.com/2018/01/11/testing-of-microservices. Rainsberger: https://blog.thecodewhisperer.com/permalink/integrated-tests-are-a-scam |
| Test desiderata as a checklist | Expert framework | Kent Beck: https://testdesiderata.com/ |
| Coverage as a diagnostic, not a mandate | Practitioner guidance | Google Testing Blog (2020): https://testing.googleblog.com/2020/08/code-coverage-best-practices.html |
| Mutation testing is worth it on the critical domain, run incrementally | Industrial evidence (Google, ICSE 2021); no cost benchmark for JS/TS | https://arxiv.org/abs/2103.07189. StrykerJS incremental mode: https://stryker-mutator.io/docs/stryker-js/incremental/ |
| Flaky tests are defects; around 1% flakiness erodes trust | Google data | SWE book, ch. 11: https://abseil.io/resources/swe-book/html/ch11.html |
| Agent-written tests over-mock and have weak oracles | Preprints, 2026, not peer reviewed | Hora & Robbes, MSR 2026 (36% of agent commits add mocks vs 26%): https://arxiv.org/abs/2602.00409. "All Smoke, No Alarm" (about 80% weak or absent oracles): https://arxiv.org/pdf/2606.18168. Counterpoint with similar assertion strength but more flakiness: https://arxiv.org/abs/2607.12068 |
| Give agents executable verification and fresh-context review | Vendor guidance | Claude Code best practices: https://code.claude.com/docs/en/best-practices |
| Testing Library and Vitest lint rules | Tool documentation | https://github.com/testing-library/eslint-plugin-testing-library, https://github.com/vitest-dev/eslint-plugin-vitest, https://biomejs.dev/linter/rules/no-focused-tests |
| Small snapshots only | Practitioner guidance | Dodds: https://kentcdodds.com/blog/effective-snapshot-testing |
| Functional core with an imperative shell; colocation | Practitioner guidance | Bernhardt: https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell. Dodds: https://kentcdodds.com/blog/colocation |
| Boundary enforcement | Tool documentation | dependency-cruiser: https://github.com/sverweij/dependency-cruiser. eslint-plugin-boundaries: https://github.com/javierbrea/eslint-plugin-boundaries |
| Lint rules over the syntax tree instead of regex counters | Tool documentation plus local measurement (a production TypeScript monorepo, October 2026) | oxlint: https://oxc.rs/docs/guide/usage/linter. Field notes in [oxlint-test-rules.md](oxlint-test-rules.md) |
| File size limits | No objective maximum, a local policy | ESLint `max-lines`: https://eslint.org/docs/latest/rules/max-lines |
| Contract tests: shared schemas vs Pact | Weakly evidenced (vendor syntheses); Pact pays off with independent deploys | https://www.speakeasy.com/blog/pact-vs-openapi, https://pactflow.io/blog/contract-testing-using-json-schemas-and-open-api-part-1/ |

Field evidence from a production TypeScript monorepo (October 2026), as context for these rules:
- Roughly 4,500 green tests coexisted with 13 UX defects found by exploratory QA in one round.
- Eight platform routes in production required no authentication.
- The PR quality workflow had been disabled since 2026-10-02.
- 106 real-DB tests never ran because no script set their env flags.
- 470 type errors were hidden in test files.
