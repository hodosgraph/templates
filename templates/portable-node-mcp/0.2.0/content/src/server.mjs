import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createTelemetry } from "./telemetry.mjs";

const MAX_BODY_BYTES = 32 * 1024;
const SERVICE_NAME = "{{ hodos.name }}";
const SERVICE_VERSION = "0.2.0";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff"
    }
  });
}

function parseCsv(value) {
  return new Set((value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function hostnameFromHostHeader(value) {
  if (!value || Array.isArray(value)) return undefined;
  try {
    return new URL(`http://${value}`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function validateRequestAuthority(request, environment) {
  const allowedHosts = parseCsv(environment.MCP_ALLOWED_HOSTS);
  if (allowedHosts.size === 0) {
    allowedHosts.add("localhost");
    allowedHosts.add("127.0.0.1");
    allowedHosts.add("::1");
    allowedHosts.add((environment.OTEL_SERVICE_NAME ?? SERVICE_NAME).toLowerCase());
  }

  const hostname = hostnameFromHostHeader(request.headers.host);
  if (!hostname || !allowedHosts.has(hostname)) {
    return jsonResponse(421, { error: "host_not_allowed" });
  }

  const origin = request.headers.origin;
  if (origin) {
    const allowedOrigins = parseCsv(environment.MCP_ALLOWED_ORIGINS);
    let normalizedOrigin;
    try {
      normalizedOrigin = new URL(origin).origin.toLowerCase();
    } catch {
      return jsonResponse(403, { error: "origin_not_allowed" });
    }
    if (!allowedOrigins.has(normalizedOrigin)) {
      return jsonResponse(403, { error: "origin_not_allowed" });
    }
  }
  return undefined;
}

async function readBody(request) {
  const declaredSize = Number.parseInt(request.headers["content-length"] ?? "", 10);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    request.resume();
    throw Object.assign(new Error("body_too_large"), { status: 413 });
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      request.resume();
      throw Object.assign(new Error("body_too_large"), { status: 413 });
    }
    chunks.push(chunk);
  }
  return chunks.length === 0 ? undefined : Buffer.concat(chunks);
}

async function toWebRequest(request, body) {
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url ?? "/", `http://${host}`);
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    ...(body === undefined ? {} : { body })
  });
}

async function sendWebResponse(response, webResponse, requestId) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => response.setHeader(name, value));
  response.setHeader("x-request-id", requestId);
  response.setHeader("x-content-type-options", "nosniff");
  if (!webResponse.body) {
    response.end();
    return;
  }

  const reader = webResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!response.write(Buffer.from(value))) await once(response, "drain");
    }
  } finally {
    response.end();
    reader.releaseLock();
  }
}

function createProtocolServer(telemetry) {
  const server = new McpServer({ name: SERVICE_NAME, version: SERVICE_VERSION });
  const evidenceSchema = z.object({
    orderId: z.string(),
    risk: z.enum(["review"]),
    reason: z.string(),
    modelInvoked: z.boolean()
  });

  server.registerTool("lookup_order_risk", {
    title: "Lookup synthetic order risk",
    description: "Return deterministic synthetic order-risk evidence without a model or external data call.",
    inputSchema: z.object({
      orderId: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/)
    }),
    outputSchema: evidenceSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }, async ({ orderId }) => telemetry.runTool("lookup_order_risk", async () => {
    const evidence = {
      orderId,
      risk: "review",
      reason: "synthetic-pricing-policy-change",
      modelInvoked: false
    };
    return {
      content: [{ type: "text", text: JSON.stringify(evidence) }],
      structuredContent: evidence
    };
  }));

  return server;
}

export function createMcpServer({ environment = process.env, telemetry = createTelemetry({ environment }) } = {}) {
  const maxConcurrency = Number.parseInt(environment.MCP_MAX_CONCURRENCY ?? "64", 10);
  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1 || maxConcurrency > 1_024) {
    throw new Error("MCP_MAX_CONCURRENCY must be between 1 and 1024");
  }
  let activeRequests = 0;
  const handler = createMcpHandler(() => createProtocolServer(telemetry), {
    legacy: "stateless",
    responseMode: "auto",
    onerror: (error) => telemetry.error("mcp.protocol.error", { "error.type": error?.name ?? "Error" })
  });

  const server = createHttpServer(async (request, response) => {
    const requestId = randomUUID();
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    try {
      if (request.method === "GET" && (pathname === "/healthz" || pathname === "/readyz")) {
        return sendWebResponse(response, jsonResponse(200, { status: "ok" }), requestId);
      }
      if (pathname !== "/mcp") {
        return sendWebResponse(response, jsonResponse(404, { error: "not_found" }), requestId);
      }

      const rejected = validateRequestAuthority(request, environment);
      if (rejected) {
        telemetry.rejected("authority_policy");
        return sendWebResponse(response, rejected, requestId);
      }
      if (activeRequests >= maxConcurrency) {
        telemetry.rejected("concurrency_limit");
        return sendWebResponse(response, jsonResponse(503, { error: "concurrency_limit" }), requestId);
      }
      const body = request.method === "POST" ? await readBody(request) : undefined;
      const webRequest = await toWebRequest(request, body);
      activeRequests += 1;
      try {
        const webResponse = await telemetry.runHttp({
          method: request.method ?? "UNKNOWN",
          path: pathname,
          requestId
        }, () => handler.fetch(webRequest));
        return await sendWebResponse(response, webResponse, requestId);
      } finally {
        activeRequests -= 1;
      }
    } catch (error) {
      telemetry.error("mcp.http.error", { "error.type": error?.name ?? "Error", "hodosgraph.request.id": requestId });
      const status = Number.isInteger(error?.status) ? error.status : 500;
      if (status === 413) telemetry.rejected("body_limit");
      return sendWebResponse(response, jsonResponse(status, { error: status === 413 ? "body_too_large" : "internal_error" }), requestId);
    }
  });

  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.hodosClose = async () => {
    await handler.close();
    await telemetry.shutdown();
  };
  server.hodosShutdown = () => new Promise((resolve) => {
    const deadline = setTimeout(() => server.closeAllConnections(), 10_000);
    deadline.unref();
    server.close(async () => {
      clearTimeout(deadline);
      await server.hodosClose();
      resolve();
    });
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const host = process.env.HOST ?? "0.0.0.0";
  const port = Number.parseInt(process.env.PORT ?? "8080", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be between 1 and 65535");
  const server = createMcpServer();
  server.listen(port, host, () => process.stdout.write(`${JSON.stringify({ event: "mcp.started", host, port })}\n`));
  const shutdown = async () => {
    await server.hodosShutdown();
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
