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
const scenariosDir = join(repoRoot, "examples/mcp-risk-gate/scenarios");
const receiptsDir = join(repoRoot, "examples/mcp-risk-gate/receipts");

const attribution = buildRelayAttribution({
  argv,
  defaultSource: "github",
  defaultCampaign: "agent_action_gateway",
  defaultSurface: "mcp_risk_gate",
});

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function loadPairs() {
  return readdirSync(scenariosDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      scenario: readJson(join(scenariosDir, file)),
      receipt: readJson(join(receiptsDir, file)),
    }));
}

function buildActionCard(scenario, receipt) {
  const call = scenario.mcp_call;
  return {
    action_card_id: receipt.action_card_id,
    standard: "neura-action-card-v0.1-draft",
    created_at: receipt.created_at,
    actor: {
      type: "agent",
      name: call.actor.agent_name,
      runtime: call.actor.runtime,
    },
    proposed_action: {
      action_type: call.tool_name,
      target: call.target,
      summary: `Evaluate MCP-style tool call ${call.tool_name} before execution.`,
      params_hash: call.params_hash,
      amount_or_value_at_risk: receipt.proposed_action.amount_or_value_at_risk,
      customer_impact: receipt.proposed_action.customer_impact,
    },
    risk: call.risk_context,
    policy_refs: call.policy_refs,
    evidence_refs: call.evidence_refs,
    authority_context: {
      authority_ref: receipt.authority.authority_ref,
      required_role: receipt.authority.required_role,
      approval_state: receipt.authority.approval_state,
    },
    mcp_binding: {
      call_id: call.call_id,
      mcp_server: call.mcp_server,
      tool_name: call.tool_name,
      target: call.target,
      actor: call.actor.agent_name,
      params_hash: call.params_hash,
      valid_only_for_exact_call: true,
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
      real_mcp_server_called: false,
      provider_approval_claimed: false,
      compliance_certification_claimed: false,
    },
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

function receiptAppliesTo(receipt, candidate) {
  return (
    receipt.validity.valid_for_mcp_server === candidate.mcp_server &&
    receipt.validity.valid_for_tool_name === candidate.tool_name &&
    receipt.validity.valid_for_target === candidate.target &&
    receipt.validity.valid_for_actor === candidate.actor &&
    receipt.validity.params_hash === candidate.params_hash
  );
}

function buildInvalidationChecks(receipt) {
  const base = {
    mcp_server: receipt.validity.valid_for_mcp_server,
    tool_name: receipt.validity.valid_for_tool_name,
    target: receipt.validity.valid_for_target,
    actor: receipt.validity.valid_for_actor,
    params_hash: receipt.validity.params_hash,
  };

  return {
    unchanged_call: receiptAppliesTo(receipt, base),
    changed_server: receiptAppliesTo(receipt, { ...base, mcp_server: "changed-server" }),
    changed_tool: receiptAppliesTo(receipt, { ...base, tool_name: "changed_tool" }),
    changed_target: receiptAppliesTo(receipt, { ...base, target: "changed-target" }),
    changed_actor: receiptAppliesTo(receipt, { ...base, actor: "Changed Agent" }),
    changed_params_hash: receiptAppliesTo(receipt, { ...base, params_hash: "sha256:changed" }),
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
    expected_runtime_instruction: pair.scenario.runtime_instruction,
    mcp_call: {
      ...pair.scenario.mcp_call,
      attribution: {
        source: attribution.neura_source,
        campaign: attribution.neura_campaign,
        surface: attribution.neura_surface,
      },
    },
    action_card: actionCard,
    decision_receipt: decisionReceipt,
    receipt_validity_checks: buildInvalidationChecks(decisionReceipt),
    runtime_route: {
      route_owner: "developer_runtime",
      runtime_instruction: decisionReceipt.runtime_instruction,
      receipt_id: decisionReceipt.receipt_id,
      trace_ref: decisionReceipt.trace.trace_ref,
      runtime_must_recheck_binding_before_execution: true,
      runtime_owns_execution_decision: true,
      downstream_tool_executed_in_dry_run: false,
      execution_performed_by_neura: false,
    },
  };
}

const pairs = loadPairs();

if (listOnly) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "mcp-risk-gate",
        scenarios: pairs.map(({ scenario }) => ({
          scenario_id: scenario.scenario_id,
          title: scenario.title,
          tool_name: scenario.mcp_call.tool_name,
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
  proof: "mcp-risk-gate",
  capability: "MCP Risk Gate",
  mode: "local_dry_run_mcp_tool_call_no_downstream_execution",
  pattern:
    "MCP tool-call intent -> Action Card -> Agent Action Gateway -> Decision Receipt -> runtime-owned execution or restraint",
  receipt_standard: "neura-decision-receipt-v0.1-draft",
  scenario_count: results.length,
  decisions_covered: Object.keys(decisionCounts).filter((decision) => decisionCounts[decision] > 0),
  decision_counts: decisionCounts,
  binding_fields: ["mcp_server", "tool_name", "target", "actor", "params_hash"],
  activation_attribution: publicAttributionSummary(attribution),
  results,
  boundary: {
    synthetic_data_only: true,
    downstream_execution_performed_by_neura: false,
    real_mcp_server_called: false,
    real_customer_data_used: false,
    provider_approval_claimed: false,
    compliance_certification_claimed: false,
    public_action_authorized: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("MCP Risk Gate dry-run proof");
  console.log(`Scenarios: ${output.scenario_count}`);
  console.log(
    `Decisions: allow=${decisionCounts.allow}, revise=${decisionCounts.revise}, human_review=${decisionCounts.human_review}, stop=${decisionCounts.stop}`,
  );
  console.log("No MCP server called and no downstream tool executed by Neura.");
}
