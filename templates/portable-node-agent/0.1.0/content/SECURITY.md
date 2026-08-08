# Security

Do not put credentials in this repository, Docker build arguments, image labels or plain template
configuration. Use workload identity for platform access and `secretRefs` only for integrations
that cannot support identity federation.

Report vulnerabilities privately through the repository Security tab. Do not open a public issue
for an unpatched vulnerability.
