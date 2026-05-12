#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createNeuraPreflightAdapter } from "./preflight-adapter/adapter.mjs";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const dryRun = process.argv.includes("--dry-run");
const jsonOutput = process.argv.includes("--json");
const fixtureUsage = "--fixture=<path>";

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const fixture = argValue("fixture") ??
  "examples/openclaw/preflight-adapter/fixtures/send-message.preflight.json";
const preflightAction = JSON.parse(await readFile(join(repoRoot, fixture), "utf8"));
const adapter = createNeuraPreflightAdapter({ relayBaseUrl });
const result = await adapter.beforeAction(preflightAction, { dryRun });
const output = {
  ok: true,
  adapter: "neura-relay-preflight-adapter",
  mode: result.mode,
  fixture,
  relay: dryRun ? null : relayBaseUrl,
  result,
  boundaries: {
    official_openclaw_or_clawhub_claim: false,
    downstream_execution_by_neura: false,
    developer_owned_execution: true,
    refs_only: true,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`Neura Relay Preflight Adapter (${output.mode})`);
  console.log(`Fixture: ${fixture}`);
  console.log(`Custom fixture: ${fixtureUsage}`);
  if (dryRun) {
    console.log(`Route: ${result.route}`);
    console.log("Relay call: skipped");
  } else {
    console.log(`Decision: ${result.receipt.decision}`);
    console.log(`Route: ${result.receipt.route}`);
    console.log(`Receipt: ${result.receipt.receipt_id}`);
    console.log(`Trace: ${result.receipt.trace_ref}`);
    console.log(`Boundary: ${result.receipt.relay_boundary}`);
  }
  console.log("Developer runtime keeps execution ownership.");
}
