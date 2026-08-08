import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "node:url";

const MAX_BODY_BYTES = 16 * 1024;

function json(response, status, body, requestId) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId
  });
  response.end(payload);
}

async function readJson(request) {
  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    const error = new Error("content-type must be application/json");
    error.status = 415;
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("request body is not valid JSON");
    error.status = 400;
    throw error;
  }
}

export function createAgentServer() {
  const server = createHttpServer(async (request, response) => {
    const requestId = randomUUID();
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && ["/healthz", "/readyz"].includes(url.pathname)) {
      return json(response, 200, { status: "ok", modelMode: "disabled" }, requestId);
    }

    if (request.method !== "POST" || url.pathname !== "/v1/incidents/analyze") {
      return json(response, 404, { error: "not_found" }, requestId);
    }

    try {
      const input = await readJson(request);
      if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.incidentId !== "string" || !/^[A-Za-z0-9._-]{1,80}$/.test(input.incidentId)) {
        return json(response, 422, { error: "incidentId must be a safe string of at most 80 characters" }, requestId);
      }
      return json(response, 200, {
        incidentId: input.incidentId,
        mode: "deterministic",
        modelInvoked: false,
        classification: "payment-policy-impact",
        recommendedTool: "order_risk.lookup",
        summary: "Synthetic evidence indicates a pricing-policy change may affect payment review."
      }, requestId);
    } catch (error) {
      return json(response, error.status ?? 400, { error: error.message }, requestId);
    }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const host = process.env.HOST ?? "0.0.0.0";
  const port = Number.parseInt(process.env.PORT ?? "8080", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be between 1 and 65535");
  const server = createAgentServer();
  server.listen(port, host, () => console.log(JSON.stringify({ event: "agent.started", host, port, modelMode: "disabled" })));
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
