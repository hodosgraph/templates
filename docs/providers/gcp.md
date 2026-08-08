# Google Cloud agent platform promotion workbook

Target maturity: `Scaffold`. This page is a test workbook, not a Google Cloud support claim.

## Prerequisites

- current Google Cloud CLI;
- Docker with `linux/amd64` build support;
- a dedicated project and billing budget alert;
- permission to create service accounts, Workload Identity Federation, Artifact Registry, Pub/Sub
  and target runtime resources;
- agent platform access in the selected region.

## 1. Sign in and select the project

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud auth list
gcloud projects describe <project-id> --format='value(projectId,name)'
```

Client libraries used during the local test can obtain user Application Default Credentials:

```bash
gcloud auth application-default login
```

ADC from interactive login is a local development credential. It is not the production collector,
CI, deployment or runtime identity. See the
[Application Default Credentials login reference](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login).

## 2. Verify APIs and baseline

Record the exact project alias, region and enabled APIs. Inventory existing HodosGraph-labelled
resources before mutation. Stop if an earlier test resource has no teardown record.

## 3. Bootstrap secretless identities

Create separate service accounts for collector reads and Pub/Sub consumption, CI artifact push,
HodosGraph deployment and each runtime unit. Configure Workload Identity Federation for GitHub and
HodosGraph with exact repository or workload attributes and conditions.

Do not create or download a service-account key. Google recommends Workload Identity Federation
for external deployment pipelines. See the
[deployment-pipeline federation guide](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).

`BLOCKED`: exact roles and attribute mappings depend on the Google Cloud collector and placement
capability manifests.

## 4. Configure events and reconciliation

Route selected Audit Logs through Eventarc or a log sink to Pub/Sub. Authenticated push uses an
exact service-account identity and audience. The HodosGraph ingress schedules a targeted provider
read. Periodic full reconciliation remains enabled.

`BLOCKED`: the Google Cloud collector modules, authenticated Pub/Sub event mapping and install guide
are not implemented.

## 5. Build and deploy

Create the Artifact Registry repository before pushing. GitHub obtains short-lived credentials
through Workload Identity Federation, builds `linux/amd64`, signs evidence and pushes the image.
The target profile deploys only the immutable digest.

For local verification, the gcloud Docker helper can be configured for the exact regional host:

```bash
gcloud auth configure-docker <region>-docker.pkg.dev
```

This local helper is not the generated CI authentication path. See
[Artifact Registry Docker authentication](https://cloud.google.com/artifact-registry/docs/docker/authentication).

`BLOCKED`: Google target rendering and agent-platform placement drivers are not implemented.

## 6. Verify without a model

Invoke the deterministic agent and a private Cloud Run MCP endpoint. Use one service account per
runtime and a Google-signed ID token with the MCP audience. Confirm that no model is configured or
called. See [Cloud Run service-to-service authentication](https://cloud.google.com/run/docs/authenticating/service-to-service).

## 7. Negative tests

Run the shared negative tests plus:

- Workload Identity Federation principal from another repository or branch;
- ID token with another Cloud Run audience;
- one runtime service account invoking another unit without `run.invoker`;
- CI service account changing the runtime;
- deployment service account pushing an image;
- Pub/Sub push identity from another project.

## 8. Teardown

Retire the agent and MCP revisions, remove Pub/Sub and Eventarc resources, delete test registry
content according to policy, remove IAM bindings and federation providers, then run the final
collector reconciliation.

Finish the human session and revoke local ADC if the test machine is shared:

```bash
gcloud auth revoke
gcloud auth application-default revoke
```

<!-- SCREENSHOT TODO: Google Cloud connection with project alias and federation status. -->
<!-- SCREENSHOT TODO: Agent runtime, Cloud Run MCP and service accounts in Graph Explorer. -->
