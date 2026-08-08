# HodosGraph official templates

This repository is the versioned source of HodosGraph Golden Path templates for agents and MCP
servers. It is deliberately separate from the HodosGraph product repository: a template version is
reviewed and released independently, while HodosGraph consumes an immutable catalog revision.

The initial catalog contains:

- `portable-node-agent` `0.1.0`: a deterministic, model-free HTTP agent;
- `portable-node-mcp` `0.1.0`: a deterministic, model-free Streamable HTTP MCP server;
- target profiles for Kubernetes GitOps, AWS AgentCore, Azure agents and Google Cloud agents.

All target profiles are currently `scaffold`. This means the template source and local container
contract exist, but no cloud target is presented as supported until its dated live E2E gate and
step-by-step user guide pass.

## Validate locally

```bash
npm ci --ignore-scripts
npm run check
```

Build the reference images from their version directories:

```bash
docker build -t hodos-agent:test templates/portable-node-agent/0.1.0/content
docker build -t hodos-mcp:test templates/portable-node-mcp/0.1.0/content
```

See [architecture](docs/architecture.md), [security contract](docs/security-contract.md),
[local verification](docs/local-verification.md) and the generated-from-manifests
[support matrix](docs/support-matrix.md).

## Versioning and compatibility

Template versions use SemVer and live in immutable version directories. Breaking input or output
changes require a new major version. A patch may correct documentation, validation or generated
content without changing required inputs. HodosGraph stores the template id, version, catalog
revision and rendered-content checksum with every instantiation.

Copier is not part of the trusted path. HodosGraph will render only the files declared in
`template.json`, validate user inputs against the referenced JSON Schema and serialize structured
annotations/configuration itself. Repository-provided hooks are never executed by the HodosGraph
API server.
