# HodosGraph agent template standard

The HodosGraph standard defines what an agent or MCP template must provide before it can be marked
Gold. A framework adapter may add runtime behavior, but it cannot weaken this contract.

## Composition model

A generated unit is composed from five independently versioned layers:

```text
HodosGraph base contract
  + language runtime
  + optional framework pack
  + capability or use-case pack
  + deployment target profile
  = one generated agent or MCP unit
```

The base contract owns security, telemetry, health, configuration, delivery evidence and HodosGraph
metadata. A framework pack owns framework startup and lifecycle integration. A use-case pack owns
domain contracts, tools, fixtures and evaluations. A target profile owns placement files and cloud
identity requirements.

This composition avoids a separate template for every framework, cloud and repository mode.

## Maturity levels

| Level | Meaning |
| --- | --- |
| Scaffold | Source and a bounded local contract exist. Provider support is not claimed. |
| Preview | The primary path passed a dated live gate. Compatibility can still change. |
| Stable | Upgrade, rollback and operational evidence passed repeated release gates. |
| Gold | A Stable release that also passes the complete security, protocol, telemetry and supply-chain profile. |

`Gold` is a conformance badge, not a replacement for lifecycle maturity. A new target can be
Preview and Gold-conformant for its implemented path.

## Runtime contract

Every generated service must provide:

- a liveness endpoint that checks process health without calling a model or provider;
- a readiness endpoint that reports required local dependency state;
- graceful shutdown with a bounded drain period;
- request size, duration and concurrency limits;
- explicit retry rules for idempotent operations only;
- structured errors with a stable code and request identifier;
- deterministic mode that never invokes a foundation model;
- configuration validation before the service accepts traffic.

A missing external dependency produces an honest readiness or operation failure. It must not be
reported as a healthy integration.

## Protocol contract

Remote MCP servers use the official Tier 1 SDK and Streamable HTTP. Local process integrations may
also expose stdio. A server declares only the capabilities it implements. Experimental MCP
capabilities are opt-in and carry their own compatibility tests.

Agent-to-agent interoperability is an optional adapter. A template that advertises A2A must expose
a versioned agent card and pass the matching conformance suite. HodosGraph does not infer A2A from
an ordinary HTTP endpoint.

See [MCP conformance](mcp-conformance.md) for the detailed gate.

## Observability contract

Every request must preserve W3C Trace Context across agent, MCP, tool and model-gateway boundaries.
The service exports OTLP through standard OpenTelemetry environment variables. It does not write
directly to the HodosGraph database.

Prompt text, tool arguments, tool results and model responses are excluded from telemetry by
default. A non-production diagnostic policy may enable bounded content capture with redaction and
retention controls.

See [OpenTelemetry contract](observability.md) for required spans, metrics and resource attributes.

## Identity contract

Four identities remain separate:

1. Source automation reads the repository and requests a build identity.
2. Build automation pushes an artifact and signs evidence.
3. HodosGraph deployment automation changes the declared target.
4. The running workload accesses only its declared MCP, HodosGraph and provider resources.

Production paths use OIDC, workload identity or a provider-managed identity. A provider that cannot
federate may use a secret reference. A raw secret is never a template input.

## Supply-chain contract

Every releasable unit must:

- pin language locks, base images and workflow actions;
- run source and protocol tests before the image build completes;
- scan the final image and generated repository;
- publish an SBOM, provenance and keyless signature;
- deploy an immutable digest rather than a tag;
- retain template ID, template version, catalog revision and rendered-content checksum;
- support exactly one configured dependency updater in a generated repository.

The complete container controls are in the [security contract](security-contract.md).

## Generated-file ownership

Each declared output belongs to one ownership class:

- `managed`: HodosGraph may propose a replacement during a template upgrade;
- `merge`: HodosGraph may propose a schema-aware merge for JSON or YAML;
- `user-owned`: created once and never changed by a template upgrade.

Upgrades always produce a pull request. A conflict remains visible and blocks automatic merge.
HodosGraph never rewrites a user-owned business module.

## Conformance evidence

A Gold release retains:

- sample answers and rendered-file checksums;
- unit, integration, protocol and telemetry test results;
- dependency and final-image scan results;
- SBOM, provenance and signature references;
- target-specific identity and negative authorization results;
- a dated clean-environment guide verification;
- suspend, rollback, retire and trust-revocation evidence.

Fixture evidence can test rendering and graph mapping. It cannot promote a cloud target.
