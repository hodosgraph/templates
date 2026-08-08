# Versions and generated-project upgrades

Template source, released content and generated projects have different lifecycles. HodosGraph
records each one explicitly so an upgrade can be reviewed and reproduced.

## Resource model

| Resource | Mutability | Purpose |
| --- | --- | --- |
| Template definition | Changes through Git review | Authoring metadata and source files |
| Template release | Immutable | One SemVer version, source commit and OCI digest |
| Catalog revision | Immutable snapshot | Ordered set of template and target releases |
| Template installation | Workspace controlled | Trust and policy for one catalog source |
| Template instantiation | Append-only evidence | Answers, destination, renderer and Workflow run |

## SemVer rules

Use a major version when an upgrade requires a user decision or breaks an existing contract. This
includes renamed required inputs, removed output paths, incompatible framework state or a changed
runtime protocol.

Use a minor version for an additive input with a safe default, a new target profile, a new optional
capability pack or an additive generated file.

Use a patch version for documentation, validation, dependency or generated-content corrections
that preserve the declared input and runtime contracts.

A released directory and OCI digest never change. A faulty release can be deprecated or yanked
from new installations, while existing provenance remains resolvable.

## Lock file

Every generated unit contains `.hodos/template.lock.yaml` with:

- catalog identity and revision;
- template ID, version and OCI digest;
- source commit and manifest digest;
- renderer name and pinned version;
- target profile ID and version;
- normalized-answer fingerprint;
- source and deployment phase checksums;
- generated-file ownership map.

Secret values are not written to the lock. A secret reference name may be recorded when policy
permits it.

## Upgrade flow

1. HodosGraph resolves a compatible signed release.
2. The isolated renderer regenerates the old and new releases from the recorded non-secret answers.
3. HodosGraph compares the old render, the current project and the new render.
4. Managed files receive a proposed update. Merge files receive a structural merge. User-owned
   files remain unchanged.
5. HodosGraph opens a pull request with changed controls, conformance results and migration notes.
6. Existing repository policy reviews and merges the change.
7. CI builds a new immutable artifact. CD remains a separate approved Workflow operation.

An unresolved conflict blocks the upgrade pull request. HodosGraph does not bypass branch
protection or replace a modified file silently.

## Copier compatibility

Copier is useful for answer persistence and three-way project updates. HodosGraph records the exact
Copier version and answer fingerprint, runs it in the renderer sandbox and presents the result as a
pull request. Unsafe Copier features remain disabled by default.

Cookiecutter replay files can seed an import, but HodosGraph converts the result into its own lock
and release evidence. Cookiecutter hooks never become trusted Marketplace actions.

## Monorepo releases

Each unit in a generated monorepo has its own lock file, component version and image digest. A
blueprint lock records the selected unit releases and their declared relations. One unit can be
upgraded without regenerating unrelated paths.

Official template source may use a monorepo. Each template subdirectory is still published as a
separate OCI artifact, so repository-wide Git tags do not define its consumer version.
