# Template documentation

This repository contains the public source and verification contract for HodosGraph agent and MCP
templates. The current release is a model-free scaffold. It proves the catalog, container and local
runtime path. It does not yet prove a cloud placement, OpenTelemetry conformance or full MCP SDK
conformance.

## Start here

Follow [local verification](local-verification.md) first. It validates the catalog, runs the tests,
builds both images and starts the deterministic services without a foundation model.

## Current evidence

| Area | Current state | Evidence |
| --- | --- | --- |
| Catalog validation | Implemented | `npm run check` |
| Secure image baseline | Implemented | image build, UID inspection and final-image scan |
| Model-free agent | Implemented scaffold | `/healthz` reports disabled model mode |
| MCP server | Minimal protocol scaffold | local initialize, list and call tests |
| OpenTelemetry | Not implemented | required before a Gold release |
| Official MCP SDK | Not implemented | required before a Gold MCP release |
| Kubernetes placement | Scaffold | no Agent Sandbox or OpenSandbox live gate yet |
| AWS, Azure and Google Cloud placement | Scaffold | no dated provider live gate yet |
| HodosGraph Marketplace import | Not implemented | product integration remains blocked |

The [support matrix](support-matrix.md) is the public availability record. A target stays
`Scaffold` until the documented promotion gate passes from a clean environment.

## Read by task

- [Template standard](template-standard.md): the contract shared by every language, framework and
  target.
- [Create a template](authoring.md): repository structure, manifest, inputs and local checks.
- [Manifest reference](manifest-reference.md): fields for templates and installed catalog sources.
- [Versions and upgrades](versioning.md): immutable releases, generated-file ownership and upgrade
  pull requests.
- [Framework packs](framework-packs.md): LangGraph, LangChain, Strands, Microsoft Agent Framework
  and Google ADK without a framework-by-cloud matrix explosion.
- [OpenTelemetry contract](observability.md): traces, metrics, logs, privacy and propagation.
- [MCP conformance](mcp-conformance.md): official SDK, transport, authorization and test gates.
- [Monorepo blueprints](monorepo-blueprints.md): business logic, reusable use-case packs and the
  reference cross-cloud demo.
- [Delivery architecture](architecture.md): repository, CI, OCI and placement identity boundaries.
- [Security contract](security-contract.md): mandatory source, image and runtime controls.
- [Standards references](references.md): primary specifications and provider documentation used by
  the contracts.

## Provider guides

Provider guides will be published in two stages. A promotion workbook is written before the live
run and records every command, expected result, negative identity check and teardown step. It is
not an availability claim. After the founder repeats the flow from a clean environment, the same
workbook becomes the step-by-step user guide and receives a verification date.

HodosGraph screenshots are added after the corresponding UI read model and journey exist.
Screenshot placeholders remain source comments and are never presented as evidence.

Start with the shared [provider promotion workbook](providers/index.md), then use the target-specific
workbook:

- [Kubernetes, Agent Sandbox and OpenSandbox](providers/kubernetes.md)
- [AWS and Bedrock AgentCore](providers/aws.md)
- [Azure and Microsoft Foundry](providers/azure.md)
- [Google Cloud agent platform](providers/gcp.md)
