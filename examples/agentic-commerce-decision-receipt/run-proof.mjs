#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const proofRoot = join(repoRoot, "examples/agentic-commerce-decision-receipt");

function readJson(file) {
  return JSON.parse(readFileSync(join(proofRoot, file), "utf8"));
}

const manifest = readJson("manifest.json");
const receipt = readJson("refund-over-threshold.decision-receipt.example.json");

const output = {
  ok: true,
  proof: manifest.proof,
  capability: manifest.capability,
  mode: "local_dry_run_agentic_commerce_no_downstream_execution",
  pattern:
    "commerce agent intent -> Agent I/O Event -> Action Card -> Decision Receipt -> optional Approval Receipt -> developer-owned execution or restraint -> outcome ref",
  source_proof: manifest.source_proof,
  canonical_scenario: manifest.canonical_scenario,
  receipt,
  decision: receipt.decision,
  runtime_instruction: receipt.runtime_instruction,
  commerce_binding: receipt.commerce_binding,
  invalid_if_changed: receipt.validity.invalid_if_changed,
  blocked_downstream_actions: receipt.execution.blocked_downstream_actions,
  boundary: manifest.boundary,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Agentic Commerce Decision Receipt dry-run proof");
  console.log(`Decision: ${output.decision}`);
  console.log(`Runtime instruction: ${output.runtime_instruction}`);
  console.log("No payment, commerce platform, customer account, or customer message action executed by Neura.");
}
