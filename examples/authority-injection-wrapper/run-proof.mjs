#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  buildRelayAttribution,
  publicAttributionSummary,
} from "../lib/activation-attribution.mjs";

const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const dryRun = argv.includes("--dry-run") || !argv.includes("--live");
const listOnly = argv.includes("--list");
const FIXED_TIME = "2026-06-09T12:00:00.000Z";
const FUTURE_EXPIRY = "2026-06-09T23:59:00.000Z";
const PAST_EXPIRY = "2026-06-09T00:00:00.000Z";
const CONTRACT_METHODS = ["beforeAction", "resolveAuthority", "wrapTool", "afterAction"];
const BINDING_FIELDS = [
  "call_ref",
  "actor_ref",
  "runtime_ref",
  "tool_ref",
  "action_ref",
  "target_ref",
  "args_hash",
  "policy_context_ref",
  "evidence_refs",
  "source",
  "campaign",
  "surface",
];

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

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

function shaRef(value) {
  return `sha256:${sha256(stableJson(value))}`;
}

function compactRef(prefix, value) {
  return `${prefix}_${sha256(stableJson(value)).slice(0, 16)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashRef(label, value) {
  return `sha256:${sha256(`${label}:${stableJson(value)}`)}`;
}

function bindingSnapshot(invocation) {
  return Object.fromEntries(BINDING_FIELDS.map((field) => [field, invocation[field]]));
}

function bindingHash(invocation) {
  return shaRef(bindingSnapshot(invocation));
}

function changedBindingFields(boundRefs, candidateInvocation) {
  const candidate = bindingSnapshot(candidateInvocation);
  return BINDING_FIELDS.filter((field) => stableJson(boundRefs[field]) !== stableJson(candidate[field]));
}

function decisionForScenario(scenario) {
  return {
    decision: scenario.expected_decision,
    route: scenario.expected_decision,
    reason: scenario.decision_reason,
    risk_class: scenario.risk_class,
  };
}

function beforeAction(invocation, sequenceStart) {
  return {
    standard: "neura-agent-io-event-envelope-v0.1-draft",
    event_ref: compactRef("agent_io_event_authority_injection", {
      call_ref: invocation.call_ref,
      stage: "before_action",
    }),
    event_type: "tool.call.proposed",
    event_phase: "pre_action",
    event_time: FIXED_TIME,
    event_sequence: sequenceStart,
    tenant_ref: "tenant_ref:local_dry_run",
    environment: "local_dry_run",
    trace_ref: invocation.trace_ref,
    tool_call_ref: invocation.call_ref,
    actor: {
      type: "agent",
      name: invocation.actor_ref,
      runtime: invocation.runtime_ref,
    },
    io: {
      surface: "tool_call",
      direction: "egress",
      tool_name: invocation.tool_name,
      action_type: invocation.action_ref,
      target_ref: invocation.target_ref,
      target_hash: hashRef("target", invocation.target_ref),
      args_hash: invocation.args_hash,
      summary_hash: hashRef("summary", invocation.summary_ref),
    },
    decision: {
      state: "not_applicable",
      risk_class: invocation.risk_class,
      reason: "proposed_tool_call_before_authority_resolution",
    },
    policy_refs: [invocation.policy_context_ref],
    evidence_refs: invocation.evidence_refs,
    payload: {
      tier: "T0",
      redaction_status: "metadata_refs_hashes_only",
      private_payload_stored: false,
      payload_ref: null,
      metadata: {
        args_ref: invocation.args_ref,
        wrapper_ref: invocation.wrapper_ref,
        raw_args_included: false,
      },
    },
    boundary: {
      downstream_execution_performed_by_neura: false,
      private_payload_stored: false,
      provider_approval_claimed: false,
      compliance_certification_claimed: false,
    },
  };
}

function buildActionCard(invocation, beforeEvent) {
  const actionCardRef = compactRef("action_card_ref_authority_injection", {
    call_ref: invocation.call_ref,
    event_ref: beforeEvent.event_ref,
  });

  return {
    standard: "neura-action-card-v0.1-draft",
    action_card_ref: actionCardRef,
    action_card_id: actionCardRef,
    created_at: FIXED_TIME,
    derived_from: "agent_io_event_envelope",
    derived_from_agent_io_event: true,
    agent_io_event_ref: beforeEvent.event_ref,
    actor: {
      actor_ref: invocation.actor_ref,
      runtime_ref: invocation.runtime_ref,
    },
    proposed_action: {
      tool_ref: invocation.tool_ref,
      action_ref: invocation.action_ref,
      target_ref: invocation.target_ref,
      args_hash: invocation.args_hash,
      args_ref: invocation.args_ref,
    },
    authority_injection: {
      contract: "authority-injection-wrapper-v0.1",
      wrapper_ref: invocation.wrapper_ref,
      methods: CONTRACT_METHODS,
      valid_only_for_exact_tool_call: true,
    },
    context: {
      policy_context_ref: invocation.policy_context_ref,
      evidence_refs: invocation.evidence_refs,
      source: invocation.source,
      campaign: invocation.campaign,
      surface: invocation.surface,
    },
    refs_only: true,
  };
}

function resolveAuthority(beforeEvent, invocation, actionCard) {
  const evaluation = decisionForScenario(invocation);
  const boundRefs = bindingSnapshot(invocation);
  const receiptSeed = {
    action_card_ref: actionCard.action_card_ref,
    event_ref: beforeEvent.event_ref,
    binding_hash: bindingHash(invocation),
    decision: evaluation.decision,
  };
  const receiptRef = compactRef("receipt_ref_authority_injection", receiptSeed);

  return {
    standard: "neura-decision-receipt-v0.1-draft",
    receipt_ref: receiptRef,
    receipt_id: receiptRef,
    created_at: FIXED_TIME,
    action_card_ref: actionCard.action_card_ref,
    agent_io_event_ref: beforeEvent.event_ref,
    trace_ref: invocation.trace_ref,
    transaction_ref: compactRef("relay_txn_authority_injection", receiptSeed),
    decision: evaluation.decision,
    route: evaluation.route,
    reason: evaluation.reason,
    risk_class: evaluation.risk_class,
    binding: {
      binding_hash: bindingHash(invocation),
      bound_refs: boundRefs,
      binding_fields: BINDING_FIELDS,
      valid_only_for_exact_tool_call: true,
    },
    validity: {
      expires_at: FUTURE_EXPIRY,
      one_shot: true,
      consumed: false,
      invalid_if_changed: ["tool_ref", "action_ref", "target_ref", "args_hash", "policy_context_ref"],
    },
    refs_only: true,
    private_payload_persisted: false,
    downstream_execution_by_neura: false,
    boundary: {
      downstream_execution_performed_by_neura: false,
      private_payload_stored: false,
      provider_approval_claimed: false,
      compliance_certification_claimed: false,
    },
  };
}

function decisionIssuedEvent(invocation, beforeEvent, actionCard, receipt, sequence) {
  return {
    standard: "neura-agent-io-event-envelope-v0.1-draft",
    event_ref: compactRef("agent_io_event_authority_injection", {
      receipt_ref: receipt.receipt_ref,
      stage: "decision_issued",
    }),
    event_type: "decision.issued",
    event_phase: "decision",
    event_time: FIXED_TIME,
    event_sequence: sequence,
    tenant_ref: "tenant_ref:local_dry_run",
    environment: "local_dry_run",
    trace_ref: invocation.trace_ref,
    transaction_ref: receipt.transaction_ref,
    receipt_id: receipt.receipt_id,
    action_card_ref: actionCard.action_card_ref,
    tool_call_ref: invocation.call_ref,
    actor: beforeEvent.actor,
    io: beforeEvent.io,
    decision: {
      state: receipt.decision,
      risk_class: receipt.risk_class,
      reason: receipt.reason,
    },
    policy_refs: [invocation.policy_context_ref],
    evidence_refs: invocation.evidence_refs,
    payload: {
      tier: "T0",
      redaction_status: "metadata_refs_hashes_only",
      private_payload_stored: false,
      payload_ref: null,
      metadata: {
        receipt_ref: receipt.receipt_ref,
        binding_hash: receipt.binding.binding_hash,
      },
    },
    boundary: receipt.boundary,
  };
}

function buildRuntimeGate(receipt, invocation) {
  const isAllow = receipt.decision === "allow";
  return {
    route_owner: "developer_runtime",
    decision: receipt.decision,
    route: receipt.route,
    receipt_ref: receipt.receipt_ref,
    trace_ref: receipt.trace_ref,
    receipt_allows_runtime_execution: isAllow,
    runtime_must_recheck_binding_before_execution: true,
    runtime_would_consume_receipt_before_execution: isAllow,
    downstream_tool_executed_in_dry_run: false,
    execution_performed_by_neura: false,
    runtime_execution_state: isAllow
      ? "allowed_after_receipt_but_skipped_in_dry_run"
      : "not_executed_due_to_authority_route",
    bound_tool_ref: invocation.tool_ref,
    bound_target_ref: invocation.target_ref,
    bound_args_hash: invocation.args_hash,
  };
}

function afterAction(invocation, receipt, runtimeGate, sequence) {
  return {
    standard: "neura-agent-io-event-envelope-v0.1-draft",
    event_ref: compactRef("agent_io_event_authority_injection", {
      receipt_ref: receipt.receipt_ref,
      stage: "after_action",
    }),
    event_type: "execution.completed",
    event_phase: "post_action",
    event_time: FIXED_TIME,
    event_sequence: sequence,
    tenant_ref: "tenant_ref:local_dry_run",
    environment: "local_dry_run",
    trace_ref: invocation.trace_ref,
    transaction_ref: receipt.transaction_ref,
    receipt_id: receipt.receipt_id,
    tool_call_ref: invocation.call_ref,
    actor: {
      type: "agent",
      name: invocation.actor_ref,
      runtime: invocation.runtime_ref,
    },
    io: {
      surface: "tool_call",
      direction: "egress",
      tool_name: invocation.tool_name,
      action_type: invocation.action_ref,
      target_ref: invocation.target_ref,
      target_hash: hashRef("target", invocation.target_ref),
      args_hash: invocation.args_hash,
      summary_hash: hashRef("summary", invocation.summary_ref),
    },
    decision: {
      state: receipt.decision,
      risk_class: receipt.risk_class,
      reason: runtimeGate.runtime_execution_state,
    },
    policy_refs: [invocation.policy_context_ref],
    evidence_refs: invocation.evidence_refs,
    payload: {
      tier: "T0",
      redaction_status: "metadata_refs_hashes_only",
      private_payload_stored: false,
      payload_ref: null,
      metadata: {
        receipt_ref: receipt.receipt_ref,
        outcome_ref: compactRef("outcome_ref_authority_injection", {
          receipt_ref: receipt.receipt_ref,
          route: runtimeGate.route,
        }),
        downstream_tool_executed_in_dry_run: false,
      },
    },
    boundary: {
      downstream_execution_performed_by_neura: false,
      private_payload_stored: false,
      provider_approval_claimed: false,
      compliance_certification_claimed: false,
    },
  };
}

function canExecuteWithReceipt(receipt, candidateInvocation, state, now = FIXED_TIME) {
  const changedFields = changedBindingFields(receipt.binding.bound_refs, candidateInvocation);
  const currentBindingHash = bindingHash(candidateInvocation);

  if (receipt.decision !== "allow") {
    return {
      allowed: false,
      reason: "decision_not_allow",
      decision: receipt.decision,
      receipt_ref: receipt.receipt_ref,
      changed_fields: changedFields,
    };
  }

  if (new Date(receipt.validity.expires_at).getTime() <= new Date(now).getTime()) {
    return {
      allowed: false,
      reason: "receipt_expired",
      receipt_ref: receipt.receipt_ref,
      expires_at: receipt.validity.expires_at,
      changed_fields: changedFields,
    };
  }

  if (receipt.validity.one_shot && state.consumed_receipts.has(receipt.receipt_ref)) {
    return {
      allowed: false,
      reason: "receipt_already_consumed",
      receipt_ref: receipt.receipt_ref,
      changed_fields: changedFields,
    };
  }

  if (changedFields.length > 0 || currentBindingHash !== receipt.binding.binding_hash) {
    return {
      allowed: false,
      reason: "binding_mismatch",
      receipt_ref: receipt.receipt_ref,
      expected_binding_hash: receipt.binding.binding_hash,
      candidate_binding_hash: currentBindingHash,
      changed_fields: changedFields,
    };
  }

  if (receipt.validity.one_shot) state.consumed_receipts.add(receipt.receipt_ref);

  return {
    allowed: true,
    reason: "receipt_valid_for_exact_tool_call",
    receipt_ref: receipt.receipt_ref,
    changed_fields: [],
    consumed: receipt.validity.one_shot,
  };
}

function wrapTool(toolDefinition, toolHandler) {
  return {
    tool_ref: toolDefinition.tool_ref,
    tool_name: toolDefinition.tool_name,
    wrapper_ref: toolDefinition.wrapper_ref,
    contract: "authority-injection-wrapper-v0.1",
    methods: CONTRACT_METHODS,
    async run(invocation, sequenceStart) {
      const beforeEvent = beforeAction(invocation, sequenceStart);
      const actionCard = buildActionCard(invocation, beforeEvent);
      const receipt = resolveAuthority(beforeEvent, invocation, actionCard);
      const decisionEvent = decisionIssuedEvent(invocation, beforeEvent, actionCard, receipt, sequenceStart + 1);
      const runtimeGate = buildRuntimeGate(receipt, invocation);
      const afterEvent = afterAction(invocation, receipt, runtimeGate, sequenceStart + 2);

      return {
        scenario: invocation.id,
        title: invocation.title,
        tool: {
          tool_ref: toolDefinition.tool_ref,
          tool_name: toolDefinition.tool_name,
          handler_ref: toolHandler.handler_ref,
          wrapped_by: toolDefinition.wrapper_ref,
        },
        authority_injection_contract: {
          beforeAction: true,
          resolveAuthority: true,
          wrapTool: true,
          afterAction: true,
        },
        runtime_invocation: {
          call_ref: invocation.call_ref,
          actor_ref: invocation.actor_ref,
          runtime_ref: invocation.runtime_ref,
          tool_ref: invocation.tool_ref,
          action_ref: invocation.action_ref,
          target_ref: invocation.target_ref,
          args_hash: invocation.args_hash,
          args_ref: invocation.args_ref,
          policy_context_ref: invocation.policy_context_ref,
          evidence_refs: invocation.evidence_refs,
          refs_only: true,
          private_payload_persisted: false,
          downstream_execution_by_neura: false,
        },
        agent_io_events: [beforeEvent, decisionEvent, afterEvent],
        action_card: actionCard,
        decision_receipt: receipt,
        runtime_gate: runtimeGate,
        boundaries: {
          local_dry_run: true,
          refs_only: true,
          private_payload_persisted: false,
          downstream_execution_by_neura: false,
          runtime_owned_execution: true,
          provider_listing_or_partnership_claim: false,
          endorsement_or_approval_claim: false,
          compliance_certification_claim: false,
          public_distribution_action: false,
        },
      };
    },
  };
}

function buildInvocation(scenario, attribution) {
  const source = attribution.neura_source ?? "authority_injection_wrapper";
  const campaign = attribution.neura_campaign ?? "authority_injection_wrapper_v0_1";
  const surface = attribution.neura_surface ?? "examples/authority-injection-wrapper/run-proof";
  const toolRef = "tool_ref:crm.customer_record.update";
  const toolName = "crm.customer_record.update";
  const actionRef = "action_ref:crm.customer_record.update";
  const callRef = `call_ref:authority_injection:${scenario.id}:001`;

  return {
    ...scenario,
    call_ref: callRef,
    trace_ref: compactRef("trace_ref_authority_injection", callRef),
    actor_ref: "actor_ref:agent:customer_ops_assistant",
    runtime_ref: "runtime_ref:tool_wrapper:local_dry_run",
    tool_ref: toolRef,
    tool_name: toolName,
    action_ref: actionRef,
    args_hash: hashRef("tool_args", {
      scenario: scenario.id,
      args_ref: scenario.args_ref,
    }),
    wrapper_ref: "wrapper_ref:authority_injection:tool_call:v0_1",
    source,
    campaign,
    surface,
  };
}

const attribution = buildRelayAttribution({
  argv,
  env: {
    ...process.env,
    NEURA_SESSION_REF: process.env.NEURA_SESSION_REF ?? "authority_injection_wrapper_session:dry_run",
  },
  defaultSource: "authority_injection_wrapper",
  defaultCampaign: "authority_injection_wrapper_v0_1",
  defaultSurface: "examples/authority-injection-wrapper/run-proof",
});

const scenarios = [
  {
    id: "customer-note-allow",
    title: "Low-risk customer note update",
    expected_decision: "allow",
    decision_reason: "The tool call is bounded, evidence-backed, and safe for runtime-owned execution.",
    risk_class: 1,
    target_ref: "target_ref:crm_case:low_risk_support_note",
    args_ref: "args_ref:crm_update:low_risk_support_note",
    summary_ref: "summary_ref:add_internal_support_note",
    policy_context_ref: "policy_context_ref:crm_update:bounded_internal_note",
    evidence_refs: ["evidence_ref:case_owner_scope", "evidence_ref:internal_note_policy"],
  },
  {
    id: "customer-note-revise",
    title: "Customer note missing evidence refs",
    expected_decision: "revise",
    decision_reason: "The tool call needs stronger evidence refs before the runtime can execute it.",
    risk_class: 1,
    target_ref: "target_ref:crm_case:missing_evidence_note",
    args_ref: "args_ref:crm_update:missing_evidence_note",
    summary_ref: "summary_ref:add_external_claim_without_evidence",
    policy_context_ref: "policy_context_ref:crm_update:needs_revision",
    evidence_refs: ["evidence_ref:case_context_present"],
  },
  {
    id: "customer-note-human-review",
    title: "High-impact account status update",
    expected_decision: "human_review",
    decision_reason: "The update affects account status and needs accountable owner review before execution.",
    risk_class: 2,
    target_ref: "target_ref:crm_account:status_change",
    args_ref: "args_ref:crm_update:account_status_change",
    summary_ref: "summary_ref:change_account_status",
    policy_context_ref: "policy_context_ref:crm_update:owner_review_required",
    evidence_refs: ["evidence_ref:status_change_request", "evidence_ref:operator_review_policy"],
  },
  {
    id: "customer-note-stop",
    title: "Unauthorized privilege note update",
    expected_decision: "stop",
    decision_reason: "The tool call attempts an unauthorized privilege-sensitive change and must stop before execution.",
    risk_class: 3,
    target_ref: "target_ref:crm_account:privilege_sensitive_change",
    args_ref: "args_ref:crm_update:privilege_sensitive_change",
    summary_ref: "summary_ref:attempt_sensitive_privilege_note",
    policy_context_ref: "policy_context_ref:crm_update:blocked_without_authority",
    evidence_refs: ["evidence_ref:missing_privilege_owner_approval", "evidence_ref:blocked_change_policy"],
  },
];

const wrappedTool = wrapTool(
  {
    tool_ref: "tool_ref:crm.customer_record.update",
    tool_name: "crm.customer_record.update",
    wrapper_ref: "wrapper_ref:authority_injection:tool_call:v0_1",
  },
  {
    handler_ref: "handler_ref:synthetic_customer_record_update",
  },
);

const only = argValue("only");
const selectedScenarios = only ? scenarios.filter((scenario) => scenario.id === only) : scenarios;

if (listOnly) {
  const list = scenarios.map(({ id, title, expected_decision }) => ({ id, title, expected_decision }));
  console.log(jsonOutput ? JSON.stringify(list, null, 2) : list.map((item) => item.id).join("\n"));
  process.exit(0);
}

if (only && selectedScenarios.length === 0) {
  console.error(`Unknown Authority Injection wrapper scenario: ${only}`);
  console.error(`Available scenarios: ${scenarios.map((scenario) => scenario.id).join(", ")}`);
  process.exit(1);
}

if (!dryRun) {
  console.error("Live mode is intentionally not implemented for this proof packet. Use --dry-run.");
  process.exit(1);
}

const allInvocations = scenarios.map((scenario) => buildInvocation(scenario, attribution));
const selectedInvocations = selectedScenarios.map((scenario) => buildInvocation(scenario, attribution));
const results = [];

for (const [index, invocation] of selectedInvocations.entries()) {
  results.push(await wrappedTool.run(invocation, index * 3 + 1));
}

const allowInvocation = allInvocations.find((invocation) => invocation.id === "customer-note-allow");
const allowBeforeEvent = beforeAction(allowInvocation, 1);
const allowActionCard = buildActionCard(allowInvocation, allowBeforeEvent);
const allowReceipt = resolveAuthority(allowBeforeEvent, allowInvocation, allowActionCard);

const changedArgsInvocation = clone(allowInvocation);
changedArgsInvocation.args_hash = hashRef("tool_args", {
  scenario: "customer-note-allow",
  args_ref: "args_ref:crm_update:changed_after_receipt",
});
changedArgsInvocation.args_ref = "args_ref:crm_update:changed_after_receipt";

const expiredReceipt = clone(allowReceipt);
expiredReceipt.validity.expires_at = PAST_EXPIRY;

const oneShotState = { consumed_receipts: new Set() };
const firstUse = canExecuteWithReceipt(allowReceipt, clone(allowInvocation), oneShotState);
const secondUse = canExecuteWithReceipt(allowReceipt, clone(allowInvocation), oneShotState);

const reviseInvocation = allInvocations.find((invocation) => invocation.id === "customer-note-revise");
const reviseBeforeEvent = beforeAction(reviseInvocation, 1);
const reviseActionCard = buildActionCard(reviseInvocation, reviseBeforeEvent);
const reviseReceipt = resolveAuthority(reviseBeforeEvent, reviseInvocation, reviseActionCard);

const enforcementChecks = [
  {
    scenario: "unchanged-allow-receipt",
    expected: "receipt allows exact invocation once",
    ...canExecuteWithReceipt(allowReceipt, clone(allowInvocation), { consumed_receipts: new Set() }),
  },
  {
    scenario: "changed-args-rejection",
    expected: "old receipt no longer applies after args_hash changes",
    ...canExecuteWithReceipt(allowReceipt, changedArgsInvocation, { consumed_receipts: new Set() }),
  },
  {
    scenario: "expired-receipt-rejection",
    expected: "old receipt no longer applies after expiry",
    ...canExecuteWithReceipt(expiredReceipt, clone(allowInvocation), { consumed_receipts: new Set() }),
  },
  {
    scenario: "one-shot-reuse-rejection",
    expected: "second attempt with the same one-shot receipt is denied",
    first_use: firstUse,
    second_use: secondUse,
  },
  {
    scenario: "revise-route-rejection",
    expected: "revise receipt does not authorize execution",
    ...canExecuteWithReceipt(reviseReceipt, clone(reviseInvocation), { consumed_receipts: new Set() }),
  },
];

const decisionCounts = Object.fromEntries(
  ["allow", "revise", "human_review", "stop"].map((decision) => [
    decision,
    results.filter((result) => result.decision_receipt.decision === decision).length,
  ]),
);

const output = {
  ok: true,
  proof: "authority-injection-wrapper",
  version: "0.1",
  mode: "local_dry_run_authority_injection_no_downstream_execution",
  command: "npm run proof:authority-injection-wrapper -- --dry-run --json",
  thesis:
    "wrapTool injects beforeAction, resolveAuthority, and afterAction around a tool call so Agent I/O and Decision Receipt happen before runtime-owned execution.",
  pattern: [
    "wrapTool",
    "beforeAction",
    "Agent I/O Event",
    "Action Card",
    "resolveAuthority",
    "Relay Decision Receipt",
    "runtime-owned execution gate",
    "afterAction",
    "Agent Traffic Ledger refs",
  ],
  contract_methods: CONTRACT_METHODS,
  wrapped_tool: {
    tool_ref: wrappedTool.tool_ref,
    tool_name: wrappedTool.tool_name,
    wrapper_ref: wrappedTool.wrapper_ref,
    handler_ref: "handler_ref:synthetic_customer_record_update",
  },
  attribution: publicAttributionSummary(attribution),
  decision_counts: decisionCounts,
  scenario_count: results.length,
  results,
  enforcement_checks: enforcementChecks,
  boundaries: {
    one_wrapped_tool: true,
    local_dry_run: true,
    refs_only: true,
    agent_io_filter_before_tool_execution: true,
    private_payload_persisted: false,
    downstream_execution_by_neura: false,
    runtime_owned_execution: true,
    provider_listing_or_partnership_claim: false,
    endorsement_or_approval_claim: false,
    compliance_certification_claim: false,
    public_distribution_action: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Tool-call Authority Injection Wrapper v0.1");
  console.log("");
  console.log(output.thesis);
  console.log("");
  for (const result of results) {
    console.log(`${result.scenario}`);
    console.log(`  Decision: ${result.decision_receipt.decision}`);
    console.log(`  Receipt: ${result.decision_receipt.receipt_ref}`);
    console.log(`  Runtime route: ${result.runtime_gate.runtime_execution_state}`);
  }
  console.log("");
  console.log("Changed args, expired receipt, and one-shot reuse fail closed.");
  console.log("No downstream execution by Neura.");
}
