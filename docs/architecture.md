# Template lifecycle and delivery architecture

The catalog separates four things that change at different speeds:

1. A versioned template owns source files, allowed inputs and secure defaults.
2. A target profile declares placement, artifact architecture, identity and event behavior.
3. HodosGraph creates a source repository from an exact template version and records provenance.
4. CI builds and signs an OCI image; HodosGraph Workflow deploys that immutable digest.

GitHub is the first repository implementation, not a domain assumption. The same template contract
can later target another Git provider. Polyrepo creates one repository per agent or MCP server;
monorepo adds one generated component directory and scopes CI to that path. Both retain the same
template id/version and rendered checksum.

CI has permission to read source, push an OCI artifact and obtain GitHub OIDC for keyless signing.
It does not receive cloud deployment credentials. HodosGraph Workflow holds the separate,
short-lived provider deployment identity through `ProviderAccessBinding` and a placement driver.
That boundary is what makes provisioning secretless after the one-time trust bootstrap.

Cloud events accelerate discovery but never directly mutate the graph. Each authenticated event
queues a bounded provider API refresh; the collector then emits authoritative facts and normal
HodosGraph graph diffs. Periodic reconciliation remains enabled so lost or delayed events heal.

<!-- SCREENSHOT TODO: Template Marketplace version/details panel after the real read model exists. -->
<!-- SCREENSHOT TODO: Instantiation Plan showing repo, CI identity, artifact and deployment identity boundaries. -->
