import { context, metrics, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";

const INSTRUMENTATION_NAME = "com.hodosgraph.mcp";
const TEMPLATE_ID = "portable-node-mcp";
const TEMPLATE_VERSION = "0.2.0";

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function telemetryEnabled(environment) {
  const explicitlyEnabled = environment.OTEL_SDK_DISABLED?.toLowerCase() === "false";
  const exporterConfigured = Boolean(
    environment.OTEL_EXPORTER_OTLP_ENDPOINT ||
    environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    environment.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    environment.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
  );
  return explicitlyEnabled && exporterConfigured;
}

function exporterUrl(environment, signal) {
  const dedicated = environment[`OTEL_EXPORTER_OTLP_${signal.toUpperCase()}_ENDPOINT`];
  if (dedicated) return dedicated;
  const common = environment.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!common) return undefined;
  return new URL(`v1/${signal}`, common.endsWith("/") ? common : `${common}/`).toString();
}

function writeConsole(event, severity, attributes = {}) {
  process.stdout.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    event,
    ...attributes
  })}\n`);
}

export function createTelemetry({
  environment = process.env,
  serviceName = environment.OTEL_SERVICE_NAME ?? "{{ hodos.name }}",
  serviceVersion = environment.SERVICE_VERSION ?? TEMPLATE_VERSION
} = {}) {
  let sdk;
  const enabled = telemetryEnabled(environment);

  if (enabled) {
    const resource = defaultResource().merge(resourceFromAttributes({
      "service.name": serviceName,
      "service.version": serviceVersion,
      "deployment.environment.name": environment.DEPLOYMENT_ENVIRONMENT ?? "local",
      "hodosgraph.template.id": TEMPLATE_ID,
      "hodosgraph.template.version": TEMPLATE_VERSION,
      "hodosgraph.mcp.id": environment.HODOS_MCP_ID ?? serviceName
    }));

    sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({ url: exporterUrl(environment, "traces") }),
      metricReaders: [new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: exporterUrl(environment, "metrics") }),
        exportIntervalMillis: positiveInteger(environment.OTEL_METRIC_EXPORT_INTERVAL, 60_000),
        exportTimeoutMillis: positiveInteger(environment.OTEL_METRIC_EXPORT_TIMEOUT, 30_000)
      })],
      logRecordProcessors: [new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: exporterUrl(environment, "logs") })
      })]
    });
    sdk.start();
  }

  const tracer = trace.getTracer(INSTRUMENTATION_NAME, TEMPLATE_VERSION);
  const meter = metrics.getMeter(INSTRUMENTATION_NAME, TEMPLATE_VERSION);
  const logger = logs.getLogger(INSTRUMENTATION_NAME, TEMPLATE_VERSION);
  const requestCount = meter.createCounter("mcp.server.requests", { unit: "{request}" });
  const requestErrors = meter.createCounter("mcp.server.errors", { unit: "{error}" });
  const requestDuration = meter.createHistogram("mcp.server.request.duration", { unit: "ms" });
  const toolDuration = meter.createHistogram("gen_ai.server.tool.duration", { unit: "s" });
  const activeRequests = meter.createUpDownCounter("mcp.server.active_requests", { unit: "{request}" });
  const rejectedRequests = meter.createCounter("mcp.server.rejected_requests", { unit: "{request}" });

  function emit(event, severityNumber, severityText, attributes = {}) {
    const spanContext = trace.getSpan(context.active())?.spanContext();
    const correlated = {
      ...attributes,
      ...(spanContext?.traceId ? { "trace.id": spanContext.traceId, "span.id": spanContext.spanId } : {})
    };
    logger.emit({ eventName: event, severityNumber, severityText, body: event, attributes: correlated });
    writeConsole(event, severityText, correlated);
  }

  return {
    enabled,

    info(event, attributes) {
      emit(event, SeverityNumber.INFO, "INFO", attributes);
    },

    error(event, attributes) {
      emit(event, SeverityNumber.ERROR, "ERROR", attributes);
    },

    runHttp({ method, path, requestId }, operation) {
      const started = performance.now();
      activeRequests.add(1);
      const attributes = {
        "http.request.method": method,
        "url.path": path,
        "hodosgraph.request.id": requestId
      };
      return tracer.startActiveSpan("mcp.request", { kind: SpanKind.SERVER, attributes }, async (span) => {
        let statusCode = 500;
        try {
          const response = await operation();
          statusCode = response.status;
          span.setAttribute("http.response.status_code", statusCode);
          if (statusCode >= 400) {
            requestErrors.add(1, {
              "error.type": "http_status",
              "http.response.status_code": statusCode
            });
          }
          if (statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
          return response;
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.setAttribute("error.type", error?.name ?? "Error");
          requestErrors.add(1, { "error.type": error?.name ?? "Error" });
          throw error;
        } finally {
          requestCount.add(1, { "http.request.method": method, "http.response.status_code": statusCode });
          requestDuration.record(performance.now() - started, { "http.request.method": method });
          activeRequests.add(-1);
          span.end();
        }
      });
    },

    rejected(reason) {
      rejectedRequests.add(1, { reason });
    },

    runTool(toolName, operation) {
      const started = performance.now();
      return tracer.startActiveSpan(`${toolName} execute_tool`, {
        kind: SpanKind.INTERNAL,
        attributes: {
          "gen_ai.operation.name": "execute_tool",
          "gen_ai.tool.name": toolName,
          "gen_ai.tool.type": "extension"
        }
      }, async (span) => {
        try {
          const result = await operation();
          span.setStatus({ code: SpanStatusCode.OK });
          emit("mcp.tool.completed", SeverityNumber.INFO, "INFO", { "gen_ai.tool.name": toolName });
          return result;
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.setAttribute("error.type", error?.name ?? "Error");
          requestErrors.add(1, { "error.type": error?.name ?? "Error" });
          emit("mcp.tool.failed", SeverityNumber.ERROR, "ERROR", {
            "gen_ai.tool.name": toolName,
            "error.type": error?.name ?? "Error"
          });
          throw error;
        } finally {
          toolDuration.record((performance.now() - started) / 1_000, {
            "gen_ai.operation.name": "execute_tool",
            "gen_ai.tool.name": toolName
          });
          span.end();
        }
      });
    },

    async shutdown() {
      await sdk?.shutdown();
    }
  };
}
