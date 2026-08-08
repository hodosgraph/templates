import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const identifier = /^[a-z0-9][a-z0-9-]{1,62}$/;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, allowed, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  for (const key of Object.keys(value)) {
    invariant(allowed.includes(key), `${context} contains unsupported property ${key}`);
  }
}

async function loadJson(relativePath) {
  const absolutePath = await safeExistingPath(relativePath);
  try {
    return JSON.parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

async function safeExistingPath(relativePath) {
  invariant(typeof relativePath === "string" && relativePath.length > 0, "path must be a non-empty string");
  invariant(!path.isAbsolute(relativePath), `${relativePath} must be relative`);
  const candidate = path.resolve(repositoryRoot, relativePath);
  const root = (await realpath(repositoryRoot)).toLowerCase();
  const resolved = (await realpath(candidate)).toLowerCase();
  invariant(resolved.startsWith(`${root}${path.sep}`), `${relativePath} escapes the repository`);
  const metadata = await stat(candidate);
  invariant(metadata.isFile(), `${relativePath} must be a regular file`);
  return candidate;
}

function validateCatalogShape(catalog) {
  exactKeys(catalog, ["$schema", "apiVersion", "kind", "metadata", "spec"], "catalog");
  invariant(catalog.apiVersion === "templates.hodosgraph.com/v1alpha1", "catalog apiVersion is invalid");
  invariant(catalog.kind === "TemplateCatalog", "catalog kind is invalid");
  exactKeys(catalog.metadata, ["name", "publisher"], "catalog.metadata");
  invariant(identifier.test(catalog.metadata.name), "catalog metadata.name is invalid");
  invariant(typeof catalog.metadata.publisher === "string" && catalog.metadata.publisher.length > 0, "catalog publisher is required");
  exactKeys(catalog.spec, ["templates", "targetProfiles"], "catalog.spec");
  invariant(Array.isArray(catalog.spec.templates) && catalog.spec.templates.length > 0, "catalog needs templates");
  invariant(Array.isArray(catalog.spec.targetProfiles) && catalog.spec.targetProfiles.length > 0, "catalog needs target profiles");
}

function validateInputSchema(schema, context) {
  invariant(schema.$schema === "https://json-schema.org/draft/2020-12/schema", `${context} must use JSON Schema 2020-12`);
  invariant(schema.type === "object", `${context} root type must be object`);
  invariant(schema.additionalProperties === false, `${context} must reject unknown inputs`);
  invariant(schema.properties?.dependencyUpdater?.enum?.includes("dependabot"), `${context} must support Dependabot`);
  invariant(schema.properties?.dependencyUpdater?.enum?.includes("renovate"), `${context} must support Renovate`);
  invariant(schema.properties?.annotations?.propertyNames?.pattern, `${context} must constrain annotation names`);
  invariant(schema.properties?.secretRefs?.type === "array", `${context} must model secrets as references`);
}

async function validateDockerfile(relativePath) {
  const dockerfile = await readFile(await safeExistingPath(relativePath), "utf8");
  const fromLines = dockerfile.match(/^FROM\s+.+$/gim) ?? [];
  invariant(fromLines.length >= 2, `${relativePath} must be multi-stage`);
  invariant(/ARG BUILDER_BASE=.+@sha256:[a-f0-9]{64}/.test(dockerfile), `${relativePath} builder must be digest-pinned`);
  invariant(/ARG RUNTIME_BASE=gcr\.io\/distroless\/.+@sha256:[a-f0-9]{64}/.test(dockerfile), `${relativePath} runtime must be digest-pinned Distroless`);
  invariant(/USER 65532:65532/.test(dockerfile), `${relativePath} must explicitly use UID/GID 65532`);
  invariant(!/^\s*ADD\s/im.test(dockerfile), `${relativePath} may not use ADD`);
  invariant(!/(curl|wget).*(\||>)\s*(sh|bash)/i.test(dockerfile), `${relativePath} may not pipe downloads to a shell`);
  invariant(!/\b(ARG|ENV)\s+\w*(TOKEN|PASSWORD|SECRET|PRIVATE_KEY)\b/i.test(dockerfile), `${relativePath} may not declare secret inputs`);
  for (const label of ["source", "revision", "version", "created", "title", "description", "licenses", "vendor"]) {
    invariant(dockerfile.includes(`org.opencontainers.image.${label}`), `${relativePath} lacks OCI ${label} label`);
  }
}

async function validateTarget(relativePath) {
  const target = await loadJson(relativePath);
  exactKeys(target, ["$schema", "apiVersion", "kind", "metadata", "spec"], relativePath);
  invariant(target.apiVersion === "templates.hodosgraph.com/v1alpha1", `${relativePath} apiVersion is invalid`);
  invariant(target.kind === "TargetProfile", `${relativePath} kind is invalid`);
  exactKeys(target.metadata, ["id", "name"], `${relativePath}.metadata`);
  invariant(identifier.test(target.metadata.id), `${relativePath} target id is invalid`);
  exactKeys(target.spec, ["provider", "maturity", "artifact", "agentHosting", "mcpHosting", "delivery", "identity", "events", "documentation"], `${relativePath}.spec`);
  invariant(["scaffold", "preview", "stable"].includes(target.spec.maturity), `${relativePath} maturity is invalid`);
  invariant(target.spec.artifact?.format === "oci-image", `${relativePath} artifact must be an OCI image`);
  return target.metadata.id;
}

async function validateTemplate(entry, targetIds) {
  exactKeys(entry, ["id", "version", "manifest", "conformance"], `catalog template ${entry.id ?? "<unknown>"}`);
  invariant(identifier.test(entry.id), `template id ${entry.id} is invalid`);
  invariant(semver.test(entry.version), `template ${entry.id} version is not semver`);
  exactKeys(entry.conformance, ["framework", "deterministicMode", "mcp", "openTelemetry", "level"], `catalog template ${entry.id} conformance`);
  invariant(typeof entry.conformance.framework === "string" && entry.conformance.framework.length > 0, `template ${entry.id} framework is required`);
  invariant(typeof entry.conformance.deterministicMode === "boolean", `template ${entry.id} deterministic mode must be declared`);
  invariant(["not-applicable", "minimal-handwritten", "official-sdk"].includes(entry.conformance.mcp), `template ${entry.id} MCP conformance is invalid`);
  invariant(["none", "otlp"].includes(entry.conformance.openTelemetry), `template ${entry.id} OpenTelemetry conformance is invalid`);
  invariant(["scaffold", "gold"].includes(entry.conformance.level), `template ${entry.id} conformance level is invalid`);
  const manifest = await loadJson(entry.manifest);
  exactKeys(manifest, ["$schema", "apiVersion", "kind", "metadata", "spec"], entry.manifest);
  invariant(manifest.apiVersion === "templates.hodosgraph.com/v1alpha1", `${entry.manifest} apiVersion is invalid`);
  invariant(manifest.kind === "Template", `${entry.manifest} kind is invalid`);
  exactKeys(manifest.metadata, ["id", "name", "version", "description"], `${entry.manifest}.metadata`);
  invariant(manifest.metadata.id === entry.id, `${entry.manifest} id does not match catalog`);
  invariant(manifest.metadata.version === entry.version, `${entry.manifest} version does not match catalog`);
  exactKeys(manifest.spec, ["type", "maturity", "inputSchema", "files", "targets", "security"], `${entry.manifest}.spec`);
  invariant(["agent", "mcp-server"].includes(manifest.spec.type), `${entry.manifest} type is invalid`);
  invariant(manifest.spec.type === "mcp-server" || entry.conformance.mcp === "not-applicable", `${entry.manifest} agent must declare MCP as not applicable`);
  invariant(manifest.spec.type !== "mcp-server" || entry.conformance.mcp !== "not-applicable", `${entry.manifest} MCP server must declare its protocol implementation`);
  invariant(entry.conformance.level !== "gold" || entry.conformance.deterministicMode, `${entry.manifest} Gold requires deterministic mode`);
  invariant(entry.conformance.level !== "gold" || entry.conformance.openTelemetry === "otlp", `${entry.manifest} Gold requires OTLP`);
  invariant(entry.conformance.level !== "gold" || manifest.spec.type !== "mcp-server" || entry.conformance.mcp === "official-sdk", `${entry.manifest} Gold MCP requires the official SDK`);
  invariant(["scaffold", "preview", "stable"].includes(manifest.spec.maturity), `${entry.manifest} maturity is invalid`);
  invariant(Array.isArray(manifest.spec.files) && manifest.spec.files.length > 0, `${entry.manifest} needs files`);
  invariant(Array.isArray(manifest.spec.targets) && manifest.spec.targets.length > 0, `${entry.manifest} needs targets`);
  for (const targetId of manifest.spec.targets) invariant(targetIds.has(targetId), `${entry.manifest} references unknown target ${targetId}`);
  const manifestDir = path.posix.dirname(entry.manifest);
  const inputSchemaPath = path.posix.join(manifestDir, manifest.spec.inputSchema);
  const inputSchema = await loadJson(inputSchemaPath);
  validateInputSchema(inputSchema, inputSchemaPath);
  const inputs = new Set(Object.keys(inputSchema.properties ?? {}));
  const targets = new Set();
  for (const file of manifest.spec.files) {
    exactKeys(file, ["source", "target", "when"], `${entry.manifest} file`);
    await safeExistingPath(path.posix.join(manifestDir, file.source));
    invariant(typeof file.target === "string" && file.target.length > 0 && !path.isAbsolute(file.target) && !file.target.split(/[\\/]/).includes(".."), `${entry.manifest} has unsafe output target`);
    invariant(!targets.has(file.target), `${entry.manifest} has duplicate output ${file.target}`);
    targets.add(file.target);
    if (file.when) {
      exactKeys(file.when, ["input", "equals"], `${entry.manifest} condition`);
      invariant(inputs.has(file.when.input), `${entry.manifest} condition references unknown input ${file.when.input}`);
      invariant(inputSchema.properties[file.when.input].enum?.includes(file.when.equals), `${entry.manifest} condition value is outside the input enum`);
    }
  }
  exactKeys(manifest.spec.security, ["dockerfile", "runtimeUser", "readOnlyRootFilesystem", "dependencyUpdaters"], `${entry.manifest}.security`);
  invariant(manifest.spec.security.runtimeUser === 65532, `${entry.manifest} runtime UID must be 65532`);
  invariant(manifest.spec.security.readOnlyRootFilesystem === true, `${entry.manifest} must require a read-only root filesystem`);
  invariant(new Set(manifest.spec.security.dependencyUpdaters).size === 2 && manifest.spec.security.dependencyUpdaters.includes("dependabot") && manifest.spec.security.dependencyUpdaters.includes("renovate"), `${entry.manifest} must support Dependabot and Renovate`);
  await validateDockerfile(path.posix.join(manifestDir, manifest.spec.security.dockerfile));
}

export async function validateCatalog(catalogPath = "catalog.json") {
  const catalog = await loadJson(catalogPath);
  validateCatalogShape(catalog);
  const targetIds = new Set();
  for (const targetPath of catalog.spec.targetProfiles) {
    const targetId = await validateTarget(targetPath);
    invariant(!targetIds.has(targetId), `duplicate target profile ${targetId}`);
    targetIds.add(targetId);
  }
  const templateIds = new Set();
  for (const entry of catalog.spec.templates) {
    invariant(!templateIds.has(entry.id), `duplicate template ${entry.id}`);
    templateIds.add(entry.id);
    await validateTemplate(entry, targetIds);
  }
  return { templates: templateIds.size, targets: targetIds.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await validateCatalog(process.argv[2] ?? "catalog.json");
    console.log(`Validated ${result.templates} templates and ${result.targets} target profiles.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
