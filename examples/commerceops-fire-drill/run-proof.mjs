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
const proofRoot = join(repoRoot, "examples/commerceops-fire-drill");
const fixturesDir = join(proofRoot, "fixtures");
const scenariosDir = join(proofRoot, "scenarios");
const receiptsDir = join(proofRoot, "receipts");

const attribution = buildRelayAttribution({
  argv,
  defaultSource: "github",
  defaultCampaign: "pre_action_authority",
  defaultSurface: "commerceops_fire_drill",
});

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function receiptFileFor(scenarioFile) {
  return scenarioFile.replace(/\.json$/, ".receipt.json");
}

function loadPairs() {
  return readdirSync(scenariosDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      scenario: readJson(join(scenariosDir, file)),
      receipt: readJson(join(receiptsDir, receiptFileFor(file))),
    }));
}

function loadFixturesSummary() {
  const merchant = readJson(join(fixturesDir, "merchant.json"));
  const orders = readJson(join(fixturesDir, "orders.json"));
  const policies = readJson(join(fixturesDir, "policies.json"));
  return {
    merchant_id: merchant.merchant_id,
    merchant_name: merchant.merchant_name,
    order_count: orders.length,
    policy_count: Object.keys(policies).filter((key) => key !== "synthetic_data_only").length,
    synthetic_data_only: merchant.synthetic_data_only === true,
  };
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

function buildActionCard(scenario, receipt) {
  return {
    action_card_id: scenario.action_card_id,
    standard: "neura-action-card-v0.1-draft",
    created_at: receipt.created_at,
    actor: scenario.actor,
    system: scenario.system,
    proposed_action: {
      action_type: scenario.action_type,
      target: scenario.target,
      summary: scenario.proposed_change,
      params_hash: scenario.params_hash,
      amount_or_value_at_risk: scenario.amount_or_value_at_risk,
      customer_impact: scenario.customer_impact,
    },
    risk: scenario.risk,
    policy_refs: scenario.policy_refs,
    evidence_refs: scenario.evidence_refs,
    requested_outcome: scenario.requested_outcome,
    authority_context: {
      authority_ref: receipt.authority.authority_ref,
      required_role: receipt.authority.required_role,
      approval_state: receipt.authority.approval_state,
    },
    execution_boundary: {
      downstream_execution_owner: "developer_runtime",
      no_downstream_execution_by_neura: true,
    },
    trace: {
      trace_ref: receipt.trace.trace_ref,
      source: attribution.neura_source,
      campaign: attribution.neura_campaign,
      surface: attribution.neura_surface,
    },
    boundary: {
      synthetic_data_only: true,
      downstream_execution_performed_by_neura: false,
      real_shopify_touched: false,
      real_payment_touched: false,
      real_fulfillment_touched: false,
      real_discount_code_created: false,
      real_customer_message_sent: false,
      provider_approval_claimed: false,
      compliance_certification_claimed: false,
    },
  };
}

function buildResult(pair) {
  const decisionReceipt = applyAttribution(pair.receipt);
  const actionCard = buildActionCard(pair.scenario, decisionReceipt);
  return {
    scenario_id: pair.scenario.scenario_id,
    title: pair.scenario.title,
    source_file: basename(pair.file),
    expected_decision: pair.scenario.expected_decision,
    decision: decisionReceipt.decision,
    runtime_instruction: decisionReceipt.runtime_instruction,
    expected_runtime_instruction: pair.scenario.expected_runtime_instruction,
    action_card: actionCard,
    decision_receipt: decisionReceipt,
    commerce_route: {
      route_owner: "developer_runtime",
      decision: decisionReceipt.decision,
      runtime_instruction: decisionReceipt.runtime_instruction,
      allowed_next_step: decisionReceipt.execution.allowed_next_step,
      blocked_downstream_actions: decisionReceipt.execution.blocked_downstream_actions,
      downstream_actions_executed_in_dry_run: false,
      execution_performed_by_neura: false,
    },
    synthetic_data_only: true,
  };
}

const pairs = loadPairs();

if (listOnly) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "commerceops-fire-drill",
        scenarios: pairs.map(({ scenario }) => ({
          scenario_id: scenario.scenario_id,
          title: scenario.title,
          action_type: scenario.action_type,
          expected_decision: scenario.expected_decision,
        })),
      },
      null,
      2,
    ),
  );
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
  proof: "commerceops-fire-drill",
  capability: "CommerceOps Fire Drill",
  mode: "local_dry_run_commerce_agent_no_downstream_execution",
  pattern:
    "Commerce agent intent -> Action Card -> Pre-Action Authority -> Decision Receipt -> developer-owned execution or restraint",
  receipt_standard: "neura-decision-receipt-v0.1-draft",
  fixture_summary: loadFixturesSummary(),
  scenario_count: results.length,
  receipts_generated: results.length,
  decisions_covered: Object.keys(decisionCounts).filter((decision) => decisionCounts[decision] > 0),
  decision_counts: decisionCounts,
  activation_attribution: publicAttributionSummary(attribution),
  results,
  boundary: {
    synthetic_data_only: true,
    downstream_execution_performed_by_neura: false,
    real_shopify_touched: false,
    real_payment_touched: false,
    real_fulfillment_touched: false,
    real_discount_code_created: false,
    real_customer_message_sent: false,
    provider_approval_claimed: false,
    compliance_certification_claimed: false,
    public_action_authorized: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("CommerceOps Fire Drill dry-run proof");
  console.log(`Scenarios: ${output.scenario_count}`);
  console.log(
    `Decisions: allow=${decisionCounts.allow}, revise=${decisionCounts.revise}, human_review=${decisionCounts.human_review}, stop=${decisionCounts.stop}`,
  );
  console.log("No Shopify, payment, fulfillment, discount-code, or customer-message action executed by Neura.");
}
