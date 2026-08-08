import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}

function localTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<|>$/g, "");
  if (!target || target.startsWith("#")) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;
  return decodeURIComponent(target.split("#", 1)[0]);
}

async function assertLocalLink(source, target) {
  invariant(!path.isAbsolute(target), `${source} contains an absolute local link: ${target}`);
  const candidate = path.resolve(path.dirname(source), target);
  const root = (await realpath(repositoryRoot)).toLowerCase();
  let resolved;
  try {
    resolved = (await realpath(candidate)).toLowerCase();
  } catch {
    throw new Error(`${source} contains a broken local link: ${target}`);
  }
  invariant(resolved === root || resolved.startsWith(`${root}${path.sep}`), `${source} link escapes the repository: ${target}`);
  invariant((await stat(candidate)).isFile(), `${source} local link is not a file: ${target}`);
}

export async function checkDocs() {
  const documentationRoot = path.join(repositoryRoot, "docs");
  const files = [
    path.join(repositoryRoot, "README.md"),
    path.join(repositoryRoot, "CONTRIBUTING.md"),
    path.join(repositoryRoot, "SECURITY.md"),
    ...await markdownFiles(documentationRoot)
  ];

  const indexPath = path.join(documentationRoot, "index.md");
  const index = await readFile(indexPath, "utf8");
  invariant(index.includes("local-verification.md"), "docs/index.md must name the start-here verification path");

  for (const file of files) {
    const relative = path.relative(repositoryRoot, file).replaceAll("\\", "/");
    const source = await readFile(file, "utf8");
    invariant(!source.includes("\u2014"), `${relative} contains an em dash connector`);
    for (const match of source.matchAll(markdownLink)) {
      const target = localTarget(match[1]);
      if (target) await assertLocalLink(relative, target);
    }
  }

  const documentationFiles = files.filter((file) => file.startsWith(`${documentationRoot}${path.sep}`) && file !== indexPath);
  for (const file of documentationFiles) {
    const relative = path.relative(documentationRoot, file).replaceAll("\\", "/");
    invariant(index.includes(`(${relative})`), `docs/index.md does not link ${relative}`);
  }

  return { pages: documentationFiles.length + 1 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkDocs();
    console.log(`Checked ${result.pages} documentation pages.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
