# Local verification

These steps verify the implemented, model-free part of the catalog. They do not promote a cloud
target beyond `scaffold`.

## 1. Requirements

- Node.js 22 or newer;
- Docker with BuildKit;
- network access to Docker Hub and `gcr.io` for the pinned base layers.

## 2. Validate the catalog

From the repository root:

```bash
npm ci --ignore-scripts
npm run check
```

Expected result: two templates and four target profiles validate; all six service tests pass.

## 3. Build both final images

```bash
docker build --pull -t hodos-agent:test templates/portable-node-agent/0.1.0/content
docker build --pull -t hodos-mcp:test templates/portable-node-mcp/0.1.0/content
```

The builder runs each service's tests. Inspect the runtime contract:

```bash
docker image inspect hodos-agent:test --format '{{json .Config.User}}'
docker image inspect hodos-mcp:test --format '{{json .Config.User}}'
```

Both must return `"65532:65532"`. `docker run --rm --entrypoint /bin/sh hodos-agent:test`
must fail because the Distroless runtime contains no shell.

## 4. Run without a model

```bash
docker run --rm -p 8081:8080 hodos-agent:test
curl -fsS http://127.0.0.1:8081/healthz
```

In a second terminal, run the MCP server:

```bash
docker run --rm -p 8082:8080 hodos-mcp:test
curl -fsS http://127.0.0.1:8082/healthz
```

The agent health response states `modelMode: disabled`. Neither image needs a model API key.

## 5. Verify base-image updates

For a generated repository using Dependabot:

```bash
node .hodos/update-base-images.mjs
```

The command is read-only without `--write`. Its scheduled workflow uses `--write` only on a fresh
runner and opens a PR if either allowlisted digest changed. Renovate-generated repositories do not
include this helper because Renovate handles Docker `ARG` expansion natively.
