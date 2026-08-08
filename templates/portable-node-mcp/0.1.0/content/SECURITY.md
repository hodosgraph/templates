# Security

Do not put credentials in this repository, Docker build arguments, image labels or plain template
configuration. Use workload identity for platform access and `secretRefs` only for integrations
that cannot support identity federation.

MCP endpoints must be private or protected by the target platform's workload identity. A public
URL is not treated as trusted merely because it speaks MCP.

Report vulnerabilities privately through the repository Security tab.
