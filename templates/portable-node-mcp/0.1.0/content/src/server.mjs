import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "node:url";

const MAX_BODY_BYTES = 32 * 1024;

function sendJson(response, status, body, requestId) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
    ...(payload ? { "content-type": "application/json; charset=utf-8" } : {}),
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

function result(id, value) {
  return { jsonrpc: "2.0", id, result: value };
}

function protocolError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function handleMessage(message) {
  if (!message || typeof message !== "object" || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return protocolError(message?.id, -32600, "Invalid Request");
  }
  if (message.id === undefined) return undefined;
  switch (message.method) {
    case "initialize":
      return result(message.id, {
        protocolVersion: message.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "{{ hodos.name }}", version: "0.1.0" }
      });
    case "ping":
      return result(message.id, {});
    case "tools/list":
      return result(message.id, {
        tools: [{
          name: "lookup_order_risk",
          description: "Return deterministic synthetic order-risk evidence without a model or external data call.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["orderId"],
            properties: { orderId: { type: "string", pattern: "^[A-Za-z0-9._-]{1,80}$" } }
          }
        }]
      });
    case "tools/call": {
      if (message.params?.name !== "lookup_order_risk") return protocolError(message.id, -32602, "Unknown tool");
      const orderId = message.params?.arguments?.orderId;
      if (typeof orderId !== "string" || !/^[A-Za-z0-9._-]{1,80}$/.test(orderId)) return protocolError(message.id, -32602, "orderId is invalid");
      const evidence = { orderId, risk: "review", reason: "synthetic-pricing-policy-change", modelInvoked: false };
      return result(message.id, {
        content: [{ type: "text", text: JSON.stringify(evidence) }],
        structuredContent: evidence,
        isError: false
      });
    }
    default:
      return protocolError(message.id, -32601, "Method not found");
  }
}

export function createMcpServer() {
  const server = createHttpServer(async (request, response) => {
    const requestId = randomUUID();
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/healthz") return sendJson(response, 200, { status: "ok" }, requestId);
    if (request.method !== "POST" || url.pathname !== "/mcp") return sendJson(response, 404, { error: "not_found" }, requestId);
    try {
      const message = await readJson(request);
      const responseMessage = handleMessage(message);
      if (responseMessage === undefined) return sendJson(response, 202, undefined, requestId);
      return sendJson(response, 200, responseMessage, requestId);
    } catch (error) {
      return sendJson(response, error.status ?? 400, protocolError(null, -32700, error.message), requestId);
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
  const server = createMcpServer();
  server.listen(port, host, () => console.log(JSON.stringify({ event: "mcp.started", host, port })));
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
