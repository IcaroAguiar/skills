# Tetra AWS Ops Reference

This file holds operational details for Tetra AWS work. Load it when a task needs concrete commands, ECS/CloudWatch investigation, or CLI setup checks.

## Defaults

- Profile: `tetra`
- Region: `us-east-2`
- Account: `780136995828`
- ECS cluster: `tetra-educacao-ecs-prod`
- Output: `json`

Use explicit flags:

```bash
aws <service> <operation> --profile tetra --region us-east-2 --output json
```

## Safe Read-Only Commands

Identity:

```bash
aws sts get-caller-identity --profile tetra --region us-east-2
aws configure list --profile tetra
```

ECS:

```bash
aws ecs list-clusters --profile tetra --region us-east-2
aws ecs list-services --cluster tetra-educacao-ecs-prod --profile tetra --region us-east-2
aws ecs describe-services --cluster tetra-educacao-ecs-prod --services <service> --profile tetra --region us-east-2
aws ecs list-tasks --cluster tetra-educacao-ecs-prod --service-name <service> --profile tetra --region us-east-2
aws ecs describe-tasks --cluster tetra-educacao-ecs-prod --tasks <task-arn> --profile tetra --region us-east-2
```

Task definition, sanitized manually:

```bash
aws ecs describe-task-definition --task-definition <task-definition-arn> --profile tetra --region us-east-2
```

Do not paste raw task definition JSON if it contains environment values. Extract names and structural fields only.

CloudWatch logs:

```bash
aws logs filter-log-events \
  --log-group-name <log-group> \
  --start-time <epoch-ms> \
  --limit 50 \
  --profile tetra \
  --region us-east-2
```

Treat logs as sensitive and redact before quoting.

## Helper Script Recipes

All commands below are read-only:

```bash
SKILL=/Users/icaroaguiar/.agents/skills/tetra-aws-ops
python3 "$SKILL/scripts/tetra-aws" whoami
python3 "$SKILL/scripts/tetra-aws" services
python3 "$SKILL/scripts/tetra-aws" service tetra-enrollments
python3 "$SKILL/scripts/tetra-aws" taskdef tetra-iam
python3 "$SKILL/scripts/tetra-aws" logs tetra-enrollments --minutes 30 --limit 50
```

Use `--cluster`, `--profile`, or `--region` only when intentionally departing from defaults.

## Investigation Recipes

### Service will not stabilize

1. `service <service>`: inspect desired/running/pending count and deployment rollout state.
2. `tasks <service> --desired STOPPED`: inspect recent stopped reasons.
3. `taskdef <service>`: verify image, command, env names, secret names, ports, log group.
4. `logs <service> --minutes 60 --limit 100`: inspect recent redacted errors.
5. Compare task definition command and env names with the repo Dockerfile/env schema.

### Proposed infrastructure change

1. Classify the change:
   - read-only observation: AWS CLI helper is appropriate;
   - application rollout: use the repository deploy workflow if it owns only image/service rollout;
   - infrastructure mutation: prefer Terraform/OpenTofu/Terragrunt if an approved source exists;
   - emergency manual mutation: require explicit human approval and record drift follow-up.
2. Look for IaC sources before direct AWS writes:

```bash
find /Users/icaroaguiar/dev/tetra -maxdepth 5 \
  \( -name '*.tf' -o -name '.terraform.lock.hcl' -o -name 'terragrunt.hcl' \) -print
```

3. If Terraform exists, run the normal safe sequence from that repo/workspace:

```bash
terraform fmt -check
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Use the team's backend/workspace conventions rather than inventing local state. Do not apply from an unreviewed local state file.

4. If runtime AWS differs from Terraform state/config, use drift-oriented review before applying:

```bash
terraform plan -refresh-only
```

Then decide whether to import, update code, refresh state, or revert the manual drift.

### Suspected missing env or secret

1. Use `taskdef <service>` and inspect only env variable names and secret names.
2. Compare with repo `.env.example`, validation schema, and production-required variables.
3. Do not print env values. For SSM/Secrets Manager, report parameter names/ARN suffixes only unless the user explicitly authorizes value access and there is a safe redaction path.

### Suspected auth or issuer problem

1. Confirm public symptom with a real HTTP request if authorized.
2. Inspect task definition env names for IAM URL/issuer/audience variables.
3. Compare canonical issuer: `https://iam.tetraeducacao.com.br`.
4. Check service logs with redaction.

## Commands That Require Explicit Confirmation

Show the exact command and wait for confirmation before any:

```bash
aws ecs update-service ...
aws ecs run-task ...
aws ecs stop-task ...
aws ecs register-task-definition ...
aws ecs deregister-task-definition ...
aws ssm put-parameter ...
aws secretsmanager put-secret-value ...
aws iam ...
```

Also require confirmation for scaling, restart, deploy, rollback, deletion, permission changes, secret reads, or production mutations through any tool.

When the same change is represented in Terraform, do not use these direct AWS commands as the normal path. Use Terraform plan/apply or document the emergency exception and the drift reconciliation plan.

## Source Links

- AWS IAM security best practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- AWS temporary credentials: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html
- AWS CLI setup: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html
- AWS CLI configuration precedence: https://docs.aws.amazon.com/cli/latest/topic/config-vars.html
- AWS CLI command options: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html
