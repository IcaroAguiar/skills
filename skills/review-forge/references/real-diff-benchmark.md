# Real-diff benchmark

## Purpose

Evaluate Review Forge and its engine routing with real open-source PR history.
Do not plant synthetic findings for promotion claims. Synthetic fixtures may
test parser failure or schema validation, but never reviewer quality.

## Corpus

Build at least 18 adjudicated merged PR cases:

- six with maintainer-backed simplification corrections;
- six with naming, responsibility, temporal-label, or magic-value corrections;
- six with documentation-impact corrections;
- hidden critical/high findings for both correctness and verification;
- multiple languages and small, medium, and large diffs;
- positive and accepted-state negative controls.

Each case pins:

- repository and PR URL;
- merge base/base SHA;
- pre-correction candidate SHA;
- accepted post-correction base/head range, canonical diff SHA-256, and stats;
  its base must equal the candidate base, preserving a full negative snapshot;
- issue/spec sources;
- immutable final-commit evidence plus GitHub merged-PR metadata;
- hidden known findings and acceptable correction properties;
- project-owned checks and documentation sources;
- license and retrieval status.

Store the full SHAs, retrieval timestamp, diff SHA-256 fingerprint, and observed
file/addition/deletion counts so the exact public artifact can be rechecked
without trusting a mutable PR page. The canonical bytes are the unmodified HTTPS
response from `https://github.com/<owner>/<repo>/compare/<base>...<head>.diff`,
requested with `Accept: text/x-diff` and `User-Agent:
review-forge-corpus-validator/1.0`. Hash those response bytes exactly; do not
substitute `git diff`, a patch endpoint, normalization, or a rendered PR page.
Count unified-diff `diff --git`, `+` (except `+++`), and `-` (except `---`)
lines for files, additions, and deletions. Exclude binary-only cases unless the
canonical collector gains an equivalent deterministic counter.

Candidate measures known-finding recall; accepted measures whether the reviewer
stops raising the corrected issue. Each head needs a direct repository commit URL
and remote PR association. An adjudicated case declares `acceptedFinality`:
`pr-head` is the last PR-commits API SHA; `merge-commit` is GitHub's
`merge_commit_sha` and records that final PR head as parent (or is the same SHA
for fast-forward). Its SHA equals `accepted.headSha`; `accepted.baseSha` equals
`candidate.baseSha`; and the PR is closed/merged with `merged_at`/`merged_by`.
PR commits and candidate-head-to-accepted-head compare prove order separately;
the validator rechecks those APIs, range bytes, and immutable acceptance evidence.

## Blind protocol

1. Freeze the repository and verify every SHA before the run.
2. Give the reviewer the candidate diff, request/spec, and repository context.
3. Hide PR discussion, accepted SHA, known findings, previous outputs, and score.
4. Score the independent output against hidden maintainer-backed findings.
5. Adjudicate novel findings separately; absence from maintainer comments does
   not automatically make a finding false.
6. Give accepted reviewer findings, but not the accepted patch, to the fixer.
7. Run project checks and a fresh reviewer on the fixer's result.
8. Review the accepted snapshot as a negative control.
9. Repeat selected engines enough to expose nondeterministic escapes.

## Metrics

Reviewer:

- known-finding recall by category and severity;
- blocker precision after adjudicating novel findings;
- critical/high escapes and severity calibration;
- five-gate receipt completeness;
- accepted-state false blocker rate (high/critical on accepted snapshots);
- wall time, tokens/cost when observable, and review rounds.

Fixer:

- first-pass acceptance by the fresh reviewer;
- behavioral regression and scope-creep rate;
- checks and documentation correctness;
- diff size and correction rounds;
- total expected cost including retries and escalation.

Engine routing:

- selected versus cheaper/stronger qualified candidates;
- cost saved against using the premium reviewer as fixer;
- escapes caused by routing;
- fallback and escalation correctness across harnesses.

## Promotion rule

Do not promote a prompt, engine, or routing change unless:

- no known critical/high finding regresses or escapes;
- targeted simplification, semantic, and documentation recall meets the corpus
  requirement;
- hidden ground truth covers critical/high correctness and verification findings
  (finding-level gates; the three six-case categories still drive per-gate recall);
- accepted-state false blockers do not worsen beyond the declared margin;
- fixer changes introduce no critical regression and meet acceptance targets;
- cost or latency improves without lowering the quality floor;
- Codex, Cursor, and Claude Code adapters report actual engines truthfully;
- results include median and worst-case across independent repeats, not one best run.

Keep discovery cases separate from adjudicated promotion cases. A real PR URL
without hidden ground truth and accepted-state control is useful exploration,
not promotion evidence.

Validate a discovery manifest with:

`node scripts/validate-real-diff-corpus.mjs templates/real-diff-corpus.example.json`

Run deterministic manifest-guard tests with:

`node scripts/test-real-diff-corpus.mjs`

Run the explicit network happy-path against the public discovery case with:

`node scripts/test-real-diff-remote.mjs --network`

Use `--verify-remote` to re-fetch discovery artifacts. It verifies repository/PR
association, the exact candidate compare diff, response-byte SHA-256, and the
recomputed stats. `retrievalStatus` alone is only a manifest claim.

Use `--promotion` only for the private adjudicated corpus. After manifest lint
it runs the remote gate, rejecting open/unmerged PRs, inverted or incoherent
ranges, intermediate accepted commits, and non-commit maintainer evidence. It
then enforces 18 cases, six per target category, language/size coverage,
critical/high correctness and verification findings, controls, unique PR/head
identities, and confined hidden ground truth. Ground truth must match the case
and ranges, have its own non-zero SHA-256, and include specific finding,
evidence, and correction metadata. Accepted snapshots need their own canonical
response-byte fingerprint, stats, and direct commit evidence. Keep ground truth
outside reviewer input.
