# Standards references

These primary sources define the external contracts used by the catalog. They were reviewed on
2026-08-08. A template release pins tested dependency and protocol versions; this list does not
authorize an automatic upgrade to the newest release.

## OpenTelemetry

- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
- [OpenTelemetry generative AI observability](https://opentelemetry.io/blog/2026/genai-observability/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [W3C Baggage](https://www.w3.org/TR/baggage/)

Generative AI conventions can change while they mature. The conformance matrix must name the
version tested by a Gold template.

## MCP

- [Official MCP SDK tiers](https://modelcontextprotocol.io/docs/sdk)
- [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/)
- [MCP Python SDK](https://py.sdk.modelcontextprotocol.io/)
- [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25)

The SDK and protocol compatibility pair belongs in the template release evidence. Experimental
tasks are not enabled by the base MCP template.

## Frameworks

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [Strands Agents documentation](https://strandsagents.com/docs/)
- [Strands deployment to Bedrock AgentCore](https://strandsagents.com/docs/user-guide/deploy/deploy_to_bedrock_agentcore/python/)
- [Google Agent Development Kit](https://google.github.io/adk-docs/)
- [Microsoft Foundry agent documentation](https://learn.microsoft.com/en-us/azure/foundry/agents/)

Framework documentation guides adapter implementation. The HodosGraph base contract remains the
source for security, identity, telemetry and generated-file ownership.

## Template engines

- [Copier configuration](https://copier.readthedocs.io/en/latest/configuring/)
- [Copier project updates](https://copier.readthedocs.io/en/stable/updating/)
- [Cookiecutter advanced use](https://cookiecutter.readthedocs.io/en/stable/advanced/index.html)

Copier documents tasks, migrations and extensions as unsafe features. HodosGraph disables them in
the default renderer policy.

## Provider targets

- [Kubernetes Agent Sandbox](https://github.com/kubernetes-sigs/agent-sandbox)
- [OpenSandbox](https://github.com/opensandbox-group/OpenSandbox)
- [Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)
- [Microsoft Foundry hosted agents](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/deploy-hosted-agent)
- [Google Cloud Workload Identity Federation for deployment pipelines](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)

Provider promotion workbooks record the exact product, API and CLI versions used during a live
verification. Preview names and compatibility aliases stay in the target adapter instead of
spreading through business code.
