# {{ hodos.name }}

{{ hodos.description }}

This repository contains a model-free MCP server generated from HodosGraph template
`portable-node-mcp` `0.2.0`. It uses the official MCP TypeScript SDK and Streamable HTTP. The
deterministic `lookup_order_risk` tool does not call a model, a paid API or an external datastore.

## What is included

- `POST /mcp` with stateless Streamable HTTP;
- `GET /healthz` and `GET /readyz`;
- Zod validation and structured tool output;
- read-only, non-destructive and idempotent MCP tool annotations;
- optional OTLP HTTP traces, metrics and logs;
- a multi-stage Distroless image running as UID/GID `65532`;
- Kubernetes manifests with a read-only filesystem and default-deny networking;
- either Dependabot or Renovate configuration selected when the repository is generated.

## 1. Verify the generated repository

Install Node.js 22 or newer, then run:

```bash
npm ci --ignore-scripts
npm test
npm audit --omit=dev
```

The test suite uses the official MCP client. It also starts a local OTLP receiver and verifies that
traces, metrics and logs exclude a seeded tool argument and result.

## 2. Run locally without telemetry

Telemetry is disabled unless both `OTEL_SDK_DISABLED=false` and an OTLP endpoint are set.

```bash
npm start
```

In another terminal:

```bash
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/readyz
```

Use an MCP client at `http://127.0.0.1:8080/mcp`. Do not use a hand-written JSON-RPC probe as a
substitute for initialization and protocol negotiation.

## 3. Export OpenTelemetry locally

Start an OpenTelemetry Collector with an OTLP HTTP receiver, then configure the server:

```bash
export OTEL_SDK_DISABLED=false
export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
export OTEL_SERVICE_NAME={{ hodos.name }}
export DEPLOYMENT_ENVIRONMENT=local
npm start
```

Signal-specific `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`,
`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` and `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` values override the
common endpoint. The server records method, status, tool name and duration. Tool arguments, tool
results, tokens and prompts are never captured by the default instrumentation.

## 4. Build the image

```bash
docker build --pull -t {{ hodos.name }}:test .
docker run --rm --read-only --cap-drop=ALL -p 8080:8080 {{ hodos.name }}:test
```

The runtime base is the digest-pinned Google Distroless line used by HodosGraph. It contains no
shell or package manager. The Docker build runs tests, audits production dependencies and copies
only production packages into the final image.

## 5. Deploy to Kubernetes with GitOps

The release workflow publishes a signed OCI image, SBOM and provenance. Put its immutable digest
into the generated deployment before committing the manifests to the GitOps repository.

```bash
kubectl apply -f deploy/kubernetes/service.yaml
kubectl apply -f deploy/kubernetes/deployment.yaml
kubectl apply -f deploy/kubernetes/network-policy.yaml
kubectl rollout status deployment/{{ hodos.name }}
```

The included NetworkPolicy permits ingress only from pods carrying this label:

```yaml
hodosgraph.com/mcp-client: "true"
```

It denies all egress. Add a separate, reviewed egress policy for the OTLP Collector if telemetry is
enabled. The synthetic tool itself needs no egress.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Bind address. Reserved by the template. |
| `PORT` | `8080` | HTTP port. Reserved by the template. |
| `MCP_ALLOWED_HOSTS` | loopback and service name | Comma-separated exact hostnames accepted on `/mcp`. |
| `MCP_ALLOWED_ORIGINS` | empty | Comma-separated exact browser origins. Requests without `Origin` remain valid for machine clients. |
| `MCP_MAX_CONCURRENCY` | `64` | Maximum active MCP requests, from 1 through 1024. |
| `OTEL_SDK_DISABLED` | `true` | Must be set to `false` to enable telemetry. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | Common OTLP HTTP base endpoint. |
| `OTEL_SERVICE_NAME` | generated name | OpenTelemetry service name and default MCP host identity. |
| `HODOS_MCP_ID` | service name | Stable HodosGraph MCP identifier. |

For browser clients, add only the exact HTTPS origins that should call the endpoint. For a custom
gateway or external DNS name, add its exact hostname to `MCP_ALLOWED_HOSTS`.

## Production boundary

The server does not turn a bearer token into a trusted principal. Keep it private and terminate
OAuth, mTLS or provider workload identity at an approved gateway or platform boundary. That
boundary must enforce the exact audience and authorization policy before forwarding to `/mcp`.
Discovery does not grant execution permission.

Provider target profiles remain `scaffold` until their dated live identity, deployment and teardown
workbooks pass. Gold conformance of this portable runtime does not promote AWS, Azure, GCP or
Kubernetes hosting support by itself.
