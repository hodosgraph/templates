# Provider promotion workbook

This workbook turns a scaffold target into a dated user guide. Complete it from a clean environment
and retain sanitized evidence. A command marked `BLOCKED` depends on HodosGraph code that has not
been implemented. Do not replace it with an undocumented manual change.

## 1. Prepare an isolated boundary

Use a dedicated Kubernetes cluster, AWS account, Azure subscription or Google Cloud project. Set a
budget alert and identify the operator who can remove resources and trust bindings.

Record:

- provider boundary ID in a private test record;
- public alias used in screenshots and documentation;
- region and required architectures;
- CLI, API and target-runtime versions;
- budget and teardown owner;
- start time and expected maximum duration.

Provider IDs, email addresses, access tokens and claims must not appear in committed evidence.

## 2. Verify human access

Use the provider's interactive login. Confirm the exact boundary before any mutation. Retain only a
sanitized command result that proves the expected tenant, account, subscription or project.

Human login is for bootstrap and live verification. It is not the production identity used by CI,
HodosGraph deployment Workflows or running agents.

## 3. Bootstrap production identities

Create separate least-privilege identities for:

- collector reads and event consumption;
- artifact push and signing from CI;
- deployment changes from a HodosGraph Workflow;
- the runtime agent or MCP server.

Bind GitHub or HodosGraph through OIDC or the provider's workload federation. Constrain repository,
branch or environment, audience and provider boundary. Store no long-lived cloud key.

## 4. Install the collector

Install one collector per cloud provider. Enable only the required boundary, compute, network, data,
registry, identity, observability and agent-platform modules. Configure both periodic full
reconciliation and the native event path.

`BLOCKED`: AWS, Azure and Google Cloud collectors described by this catalog are not implemented.
The Kubernetes Agent Sandbox mapper and OpenSandbox collector are also not implemented. A target
cannot pass this step until the relevant package and least-privilege policy exist.

## 5. Verify event-assisted reconciliation

Produce one safe provider change. Confirm this sequence:

1. The event ingress authenticates and deduplicates the provider event.
2. It schedules a bounded refresh for the affected resource or module.
3. The collector reads current provider state.
4. The reconciled graph diff records the observed change.
5. A later periodic full run converges to the same state.

An event payload is a refresh hint. It never becomes authoritative graph state by itself.

## 6. Render and create a repository

Select an exact signed template release and target profile. Review the server-derived Plan. Record
the output repository or component path, normalized-answer fingerprint and rendered-source
checksum.

`BLOCKED`: HodosGraph catalog installation, Marketplace rendering and repository creation are not
implemented.

## 7. Build and publish

The generated CI must test, build the required architecture, scan the final image, produce an SBOM
and provenance, sign the digest through OIDC and push to the provider-local OCI registry.

Reject a mutable tag at the deployment boundary. Record the digest and signature identity.

## 8. Deploy one agent and one MCP server

HodosGraph deployment identity applies the target profile. The agent and MCP server receive
different runtime identities. Default mode invokes no foundation model.

`BLOCKED`: provider placement drivers are not implemented.

## 9. Verify the graph path

Confirm exact-identity relations from repository to component, artifact, deployment, runtime,
workload identity, MCP server and tool. A missing link remains visible. Do not repair it through a
display-name match.

## 10. Run negative tests

At minimum, prove that these requests fail:

- wrong provider boundary;
- wrong OIDC subject;
- wrong audience;
- collector role attempting deployment;
- runtime identity attempting artifact push;
- one agent invoking another agent's private MCP permission;
- unsigned or mutable artifact deployment.

## 11. Suspend, rollback and retire

Suspend new runtime work, restore the previous immutable version, then retire the unit. Confirm that
new access stops while HodosGraph retains evidence.

## 12. Teardown and revoke trust

Delete the declared chargeable resources, event route, queue or subscription, workload federation,
runtime identities and registry test artifacts according to retention policy. Re-run the collector
and confirm tombstoned or retired state.

A failed teardown stops the promotion. Do not retry with a broader role or deletion target.

## Promotion record

The resulting public guide must include:

- tested versions and region;
- exact prerequisites and least-privilege policies;
- expected output after every material command;
- negative-test results;
- sanitized graph and release evidence;
- teardown result;
- verification date and known limitations.

<!-- SCREENSHOT TODO: Provider connection showing verified boundary and identity mode. -->
<!-- SCREENSHOT TODO: Instantiation Plan with repository, build, deployment and runtime identities. -->
<!-- SCREENSHOT TODO: Graph path from source commit to agent, MCP tool and workload identity. -->
