---
name: merge-gate
description: >-
  Land or escalate your own PRs by risk so none sits forgotten: a PR you opened or pushed to with green CI and an approved independent review, and the scheduled sweep of stale PRs. Writing PR bodies: pr.
---

# Merge gate

Every open PR ends **landed** (merged, and any deploy it triggers watched to green), **escalated** (in front of the user so they cannot miss it), or **held** (the user said to wait, or a stack layer whose base is still open). "Aguardando merge" is none of the three.

## 1. Read the PR

```bash
gh pr view <pr> --json number,url,isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,files,baseRefName
```

Know the CI state on the head SHA, whether the review this change owes approved, unresolved threads, mergeability, and the risk class judged from the diff. `reviewDecision: REVIEW_REQUIRED` or `mergeStateStatus: BLOCKED` means the repository wants a person: escalate and name whose review it waits on.

## 2. Classify the risk

**Risky** means data, auth, money and billing, safety-critical values, a migration, deploy or CI, plus secrets or environment configuration and a one-way architecture decision the user has not approved. Everything else is **routine**.

## 3. Land or escalate

- **Review owed and missing**: run `code-review`, then start this gate again.
- **Routine, CI green, owed review approved, no open threads, mergeable**: land it under standing authorization. A stack lands with one `gh stack merge <top PR> --yes`; otherwise `gh pr merge <pr> --squash` (or the repository's usual method). Watch any deploy it triggers until green; a failed deploy is escalated at once. The PostToolUse hook `scripts/closeout_after_merge.py` then reminds you to run `task-closeout`.
- **Risky, blocked by repository rules, or failing a condition you cannot fix**: escalate.

**To escalate**, send a one-line push notification first when the harness has one (`PushNotification`), then a **blocking question** (`AskUserQuestion` in Claude Code, `request_user_input` in Codex) in the user's language that stands alone: PR link and title, risk class and why, CI and review state, what merging triggers ("publica em produção"). Options: **Mergear agora (Recomendado)** when the evidence supports it, **Segurar**, **Fechar**. Without a question tool, the escalation is the first line of your final message and the notification is mandatory.

## Sweep

The scheduled sweep runs this gate over all of the user's open PRs:

```bash
gh search prs --author @me --state open --json repository,number,title,url,updatedAt,isDraft --limit 100
```

- Open more than 2 days: land the routine ones that meet every condition, escalate the rest.
- Drafts untouched more than 7 days: ask whether to resume, close or keep each.

Escalate in batches of up to four questions per call, highest risk and oldest first, until every escalated PR has an answer. End with a table of landed, escalated and held PRs, or one line when nothing is stale.
