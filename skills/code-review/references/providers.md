# Providers, fallback and the review ledger

Every model call the review makes goes through one layer, whatever the account,
harness or model: T1's lenses, the deep reviewer and the fixer. It answers three
questions the same way everywhere:

- **Who may see this code?** The repository's *front* (an account boundary) in
  the private policy.
- **Who answers now?** That front's candidates for the role, in order, skipping
  providers that are limited, logged out or the author's own model.
- **Was it worth it?** The ledger: cost, latency and cache use per call, and what
  happened to each finding.

```bash
node scripts/review-run.mjs --role review -C <repo> --base <base-sha> --author-model <model|human> --prompt p.md --out r.md [--effort high]
node scripts/review-run.mjs --role review -C <repo> --base <old-head> --author-model <model|human> --prompt delta.md --out d.md --resume <call> --fresh-prompt full.md --full-base <base-sha>
node scripts/review-run.mjs --role fix    -C <repo> --prompt fix.md --out f.md
node scripts/review-run.mjs --plan --role review -C <repo> --author-model <model|human>   # candidates, calls nothing
node scripts/review-ledger.mjs triage --t1 <t1-report> --decisions d.json
node scripts/review-ledger.mjs triage --call <call> --decisions d.json
node scripts/review-ledger.mjs record --front <front> --role review --provider <id> --status limit --until <iso>   # T3 calls
node scripts/review-ledger.mjs stats [--since 30] [--role t1]
node scripts/review-ledger.mjs limits
node scripts/review-ledger.mjs clear <provider> --front <front>
```

## The policy

`~/.config/agent-review/policy.json` (or `$AGENT_REVIEW_POLICY`) is private to
the machine and never published. Without it, T1 keeps its built-in lenses
(Sonnet at medium effort and Haiku on the caller's `claude`, with cooldowns
scoped to that CLI's path) and `review-run` refuses to run.

```json
{
  "version": 1,
  "fronts": [
    {
      "name": "work",
      "match": { "paths": ["~/dev/work"], "remotes": ["github.com/WorkOrg/"] },
      "providers": {
        "codex-sol":  { "kind": "codex",  "bin": "/abs/work-codex",  "model": "gpt-6.1-sol",
                        "t3": { "providerInstanceId": "codex-work", "model": "gpt-6.1-sol" } },
        "sonnet":     { "kind": "claude", "bin": "/abs/work-claude", "model": "claude-sonnet-5-5", "effort": "high" },
        "sonnet-med": { "kind": "claude", "bin": "/abs/work-claude", "model": "claude-sonnet-5-5", "effort": "medium" },
        "haiku":      { "kind": "claude", "bin": "/abs/work-claude", "model": "claude-haiku-5-5" }
      },
      "roles": {
        "t1":     [[{ "split": ["sonnet-med", "sonnet"] }], ["haiku"]],
        "review": ["codex-sol", "sonnet"],
        "fix":    ["codex-sol", "sonnet"]
      }
    }
  ]
}
```

- **Fronts.** The first front whose `paths` contain the repository wins. If no
  path matches, the remotes decide: every `git remote` URL is normalized
  (`git@github.com:Org/x.git` → `github.com/org/x`) and compared by prefix. Two
  fronts matching (a fork of another account's code) stop with an error until
  `--front` names the owner. No match also stops. A front with
  `"match": {"any": true}` catches everything else, so leave it out when the
  default must be to refuse.
- **Providers.** One model on one account's CLI. `bin` must be an absolute path
  to that account's CLI or wrapper: a bare `claude` or `codex` inherits whichever
  account the caller runs as. `effort` is the provider's default. For `review`
  and `fix`, `--effort` overrides it, and so does T0's route for the same tree:
  the route's level for a full review, one level below for a delta (`--resume`),
  and `high` for a fix (`medium` when the route is `medium`). `t3` is what a T3 orchestrator passes to
  `delegate_task` for the same provider. `allowedTools` (Claude `fix` only) adds
  permission rules such as `Bash(pnpm test:*)`; `writableRoots` (Codex `fix`
  only) adds writable directories.
- **Roles.** `review` and `fix` are ordered candidate lists. `t1` is a list of
  lens slots that run in parallel, each with its own candidate list. An entry
  `{"split": [a, b]}` is an A/B test: each head gets one arm (the same one on a
  rerun) and the other arm becomes its fallback. The ledger records the arm.
- **Order is the policy's judgement.** Put the strongest trusted reviewer first,
  then others trusted for the role, preferring another subscription or model
  family over a weaker model. Never add a model to a role to have more fallback:
  a role nobody is trusted for is `BLOCKED`, and lowering the bar is the user's
  decision.

| Kind | Roles | How it runs |
| --- | --- | --- |
| `claude` | t1, review, fix | `claude -p --output-format json`, no MCP, every unapproved permission denied. t1 and review: `Read,Grep,Glob` only, with no shell and not even git, because prefix rules cannot stop `git diff --output=<file>` from writing. Pass `--base`, and the diff comes in the prompt. The review session is kept for deltas. fix: `acceptEdits` plus `allowedTools`. |
| `codex` | t1, review, fix | `codex exec --json`, sandbox `read-only` (t1 ephemeral) or `workspace-write` for fix; deltas use `exec resume`. The sandbox, not the prompt, keeps a reviewer read-only. |
| `agy` | t1 | `agy -p --sandbox`, prompt on argv. Headless agy denies every command, so it reviews only what the prompt carries (T1 sends the changed files). |
| `command` | t1, review | `sh -c`, prompt on stdin, answer on stdout. Make it read-only yourself. As a reviewer it needs `model`, so independence can compare it. |

## Fallback

| Status | Meaning | Next |
| --- | --- | --- |
| `ok` | answered | stop |
| `limit` | rate or usage limit (HTTP 429, "usage limit", quota) | next candidate; this provider cools down until the reset the CLI states, else 30 min |
| `auth` | logged out or rejected credentials | next candidate; cools down 10 min |
| `transient` | overloaded, 5xx, dropped connection | retry once, then next candidate |
| `empty` | the turn ended with no answer and no model output | next candidate, no cooldown. Codex does this (exit 0) when its provider silently drops the input; `claude -p` does it when a `UserPromptSubmit` hook blocks the prompt, printing the hook's message as if it were the answer. A string shaped like a credential in the diff is enough for either, and a dropped message stays in the Codex session, so later resumes of that session come back empty too: start a fresh review. Build fake credentials in tests at run time instead of writing them as literals. |
| `timeout`, `error` | the call itself failed | stop: another account would most likely fail the same way, and a slow reviewer is not a capacity problem |

Fallback never leaves the front, so it can never move code to another account.
Cooldowns live in the ledger and are shared by every harness on the machine:
when one session hits a limit, the next session skips that provider without
spending a call. They are keyed by front and provider id (`work/sonnet`), so one
account's limit never blocks another account's provider of the same name.
`review-ledger limits` shows them; `clear <provider> --front <front>` ends one
early (after a login, say).

**`--base`** appends `git diff <base>...HEAD` and its commit list to the prompt
Use it on every review: it saves the round trip in which the reviewer would fetch
the diff, and a Claude reviewer has no other way to see it. For a delta, pass the
old head. Over 400 KB the prompt gets a `--stat` instead, and only candidates
that can run git themselves (Codex) may take the review; the others are skipped
with that reason.

**Independence.** `--author-model` drops every candidate of the author's model
(Claude aliases and versions count as one: `sonnet` = `claude-sonnet-5-5`).
A front with `"independence": "vendor"` drops the author's whole vendor instead,
so Claude work always gets a GPT reviewer and the other way round. A review
refuses to start without `--author-model` (`human` for a person's change):
otherwise the first fallback could land on the author's model.

**Deltas.** `--resume <call>` continues that call's session on the same provider,
for the same role, and only while that provider is still a candidate for the role
and independent from `--author-model`. Sessions never cross providers. If that
provider is unavailable, `review-run` exits 3, unless `--fresh-prompt` gives a
self-contained full-review prompt (the original brief, the earlier findings, the
triage and the fix) and `--full-base` the original base. Then the next candidate
does a fresh full review of `git diff <full-base>...HEAD`, and the output says
`FRESH`.

**T3.** A T3 orchestrator delegates instead of shelling out. Run
`review-run --plan --role review --author-model <model>` for the ordered candidates and their `t3`
targets, delegate to the first available one, and record the outcome with
`review-ledger record` (a `limit` with `--until` cools the provider for
everyone). On a limit, take the next candidate from the plan.

## The ledger

`~/.local/state/agent-review/ledger.jsonl` (or `$AGENT_REVIEW_STATE`), mode 600.
It holds metadata only. A failure is stored as its status, HTTP status, exit code
and the known pattern that matched (`limit, exit 1, "usage limit"`), never the
CLI's text, which can hold part of an answer. Otherwise it records the
repository name, head, provider, model (the requested one and, for Claude, the
resolved version), effort, status, duration, turns, cost in USD (Claude), tokens
split into input, output, cache read, cache write and reasoning, the session id,
and finding titles and locations. Prompts, diffs and answers never go in.

**Triage is the quality signal.** Every finding gets one decision, borrowed from
Anthropic's review classes:

| Decision | Use when |
| --- | --- |
| `fixed` | the author changed the code (with a test when behaviour changed) |
| `wrong` | the finding is false; the reason gives the evidence |
| `intentional` | the behaviour is deliberate; the reason says where it is decided |
| `irrelevant` | true but not worth acting on in this change |
| `deferred` | real, left for later (fails safely, or the fix needs its own scope) |

Every decision except `fixed` needs a reason. A decisions file is checked whole
before anything is written. To correct a decision, triage the finding again:
`stats` keeps only the newest decision per finding. For T1, the decisions file
lists spot numbers from the report (`#1`, `#2`, ...). For a deep review, it lists the
findings with severity, title, file and line, plus `preexisting: true` for bugs
the change did not introduce.

**`stats`** groups calls and decisions by role, provider, model, effort and A/B
arm: calls, successes, limits, p50/p90 time, median turns, cost per review
(everything the provider spent, failed attempts included, divided by the
reviews it delivered),
cache-read share of the prompt, decisions, the **acted-on rate** (`fixed` ÷
decided), the `wrong` rate, and serious fixed findings per review. The authors'
edits are the signal Cloudflare used. Two caveats apply: an edit does not prove a
finding right, and small groups (tens of findings) have wide error bars. Compare
configurations on the same kind of work before you change the policy.

**What to change, and on what evidence.**

- **Effort.** A higher effort that costs more per run but raises *serious fixed
  findings per review* is worth it: Cloudflare paid +61% for +58% acted-on
  serious findings at about two cents per review. A lower effort that keeps the
  acted-on rate but loses serious fixed findings is not.
- **Model version.** Under the same per-token price, a newer version can cost
  far less per run because it makes fewer calls. Compare `turns` and cost per
  review per resolved model.
- **Turns.** Many turns with one tool call each mean the prompt is missing
  context. T1 sends the changed files, so its median should stay at one or two.
  For the deep reviewer, put what it would look up into the prompt.
- **Cache share.** It should be high from the first request. A low share means
  something variable sits early in the prompt.
- **Offline replay.** `review-eval` replays escaped bugs and known-clean changes
  against a configuration before it reaches the policy (`references/t1.md`).
  Its calls go to a separate ledger (`<state>/eval/`), so replays never skew
  the live numbers.
