# Monorepo blueprints and business logic

A unit template creates one independently deployable agent or MCP server. A blueprint composes
several released units into one business system. This keeps platform files upgradeable while the
business implementation remains owned by its team.

## Reference launch repository

The cross-cloud launch demo should use one monorepo:

```text
apps/
  incident-commander/
  order-risk-agent/
  customer-resolution-agent/
  demand-planner/
mcp/
  topology/
  order-risk/
  customer-case/
  demand-signal/
packages/
  domain-contracts/
  telemetry/
  fixtures/
  evals/
deploy/
  kubernetes/
  aws/
  azure/
  gcp/
.hodos/
  units/
  blueprint.lock.yaml
```

The repository is not one runtime. Each directory has its own image, lock file, workload identity,
release and deployment. CI uses path filters and builds only affected units.

## Reference business scenario

One synthetic retail pricing change links the four environments:

| Runtime | Agent responsibility | MCP evidence |
| --- | --- | --- |
| Kubernetes | coordinates the incident and queries topology | affected components and owners |
| AWS AgentCore | evaluates deterministic order and payment risk | synthetic order-risk records |
| Microsoft Foundry | prepares customer-resolution actions | synthetic cases and affected customers |
| Google agent runtime | evaluates demand and warehouse signals | synthetic demand and quality records |

The default path invokes no foundation model. Deterministic fixtures return structured results and
exercise the same agent and MCP boundaries. A governed model gateway can be enabled in a separate
profile after budget and provider policy are configured.

## Business-code ownership

Generated platform files and user business code live in declared ownership zones:

```text
src/platform/       managed by the template
src/adapters/       managed or merge-owned by framework packs
src/domain/         user-owned
src/use_cases/      user-owned
deploy/             managed by target profiles
.hodos/             managed evidence and locks
```

A team implements its rules in `src/domain` and `src/use_cases`. It does not fork the base security,
telemetry or deployment files. When the same business capability becomes reusable, the team
publishes a capability pack or a derived template under its own namespace.

## Blueprint contract

A blueprint pins unit releases and declares:

- target and repository path for each unit;
- intended agent-to-MCP connections;
- shared domain-schema versions;
- identity and network-policy boundaries;
- deterministic fixtures and evaluation datasets;
- graph relations expected after collector reconciliation;
- creation, suspension, rollback, retirement and teardown Workflows.

It does not store cloud credentials or copy unit source into the blueprint release.

## HodosGraph graph view

Collectors build the observed path from exact source, artifact and provider identities:

```text
repository -> component -> artifact -> deployment -> agent
agent -> workload identity -> MCP server -> tool -> governed data
```

The blueprint records intent. The graph shows observed state and evidence. A missing relation stays
visible as a gap and is never inferred from a matching display name.

## Customer repository modes

Polyrepo remains the recommended default for separately owned and released services. Monorepo is
recommended for the launch demo and for a product team that shares domain contracts and release
governance.

The same blueprint can target either mode. HodosGraph records a repository and component path for
every unit, so changing topology does not change the agent, MCP or target-profile contracts.
