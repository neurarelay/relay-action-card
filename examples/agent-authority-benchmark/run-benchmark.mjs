#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  buildRelayAttribution,
  publicAttributionSummary,
} from "../lib/activation-attribution.mjs";

const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const listOnly = argv.includes("--list");

const REQUIRED_FIELDS = [
  "actor_ref",
  "runtime_ref",
  "tool_ref",
  "action_ref",
  "target_ref",
  "params_hash",
  "authority_refs",
  "policy_refs",
  "evidence_refs",
  "decision_route",
  "receipt_ref",
  "trace_ref",
  "developer_owned_execution",
  "downstream_execution_by_neura",
  "private_payload_required",
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function ref(prefix, value) {
  return `${prefix}_${sha256(stableJson(value)).slice(0, 16)}`;
}

function paramsHash(seed) {
  return `sha256:${sha256(`agent-authority-benchmark:${stableJson(seed)}`)}`;
}

const SCENARIOS = [
  {
    id: "external_email_send",
    action_family: "email.send",
    tool_ref: "tool_ref:mail.send",
    target_ref: "target_ref:customer_thread:estimate_followup",
    decision_route: "human_review",
    authority_refs: ["authority_ref:owner_approval_required:customer_message"],
    policy_refs: ["policy_ref:external_customer_communication"],
    evidence_refs: ["evidence_ref:draft_review_required", "evidence_ref:customer_context_refs_only"],
    why_it_matters:
      "External messages can create commitments, disclose information, or affect customers.",
  },
  {
    id: "credentialed_browser_submit",
    action_family: "browser.submit",
    tool_ref: "tool_ref:browser.submit",
    target_ref: "target_ref:authenticated_vendor_portal:submit_button",
    decision_route: "human_review",
    authority_refs: ["authority_ref:credentialed_session_owner"],
    policy_refs: ["policy_ref:credentialed_browser_action"],
    evidence_refs: ["evidence_ref:target_origin_review", "evidence_ref:form_params_hash_review"],
    why_it_matters:
      "A credentialed browser submit can turn automation into a real-world account action.",
  },
  {
    id: "customer_data_export",
    action_family: "data.export",
    tool_ref: "tool_ref:crm.export",
    target_ref: "target_ref:customer_records:external_csv",
    decision_route: "stop",
    authority_refs: ["authority_ref:data_controller_scope:export_restricted"],
    policy_refs: ["policy_ref:customer_data_movement"],
    evidence_refs: ["evidence_ref:purpose_missing", "evidence_ref:destination_policy_missing"],
    why_it_matters:
      "Data export needs purpose, authority, and destination controls before data moves.",
  },
  {
    id: "package_publish",
    action_family: "package.publish",
    tool_ref: "tool_ref:npm.publish",
    target_ref: "target_ref:npm_package:@example/agent-plugin",
    decision_route: "human_review",
    authority_refs: ["authority_ref:package_owner"],
    policy_refs: ["policy_ref:package_release_gate"],
    evidence_refs: ["evidence_ref:version_diff_review", "evidence_ref:integrity_check"],
    why_it_matters:
      "Package publication can affect downstream developers and supply chains.",
  },
  {
    id: "production_deploy",
    action_family: "code.deploy",
    tool_ref: "tool_ref:vercel.deploy",
    target_ref: "target_ref:production_project:customer_app",
    decision_route: "human_review",
    authority_refs: ["authority_ref:deployment_owner"],
    policy_refs: ["policy_ref:production_change_control"],
    evidence_refs: ["evidence_ref:build_passed", "evidence_ref:rollback_plan"],
    why_it_matters:
      "Production deploys can change live customer-facing behavior.",
  },
  {
    id: "permission_change",
    action_family: "permission.change",
    tool_ref: "tool_ref:admin.permissions.update",
    target_ref: "target_ref:workspace_role:billing_admin",
    decision_route: "stop",
    authority_refs: ["authority_ref:admin_scope:insufficient"],
    policy_refs: ["policy_ref:least_privilege_access"],
    evidence_refs: ["evidence_ref:business_need_missing"],
    why_it_matters:
      "Permission changes can expand access and create security exposure.",
  },
  {
    id: "workflow_close",
    action_family: "workflow.transition",
    tool_ref: "tool_ref:ticket.close",
    target_ref: "target_ref:support_ticket:open_customer_issue",
    decision_route: "revise",
    authority_refs: ["authority_ref:support_workflow_owner"],
    policy_refs: ["policy_ref:customer_resolution_required"],
    evidence_refs: ["evidence_ref:resolution_summary_missing"],
    why_it_matters:
      "Closing tickets or workflows can hide unresolved work or create false completion.",
  },
  {
    id: "persistent_memory_write",
    action_family: "memory.write",
    tool_ref: "tool_ref:agent_memory.write",
    target_ref: "target_ref:persistent_memory:customer_preference",
    decision_route: "human_review",
    authority_refs: ["authority_ref:memory_write_scope:limited"],
    policy_refs: ["policy_ref:persistent_memory_retention"],
    evidence_refs: ["evidence_ref:user_visible_memory_review"],
    why_it_matters:
      "Memory writes can persist incorrect, private, or unauthorized information.",
  },
];

function buildReceipt(scenario, attribution) {
  const seed = {
    id: scenario.id,
    action_family: scenario.action_family,
    tool_ref: scenario.tool_ref,
    target_ref: scenario.target_ref,
    attribution,
  };

  const actionRef = `action_ref:${scenario.action_family}:${scenario.id}`;
  const params = {
    scenario_id: scenario.id,
    target_ref: scenario.target_ref,
    simulated: true,
  };

  return {
    actor_ref: "actor_ref:agent_authority_benchmark_runner",
    runtime_ref: "runtime_ref:local_dry_run",
    tool_ref: scenario.tool_ref,
    action_ref: actionRef,
    target_ref: scenario.target_ref,
    params_hash: paramsHash(params),
    authority_refs: scenario.authority_refs,
    policy_refs: scenario.policy_refs,
    evidence_refs: scenario.evidence_refs,
    decision_route: scenario.decision_route,
    receipt_ref: ref("receipt_ref_agent_authority", seed),
    trace_ref: ref("trace_ref_agent_authority", { ...seed, trace: true }),
    developer_owned_execution: true,
    downstream_execution_by_neura: false,
    private_payload_required: false,
  };
}

function scoreReceipt(receipt) {
  const present = REQUIRED_FIELDS.filter((field) => {
    const value = receipt[field];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  });
  const missing = REQUIRED_FIELDS.filter((field) => !present.includes(field));
  const score = Math.round((present.length / REQUIRED_FIELDS.length) * 100);
  return {
    authority_ready:
      score >= 90 &&
      receipt.developer_owned_execution === true &&
      receipt.downstream_execution_by_neura === false &&
      receipt.private_payload_required === false,
    score,
    present,
    missing,
  };
}

function buildScenarioResult(scenario, attribution) {
  const receipt = buildReceipt(scenario, attribution);
  const score = scoreReceipt(receipt);

  return {
    scenario_id: scenario.id,
    action_family: scenario.action_family,
    why_it_matters: scenario.why_it_matters,
    authority_ready: score.authority_ready,
    score: score.score,
    decision_route: receipt.decision_route,
    required_receipt_fields: REQUIRED_FIELDS,
    present_receipt_fields: score.present,
    missing_receipt_fields: score.missing,
    receipt_preview: receipt,
    developer_owned_next_step:
      "Use the receipt route to execute, revise, stop, or route to human review in the developer-owned runtime.",
  };
}

function firstProofCommand(attribution) {
  const source = attribution.neura_source ?? "benchmark";
  const campaign = attribution.neura_campaign ?? "agent_authority_week";
  const surface = attribution.neura_surface ?? "agent_authority_benchmark_v0_1";
  return `npm run first-proof -- --source=${source} --campaign=${campaign} --surface=${surface} --json`;
}

const attribution = buildRelayAttribution({
  argv,
  defaultSource: "benchmark",
  defaultCampaign: "agent_authority_week",
  defaultSurface: "agent_authority_benchmark_v0_1",
});

if (listOnly) {
  const list = {
    ok: true,
    benchmark: "agent_authority_benchmark_v0_1",
    scenarios: SCENARIOS.map(({ id, action_family, why_it_matters }) => ({
      id,
      action_family,
      why_it_matters,
    })),
  };
  console.log(JSON.stringify(list, null, 2));
  process.exit(0);
}

const results = SCENARIOS.map((scenario) => buildScenarioResult(scenario, attribution));
const readyCount = results.filter((result) => result.authority_ready).length;

const output = {
  ok: true,
  benchmark: "agent_authority_benchmark_v0_1",
  artifact_type: "agent_authority_benchmark_result",
  artifact_version: "0.1",
  mode: "dry_run_no_downstream_execution",
  command: "npm run benchmark:agent-authority -- --dry-run --json",
  scenario_count: results.length,
  authority_ready_count: readyCount,
  pass_threshold: {
    authority_ready: true,
    minimum_score: 90,
  },
  activation_attribution: publicAttributionSummary(attribution),
  results,
  first_proof_next_command: firstProofCommand(attribution),
  boundaries: {
    downstream_execution_by_neura: false,
    developer_owned_execution: true,
    private_payload_required: false,
    private_payload_stored: false,
    public_token_issued: false,
    provider_listing_or_partnership_claim: false,
    target_framework_endorsement_claim: false,
    target_framework_pass_fail_claim: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Agent Authority Benchmark v0.1");
  console.log(`Scenarios authority-ready: ${readyCount}/${results.length}`);
  console.log("Run with --json for full receipt previews.");
}
