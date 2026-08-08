# OpenTelemetry contract

Agents and MCP servers export traces, metrics and logs through OpenTelemetry Protocol. A workload
sends OTLP to a local, cluster or provider collector. HodosGraph collectors observe provider and
deployment evidence; application code does not write telemetry or topology directly to the graph
database.

The `portable-node-mcp` `0.2.0` template implements the portable part of this contract and tests
OTLP HTTP traces, metrics and logs against a local receiver. The `portable-node-agent` `0.1.0`
template does not yet implement this contract and cannot receive the Gold badge.

## Configuration

Templates use standard OpenTelemetry variables, including:

- `OTEL_SERVICE_NAME`;
- `OTEL_RESOURCE_ATTRIBUTES`;
- `OTEL_EXPORTER_OTLP_ENDPOINT`;
- `OTEL_EXPORTER_OTLP_PROTOCOL`;
- `OTEL_TRACES_SAMPLER` and its argument;
- signal-specific exporter controls when a target requires them.

Exporter authentication is supplied by workload identity or a managed secret reference. A raw
OTLP header value is not stored in a template lock or rendered into a repository.

## Propagation

W3C `traceparent`, `tracestate` and permitted `baggage` values propagate across:

```text
caller -> agent -> MCP client -> MCP server -> tool -> governed model gateway
```

Trust boundaries validate baggage size and allowlisted keys. User identifiers, tokens and prompt
content are not propagated as baggage.

## Required spans

The tested trace contains spans for:

- inbound protocol request;
- agent invocation or graph run;
- MCP request and tool execution;
- external provider or datastore operation;
- model-gateway request when gateway mode is enabled.

Framework-native GenAI semantic conventions are used where their maturity matches the pinned
OpenTelemetry release. HodosGraph-specific attributes supplement the standard and never redefine
one of its fields.

## Required resource attributes

Every service includes:

- service name and version;
- deployment environment;
- cloud provider and region when applicable;
- Kubernetes namespace and workload when applicable;
- HodosGraph template ID and version;
- HodosGraph unit, agent or MCP identity;
- HodosGraph Workflow run ID when the request originates from a governed run.

Custom HodosGraph attributes use the `hodosgraph.*` namespace.

## Metrics

At minimum, each runtime exports request count, error count, latency, active work, rejected work and
tool duration. Agent runtimes also report run duration and termination reason. Model token and cost
metrics exist only when gateway mode provides trustworthy values.

Metric dimensions use bounded identifiers. Session IDs, request IDs, tool arguments and arbitrary
user strings are not metric attributes.

## Logs

Structured logs include timestamp, severity, stable event code, service version, request ID, trace
ID and span ID. Errors identify the failed boundary and a safe remediation. Logs never contain
access tokens, cloud credentials, secret values, complete prompts or tool results.

## Content privacy

Content capture is off by default. The default trace records operation name, status, duration,
bounded sizes and safe identifiers. A non-production diagnostic policy may enable selected content
events when all of these controls exist:

- explicit workspace and environment opt-in;
- secret and personal-data redaction;
- payload and event limits;
- short retention;
- access auditing;
- a visible disable action.

## Conformance test

A Gold template test starts an agent and MCP server with an in-memory or test OTLP collector. It
must prove trace continuity, required attributes, bounded metrics and the absence of seeded secret
values. A failed exporter must not stop the business request unless target policy explicitly makes
telemetry delivery mandatory.
