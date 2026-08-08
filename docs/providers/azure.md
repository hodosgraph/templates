# Azure and Microsoft Foundry promotion workbook

Target maturity: `Scaffold`. This page is a test workbook, not an Azure support claim.

## Prerequisites

- current Azure CLI;
- Docker with `linux/amd64` build support;
- a dedicated subscription or resource group with a budget alert;
- permission to create federated credentials, managed identities, ACR, Event Grid and target
  runtime resources;
- Microsoft Foundry access in the selected region.

Use the [Azure CLI interactive login guide](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-interactively)
as the login authority. User login requires MFA. Automation must use workload identity.

## 1. Sign in and select the subscription

```bash
az login --tenant <tenant-id>
az account set --subscription <subscription-id>
az account show --query '{tenantId:tenantId,subscriptionId:id,name:name}' --output json
```

Confirm the sanitized subscription alias before continuing. Do not commit the tenant or
subscription ID.

## 2. Verify providers and baseline

Check that required resource providers are registered and inventory existing HodosGraph-tagged
resources in the test resource group. Stop when an existing resource has no owner or teardown
record.

The promotion run must record the exact provider namespaces required by the implemented collector
and placement driver.

## 3. Bootstrap secretless identities

Create separate managed identities or Entra applications for collector reads, GitHub OIDC artifact
push, HodosGraph deployment and each runtime unit. Add federated credentials with exact issuer,
subject and audience constraints. Assign roles at the smallest resource scope.

CI uses an OIDC login and receives only ACR push plus evidence permissions. A running agent uses a
dedicated managed or agent identity. Do not enable the ACR administrator account.

See [Azure authentication from GitHub Actions](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
and [managed identity authentication for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity).

`BLOCKED`: exact custom roles and federated-subject templates depend on the Azure collector and
placement capability manifests.

## 4. Configure events and reconciliation

Event Grid delivers authenticated resource events to the HodosGraph event ingress. The ingress
validates tenant, audience and source before requesting a targeted Azure API refresh. Periodic full
reconciliation remains enabled.

`BLOCKED`: the Azure collector modules, authenticated Event Grid ingress mapping and install guide
are not implemented.

## 5. Build and deploy

Build `linux/amd64` images, push them to ACR through GitHub OIDC, retain SBOM and provenance and
deploy immutable digests. The initial target places the agent in Microsoft Foundry and the MCP
server in Azure Container Apps, subject to the live API gate.

`BLOCKED`: Azure target rendering and placement drivers are not implemented.

## 6. Verify without a model

Invoke the deterministic agent and private MCP tool with separate identities. Confirm that no model
deployment is required and no token appears in logs, graph facts or screenshots.

## 7. Negative tests

Run the shared negative tests plus:

- federated credential from another repository or environment;
- managed identity from another agent invoking the MCP endpoint;
- CI identity changing a Foundry or Container Apps deployment;
- deployment identity pushing to ACR;
- Event Grid request from another tenant or subscription.

## 8. Teardown

Retire the agent and MCP revisions, remove Event Grid subscriptions, delete test registry content
according to policy, remove role assignments and federated credentials, then run the final
collector reconciliation.

Finish the human session:

```bash
az logout
az account clear
```

<!-- SCREENSHOT TODO: Azure connection with subscription alias and federated identity status. -->
<!-- SCREENSHOT TODO: Foundry agent, Container Apps MCP and managed identities in Graph Explorer. -->
