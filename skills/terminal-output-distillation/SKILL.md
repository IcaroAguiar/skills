---
name: terminal-output-distillation
description: Compress large terminal output before passing it to the main model. Use when command output is verbose and the task only needs a conclusion, extraction, prioritization, or shortlist. Do not use when literal fidelity matters, such as security review, migrations, exact stack traces, XML or JSON contract debugging, fiscal payloads, or compliance evidence.
---

# Terminal Output Distillation

## Goal

Reduce token waste and context pollution from verbose shell output while preserving enough signal for the task.

## Decision rule

Use this skill only when all conditions are true:
1. the command output is large or noisy
2. the user task does not require exact literal output
3. the result can be expressed as a focused extraction, conclusion, ranking, or shortlist

Do not use this skill when:
- exact lines matter
- order of lines matters
- debugging depends on literal stack traces
- reviewing migrations, security-sensitive diffs, contracts, XML, JSON, or fiscal payloads
- the output will be used as formal evidence

## Workflow

1. Prefer deterministic filtering first.
2. Only if output is still too large, compress it.
3. Ask for a precise extraction target in the compression prompt.
4. If the compressed result looks incomplete or suspicious, re-run with:
   - narrower filters
   - a better extraction target
   - or raw output

## Deterministic filters first

Always try one or more of these before compression:
- `rg`
- `grep`
- `jq`
- `head`
- `tail`
- `sed -n`
- path filters
- exact test selection
- exit code inspection

Examples:
- `pnpm test -- --runInBand path/to/spec`
- `rg -n "membership|invite|tenant" apps packages`
- `jq '.advisories // .vulnerabilities' audit.json`
- `tail -n 200 build.log`

## Compression rules

When compression is needed:
- keep `set -o pipefail` enabled when relevant
- preserve the original command in your reasoning
- write the extraction target as a concrete question
- prefer actionable structured output over generic prose
- keep the result short and decision-oriented

Good extraction prompts:
- `Did the tests pass? If not, list failing tests and the first likely root cause.`
- `List only high and critical vulnerabilities with package, severity, and fix availability.`
- `From this diff, identify changed modules, intent of each change, and any risky files.`
- `From these grep results, shortlist the files most likely to contain the invite workflow.`

Bad extraction prompts:
- `Summarize this`
- `What do you think about this output?`
- `Explain everything`

## Example patterns

### Large test output

```bash
set -o pipefail
pnpm test 2>&1 | distill "Did the tests pass? If not, list failing suites, failing tests, and the first actionable root cause."
Broad code search
set -o pipefail
rg -n "membership|invite|tenant" apps packages 2>&1 | distill "Which files are most likely to own the invite and membership flow? Return a ranked shortlist with reason."
Audit output
set -o pipefail
npm audit --json 2>&1 | distill "Extract only high and critical vulnerabilities. Return package, severity, direct or transitive, and fix availability."
Noisy build log
set -o pipefail
pnpm build 2>&1 | distill "Did the build succeed? If not, show the first real error, likely cause, and the file or package involved."
````

### Anti-patterns

- `Do not use distill for:`

- `exact stack traces that still need diagnosis`

- `schema or migration review`

- `fiscal XML or provider payload inspection`

- `contract debugging where literal JSON or XML matters`

- `security review where raw evidence is required`

- `compliance, audit, or incident evidence`

### Output preference

Return:

 - `decision first`

 - `shortest actionable answer possible` 
  
- `file paths or identifiers when useful`

- `no long prose`

- `no payload dump unless explicitly requested`

### Escalation

If compression produces ambiguity:

 - `narrow the command`

 - `use deterministic filters again`

- `fall back to raw output`
