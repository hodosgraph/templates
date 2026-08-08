# Platform support matrix

This matrix mirrors the current target-profile manifests. `Scaffold` means repository content and a
contract exist; it does not mean the provider path has passed live verification.

| target | maturity | agent hosting | MCP hosting | artifact | event/reconciliation | deployment identity | live verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kubernetes GitOps | Scaffold | Deployment; Agent Sandbox | Deployment; OpenSandbox-backed workload | OCI, amd64/arm64 | watch + periodic reconciliation | Hodos Workflow ServiceAccount / ProviderAccessBinding | No |
| AWS AgentCore | Scaffold | Bedrock AgentCore Runtime | AgentCore Runtime MCP | ECR OCI, arm64 | CloudTrail/EventBridge/SQS + reconciliation | Hodos Workflow OIDC to scoped AWS role | No |
| Azure agents | Scaffold | Foundry Hosted Agent | Container Apps | ACR OCI, amd64 | authenticated Event Grid + reconciliation | federated Entra identity | No |
| Google Cloud agents | Scaffold | Google Agent Runtime | Cloud Run | Artifact Registry OCI, amd64 | Audit Logs/Eventarc/Pub/Sub + reconciliation | Workload Identity Federation | No |

Promotion to Preview or Stable requires a dated clean-environment run covering interactive login,
secretless collector access, negative identity tests, build/sign/SBOM/provenance, deployment by
immutable digest, agent-to-MCP identity, graph convergence, suspension and teardown.

<!-- SCREENSHOT TODO: supported-platform matrix from HodosGraph after it is generated from these manifests. -->
