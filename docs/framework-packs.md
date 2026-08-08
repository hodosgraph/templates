# Framework packs

Framework support is an adapter layer over the HodosGraph base contract. The same telemetry,
identity, delivery and privacy rules apply to every framework.

## Launch set

| Pack | Primary use | Initial target | Portability goal |
| --- | --- | --- | --- |
| Minimal Python | Custom runtime without a framework | Kubernetes | all container targets |
| LangGraph Python | Stateful and durable agent workflows | Kubernetes | all container targets |
| LangChain Python | Higher-level agent and tool loop | Kubernetes | all container targets |
| Strands Python | AWS-oriented agent implementation | AWS AgentCore | Kubernetes and AgentCore |
| Microsoft Agent Framework Python | Microsoft Foundry integration | Azure | Azure and Kubernetes |
| Google ADK Python | Google agent runtime integration | Google Cloud | Google Cloud and Kubernetes |
| MCP Python | MCP server through the official Python SDK | all | all container targets |
| MCP TypeScript | MCP server through the official TypeScript SDK | all | all container targets |

This table is a delivery priority, not a current support claim. The [support matrix](support-matrix.md)
contains the implemented maturity for each release.

## Adapter boundary

A framework pack may own:

- framework initialization and shutdown;
- state or checkpoint integration;
- tool registration adapters;
- framework-specific OpenTelemetry instrumentation;
- deterministic model and tool fixtures;
- framework lifecycle and compatibility tests.

It must not own:

- business entities and domain decisions;
- cloud credentials or deployment permissions;
- provider-specific infrastructure outside its target profile;
- prompt or tool-content telemetry defaults;
- direct writes to the HodosGraph graph store.

Business code depends on ports defined by the unit template. Provider and framework SDKs remain in
adapters. This permits a use-case pack to move from LangGraph to Strands without changing its MCP
schemas, domain fixtures or HodosGraph relation metadata.

## Dependency policy

Each framework release pins a lock file and records its tested Python, Node.js, MCP and
OpenTelemetry compatibility. Renovate or Dependabot may propose updates, but the release stays on
the previous version until deterministic, protocol, telemetry and target tests pass.

Provider preview APIs are isolated behind an adapter and identified in the support matrix. A
template cannot be marked Stable while its required framework or provider API is unpinned.

## Model modes

Every framework pack implements three explicit modes:

- `disabled`: no model client is constructed;
- `fixture`: a deterministic local response drives the same agent path;
- `gateway`: a governed model gateway is required and budget policy applies.

The public demo and default sample answer set use `disabled` or `fixture`. A model API key is never
a template answer.
