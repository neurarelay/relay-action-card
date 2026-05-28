#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRelayAttribution,
  publicAttributionSummary,
} from "../examples/lib/activation-attribution.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const attribution = buildRelayAttribution({
  argv,
  defaultSource: "github",
  defaultCampaign: "pre_action_authority",
  defaultSurface: "authority_ladder",
});

const proofSteps = [
  {
    step: "01",
    proof: "agent-action-firewall",
    capability: "Agent Action Firewall",
    script: "examples/agent-action-firewall/run-proof.mjs",
    surface: "agent_action_firewall",
  },
  {
    step: "03",
    proof: "mcp-risk-gate",
    capability: "MCP Risk Gate",
    script: "examples/mcp-risk-gate/run-proof.mjs",
    surface: "mcp_risk_gate",
  },
  {
    step: "04",
    proof: "commerceops-fire-drill",
    capability: "CommerceOps Fire Drill",
    script: "examples/commerceops-fire-drill/run-proof.mjs",
    surface: "commerceops_fire_drill",
  },
  {
    step: "05",
    proof: "authority-path",
    capability: "Authority Path Proof",
    script: "examples/authority-path/run-proof.mjs",
    surface: "authority_path",
  },
];

function proofArgs(surface) {
  return [
    "--dry-run",
    "--json",
    `--source=${attribution.neura_source ?? "github"}`,
    `--campaign=${attribution.neura_campaign ?? "pre_action_authority"}`,
    `--surface=${surface}`,
  ];
}

function parseJson(stdout, label) {
  const start = stdout.indexOf("{");
  if (start === -1) throw new Error(`${label} did not return JSON`);
  return JSON.parse(stdout.slice(start));
}

function runNode(script, args = []) {
  return spawnSync("node", [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runDecisionReceiptStandard() {
  const result = runNode("scripts/verify-decision-receipt-standard.mjs");
  if (result.status !== 0) {
    return {
      step: "02",
      proof: "decision-receipt-standard",
      capability: "Decision Receipt Standard",
      ok: false,
      error: result.stderr || result.stdout,
    };
  }

  return {
    step: "02",
    proof: "decision-receipt-standard",
    capability: "Decision Receipt Standard",
    ok: true,
    standard: "neura-decision-receipt-v0.1-draft",
    verifier: "scripts/verify-decision-receipt-standard.mjs",
  };
}

function runProof(step) {
  const result = runNode(step.script, proofArgs(step.surface));
  if (result.status !== 0) {
    return {
      step: step.step,
      proof: step.proof,
      capability: step.capability,
      ok: false,
      error: result.stderr || result.stdout,
    };
  }

  const output = parseJson(result.stdout, step.proof);
  return {
    step: step.step,
    proof: step.proof,
    capability: step.capability,
    ok: output.ok === true,
    mode: output.mode,
    pattern: output.pattern,
    scenario_count: output.scenario_count,
    receipt_standard: output.receipt_standard,
    decisions_covered: output.decisions_covered,
    decision_counts: output.decision_counts,
    activation_attribution: output.activation_attribution,
    boundary: output.boundary,
  };
}

try {
  const proofResults = [
    runProof(proofSteps[0]),
    runDecisionReceiptStandard(),
    runProof(proofSteps[1]),
    runProof(proofSteps[2]),
    runProof(proofSteps[3]),
  ];
  const ok = proofResults.every((result) => result.ok === true);
  const decisionCounts = {};

  for (const result of proofResults) {
    for (const [decision, count] of Object.entries(result.decision_counts ?? {})) {
      decisionCounts[decision] = (decisionCounts[decision] ?? 0) + count;
    }
  }

  const output = {
    ok,
    proof: "pre-action-authority",
    capability: "Pre-Action Authority",
    mode: "local_dry_run_pre_action_authority_no_downstream_execution",
    pattern:
      "Proposed action -> Action Card -> Pre-Action Authority -> Decision Receipt -> developer-owned execution or restraint",
    receipt_standard: "neura-decision-receipt-v0.1-draft",
    proof_ladder: proofResults,
    scenario_count: proofResults.reduce((total, result) => total + (result.scenario_count ?? 0), 0),
    decision_counts: decisionCounts,
    activation_attribution: publicAttributionSummary(attribution),
    boundary: {
      synthetic_data_only: true,
      downstream_execution_performed_by_neura: false,
      real_mcp_server_called: false,
      real_shopify_touched: false,
      real_payment_touched: false,
      real_fulfillment_touched: false,
      real_discount_code_created: false,
      real_customer_message_sent: false,
      provider_approval_claimed: false,
      compliance_certification_claimed: false,
      public_action_authorized: false,
    },
    docs: {
      authority_doc: "docs/agent-action-gateway.md",
      authority_url: "https://www.neurarelay.com/agent-action-gateway",
      first_proof_url: "https://www.neurarelay.com/developers/first-proof",
    },
  };

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("Pre-Action Authority dry-run proof ladder");
    console.log(`Status: ${ok ? "passed" : "failed"}`);
    console.log(`Scenarios: ${output.scenario_count}`);
    console.log(
      `Decisions: allow=${decisionCounts.allow ?? 0}, revise=${decisionCounts.revise ?? 0}, human_review=${decisionCounts.human_review ?? 0}, stop=${decisionCounts.stop ?? 0}`,
    );
    console.log("No downstream execution by Neura.");
  }

  process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
