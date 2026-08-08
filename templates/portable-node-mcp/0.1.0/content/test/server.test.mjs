import assert from "node:assert/strict";
import test from "node:test";
import { createMcpServer } from "../src/server.mjs";

async function withServer(run) {
  const server = createMcpServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function rpc(baseUrl, message) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify(message)
  });
  return { response, body: response.status === 202 ? undefined : await response.json() };
}

test("lists one deterministic tool", () => withServer(async (baseUrl) => {
  const { response, body } = await rpc(baseUrl, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.equal(response.status, 200);
  assert.equal(body.result.tools[0].name, "lookup_order_risk");
}));

test("calls the tool without a foundation model", () => withServer(async (baseUrl) => {
  const { body } = await rpc(baseUrl, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "lookup_order_risk", arguments: { orderId: "ORDER-42" } }
  });
  assert.equal(body.result.structuredContent.orderId, "ORDER-42");
  assert.equal(body.result.structuredContent.modelInvoked, false);
}));

test("accepts MCP notifications without returning a body", () => withServer(async (baseUrl) => {
  const { response, body } = await rpc(baseUrl, { jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(response.status, 202);
  assert.equal(body, undefined);
}));
