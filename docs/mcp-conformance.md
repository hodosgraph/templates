# MCP conformance

An MCP server marked Gold uses an official Tier 1 SDK. Handwritten JSON-RPC routing is allowed for
a scaffold test, but it is not a production protocol implementation.

The current `portable-node-mcp` `0.1.0` release implements only a deterministic subset for local
catalog verification. It does not pass this conformance profile.

## Transport

Remote servers use Streamable HTTP. stdio remains available for local process integrations. Legacy
HTTP with separate SSE endpoints is compatibility-only and must be declared explicitly.

The server validates content type, request size, host and origin policy before protocol handling.
Deployment behind a proxy includes a tested trusted-proxy configuration and does not accept an
arbitrary forwarded host.

## Protocol lifecycle

The server and its test client verify:

- initialization and protocol-version negotiation;
- declared capabilities;
- ping and clean shutdown;
- tools, resources and prompts that the server advertises;
- structured tool output and JSON Schema validation;
- cancellation, progress and pagination when declared;
- session or stateless behavior required by the pinned protocol release;
- standard method and name headers required by that release.

Experimental tasks are disabled unless the template declares them. A task is bound to the exact
authorization context and uses an unguessable identifier.

## Authorization

A remote endpoint is private by default. Production templates require OAuth or a provider workload
identity with an exact audience. Each tool declares the minimum required scope or permission.

The server must reject:

- a missing or wrong audience;
- an expired token;
- a token for another agent or workspace;
- an unapproved tool scope;
- an origin or host outside policy;
- a replay that violates the operation's idempotency contract.

Discovery does not grant execution permission. HodosGraph may inventory a tool while runtime policy
still denies its use.

## Tool safety

Tool input and output use bounded schemas with unknown fields rejected. A tool that performs an
external request applies the same SSRF, redirect and egress policy as the HodosGraph control plane.
Side-effecting tools document idempotency, approval and cancellation behavior.

Resources that expose files or URLs use allowlisted roots and schemes. A client-provided URI is
never treated as a trusted local path.

## Privacy and observability

MCP method and tool name may be recorded as bounded telemetry. Tool arguments, results and resource
content remain excluded by default. Trace Context propagates through the MCP transport without
placing identity tokens in baggage.

## Release gate

Each SDK template pins an SDK and protocol compatibility pair. Its CI runs:

- official SDK client integration tests;
- malformed request and version-negotiation tests;
- authorization and wrong-audience tests;
- request size, timeout, cancellation and concurrency tests;
- seeded-secret log and telemetry tests;
- multi-replica tests for the declared session mode;
- HodosGraph discovery and capability-mapping fixtures.

A protocol or SDK upgrade is a normal dependency pull request. It does not change the published
support matrix until the complete gate passes.
