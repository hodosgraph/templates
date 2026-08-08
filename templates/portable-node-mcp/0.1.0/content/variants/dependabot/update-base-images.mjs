import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const dockerfilePath = "Dockerfile";
const write = process.argv.includes("--write");
const original = await readFile(dockerfilePath, "utf8");
const pattern = /^(ARG (?:BUILDER_BASE|RUNTIME_BASE)=)([^\s@]+:[^\s@]+)@sha256:[a-f0-9]{64}$/gm;
const matches = [...original.matchAll(pattern)];
if (matches.length !== 2) throw new Error("expected exactly two pinned HodosGraph base-image ARGs");

let updated = original;
const changes = [];
for (const match of matches) {
  const image = match[2];
  const inspection = spawnSync("docker", ["buildx", "imagetools", "inspect", image], { encoding: "utf8", shell: false });
  if (inspection.status !== 0) throw new Error(`could not inspect ${image}: ${inspection.stderr.trim()}`);
  const digest = inspection.stdout.match(/^Digest:\s+(sha256:[a-f0-9]{64})$/m)?.[1];
  if (!digest) throw new Error(`registry returned no manifest-list digest for ${image}`);
  const current = match[0].match(/sha256:[a-f0-9]{64}$/)[0];
  if (current !== digest) {
    updated = updated.replace(match[0], `${match[1]}${image}@${digest}`);
    changes.push({ image, from: current, to: digest });
  }
}

if (write && changes.length > 0) await writeFile(dockerfilePath, updated, "utf8");
console.log(JSON.stringify({ changed: changes.length > 0, changes }));
