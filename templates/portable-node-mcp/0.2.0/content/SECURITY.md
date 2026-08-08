# Security

Report vulnerabilities privately through the repository Security tab. Do not open a public issue
with exploit details, credentials or customer data.

## Default controls

The generated service:

- runs on a digest-pinned Distroless image as UID/GID `65532`;
- has no shell, package manager or writable application directory;
- rejects unknown MCP tool input through the SDK schema;
- limits request bodies to 32 KiB and active MCP requests to 64 by default;
- validates exact Host and optional Origin policy before protocol handling;
- excludes tool arguments and results from logs, metrics and spans;
- disables telemetry until an operator explicitly enables a configured OTLP endpoint;
- disables Kubernetes service-account token mounting;
- denies Kubernetes egress and limits ingress to labeled MCP clients;
- pins GitHub Actions, dependencies and both container stages.

Do not weaken the pod security context, change an image digest to a mutable tag or expose `/mcp`
directly to the public internet.

## Identity and secrets

Use workload identity for platform access. Terminate OAuth, mTLS or provider identity at a trusted
gateway that validates issuer, exact audience, expiry and required authorization. The application
does not treat an unverified bearer token as identity.

Do not put credentials in this repository, Docker build arguments, image labels, plain template
configuration or `OTEL_RESOURCE_ATTRIBUTES`. Use `secretRefs` only for an integration that cannot
federate, and prefer a short-lived credential delivered by the target platform.

## Dependency updates

The generated repository contains exactly one selected updater: Dependabot or Renovate. Review SDK,
OpenTelemetry, base-image and workflow-action updates as supply-chain changes. CI must pass protocol
tests, the privacy test, dependency audit, secret scanning and final-image scanning before merge.
