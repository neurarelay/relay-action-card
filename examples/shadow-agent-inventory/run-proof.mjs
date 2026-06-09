#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRelayAttribution,
  publicAttributionSummary,
} from "../lib/activation-attribution.mjs";

const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const listOnly = argv.includes("--list");
const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const proofRoot = join(repoRoot, "examples/shadow-agent-inventory");
const findingsDir = join(proofRoot, "findings");
const receiptsDir = join(proofRoot, "receipts");

const attribution = buildRelayAttribution({
  argv,
  defaultSource: "github",
  defaultCampaign: "shadow_agent_inventory",
  defaultSurface: "relay_action_card",
});

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function loadJsonDir(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      value: readJson(join(dir, file)),
    }));
}

function applyReceiptAttribution(receipt) {
  return {
    ...receipt,
    trace: {
      ...receipt.trace,
      source: attribution.neura_source,
      campaign: attribution.neura_campaign,
      surface: attribution.neura_surface,
    },
  };
}

const manifest = readJson(join(proofRoot, "manifest.json"));
const findings = loadJsonDir(findingsDir);
const receipts = loadJsonDir(receiptsDir).map(({ file, value }) => ({
  file,
  value: applyReceiptAttribution(value),
}));

if (listOnly) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: manifest.proof,
        findings: findings.map(({ file, value }) => ({
          file: basename(file),
          finding_id: value.finding_id,
          finding_type: value.finding_type,
          recommended_decision: value.recommended_decision,
          stop_receipt_required: value.stop_receipt_required,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const findingCounts = findings.reduce((counts, { value }) => {
  counts[value.finding_type] = (counts[value.finding_type] ?? 0) + 1;
  return counts;
}, {});

const output = {
  ok: true,
  proof: manifest.proof,
  capability: manifest.capability,
  mode: "local_dry_run_shadow_inventory_no_customer_shutdown",
  pattern: manifest.pattern,
  source_refs: manifest.source_refs,
  finding_count: findings.length,
  finding_counts: findingCounts,
  stop_receipt_count: receipts.length,
  activation_attribution: publicAttributionSummary(attribution),
  inventory_findings: findings.map(({ file, value }) => ({
    source_file: basename(file),
    ...value,
  })),
  stop_receipts: receipts.map(({ file, value }) => ({
    source_file: basename(file),
    ...value,
  })),
  boundary: manifest.boundary,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Shadow Agent Inventory / Stop Receipt dry-run proof");
  console.log(`Inventory findings: ${output.finding_count}`);
  console.log(`Stop recommendation receipts: ${output.stop_receipt_count}`);
  console.log("No customer runtime shutdown by Neura.");
}
