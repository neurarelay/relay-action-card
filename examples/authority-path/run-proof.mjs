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
  defaultCampaign: "pre_action_authority",
  defaultSurface: "authority_path",
});

const actorRefs = {
  owner: "owner_ref_acme_operations",
  orchestrator: "agent_ref_ops_orchestrator",
  analyst: "agent_ref_refund_analyst",
  worker: "agent_ref_authority_worker",
  auditor: "agent_ref_sequence_auditor",
};

const scenarios = [
  {
    scenario_id: "authority-scope-allow",
    title: "Worker stays inside assigned read scope",
    decision: "allow",
    risk_class: "low",
    actor: actorRefs.analyst,
    action_type: "read_order_status",
    target: "order:CO-1007",
    params_hash: "sha256:scope_envelope_allow_001",
    authority_path_depth: 1,
    authority_score: 91,
    required_authority_floor: 75,
    reason: "Proposed read stays within the assigned resource and action scope.",
    allowed_next_step: "return_status_summary",
    blocked_downstream_actions: [],
    authority_path: [actorRefs.owner, actorRefs.orchestrator, actorRefs.analyst],
    flags: [],
  },
  {
    scenario_id: "indirect-refund-human-review",
    title: "Indirect refund path requires owner review",
    decision: "human_review",
    risk_class: "money_movement_high",
    actor: actorRefs.worker,
    action_type: "issue_refund",
    target: "order:CO-2019",
    params_hash: "sha256:indirect_refund_path_001",
    authority_path_depth: 3,
    authority_score: 64,
    required_authority_floor: 85,
    reason:
      "Authority is too indirect for money movement without owner review before execution.",
    allowed_next_step: "prepare_owner_review",
    blocked_downstream_actions: ["refund_payment", "send_refund_confirmation"],
    authority_path: [
      actorRefs.owner,
      actorRefs.orchestrator,
      actorRefs.analyst,
      actorRefs.worker,
    ],
    flags: ["AUTHORITY_PATH_TOO_INDIRECT", "MONEY_MOVEMENT_REQUIRES_OWNER_REVIEW"],
  },
  {
    scenario_id: "scope-envelope-violation-stop",
    title: "Worker attempts resource outside scope envelope",
    decision: "stop",
    risk_class: "scope_violation",
    actor: actorRefs.worker,
    action_type: "export_customer_records",
    target: "customer_export:all",
    params_hash: "sha256:scope_envelope_violation_001",
    authority_path_depth: 2,
    authority_score: 18,
    required_authority_floor: 90,
    reason:
      "Requested target is outside the scope envelope carried by the authority path.",
    allowed_next_step: "request_scope_envelope_update",
    blocked_downstream_actions: ["export_customer_records", "upload_export"],
    authority_path: [actorRefs.owner, actorRefs.orchestrator, actorRefs.worker],
    flags: ["SCOPE_ENVELOPE_VIOLATION", "RESOURCE_OUTSIDE_ASSIGNED_SCOPE"],
  },
  {
    scenario_id: "valid-reads-then-export-stop",
    title: "Valid reads followed by export require stop",
    decision: "stop",
    risk_class: "data_exfiltration",
    actor: actorRefs.auditor,
    action_type: "export_report_bundle",
    target: "reports:quarterly_bundle",
    params_hash: "sha256:bulk_read_then_export_001",
    authority_path_depth: 0,
    authority_score: 22,
    required_authority_floor: 90,
    reason:
      "Ten synthetic reads in the sequence were followed by an export attempt.",
    allowed_next_step: "open_security_review",
    blocked_downstream_actions: ["export_report_bundle", "send_external_archive"],
    authority_path: [actorRefs.owner, actorRefs.auditor],
    flags: ["SEQUENCE_RISK:BULK_READ_THEN_EXPORT", "SEQUENCE_REQUIRES_REVIEW"],
    sequence_context: [
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
    authority_path_depth: 0,
    authority_score: 31,
    required_authority_floor: 88,
    reason:
      "Declared purpose covers summarization, not external transmission of report data.",
    allowed_next_step: "revise_to_internal_summary",
    blocked_downstream_actions: ["send_external_email", "attach_report_bundle"],
    authority_path: [actorRefs.owner, actorRefs.auditor],
    flags: ["PURPOSE_DRIFT", "EXTERNAL_TRANSMISSION_NOT_AUTHORIZED"],
  },
  {
    scenario_id: "policy-revision-required",
    title: "Allowed authority path but proposed action must be narrowed",
    decision: "revise",
    risk_class: "customer_commitment_medium",
    actor: actorRefs.analyst,
    action_type: "send_customer_update",
    target: "customer_thread:CO-3012",
    params_hash: "sha256:policy_revision_required_001",
    authority_path_depth: 1,
    authority_score: 72,
    required_authority_floor: 80,
    reason:
      "Authority path is valid, but the proposed message promises an unsupported delivery date.",
    allowed_next_step: "revise_message_without_delivery_promise",
    blocked_downstream_actions: ["send_customer_update_with_unsupported_promise"],
    authority_path: [actorRefs.owner, actorRefs.orchestrator, actorRefs.analyst],
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
      authority_path_depth: scenario.authority_path_depth,
      authority_path: scenario.authority_path,
    },
    proposed_action: {
      action_type: scenario.action_type,
      target: scenario.target,
      params_hash: scenario.params_hash,
      summary: scenario.title,
    },
    risk: {
      class: scenario.risk_class,
      authority_score: scenario.authority_score,
      required_authority_floor: scenario.required_authority_floor,
      flags: scenario.flags,
    },
    policy_refs: ["policy:authority_path_v0_1"],
    evidence_refs: [
      `evidence:${scenario.scenario_id}:authority_path`,
      `evidence:${scenario.scenario_id}:proposed_action`,
    ],
    authority_context: {
      authority_origin: scenario.authority_path[0],
      acting_agent: scenario.actor,
      scope_envelope_checked: true,
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
    authority_path_review: {
      authority_score: scenario.authority_score,
      required_authority_floor: scenario.required_authority_floor,
      authority_path_depth: scenario.authority_path_depth,
      flags: scenario.flags,
      sequence_context: scenario.sequence_context ?? [],
    },
    policy_basis: [
      {
        policy_ref: "policy:authority_path_v0_1",
        summary:
          "Actions must stay inside authority path, scope envelope, stated purpose, sequence context, and required authority floor.",
      },
    ],
    evidence_basis: actionCard.evidence_refs.map((evidence_ref) => ({
      evidence_ref,
      summary: "Synthetic reference used for local proof only.",
    })),
    authority: {
      authority_path: scenario.authority_path,
      scope_envelope_checked: true,
      authority_path_depth: scenario.authority_path_depth,
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
        "authority_path",
        "scope_envelope",
        "approval_state",
        "sequence_context",
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
    capability_added: {
      mechanism:
        "authority path depth, scope envelope, purpose fit, sequence context, and action risk become pre-action receipt factors",
      neura_output:
        "portable pre-action Decision Receipt with validity, authority refs, policy/evidence refs, and developer-owned execution boundary",
    },
  };
}

if (listOnly) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "authority-path",
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
  proof: "authority-path",
  capability: "Authority Path Proof",
  mode: "local_dry_run_no_downstream_execution",
  pattern:
    "Proposed action -> authority path review -> Decision Receipt -> developer-owned execution or restraint",
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
  console.log("Authority Path Proof dry-run proof");
  console.log(`Scenarios: ${output.scenario_count}`);
  console.log(
    `Decisions: allow=${decisionCounts.allow}, revise=${decisionCounts.revise}, human_review=${decisionCounts.human_review}, stop=${decisionCounts.stop}`,
  );
  console.log("No downstream execution by Neura.");
}
