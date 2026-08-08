# Security-by-default contract

Every official image template must satisfy all of these gates:

- multi-stage build with immutable builder and runtime digests;
- the HodosGraph Google Distroless language runtime where one is maintained;
- explicit runtime UID/GID `65532:65532`, no shell or package manager;
- no credential-shaped `ARG` or `ENV`, download-to-shell command or `ADD` instruction;
- only production files copied to the final image, with an assertion excluding tests;
- OCI source, revision, version, created, title, description, license and vendor labels;
- final-image HIGH/CRITICAL gate, SPDX SBOM, keyless signature and SLSA provenance;
- full-commit pins for every GitHub Action.

Kubernetes output additionally requires a dedicated ServiceAccount, disabled API token mounting by
default, read-only root filesystem, no privilege escalation, all capabilities dropped,
`RuntimeDefault` seccomp, explicit resource bounds and default-deny ingress/egress.

`annotations`, `labels`, environment `config`, resource values and `secretRefs` are structured
schema inputs. Unknown fields fail validation. `hodosgraph.com/*`, managed-by and OCI provenance
keys are reserved. Plain configuration is never interpreted as a secret; secret-bearing settings
must use a named reference or workload identity.

## Dependency automation

A generated repository selects exactly one updater:

- Renovate updates npm locks, full-commit Action pins and digest-pinned Docker `ARG` values using
  its native managers.
- Dependabot updates npm and GitHub Actions. Because Dependabot cannot update Docker images stored
  in `ARG` and can miss later stages, that variant also includes a narrow scheduled workflow. Its
  local script resolves only `BUILDER_BASE` and `RUNTIME_BASE`, then opens a review PR through the
  GitHub API. It cannot change an image name, merge the PR or bypass CI.

Major upgrades require an explicit migration review. Routine pull requests still rebuild and scan
the final image; an updater result is never trusted as release evidence by itself.
