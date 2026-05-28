#!/usr/bin/env node

import {
  buildRelayAttribution,
  publicAttributionSummary,
} from "../lib/activation-attribution.mjs";

const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const listOnly = argv.includes("--list");

const attribution = buildRelayAttribution({
  argv,
  defaultSource: "github",
  defaultCampaign: "agent_action_gateway",
  defaultSurface: "delegated_action_trust",
});

const actorRefs = {
  owner: "owner_ref_acme_operations",
  orchestrator: "agent_ref_ops_orchestrator",
  analyst: "agent_ref_refund_analyst",
  worker: "agent_ref_delegated_worker",
  auditor: "agent_ref_sequence_auditor",
};

const scenarios = [
  {
    scenario_id: "delegated-scope-allow",
    title: "Child agent stays inside delegated read scope",
    decision: "allow",
    risk_class: "low",
    actor: actorRefs.analyst,
    action_type: "read_order_status",
    target: "order:CO-1007",
    params_hash: "sha256:delegated_scope_allow_001",
    delegation_depth: 1,
    trust_score: 91,
    trust_floor: 75,
    reason: "Child agent request stays within parent resource and action scope.",
    allowed_next_step: "return_status_summary",
    blocked_downstream_actions: [],
    delegation_path: [actorRefs.owner, actorRefs.orchestrator, actorRefs.analyst],
    flags: [],
  },
  {
    scenario_id: "deep-delegation-human-review",
    title: "Three-hop delegated refund requires owner review",
    decision: "human_review",
    risk_class: "money_movement_high",
    actor: actorRefs.worker,
    action_type: "issue_refund",
    target: "order:CO-2019",
    params_hash: "sha256:deep_delegation_refund_001",
    delegation_depth: 3,
    trust_score: 64,
    trust_floor: 85,
    reason:
      "Delegation depth and money-movement risk require owner review before execution.",
    allowed_next_step: "prepare_owner_review",
    blocked_downstream_actions: ["refund_payment", "send_refund_confirmation"],
    delegation_path: [
      actorRefs.owner,
      actorRefs.orchestrator,
      actorRefs.analyst,
      actorRefs.worker,
    ],
    flags: ["DELEGATION_DEPTH_DECAY", "MONEY_MOVEMENT_REQUIRES_OWNER_REVIEW"],
  },
  {
    scenario_id: "delegated-scope-violation-stop",
    title: "Delegated worker attempts resource outside parent scope",
    decision: "stop",
    risk_class: "scope_violation",
    actor: actorRefs.worker,
    action_type: "export_customer_records",
    target: "customer_export:all",
    params_hash: "sha256:delegated_scope_violation_001",
    delegation_depth: 2,
    trust_score: 18,
    trust_floor: 90,
    reason:
      "Requested target is outside the resource scope inherited from the delegation chain.",
    allowed_next_step: "request_new_authority_scope",
    blocked_downstream_actions: ["export_customer_records", "upload_export"],
    delegation_path: [actorRefs.owner, actorRefs.orchestrator, actorRefs.worker],
    flags: ["CHAIN_SCOPE_VIOLATION", "RESOURCE_OUTSIDE_DELEGATED_SCOPE"],
  },
  {
    scenario_id: "bulk-read-then-export-stop",
    title: "Bulk reads followed by export are treated as a kill-chain pattern",
    decision: "stop",
    risk_class: "data_exfiltration",
    actor: actorRefs.auditor,
    action_type: "export_report_bundle",
    target: "reports:quarterly_bundle",
    params_hash: "sha256:bulk_read_then_export_001",
    delegation_depth: 0,
    trust_score: 22,
    trust_floor: 90,
    reason:
      "Ten synthetic reads in the sequence were followed by an export attempt.",
    allowed_next_step: "open_security_review",
    blocked_downstream_actions: ["export_report_bundle", "send_external_archive"],
    delegation_path: [actorRefs.owner, actorRefs.auditor],
    flags: ["KILL_CHAIN:BULK_READ_THEN_EXFIL", "SEQUENCE_REQUIRES_REVIEW"],
    behavioral_sequence: [
      "read:/reports/q1.pdf",
      "read:/reports/q2.pdf",
      "read:/reports/q3.pdf",
      "read:/reports/q4.pdf",
      "read:/reports/forecast.pdf",
      "read:/reports/board.pdf",
      "read:/reports/finance.pdf",
      "read:/reports/ops.pdf",
      "read:/reports/customer.pdf",
      "read:/reports/legal.pdf",
      "export:/reports/*",
    ],
  },
  {
    scenario_id: "purpose-drift-stop",
    title: "Report summarizer drifts into external data movement",
    decision: "stop",
    risk_class: "purpose_drift",
    actor: actorRefs.auditor,
    action_type: "send_external_email",
    target: "external:vendor@example.test",
    params_hash: "sha256:purpose_drift_external_send_001",
    delegation_depth: 0,
    trust_score: 31,
    trust_floor: 88,
    reason:
      "Declared purpose covers summarization, not external transmission of report data.",
    allowed_next_step: "revise_to_internal_summary",
    blocked_downstream_actions: ["send_external_email", "attach_report_bundle"],
    delegation_path: [actorRefs.owner, actorRefs.auditor],
    flags: ["PURPOSE_DRIFT", "EXTERNAL_TRANSMISSION_NOT_AUTHORIZED"],
  },
  {
    scenario_id: "policy-revision-required",
    title: "Allowed delegation but proposed action must be narrowed",
    decision: "revise",
    risk_class: "customer_commitment_medium",
    actor: actorRefs.analyst,
    action_type: "send_customer_update",
    target: "customer_thread:CO-3012",
    params_hash: "sha256:policy_revision_required_001",
    delegation_depth: 1,
    trust_score: 72,
    trust_floor: 80,
    reason:
      "Delegation is valid, but the proposed message promises an unsupported delivery date.",
    allowed_next_step: "revise_message_without_delivery_promise",
    blocked_downstream_actions: ["send_customer_update_with_unsupported_promise"],
    delegation_path: [actorRefs.owner, actorRefs.orchestrator, actorRefs.analyst],
    flags: ["POLICY_REVISION_REQUIRED", "CUSTOMER_PROMISE_UNSUPPORTED"],
  },
];

function buildActionCard(scenario) {
  return {
    action_card_id: `ac_${scenario.scenario_id}`,
    standard: "neura-action-card-v0.1-draft",
    created_at: "2026-05-28T10:00:00-04:00",
    actor: {
      type: "agent",
      ref: scenario.actor,
      delegation_depth: scenario.delegation_depth,
      delegation_path: scenario.delegation_path,
    },
    proposed_action: {
      action_type: scenario.action_type,
      target: scenario.target,
      params_hash: scenario.params_hash,
      summary: scenario.title,
    },
    risk: {
      class: scenario.risk_class,
      trust_score: scenario.trust_score,
      trust_floor: scenario.trust_floor,
      flags: scenario.flags,
    },
    policy_refs: ["policy:delegated_action_trust_v0_1"],
    evidence_refs: [
      `evidence:${scenario.scenario_id}:delegation_chain`,
      `evidence:${scenario.scenario_id}:proposed_action`,
    ],
    authority_context: {
      delegated_by: scenario.delegation_path[0],
      acting_agent: scenario.actor,
      inherited_scope_checked: true,
      registry_backed_authority: "reference_required_for_production",
    },
    execution_boundary: {
      no_downstream_execution_by_neura: true,
      developer_runtime_keeps_execution: true,
    },
    trace: {
      trace_ref: `trace_${scenario.scenario_id}`,
      source: attribution.neura_source,
      campaign: attribution.neura_campaign,
      surface: attribution.neura_surface,
    },
    boundary: {
      synthetic_data_only: true,
      downstream_execution_performed_by_neura: false,
    },
  };
}

function buildReceipt(scenario, actionCard) {
  return {
    receipt_id: `dr_${scenario.scenario_id}`,
    standard: "neura-decision-receipt-v0.1-draft",
    created_at: "2026-05-28T10:00:01-04:00",
    action_card_id: actionCard.action_card_id,
    decision: scenario.decision,
    decision_reason: scenario.reason,
    actor: actionCard.actor,
    proposed_action: actionCard.proposed_action,
    risk: actionCard.risk,
    trust_analysis: {
      trust_score: scenario.trust_score,
      trust_floor: scenario.trust_floor,
      delegation_depth: scenario.delegation_depth,
      flags: scenario.flags,
      behavioral_sequence: scenario.behavioral_sequence ?? [],
    },
    policy_basis: [
      {
        policy_ref: "policy:delegated_action_trust_v0_1",
        summary:
          "Delegated actions must stay within inherited scope, purpose, behavioral sequence, and risk floor.",
      },
    ],
    evidence_basis: actionCard.evidence_refs.map((evidence_ref) => ({
      evidence_ref,
      summary: "Synthetic reference used for local proof only.",
    })),
    authority: {
      delegation_path: scenario.delegation_path,
      inherited_scope_checked: true,
      delegation_depth: scenario.delegation_depth,
      approval_state:
        scenario.decision === "allow" ? "approved_by_policy" : "not_approved_for_execution",
      required_role:
        scenario.decision === "human_review" ? "owner_or_admin" : "runtime_policy",
    },
    validity: {
      params_hash: scenario.params_hash,
      invalid_if_changed: [
        "target",
        "params_hash",
        "actor",
        "delegation_path",
        "authority_scope",
        "approval_state",
        "behavioral_sequence",
      ],
    },
    execution: {
      allowed_next_step: scenario.allowed_next_step,
      blocked_downstream_actions: scenario.blocked_downstream_actions,
      execution_boundary: "developer-owned runtime decides downstream execution after receipt",
    },
    trace: actionCard.trace,
    boundary: {
      synthetic_data_only: true,
      downstream_execution_performed_by_neura: false,
      real_customer_data_used: false,
      real_payment_touched: false,
      real_email_sent: false,
      provider_approval_claimed: false,
      compliance_certification_claimed: false,
      public_action_authorized: false,
    },
  };
}

function buildResult(scenario) {
  const actionCard = buildActionCard(scenario);
  const decisionReceipt = buildReceipt(scenario, actionCard);
  return {
    scenario_id: scenario.scenario_id,
    title: scenario.title,
    decision: scenario.decision,
    decision_reason: scenario.reason,
    action_card: actionCard,
    decision_receipt: decisionReceipt,
    parity_plus: {
      borrowed_pattern:
        "delegation depth, inherited scope, purpose drift, behavioral sequence, and kill-chain flags",
      neura_difference:
        "portable pre-action Decision Receipt with validity, authority refs, policy/evidence refs, and developer-owned execution boundary",
    },
  };
}

if (listOnly) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "delegated-action-trust",
        scenarios: scenarios.map(({ scenario_id, title, decision }) => ({
          scenario_id,
          title,
          decision,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const results = scenarios.map(buildResult);
const decisionCounts = Object.fromEntries(
  ["allow", "revise", "human_review", "stop"].map((decision) => [
    decision,
    results.filter((result) => result.decision === decision).length,
  ]),
);

const output = {
  ok: true,
  proof: "delegated-action-trust",
  capability: "Delegated Action Trust",
  mode: "local_dry_run_no_downstream_execution",
  pattern:
    "Delegated action intent -> trust and sequence analysis -> Decision Receipt -> developer-owned execution or restraint",
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
    real_payment_touched: false,
    real_email_sent: false,
    provider_approval_claimed: false,
    compliance_certification_claimed: false,
    public_action_authorized: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Delegated Action Trust dry-run proof");
  console.log(`Scenarios: ${output.scenario_count}`);
  console.log(
    `Decisions: allow=${decisionCounts.allow}, revise=${decisionCounts.revise}, human_review=${decisionCounts.human_review}, stop=${decisionCounts.stop}`,
  );
  console.log("No downstream execution by Neura.");
}
