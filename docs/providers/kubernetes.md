# Kubernetes, Agent Sandbox and OpenSandbox promotion workbook

Target maturity: `Scaffold`. This page is a test workbook, not a Kubernetes target support claim.

## Prerequisites

- a disposable or dedicated Kubernetes cluster;
- current `kubectl`, GitOps controller and container tooling;
- a supported isolation runtime such as gVisor or Kata, verified on the chosen nodes;
- permission to install CRDs and controllers during bootstrap;
- an OCI registry that accepts workload-identity or short-lived CI authentication.

Agent Sandbox and OpenSandbox are separate paths. Test each path from a clean namespace and retain
its own evidence.

## 1. Verify context and permissions

```bash
kubectl config current-context
kubectl cluster-info
kubectl auth can-i create customresourcedefinitions.apiextensions.k8s.io
kubectl auth can-i create namespaces
```

Confirm that the context points to the disposable test cluster. Record Kubernetes version,
container runtime, isolation runtime and GitOps controller version.

## 2. Install Agent Sandbox from a pin

Choose a reviewed release from the
[Agent Sandbox releases](https://github.com/kubernetes-sigs/agent-sandbox/releases). Record the tag,
source commit and downloaded manifest checksum. Never install `latest` in the promotion run.

```bash
export AGENT_SANDBOX_VERSION=<reviewed-version>
curl --fail --location --output sandbox-with-extensions.yaml \
  "https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${AGENT_SANDBOX_VERSION}/sandbox-with-extensions.yaml"
sha256sum sandbox-with-extensions.yaml
kubectl apply --server-side --filename sandbox-with-extensions.yaml
kubectl --namespace agent-sandbox-system rollout status deployment --timeout=180s
```

Confirm installed API versions before rendering a `SandboxTemplate`, `SandboxWarmPool` or
`SandboxClaim`. The project moved its API to `v1beta1`; the exact manifest must match the selected
release.

## 3. Verify isolation and default denial

Create a dedicated runtime class and namespace policy for the test. Confirm from the resulting Pod
that the requested runtime handler is active. Apply default-deny ingress and egress before the
agent starts.

The promotion fails if the workload silently falls back to the ordinary node runtime.

`BLOCKED`: the HodosGraph Agent Sandbox target files and CRD mapper have not been implemented.

## 4. Install OpenSandbox from a pin

Select an exact OpenSandbox server and Kubernetes controller release. Record chart or manifest
digest, component images and source commits. Use a dedicated namespace and service account.

`BLOCKED`: the catalog has no reviewed OpenSandbox release bundle yet. Do not install a moving
branch or unpinned chart as HodosGraph promotion evidence.

## 5. Configure collectors

The Kubernetes collector observes Pods, workloads, Services, ServiceAccounts and network policy.
Its Agent Sandbox mapper adds CRD facts through the same watch and reconciliation path. The separate
OpenSandbox collector reads session metadata from the OpenSandbox API, while the Kubernetes
collector remains authoritative for underlying workloads.

`BLOCKED`: the Agent Sandbox mapper, OpenSandbox collector and their least-privilege RBAC are not
implemented.

## 6. Configure GitOps delivery

HodosGraph creates a pull request containing the immutable image digest and target resources. The
GitOps controller reconciles the approved commit. HodosGraph does not receive cluster-admin and CI
does not apply manifests directly to the cluster.

`BLOCKED`: target rendering and the repository creation flow are not implemented.

## 7. Verify without a model

Create one deterministic agent and one MCP server. Confirm separate ServiceAccounts, private MCP
access, default-deny egress, read-only root filesystems and no automatic API token mount unless a
declared operation needs it.

## 8. Negative tests

Run the shared negative tests plus:

- Pod without the required isolation runtime;
- agent ServiceAccount reading Sandbox CRDs;
- MCP ServiceAccount using the agent's HodosGraph audience;
- direct external egress before a governed policy change;
- unsigned or mutable image reference;
- OpenSandbox API record linked to a Pod only by display name.

## 9. Teardown

Delete the test claims and wait for declared child cleanup. Remove GitOps resources, controllers,
CRDs and runtime configuration only after checking for remaining instances. Run a final collector
reconciliation before removing collector access.

<!-- SCREENSHOT TODO: Kubernetes connection and collector permissions after live verification. -->
<!-- SCREENSHOT TODO: Agent Sandbox claim linked to Pod, ServiceAccount and image digest. -->
<!-- SCREENSHOT TODO: OpenSandbox session resolved to the underlying Kubernetes workload. -->
