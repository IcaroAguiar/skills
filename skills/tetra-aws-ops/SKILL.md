---
name: tetra-aws-ops
description: Use when any agent or harness needs to manage, inspect, diagnose, or operate AWS resources for Tetra services, especially ECS, CloudWatch logs, task definitions, service health, deployment diagnostics, AWS CLI profile setup, region/account checks, or requests mentioning AWS plus Tetra. Invoke implicitly for "AWS da Tetra", "ECS Tetra", "servicos da Tetra na AWS", "CloudWatch Tetra", task definition/env diagnosis, production service inspection, deploy stabilization, or validating local AWS CLI access for Tetra.
---

# Tetra AWS Ops

Use this skill for Tetra-specific AWS operations across Codex, Claude, Cursor, OpenCode, and other local harnesses that can read shared skills. Keep actions evidence-driven, least-privilege, and explicit about side effects.

Canonical location: `/Users/icaroaguiar/.agents/skills/tetra-aws-ops`. Harness-specific skill folders should symlink to this directory instead of copying it.

Defaults:
- AWS CLI profile: `tetra`
- Region: `us-east-2`
- Account: `780136995828`
- ECS cluster: `tetra-educacao-ecs-prod`
- Validated role pattern: `AWSReservedSSO_TetraAdmin_*`

## Safety Contract

- Never print, paste, store, or summarize AWS secret values, session tokens, cookies, private keys, or full env values.
- Use explicit `--profile tetra --region us-east-2` for AWS CLI commands unless the user explicitly selects another profile or region.
- Prefer temporary/federated credentials and role-based access. Treat long-lived access keys as a fallback that must stay in local AWS credential files only.
- Treat CloudWatch logs and task definitions as sensitive. Redact tokens, API keys, authorization headers, passwords, and env values before showing output.
- Read-only inspection is allowed. Any write operation requires explicit user confirmation after showing the exact command and risk:
  - ECS: `update-service`, `run-task`, `stop-task`, `register-task-definition`, `deregister-task-definition`
  - IAM/SSM/Secrets Manager changes
  - scaling, restart, deploy, rollback, deletion, or any production mutation
- Do not deploy or mutate production just because credentials work.
- Treat Terraform/IaC as the preferred path for infrastructure mutations. Before changing ECS services, task definitions, IAM, SSM, Secrets Manager, networking, load balancers, or persistent infrastructure directly with `aws`, first look for the approved Terraform/OpenTofu/Terragrunt source and use a reviewable plan/apply workflow when it exists.
- If no Terraform source is available in the current checkout, report that gap and use AWS CLI only for read-only discovery or explicitly confirmed emergency/manual operations.

## Standard Workflow

1. Confirm identity before meaningful AWS work:
   - `aws sts get-caller-identity --profile tetra --region us-east-2`
2. Confirm target:
   - account is `780136995828`
   - region is `us-east-2`
   - cluster is usually `tetra-educacao-ecs-prod`
3. For ECS issues, inspect in this order:
   - service list or exact service name
   - `describe-services` health, deployments, events
   - running/stopped task IDs and stopped reasons
   - sanitized task definition command/image/env names/log config
   - recent redacted CloudWatch logs
4. Compare AWS runtime truth with repository truth before concluding:
   - Dockerfile/CMD vs task definition command
   - required env schema vs task definition env/secrets names
   - current remote branch vs local checkout when behavior is surprising
5. Before any proposed mutation, identify the intended change path:
   - Terraform/IaC plan when managed there
   - repository deploy workflow when it owns only application rollout
   - explicit manual AWS command only when neither managed path exists or an emergency exception is approved
6. Report concrete evidence: command class, account/region, service/task IDs, deployment status, stopped reason, log group, and redacted snippets.

## Helper Script

Use the bundled read-only script for common inspection:

```bash
python3 "/Users/icaroaguiar/.agents/skills/tetra-aws-ops/scripts/tetra-aws" whoami
python3 "/Users/icaroaguiar/.agents/skills/tetra-aws-ops/scripts/tetra-aws" clusters
python3 "/Users/icaroaguiar/.agents/skills/tetra-aws-ops/scripts/tetra-aws" services
python3 "/Users/icaroaguiar/.agents/skills/tetra-aws-ops/scripts/tetra-aws" service <service-name>
python3 "/Users/icaroaguiar/.agents/skills/tetra-aws-ops/scripts/tetra-aws" tasks <service-name>
python3 "/Users/icaroaguiar/.agents/skills/tetra-aws-ops/scripts/tetra-aws" taskdef <service-name>
python3 "/Users/icaroaguiar/.agents/skills/tetra-aws-ops/scripts/tetra-aws" logs <service-name> --minutes 30 --limit 50
```

The script only runs read-only AWS APIs and sanitizes task definition/log output. Use raw `aws` CLI only when the script does not cover the inspection needed.

## Tetra Runtime Guardrails

- For `tetra-iam` ECS startup failures, verify the task definition command before chasing env/SSM hypotheses. Known good entrypoint pattern is `node dist/main.js`; `dist/src/main.js` is a known bad path for this repo family.
- For `tetra-enrollments` auth failures, verify IAM runtime env names and issuer settings in ECS. The canonical IAM issuer is `https://iam.tetraeducacao.com.br`.
- If local repo behavior contradicts production, verify remote default/prod branch and AWS runtime state before designing changes.
- ECS deploy workflows may force a new deployment without updating task definition envs. Inspect task definition revisions and service deployments directly.
- No local Terraform files were found under `/Users/icaroaguiar/dev/tetra` when this skill was created on 2026-06-11. Re-check before concluding Terraform is absent; the IaC source may live in a separate infra repository or private workspace.

## Local AWS access (2026-06-12)

- Working admin profile in `~/.aws/credentials` is `780136995828_TetraAdmin` (portal/temporary creds: access key + secret + `aws_session_token`, expires; re-paste from the AWS access portal when expired). The skill's historical default `tetra` profile is often expired and is NOT SSO-configured (`aws sso login` fails: missing `sso_start_url`). Prefer `--profile 780136995828_TetraAdmin`.
- The Bash environment pipes `aws` output through RTK (compresses JSON values to `string[len]`), breaking `json.load`. Use `rtk proxy aws ...` to get raw JSON.

## Local Terraform / IaC

- A local OpenTofu workspace was bootstrapped at `/Users/icaroaguiar/dev/tetra/tetra-infra` (provider profile var defaults to `780136995828_TetraAdmin`, region us-east-2, local state). It is a partial adoption: import resources incrementally, and always confirm `tofu plan` shows zero drift before trusting/applying. Tool: `tofu` (OpenTofu 1.12.x, installed via brew).
- IMPORTANT: prod resources carry a `ManagedBy=terraform` tag, so a CANONICAL Terraform source exists elsewhere (not under `~/dev`). Local changes can be reverted by the canonical TF — mirror any change into the canonical source, or locate it before mutating.

## WAF (tetra-educacao-waf-prod, REGIONAL, on the imports ALB `tetra-educacao-alb-prod`)

- The WebACL runs AWS managed rule groups (CommonRuleSet, KnownBadInputs, SQLi) that inspect the request BODY. Binary uploads (PDF/images) false-positive XSS/SQLi signatures → 403 (HTML `server: awselb/2.0`, before the app). The `imports` host is direct ALB (no CloudFront/Cloudflare); `enrollments` is behind Cloudflare.
- Upload routes are exempted by the `AllowImportsImagesPost` rule = host `imports.tetraeducacao.com.br` + POST + UriPath in regex set `tetra-educacao-waf-prod-imports-upload-paths` (id `22d00e83-...`). That set listed only `^/images$`, `^/materials$` — `^/contracts/pdf$` was missing, which 403'd contract template uploads. Fix = add the path to the set (managed at `tetra-infra/waf.tf`).

## References

- Read `references/ops.md` for command examples, investigation recipes, and source links.
