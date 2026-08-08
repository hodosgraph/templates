# {{ hodos.name }}

{{ hodos.description }}

This generated Streamable HTTP MCP server exposes `POST /mcp` and one deterministic synthetic tool,
`lookup_order_risk`. It does not connect to a model or paid data source.

Run locally:

```bash
npm ci
npm test
npm start
curl -fsS http://127.0.0.1:8080/healthz
```

The Docker runtime is the same digest-pinned, non-root Google Distroless line used by HodosGraph.
The generated Kubernetes workload adds a read-only root filesystem, dropped capabilities,
`RuntimeDefault` seccomp, resource bounds and a default-deny NetworkPolicy.

This template version is a scaffold until its selected target has a dated live verification in the
HodosGraph support matrix.
