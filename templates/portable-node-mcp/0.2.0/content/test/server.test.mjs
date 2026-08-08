import assert from "node:assert/strict";
import { createServer as createHttpServer, request as createHttpRequest } from "node:http";
import test from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpServer } from "../src/server.mjs";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await server.hodosClose?.();
}

async function withServer(run, options) {
  const server = createMcpServer(options);
  const port = await listen(server);
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await close(server);
  }
}

async function withClient(baseUrl, run) {
  const client = new Client({ name: "gold-template-conformance", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  await client.connect(transport);
  try {
    await run(client);
  } finally {
    await client.close();
  }
}

async function rawRequest(baseUrl, { headers, body = "{}" }) {
  const url = new URL(`${baseUrl}/mcp`);
  return new Promise((resolve, reject) => {
    const request = createHttpRequest({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "POST",
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), ...headers }
    }, (response) => {
      response.resume();
      response.once("end", () => resolve(response));
    });
    request.once("error", reject);
    request.end(body);
  });
}

test("negotiates with the official MCP client and lists one annotated tool", () => withServer(async (baseUrl) => {
  await withClient(baseUrl, async (client) => {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "lookup_order_risk");
    assert.equal(tools[0].annotations.readOnlyHint, true);
    assert.equal(tools[0].annotations.destructiveHint, false);
  });
}));

test("calls the tool without a foundation model", () => withServer(async (baseUrl) => {
  await withClient(baseUrl, async (client) => {
    const result = await client.callTool({
      name: "lookup_order_risk",
      arguments: { orderId: "ORDER-42" }
    });
    assert.equal(result.structuredContent.orderId, "ORDER-42");
    assert.equal(result.structuredContent.modelInvoked, false);
    assert.equal(result.isError, undefined);
  });
}));

test("rejects an invalid tool input through the SDK schema", () => withServer(async (baseUrl) => {
  await withClient(baseUrl, async (client) => {
    const result = await client.callTool({
      name: "lookup_order_risk",
      arguments: { orderId: "contains a space" }
    });
    assert.equal(result.isError, true);
  });
}));

test("provides separate health and readiness endpoints", () => withServer(async (baseUrl) => {
  for (const path of ["/healthz", "/readyz"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  }
}));

test("rejects untrusted Host and Origin headers", () => withServer(async (baseUrl) => {
  const invalidHost = await rawRequest(baseUrl, { headers: { host: "attacker.invalid" } });
  assert.equal(invalidHost.statusCode, 421);

  const invalidOrigin = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.invalid" },
    body: "{}"
  });
  assert.equal(invalidOrigin.status, 403);
}));

test("limits MCP request bodies", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(33 * 1024) })
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "body_too_large" });
}));

test("rejects an unsafe concurrency configuration before listening", () => {
  assert.throws(
    () => createMcpServer({ environment: { ...process.env, MCP_MAX_CONCURRENCY: "0" } }),
    /MCP_MAX_CONCURRENCY must be between 1 and 1024/
  );
});

test("exports privacy-safe traces, metrics and logs over OTLP HTTP", async () => {
  const proxyVariables = [
    "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY",
    "http_proxy", "https_proxy", "all_proxy",
    "NO_PROXY", "no_proxy"
  ];
  const originalProxyEnvironment = new Map(proxyVariables.map((name) => [name, process.env[name]]));
  for (const name of proxyVariables) delete process.env[name];
  process.env.NO_PROXY = "127.0.0.1,localhost";
  process.env.no_proxy = "127.0.0.1,localhost";

  const received = new Map();
  const collector = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.set(request.url, Buffer.concat(chunks));
    response.writeHead(200, { "content-type": "application/json" });
    response.end("{}");
  });
  const collectorPort = await listen(collector);
  const environment = {
    ...process.env,
    OTEL_SDK_DISABLED: "false",
    OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${collectorPort}`,
    OTEL_METRIC_EXPORT_INTERVAL: "100",
    OTEL_METRIC_EXPORT_TIMEOUT: "50",
    OTEL_SERVICE_NAME: "gold-mcp-test",
    DEPLOYMENT_ENVIRONMENT: "test"
  };
  const privateValue = "PRIVATE-ORDER-9f36ac";

  try {
    await withServer(async (baseUrl) => {
      await withClient(baseUrl, async (client) => {
        await client.callTool({ name: "lookup_order_risk", arguments: { orderId: privateValue } });
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
    }, { environment });
  } finally {
    try {
      await new Promise((resolve, reject) => collector.close((error) => error ? reject(error) : resolve()));
    } finally {
      for (const [name, value] of originalProxyEnvironment) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  }

  assert.ok(received.get("/v1/traces")?.length > 0, "trace export was not received");
  assert.ok(received.get("/v1/metrics")?.length > 0, "metric export was not received");
  assert.ok(received.get("/v1/logs")?.length > 0, "log export was not received");
  const payload = Buffer.concat([...received.values()]).toString("utf8");
  assert.match(payload, /gold-mcp-test/);
  assert.match(payload, /lookup_order_risk/);
  assert.doesNotMatch(payload, new RegExp(privateValue));
  assert.doesNotMatch(payload, /synthetic-pricing-policy-change/);
});
