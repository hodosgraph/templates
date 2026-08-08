# Create a template

This guide defines the repository contract for a customer or partner template. The current release
supports local catalog validation. HodosGraph Marketplace registration and server-side rendering
are not implemented yet, so the final registration steps are explicitly marked as unavailable.

## 1. Choose the unit type

Create one independently deployable unit per template:

- `agent` for an agent runtime;
- `mcp-server` for an MCP server;
- `blueprint` for a composition of existing agent and MCP releases;
- `capability-pack` for reusable domain tools, contracts or evaluation fixtures.

Do not place an agent and an MCP server in one unit template. A blueprint can create both in one
repository and still retain separate images, releases and identities.

## 2. Create the repository

Use one repository for one Copier template when Copier will manage upgrades. Copier resolves
versions from repository tags, which makes unrelated templates in one repository ambiguous. A
HodosGraph-managed catalog may use a monorepo because it publishes each subdirectory as a separate
immutable OCI template artifact.

Recommended layout:

```text
hodos-template.json
copier.yml
schemas/
  inputs.schema.json
template/
  .hodos/
  src/
  test/
  deploy/
samples/
  minimal.answers.json
  production.answers.json
```

`hodos-template.json` is the HodosGraph trust and release contract. `copier.yml` is an authoring
engine configuration. JSON Schema remains the canonical input contract used by HodosGraph forms
and policy checks.

## 3. Write metadata

Use a stable lowercase ID. A display name or description may change in a later release, while the
ID remains fixed.

```json
{
  "apiVersion": "templates.hodosgraph.com/v1alpha2",
  "kind": "Template",
  "metadata": {
    "id": "incident-agent-langgraph",
    "name": "Incident agent for LangGraph",
    "version": "0.1.0",
    "description": "Creates a deterministic incident agent with MCP and OpenTelemetry.",
    "owners": ["platform-team"],
    "license": "Apache-2.0"
  }
}
```

The Marketplace must read this metadata from the selected release. A user supplies a Git URL and
manifest path when installing a catalog source; they do not retype the template name or description.

## 4. Define inputs

Use JSON Schema 2020-12. Reject unknown inputs with `additionalProperties: false`. Separate plain
configuration from secret references.

Required production choices include:

- unit name and ownership;
- repository mode and component path;
- target profile;
- dependency updater;
- resource limits and exposure;
- workload identity binding;
- named secret references when federation is unavailable.

Never accept an API key, password, private key or cloud credential as a normal string input.

Keep Copier questions aligned with the JSON Schema. Copier may improve the local prompt, but it
cannot introduce a hidden input that bypasses HodosGraph validation.

## 5. Declare rendering behavior

Copier templates run in an isolated renderer with network disabled. The default policy rejects:

- tasks;
- migrations that execute commands;
- custom Jinja extensions;
- reads outside the checked-out template and output directory;
- symlink, submodule and Git LFS traversal;
- unbounded file count or output size.

Use HodosGraph Workflows for setup actions that need provider access. A renderer prepares files; it
does not create a repository, push an image or change a cloud account.

## 6. Classify generated files

Declare every output as `managed`, `merge` or `user-owned`. Business modules should be user-owned.
CI, security policy and generated deployment resources are usually managed. Structured HodosGraph
resources can use merge ownership when the schema defines an unambiguous merge key.

The rendered repository records these classes in `.hodos/template.lock.yaml`.

## 7. Add sample renders

Provide at least two answer sets:

- a minimal deterministic render with no model and no stored credential;
- a production render using workload identity and the strict exposure default.

Each sample must render without network access. Tests compare the complete output inventory and
checksums, then run source, image, protocol and policy checks.

## 8. Validate locally

The repository includes a validated
[Copier authoring example](../examples/community-copier-agent/hodos-template.json). Render it with
the reviewed Copier release and the committed deterministic answer set:

```bash
uvx --from copier==9.17.1 copier copy --defaults \
  --data-file examples/community-copier-agent/samples/minimal.answers.json \
  examples/community-copier-agent generated/community-incident-agent
```

The output must contain `.copier-answers.yml`, `.hodos/unit.yaml`, `README.md` and the user-owned
domain module. Do not pass `--trust` or `--UNSAFE`.

For the official catalog, also run:

```bash
npm ci --ignore-scripts
npm run check
```

Build every changed service image and follow [local verification](local-verification.md). A future
`hodos template validate` command will apply the same checks to an external repository. Until that
command exists, an external repository cannot be registered as a supported HodosGraph catalog.

## 9. Publish a release

Create an immutable SemVer tag. Release automation must package the manifest, schema and template
files as an OCI artifact, attach SBOM and provenance, then sign the digest with workload identity.
Do not move or reuse a release tag.

See [versions and upgrades](versioning.md) for compatibility rules.

## 10. Register with HodosGraph

This step is currently unavailable. The intended flow accepts:

- catalog source Git URL;
- exact manifest path;
- allowed tag or release policy;
- expected publisher identity;
- trust mode and synchronization schedule.

HodosGraph resolves the selected release to an exact commit and signed OCI digest before it shows
the template as installable.

<!-- SCREENSHOT TODO: Add catalog source dialog after the real Marketplace import flow exists. -->
<!-- SCREENSHOT TODO: Add isolated render preview and generated-file ownership diff. -->
