# Template manifest reference

`hodos-template.json` is the canonical marketplace and release contract. Copier or Cookiecutter
configuration can control local rendering, while HodosGraph policy reads only declared manifest and
JSON Schema fields.

The composable authoring contract uses `templates.hodosgraph.com/v1alpha2`. Existing official
`0.1.0` scaffold releases retain their `v1alpha1` manifests and remain immutable.

## Metadata

| Field | Required | Contract |
| --- | --- | --- |
| `metadata.id` | yes | Stable lowercase identifier. It does not change between releases. |
| `metadata.name` | yes | User-facing name, up to 100 characters. |
| `metadata.version` | yes | Immutable SemVer release. |
| `metadata.description` | yes | Bounded statement of the generated unit's responsibility. |
| `metadata.owners` | yes | Team or publisher identities responsible for support. |
| `metadata.license` | yes | SPDX-compatible license identifier. |
| `metadata.tags` | no | Bounded marketplace filters. Tags do not grant capabilities. |

The Marketplace loads these values from the selected release. A catalog administrator supplies a
source URL and trust policy instead of duplicating template metadata.

## Type and maturity

`spec.type` accepts `agent`, `mcp-server`, `blueprint` or `capability-pack`. An agent and MCP server
remain separate units even when one blueprint creates them together.

`spec.maturity` accepts `scaffold`, `preview` or `stable`. Gold conformance is recorded separately
under `spec.conformance.profile`.

## Renderer

`spec.engine` declares:

- `name`: `hodos-files-v1`, `copier` or `cookiecutter`;
- `versionRange`: accepted authoring versions;
- `configFile`: relative renderer configuration path;
- `unsafeFeatures`: always `false` in the current contract.

The template release records an accepted version range. Each instantiation lock records the exact
renderer build that produced its files.

## Inputs

`spec.inputSchema` points to a JSON Schema 2020-12 object. Unknown inputs must be rejected. A
renderer questionnaire may improve a local prompt, but it cannot add a hidden value outside that
schema.

Secret values are not supported as template answers. A schema can accept a managed secret-reference
name when the target cannot use workload identity.

## Framework and capabilities

`spec.framework` records adapter name, language and tested version range. Use `minimal` or `none`
when the unit has no framework dependency.

`spec.capabilities` is a bounded list used for compatibility and conformance checks. A capability
does not become available merely because it is named here. The release must provide matching test
evidence.

## Outputs

Each `spec.outputs` entry declares:

- `pattern`: a relative file or bounded glob;
- `phase`: `source` or `deployment`;
- `ownership`: `managed`, `merge` or `user-owned`.

Source output is rendered when the repository or component is created. Deployment output can also
use the immutable provider-local image digest produced by CI. It is rendered later by the approved
deployment Workflow.

Patterns cannot be absolute, traverse a parent directory or follow a symlink outside the render
root.

## Targets and compatibility

`spec.targets` lists compatible target-profile IDs. `spec.compatibility.hodos` records the accepted
HodosGraph version range. `architectures` lists required OCI platforms, or `not-applicable` for a
blueprint with no image.

A target remains Scaffold until its live promotion guide passes. Listing a target in the manifest
does not change the support matrix by itself.

## Security

Agent and MCP templates declare `spec.security`:

- `secretInputs: false`;
- `networkDuringRender: false`;
- supported dependency updater choices.

Image and runtime security requirements remain in the target and Gold conformance profiles. An
authoring manifest cannot opt out of a platform security requirement.

## Conformance

`spec.conformance` names the requested profile, deterministic sample answer sets and a committed
rendered fixture. The fixture makes renderer changes reviewable and proves the documented local
command against a known inventory.

Gold is granted only after the complete release gate passes. Setting `profile: gold` in source is a
request for validation, not proof.

## Catalog source

A HodosGraph workspace installs a source through `TemplateCatalogSource`. Its schema is
[`catalog-source-v1alpha1.schema.json`](../schemas/catalog-source-v1alpha1.schema.json).

The resource declares:

- HTTPS repository URL and exact manifest path;
- locked ref, SemVer tag or signed OCI index policy;
- trust mode and expected signer identities;
- disabled unsafe-renderer features;
- bounded synchronization interval.

An arbitrary Git URL is never rendered immediately. HodosGraph resolves the source, verifies policy,
indexes metadata and requires an exact release selection before an isolated render begins.
