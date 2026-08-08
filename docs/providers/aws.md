# AWS and Bedrock AgentCore promotion workbook

Target maturity: `Scaffold`. This page is a test workbook, not an AWS support claim.

## Prerequisites

- AWS CLI v2 with browser-based IAM Identity Center access;
- Docker Buildx with `linux/arm64` support;
- a dedicated test account and region with an active budget alert;
- permission to create scoped IAM roles, ECR repositories, EventBridge rules and SQS queues;
- Bedrock AgentCore access in the selected region.

Use the [AWS IAM Identity Center CLI guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
as the login authority.

## 1. Configure interactive login

Create a named profile. Choose the dedicated test account and a bootstrap permission set that can
create the narrower production roles.

```bash
aws configure sso
aws sso login --profile hodos-aws-live
aws sts get-caller-identity --profile hodos-aws-live
```

Verify the account in `get-caller-identity` before continuing. Do not paste the account ID into a
committed file or screenshot.

Set the profile and region only in the current test shell:

```bash
export AWS_PROFILE=hodos-aws-live
export AWS_REGION=us-east-1
aws configure get region
```

The promotion record must replace `us-east-1` if a different AgentCore-supported region is tested.

## 2. Verify the empty test boundary

List existing HodosGraph-tagged resources with read-only provider calls before creating anything.
Record the expected empty or known baseline. Stop if the account contains an earlier live-test
deployment that has no owner or teardown record.

## 3. Bootstrap secretless identities

Create four roles with separate policies:

- collector read and SQS consume;
- GitHub OIDC artifact push to one ECR repository;
- HodosGraph OIDC deployment actions for declared AgentCore resources;
- AgentCore execution and workload access.

The GitHub and HodosGraph trust policies must constrain `aud`, repository or HodosGraph workload
subject, branch or protected environment and test account. Do not create an IAM user's access key.

`BLOCKED`: exact policies will be generated from the AWS collector and placement-driver capability
manifests. Broad placeholder policies are not acceptable promotion evidence.

## 4. Configure collector freshness and truth

The production path is CloudTrail management events matched by EventBridge, delivered to SQS. The
AWS collector consumes SQS with its ambient role and performs a targeted API refresh. Periodic full
reconciliation remains enabled.

`BLOCKED`: the AWS collector capability modules, SQS event consumer and installation guide are not
implemented.

## 5. Build and deploy

The generated agent and MCP images must be `linux/arm64`, stored in ECR and referenced by digest.
CI may push and sign. It cannot create or update an AgentCore runtime. The HodosGraph deployment role
performs that separate operation after Plan and approval.

`BLOCKED`: AWS target rendering and the AgentCore placement driver are not implemented.

## 6. Verify without a model

Invoke the deterministic agent and MCP tool. Confirm that CloudWatch and AgentCore show no Bedrock
model invocation. Verify W3C trace continuity after the Gold templates implement OpenTelemetry.

## 7. Negative tests

Run the shared negative tests plus:

- CI role calling an AgentCore create or update operation;
- deployment role pushing an ECR layer;
- execution role reading another unit's resource;
- event from another account or an unapproved region;
- x86-only artifact passed to the ARM64 target.

## 8. Teardown

Retire the runtimes, delete the EventBridge rule and SQS queue, remove test images according to the
retention policy, then remove role trust. Run a final collector reconciliation before deleting the
collector role.

Finish the human session:

```bash
aws sso logout
```

<!-- SCREENSHOT TODO: AWS connection with account alias, region and secretless status. -->
<!-- SCREENSHOT TODO: AgentCore runtime digest and execution-role relation in Graph Explorer. -->
