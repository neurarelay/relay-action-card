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

const BINDING_FIELDS = [
  "call_ref",
  "actor_ref",
  "runtime_ref",
  "tool_ref",
  "action_ref",
  "target_ref",
  "params_hash",
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

function paramsHash(refSeed) {
  return `sha256:${sha256(`runtime-binding-params:${refSeed}`)}`;
}

function compactRef(prefix, value) {
  return `${prefix}_${sha256(stableJson(value)).slice(0, 16)}`;
}

function bindingSnapshot(envelope) {
  return Object.fromEntries(BINDING_FIELDS.map((field) => [field, envelope[field]]));
}

function bindingHash(envelope) {
  return `sha256:${sha256(stableJson(bindingSnapshot(envelope)))}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function changedBindingFields(originalRefs, candidateEnvelope) {
  const candidateRefs = bindingSnapshot(candidateEnvelope);
  return BINDING_FIELDS.filter(
    (field) => stableJson(originalRefs[field]) !== stableJson(candidateRefs[field]),
  );
}

function deriveActionCardFromInvocation(envelope) {
  const envelopeHash = bindingHash(envelope);

  return {
    version: "0.1",
    action_card_ref: compactRef("action_card_ref_runtime_binding", envelope),
    derived_from: "runtime_invocation_envelope",
    derived_from_call_ref: envelope.call_ref,
    actor: {
      actor_ref: envelope.actor_ref,
    },
    proposed_action: {
      action_ref: envelope.action_ref,
      tool_ref: envelope.tool_ref,
      target_ref: envelope.target_ref,
      params_hash: envelope.params_hash,
    },
    invocation_binding: {
      call_ref: envelope.call_ref,
      actor_ref: envelope.actor_ref,
      runtime_ref: envelope.runtime_ref,
      tool_ref: envelope.tool_ref,
      action_ref: envelope.action_ref,
      target_ref: envelope.target_ref,
      params_hash: envelope.params_hash,
      policy_context_ref: envelope.policy_context_ref,
      evidence_refs: envelope.evidence_refs,
      source: envelope.source,
      campaign: envelope.campaign,
      surface: envelope.surface,
      envelope_hash: envelopeHash,
      binding_fields: BINDING_FIELDS,
      valid_only_for_exact_invocation: true,
    },
    context: {
      runtime_ref: envelope.runtime_ref,
      policy_context_ref: envelope.policy_context_ref,
      evidence_refs: envelope.evidence_refs,
      source: envelope.source,
      campaign: envelope.campaign,
      surface: envelope.surface,
    },
    refs_only: true,
  };
}

function evaluateActionCard(actionCard) {
  const policyRef = actionCard.context.policy_context_ref;
  const toolRef = actionCard.proposed_action.tool_ref;

  if (policyRef.includes("blocked") || toolRef.includes("deployment.promote")) {
    return {
      decision: "stop",
      route: "stop",
      reason: "The bound invocation is outside the runtime policy context for this target ref.",
      runtime_route: "stop_before_runtime_owned_execution",
    };
  }

  if (policyRef.includes("high_risk") || toolRef.includes("npm.publish")) {
    return {
      decision: "human_review",
      route: "human_review",
      reason: "The bound invocation is high impact and needs operator review before execution.",
      runtime_route: "route_to_human_review_before_runtime_owned_execution",
    };
  }

  if (policyRef.includes("needs_revision") || toolRef.includes("github.issue_comment.create")) {
    return {
      decision: "revise",
      route: "revise",
      reason: "The bound invocation needs stronger evidence or policy refs before execution.",
      runtime_route: "revise_action_card_before_runtime_owned_execution",
    };
  }

  return {
    decision: "proceed",
    route: "proceed",
    reason: "The actor, runtime, tool, target, params hash, policy context, and evidence refs align.",
    runtime_route: "ready_for_runtime_owned_execution",
  };
}

function buildDecisionReceipt(actionCard, evaluation) {
  const binding = actionCard.invocation_binding;
  const receiptSeed = {
    envelope_hash: binding.envelope_hash,
    decision: evaluation.decision,
    route: evaluation.route,
  };

  return {
    receipt_ref: compactRef("receipt_ref_runtime_binding", receiptSeed),
    receipt_id: compactRef("receipt_ref_runtime_binding", receiptSeed),
    trace_ref: compactRef("trace_ref_runtime_binding", binding.envelope_hash),
    transaction_ref: compactRef("relay_txn_runtime_binding", receiptSeed),
    decision: evaluation.decision,
    route: evaluation.route,
    reason: evaluation.reason,
    authority_layer: "neura",
    binding: {
      call_ref: binding.call_ref,
      envelope_hash: binding.envelope_hash,
      bound_refs: Object.fromEntries(BINDING_FIELDS.map((field) => [field, binding[field]])),
      binding_fields: BINDING_FIELDS,
      valid_only_for_exact_invocation: true,
    },
    refs_only: true,
    private_payload_persisted: false,
    downstream_execution_by_neura: false,
  };
}

function buildRuntimeRoute(receipt, evaluation) {
  return {
    route_owner: "developer_runtime",
    route: evaluation.route,
    runtime_route: evaluation.runtime_route,
    receipt_ref: receipt.receipt_ref,
    trace_ref: receipt.trace_ref,
    proceed_allowed_by_receipt: evaluation.decision === "proceed",
    runtime_must_recheck_binding_before_execution: true,
    runtime_owns_execution_decision: true,
    downstream_tool_executed_in_dry_run: false,
    execution_performed_by_neura: false,
  };
}

function checkReceiptApplicability(receipt, candidateEnvelope) {
  const candidateHash = bindingHash(candidateEnvelope);
  const changedFields = changedBindingFields(receipt.binding.bound_refs, candidateEnvelope);
  const applicable = candidateHash === receipt.binding.envelope_hash && changedFields.length === 0;

  return {
    applicable,
    reason: applicable ? "envelope_hash_match" : "envelope_hash_mismatch",
    receipt_ref: receipt.receipt_ref,
    original_call_ref: receipt.binding.call_ref,
    candidate_call_ref: candidateEnvelope.call_ref,
    candidate_envelope_hash: candidateHash,
    changed_fields: changedFields,
  };
}

const attribution = buildRelayAttribution({
  argv,
  env: {
    ...process.env,
    NEURA_SESSION_REF: process.env.NEURA_SESSION_REF ?? "runtime_binding_session:dry_run",
  },
  defaultSource: "runtime_binding_proof",
  defaultCampaign: "runtime_bound_action_card",
  defaultSurface: "examples/runtime-binding/run-proof",
});

const source = attribution.neura_source ?? "runtime_binding_proof";
const campaign = attribution.neura_campaign ?? "runtime_bound_action_card";
const surface = attribution.neura_surface ?? "examples/runtime-binding/run-proof";

const invocationEnvelopes = [
  {
    id: "repo-search-proceed",
    title: "Read-only repository search",
    call_ref: "call_ref:runtime_binding:repo_search:001",
    actor_ref: "actor_ref:agent:registry_lookup_assistant",
    runtime_ref: "runtime_ref:mcp_tool_adapter:local_dry_run",
    tool_ref: "tool_ref:repo.search",
    action_ref: "action_ref:repo.search",
    target_ref: "target_ref:github_repo:neurarelay/relay-action-card",
    params_hash: paramsHash("repo.search:query_ref:runtime_binding"),
    policy_context_ref: "policy_context_ref:repo_search:read_only",
    evidence_refs: ["evidence_ref:issue_comment_binding_question", "evidence_ref:repo_policy_read_only"],
    source,
    campaign,
    surface,
  },
  {
    id: "issue-comment-revise",
    title: "Issue comment before public reply",
    call_ref: "call_ref:runtime_binding:issue_comment:001",
    actor_ref: "actor_ref:agent:developer_support_assistant",
    runtime_ref: "runtime_ref:openclaw_style_before_action:local_dry_run",
    tool_ref: "tool_ref:github.issue_comment.create",
    action_ref: "action_ref:github.issue_comment.create",
    target_ref: "target_ref:github_issue:external_comment_thread",
    params_hash: paramsHash("github.issue_comment.create:comment_ref:binding_response_draft"),
    policy_context_ref: "policy_context_ref:public_reply:needs_revision",
    evidence_refs: ["evidence_ref:runtime_binding_request", "evidence_ref:no_public_action_boundary"],
    source,
    campaign,
    surface,
  },
  {
    id: "package-publish-human-review",
    title: "Package publish attempt",
    call_ref: "call_ref:runtime_binding:package_publish:001",
    actor_ref: "actor_ref:agent:release_assistant",
    runtime_ref: "runtime_ref:package_runtime:local_dry_run",
    tool_ref: "tool_ref:npm.publish",
    action_ref: "action_ref:npm.publish",
    target_ref: "target_ref:npm_package:neurarelay_preflight_adapter",
    params_hash: paramsHash("npm.publish:package_ref:neurarelay_preflight_adapter"),
    policy_context_ref: "policy_context_ref:package_release:high_risk",
    evidence_refs: ["evidence_ref:package_release_candidate", "evidence_ref:operator_approval_required"],
    source,
    campaign,
    surface,
  },
  {
    id: "deployment-promote-stop",
    title: "Production deployment promotion",
    call_ref: "call_ref:runtime_binding:deployment_promote:001",
    actor_ref: "actor_ref:agent:deployment_assistant",
    runtime_ref: "runtime_ref:deployment_runtime:local_dry_run",
    tool_ref: "tool_ref:deployment.promote",
    action_ref: "action_ref:deployment.promote",
    target_ref: "target_ref:production:neurarelay_web",
    params_hash: paramsHash("deployment.promote:target_ref:production"),
    policy_context_ref: "policy_context_ref:production_change:blocked_without_approval",
    evidence_refs: ["evidence_ref:protected_launch_boundary", "evidence_ref:no_website_change_authorized"],
    source,
    campaign,
    surface,
  },
];

const only = argValue("only");
const selectedInvocations = only
  ? invocationEnvelopes.filter((envelope) => envelope.id === only)
  : invocationEnvelopes;

if (listOnly) {
  const output = invocationEnvelopes.map(({ id, title, tool_ref, target_ref }) => ({
    id,
    title,
    tool_ref,
    target_ref,
  }));
  console.log(jsonOutput ? JSON.stringify(output, null, 2) : output.map((item) => item.id).join("\n"));
  process.exit(0);
}

if (only && selectedInvocations.length === 0) {
  console.error(`Unknown Runtime-Bound Action Card scenario: ${only}`);
  console.error(`Available scenarios: ${invocationEnvelopes.map((envelope) => envelope.id).join(", ")}`);
  process.exit(1);
}

if (!dryRun) {
  console.error("Live mode is intentionally not implemented for this proof packet. Use --dry-run.");
  process.exit(1);
}

const results = selectedInvocations.map((envelope) => {
  const actionCard = deriveActionCardFromInvocation(envelope);
  const evaluation = evaluateActionCard(actionCard);
  const receipt = buildDecisionReceipt(actionCard, evaluation);

  return {
    scenario: envelope.id,
    title: envelope.title,
    runtime_invocation_envelope: {
      ...envelope,
      captured_at: "tool_boundary_before_execution",
      refs_only: true,
      params_hash_only: true,
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
    },
    action_card: actionCard,
    decision_receipt: receipt,
    runtime_owned_route: buildRuntimeRoute(receipt, evaluation),
    trace: {
      trace_ref: receipt.trace_ref,
      events: [
        "runtime_tool_invocation_captured",
        "action_card_derived_from_invocation_envelope",
        "relay_decision_receipt_bound_to_envelope_hash",
        "runtime_rechecks_binding_before_execution",
        "runtime_execution_remains_developer_owned",
      ],
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
    },
    boundaries: {
      refs_only: true,
      action_card_derived_from_invocation_envelope: true,
      receipt_valid_only_for_exact_invocation: true,
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
      runtime_owned_execution: true,
      provider_listing_or_partnership_claim: false,
      endorsement_or_approval_claim: false,
      full_data_flow_provenance_claim: false,
    },
  };
});

const baseEnvelope = invocationEnvelopes[0];
const baseActionCard = deriveActionCardFromInvocation(baseEnvelope);
const baseEvaluation = evaluateActionCard(baseActionCard);
const baseReceipt = buildDecisionReceipt(baseActionCard, baseEvaluation);

const changedTarget = clone(baseEnvelope);
changedTarget.target_ref = "target_ref:github_repo:another-owner/another-repo";

const changedToolAction = clone(baseEnvelope);
changedToolAction.tool_ref = "tool_ref:github.issue_comment.create";
changedToolAction.action_ref = "action_ref:github.issue_comment.create";

const changedParamsHash = clone(baseEnvelope);
changedParamsHash.params_hash = paramsHash("repo.search:query_ref:changed_after_receipt");

const highRiskResult = results.find((result) => result.scenario === "package-publish-human-review");

const bindingChecks = [
  {
    scenario: "unchanged-invocation",
    expected: "receipt remains applicable",
    ...checkReceiptApplicability(baseReceipt, clone(baseEnvelope)),
  },
  {
    scenario: "changed-target",
    expected: "old receipt no longer applies",
    ...checkReceiptApplicability(baseReceipt, changedTarget),
  },
  {
    scenario: "changed-tool-action",
    expected: "old receipt no longer applies",
    ...checkReceiptApplicability(baseReceipt, changedToolAction),
  },
  {
    scenario: "changed-params-hash",
    expected: "old receipt no longer applies",
    ...checkReceiptApplicability(baseReceipt, changedParamsHash),
  },
  {
    scenario: "high-risk-call",
    expected: "high-risk call routes to human_review or stop",
    receipt_ref: highRiskResult?.decision_receipt.receipt_ref ?? null,
    trace_ref: highRiskResult?.decision_receipt.trace_ref ?? null,
    decision: highRiskResult?.decision_receipt.decision ?? null,
    route: highRiskResult?.decision_receipt.route ?? null,
    applicable: highRiskResult
      ? checkReceiptApplicability(
          highRiskResult.decision_receipt,
          highRiskResult.runtime_invocation_envelope,
        ).applicable
      : false,
    downstream_tool_executed_in_dry_run:
      highRiskResult?.runtime_owned_route.downstream_tool_executed_in_dry_run ?? null,
    execution_performed_by_neura:
      highRiskResult?.runtime_owned_route.execution_performed_by_neura ?? null,
  },
];

const output = {
  ok: true,
  proof: "runtime-bound-action-card-proof",
  version: "0.1",
  mode: "local_dry_run_runtime_binding_no_downstream_execution",
  command: "npm run proof:runtime-binding -- --dry-run --json",
  thesis:
    "The Action Card is derived from the actual runtime invocation envelope, and the receipt is valid only for that exact call.",
  pattern: [
    "actual runtime/tool invocation",
    "derived Action Card",
    "Relay Decision Receipt",
    "receipt valid only for that exact call",
    "runtime-owned proceed / revise / stop / human_review route",
  ],
  attribution: publicAttributionSummary(attribution),
  binding_fields: BINDING_FIELDS,
  count: results.length,
  results,
  binding_checks: bindingChecks,
  boundaries: {
    refs_only: true,
    local_dry_run: true,
    private_payload_persisted: false,
    downstream_execution_by_neura: false,
    runtime_owned_execution: true,
    provider_listing_or_partnership_claim: false,
    endorsement_or_approval_claim: false,
    full_data_flow_provenance_claim: false,
    public_distribution_action: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Runtime-Bound Action Card Proof v0.1");
  console.log("");
  console.log(output.thesis);
  console.log("");
  for (const result of results) {
    console.log(`${result.scenario}`);
    console.log(`  Tool: ${result.runtime_invocation_envelope.tool_ref}`);
    console.log(`  Decision: ${result.decision_receipt.decision}`);
    console.log(`  Receipt: ${result.decision_receipt.receipt_ref}`);
    console.log(`  Binding: ${result.decision_receipt.binding.envelope_hash}`);
    console.log(`  Runtime route: ${result.runtime_owned_route.runtime_route}`);
  }
  console.log("");
  console.log("Changed target, tool/action, or params hash invalidates the old receipt.");
  console.log("Neura returns the decision record. The developer runtime owns execution.");
}
