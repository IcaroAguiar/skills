# Test rules with oxlint

Proven on a production TypeScript monorepo (October 2026): oxlint 1.85+, Jest and Vitest suites. A full test tree lints in under half a second.

## Two tiers in one config

Use a dedicated config (`.oxlintrc.tests.json`) with an override for test files, so production code is not affected:

```json
{
  "plugins": ["jest", "vitest"],
  "categories": { "correctness": "off" },
  "jsPlugins": ["./scripts/oxlint/test-smells-plugin.mjs"],
  "overrides": [{
    "files": ["**/*.test.ts", "**/*.test.tsx"],
    "rules": {
      "jest/expect-expect": ["error", { "assertFunctionNames": ["expect", "expect*", "assert*", "request.**.expect"] }],
      "jest/no-identical-title": "error",
      "jest/no-standalone-expect": "error",
      "jest/no-conditional-expect": "warn",
      "qf-tests/no-internal-mock": "warn",
      "qf-tests/no-class-assertion": "warn"
    }
  }]
}
```

- **Errors** fail directly: `oxlint -c .oxlintrc.tests.json --quiet <dir>`. Only rules already at zero go here, after fixing the few real hits.
- **Warnings** are debt: run `oxlint -f json`, count diagnostics per file and rule, and feed the per-file ratchet.
- Use globs that start with `**/`. A glob such as `test/**` is resolved against the config's directory and silently misses files elsewhere, including fixtures in a temp dir.

## Local plugin

Project smells that no built-in covers go in a local JS plugin (ESLint-style `create(context)` visitors):
- `vi.mock` or `jest.mock` of an internal module, with the network boundary allowed;
- `querySelector`, `container.x` and `view.container.x`, and `data-*` selectors in strings, template literals, regex literals and JSX attributes;
- a banned matcher such as `toHaveClass`, matched on the member name so `.not`, `expect.soft` and `.resolves` forms count (`jest/no-restricted-matchers` misses `expect.soft`);
- `as never` / `as unknown as` (`TSAsExpression` with `TSNeverKeyword`, or nested over `TSUnknownKeyword`);
- assertions on ORM or repository call shapes (`expect(repo.create).toHaveBeenCalledWith(...)`); use `context.filename` to scope a rule to some files;
- `describe.skip` references outside the real-DB helper.

Guard the measurement against false zeros:
- throw when oxlint prints no JSON (it says "No files found") or lints zero files, and include its stderr;
- throw on a diagnostic without a rule code, which is a file oxlint could not parse;
- in the ratchet, fail when the measurement is empty but the baseline is not. That catches an override glob that stopped matching, which otherwise looks like "all debt paid".

Test the measurement end to end: write a fixture file to a temp root, run the real oxlint, and assert the counts. Include a comment that mentions a smell (it must not count) and a run over an empty directory, which must throw: oxlint then prints "No files found" instead of JSON.

## Migrating from regex counters

1. Map each regex category to a rule and keep the category names, so the baseline keys stay valid.
2. Compare the new counts with the baseline per file. Expect equal or lower counts (regex also counted comments) and a few higher ones where regex missed syntax, such as `querySelectorAll<HTMLElement>(`.
3. New categories and regex blind spots enter the baseline by hand, in the same PR, listed in the commit message. The ratchet's update command must keep refusing growth.

## Known false positives

- `expect-expect`: supertest `.expect(201)` (name every request variable: `request.**.expect`, `supertest.**.expect`, `agent.**.expect`), helpers like `expectConstraintViolation` or a throwing `waitFor`, and tests whose assertion is "does not throw". Configure `assertFunctionNames`, or assert a real outcome. Never add a tautology just to satisfy the rule, such as `expect(flag).toBe(true)` right after a wait that already guarantees it.
- `no-standalone-expect`: tests declared through `cond ? it : it.skip`. Keep it as debt, or name the wrapper in `additionalTestBlockFunctions`.
- `valid-expect`: a deferred `const rejection = expect(p).rejects...; await rejection` and Vitest's message argument `expect(value, 'message')`. Leave it off for Vitest.
- `no-conditional-in-test`: too noisy for parametrized tests; leave it off.
