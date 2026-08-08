import assert from "node:assert/strict";
import test from "node:test";
import { createAgentServer } from "../src/server.mjs";

async function withServer(run) {
  const server = createAgentServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health is model-free", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", modelMode: "disabled" });
}));

test("incident analysis is deterministic", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/v1/incidents/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ incidentId: "INC-42" })
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.incidentId, "INC-42");
  assert.equal(result.modelInvoked, false);
}));

test("rejects unbounded or ambiguous input", () => withServer(async (baseUrl) => {
  const response = await fetch(`${baseUrl}/v1/incidents/analyze`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "INC-42"
  });
  assert.equal(response.status, 415);
}));
