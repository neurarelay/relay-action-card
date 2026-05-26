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
const scenariosDir = join(repoRoot, "examples/agent-action-firewall/scenarios");
const receiptsDir = join(repoRoot, "examples/agent-action-firewall/receipts");

const attribution = buildRelayAttribution({
  argv,
  defaultSource: "github",
  defaultCampaign: "agent_action_gateway",
  defaultSurface: "agent_action_firewall",
});

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function loadScenarioPairs() {
  return readdirSync(scenariosDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const scenario = readJson(join(scenariosDir, file));
      const receipt = readJson(join(receiptsDir, file));
      return { file, scenario, receipt };
    });
}

function applyAttribution(receipt) {
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

function buildResult(pair) {
  const decisionReceipt = applyAttribution(pair.receipt);
  const actionCard = {
    ...pair.scenario.action_card,
    trace: {
      ...pair.scenario.action_card.trace,
      source: attribution.neura_source,
      campaign: attribution.neura_campaign,
      surface: attribution.neura_surface,
    },
  };

  return {
    scenario_id: pair.scenario.scenario_id,
    title: pair.scenario.title,
    source_file: basename(pair.file),
    decision: decisionReceipt.decision,
    expected_decision: pair.scenario.expected_decision,
    decision_reason: decisionReceipt.decision_reason,
    action_card: actionCard,
    decision_receipt: decisionReceipt,
    firewall_route: {
      decision: decisionReceipt.decision,
      allowed_next_step: decisionReceipt.execution.allowed_next_step,
      blocked_downstream_actions: decisionReceipt.execution.blocked_downstream_actions,
      runtime_owns_execution_decision: true,
      downstream_execution_by_neura: false,
    },
    synthetic_data_only: true,
  };
}

const pairs = loadScenarioPairs();

if (listOnly) {
  const output = {
    ok: true,
    proof: "agent-action-firewall",
    scenarios: pairs.map(({ scenario }) => ({
      scenario_id: scenario.scenario_id,
      title: scenario.title,
      expected_decision: scenario.expected_decision,
    })),
  };
  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

const results = pairs.map(buildResult);
const decisionCounts = Object.fromEntries(
  ["allow", "revise", "human_review", "stop"].map((decision) => [
    decision,
    results.filter((result) => result.decision === decision).length,
  ]),
);

const output = {
  ok: true,
  proof: "agent-action-firewall",
  capability: "Agent Action Firewall",
  mode: "local_dry_run_no_downstream_execution",
  pattern:
    "Action Card -> Agent Action Firewall -> Decision Receipt -> developer-owned execution or restraint",
  receipt_standard: "neura-decision-receipt-v0.1-draft",
  scenario_count: results.length,
  decisions_covered: Object.keys(decisionCounts).filter((decision) => decisionCounts[decision] > 0),
  decision_counts: decisionCounts,
  activation_attribution: publicAttributionSummary(attribution),
  results,
  boundary: {
    synthetic_data_only: true,
    downstream_execution_performed_by_neura: false,
    real_customer_data_used: false,
    provider_approval_claimed: false,
    compliance_certification_claimed: false,
    public_action_authorized: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Agent Action Firewall dry-run proof");
  console.log(`Scenarios: ${output.scenario_count}`);
  console.log(
    `Decisions: allow=${decisionCounts.allow}, revise=${decisionCounts.revise}, human_review=${decisionCounts.human_review}, stop=${decisionCounts.stop}`,
  );
  console.log("No downstream execution by Neura.");
}
