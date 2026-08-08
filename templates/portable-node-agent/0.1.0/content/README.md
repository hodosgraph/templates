# {{ hodos.name }}

{{ hodos.description }}

This generated service runs in deterministic `MODEL_MODE=disabled` mode. It does not need or read
a foundation-model credential. `POST /v1/incidents/analyze` returns bounded synthetic evidence for
the HodosGraph cross-cloud incident demo.

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
