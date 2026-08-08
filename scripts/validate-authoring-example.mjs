import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = path.join(repositoryRoot, "examples", "community-copier-agent");
const identifier = /^[a-z0-9][a-z0-9-]{1,62}$/;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, allowed, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  for (const key of Object.keys(value)) invariant(allowed.includes(key), `${context} contains unsupported property ${key}`);
}

async function safeFile(base, relativePath) {
  invariant(typeof relativePath === "string" && relativePath.length > 0 && !path.isAbsolute(relativePath), `${relativePath} must be a relative path`);
  const candidate = path.resolve(base, relativePath);
  const root = (await realpath(base)).toLowerCase();
  const resolved = (await realpath(candidate)).toLowerCase();
  invariant(resolved.startsWith(`${root}${path.sep}`), `${relativePath} escapes its template root`);
  invariant((await stat(candidate)).isFile(), `${relativePath} must be a regular file`);
  return candidate;
}

async function safeDirectory(base, relativePath) {
  invariant(typeof relativePath === "string" && relativePath.length > 0 && !path.isAbsolute(relativePath), `${relativePath} must be a relative path`);
  const candidate = path.resolve(base, relativePath);
  const root = (await realpath(repositoryRoot)).toLowerCase();
  const resolved = (await realpath(candidate)).toLowerCase();
  invariant(resolved.startsWith(`${root}${path.sep}`), `${relativePath} escapes the repository`);
  invariant((await stat(candidate)).isDirectory(), `${relativePath} must be a directory`);
  return candidate;
}

export async function validateAuthoringExample() {
  const manifest = JSON.parse(await readFile(path.join(exampleRoot, "hodos-template.json"), "utf8"));
  exactKeys(manifest, ["$schema", "apiVersion", "kind", "metadata", "spec"], "authoring manifest");
  invariant(manifest.apiVersion === "templates.hodosgraph.com/v1alpha2", "authoring manifest apiVersion is invalid");
  invariant(manifest.kind === "Template", "authoring manifest kind is invalid");
  exactKeys(manifest.metadata, ["id", "name", "version", "description", "owners", "license", "tags"], "authoring metadata");
  invariant(identifier.test(manifest.metadata.id), "authoring template id is invalid");
  exactKeys(manifest.spec, ["type", "maturity", "engine", "inputSchema", "framework", "capabilities", "outputs", "targets", "compatibility", "security", "conformance"], "authoring spec");
  exactKeys(manifest.spec.engine, ["name", "versionRange", "configFile", "unsafeFeatures"], "authoring engine");
  invariant(manifest.spec.engine.name === "copier", "authoring example must exercise Copier");
  invariant(manifest.spec.engine.unsafeFeatures === false, "unsafe renderer features must be disabled");

  const copierPath = await safeFile(exampleRoot, manifest.spec.engine.configFile);
  const copier = await readFile(copierPath, "utf8");
  for (const unsafeKey of ["_tasks", "_migrations", "_jinja_extensions"]) {
    invariant(!new RegExp(`^${unsafeKey}:`, "m").test(copier), `Copier example may not declare ${unsafeKey}`);
  }

  const inputPath = await safeFile(exampleRoot, manifest.spec.inputSchema);
  const inputSchema = JSON.parse(await readFile(inputPath, "utf8"));
  invariant(inputSchema.$schema === "https://json-schema.org/draft/2020-12/schema", "authoring inputs must use JSON Schema 2020-12");
  invariant(inputSchema.type === "object" && inputSchema.additionalProperties === false, "authoring inputs must reject unknown values");
  invariant(inputSchema.properties?.dependency_updater?.enum?.includes("dependabot"), "authoring inputs must support Dependabot");
  invariant(inputSchema.properties?.dependency_updater?.enum?.includes("renovate"), "authoring inputs must support Renovate");

  invariant(Array.isArray(manifest.spec.outputs) && manifest.spec.outputs.length > 0, "authoring example needs outputs");
  invariant(manifest.spec.outputs.some((output) => output.ownership === "user-owned"), "authoring example must preserve a user-owned zone");
  invariant(manifest.spec.outputs.every((output) => !path.isAbsolute(output.pattern) && !output.pattern.split(/[\\/]/).includes("..")), "authoring output patterns must remain relative");
  invariant(manifest.spec.security.secretInputs === false, "authoring example may not accept secret values");
  invariant(manifest.spec.security.networkDuringRender === false, "authoring example render must be offline");

  for (const sample of manifest.spec.conformance.sampleAnswers) {
    const samplePath = await safeFile(exampleRoot, sample);
    const answers = JSON.parse(await readFile(samplePath, "utf8"));
    const allowed = new Set(Object.keys(inputSchema.properties));
    invariant(Object.keys(answers).every((key) => allowed.has(key)), `${sample} contains an unknown answer`);
    invariant(inputSchema.required.every((key) => Object.hasOwn(answers, key)), `${sample} lacks a required answer`);
  }

  const fixture = await safeDirectory(exampleRoot, manifest.spec.conformance.renderedFixture);
  for (const relative of [".copier-answers.yml", ".hodos/unit.yaml", "README.md", "src/domain/incident.py"]) {
    await safeFile(fixture, relative);
  }
  const answers = await readFile(path.join(fixture, ".copier-answers.yml"), "utf8");
  invariant(answers.includes("_src_path: examples/community-copier-agent"), "rendered fixture must retain the Copier source path");
  invariant(!/[A-Z]:\\|\/Users\//i.test(answers), "rendered answers may not contain an absolute author path");

  return { templates: 1, samples: manifest.spec.conformance.sampleAnswers.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await validateAuthoringExample();
    console.log(`Validated ${result.templates} authoring example and ${result.samples} sample answer set.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
