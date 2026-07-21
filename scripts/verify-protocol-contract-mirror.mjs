import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "schemas/manifest.json"), "utf8"));
const failures = [];
const seenIds = new Set();

if (manifest.schemaVersion !== 1) failures.push("schemaVersion must be 1");
if (manifest.status !== "public_mirror") failures.push("status must remain public_mirror");
if (manifest.canonicalRepository !== "rpelevin/neura-protocol-web") failures.push("canonical repository must remain Neura Protocol");

for (const artifact of manifest.artifacts ?? []) {
  if (seenIds.has(artifact.id)) failures.push(`duplicate artifact id: ${artifact.id}`);
  seenIds.add(artifact.id);
  const bytes = await readFile(resolve(root, artifact.path));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== artifact.sha256) failures.push(`${artifact.id} mirror hash mismatch: ${actual}`);
  try {
    JSON.parse(bytes.toString("utf8"));
  } catch {
    failures.push(`${artifact.id} mirror is not valid JSON`);
  }
}

if ((manifest.artifacts ?? []).length !== 6) failures.push("expected six public schema mirrors");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, canonicalRepository: manifest.canonicalRepository, mirrors: manifest.artifacts.length }, null, 2));
