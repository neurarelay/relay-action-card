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

const FLOW_BINDING_FIELDS = [
  "call_ref",
  "actor_ref",
  "runtime_ref",
  "tool_ref",
  "action_ref",
  "target_ref",
  "source_refs",
  "transformations",
  "sink_ref",
  "destination_trust",
  "purpose_ref",
  "authority_refs",
  "tool_side_effect_refs",
  "data_labels",
  "params_hash",
  "policy_refs",
  "evidence_refs",
  "source",
  "campaign",
  "surface",
];

const SENSITIVITY_RANK = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
  regulated: 4,
  secret: 5,
};

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

function paramsHash(seed) {
  return `sha256:${sha256(`flow-aware-authority-params:${seed}`)}`;
}

function compactRef(prefix, value) {
  return `${prefix}_${sha256(stableJson(value)).slice(0, 16)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function maxSensitivity(labels) {
  return labels.reduce((highest, label) => {
    const rank = SENSITIVITY_RANK[label] ?? 0;
    return rank > (SENSITIVITY_RANK[highest] ?? 0) ? label : highest;
  }, "public");
}

function isHigherThan(label, allowed) {
  return (SENSITIVITY_RANK[label] ?? 0) > (SENSITIVITY_RANK[allowed] ?? 0);
}

function flowSnapshot(envelope) {
  return Object.fromEntries(FLOW_BINDING_FIELDS.map((field) => [field, envelope[field]]));
}

function flowHash(envelope) {
  return `sha256:${sha256(stableJson(flowSnapshot(envelope)))}`;
}

function changedBindingFields(originalRefs, candidateEnvelope) {
  const candidateRefs = flowSnapshot(candidateEnvelope);
  return FLOW_BINDING_FIELDS.filter(
    (field) => stableJson(originalRefs[field]) !== stableJson(candidateRefs[field]),
  );
}

function hasRef(refs, prefix) {
  return refs.some((ref) => ref.startsWith(prefix));
}

function transformationSummary(transformations) {
  return transformations.map((item) => item.type).join(" -> ");
}

function deriveActionCardFromFlow(envelope) {
  const envelopeHash = flowHash(envelope);
  const declassificationRefs = envelope.transformations
    .map((item) => item.declassification_ref)
    .filter(Boolean);

  return {
    version: "0.1",
    action_card_ref: compactRef("action_card_ref_flow_gate", envelope),
    derived_from: "flow_aware_runtime_invocation_envelope",
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
    flow_authority: {
      bound_refs: flowSnapshot(envelope),
      source_refs: envelope.source_refs,
      transformations: envelope.transformations,
      sink_ref: envelope.sink_ref,
      destination_trust: envelope.destination_trust,
      purpose_ref: envelope.purpose_ref,
      authority_refs: envelope.authority_refs,
      tool_side_effect_refs: envelope.tool_side_effect_refs,
      data_labels: envelope.data_labels,
      effective_data_class: envelope.effective_data_class,
      declassification_refs: declassificationRefs,
      policy_refs: envelope.policy_refs,
      evidence_refs: envelope.evidence_refs,
      envelope_hash: envelopeHash,
      binding_fields: FLOW_BINDING_FIELDS,
      valid_only_for_exact_flow: true,
      transformations_preserve_sensitivity_by_default: true,
    },
    context: {
      runtime_ref: envelope.runtime_ref,
      source: envelope.source,
      campaign: envelope.campaign,
      surface: envelope.surface,
    },
    refs_only: true,
  };
}

function evaluateFlow(envelope) {
  const sourceClass = maxSensitivity(envelope.data_labels);
  const reversibleTransform = envelope.transformations.find((item) => item.reversible === true);
  const hiddenOrCovertTransform = envelope.transformations.find((item) => item.covert_channel_risk === true);
  const untrustedInput = envelope.source_refs.some((item) => item.trust === "untrusted");
  const missingSourceLabels = envelope.source_refs.some((item) => item.labels_current === false);
  const hasDeclassification = envelope.transformations.some((item) => Boolean(item.declassification_ref));
  const declassificationEvidence = hasRef(envelope.evidence_refs, "evidence_ref:declassification_review:");
  const privacyEvidence = hasRef(envelope.evidence_refs, "evidence_ref:privacy_review:");
  const retentionEvidence = hasRef(envelope.evidence_refs, "evidence_ref:retention_scope:");
  const fieldEvidence = hasRef(envelope.evidence_refs, "evidence_ref:field_value_review:");
  const provenanceEvidence = hasRef(envelope.evidence_refs, "evidence_ref:package_integrity:");
  const humanApproval = hasRef(envelope.evidence_refs, "evidence_ref:human_approval:");
  const securityReview = hasRef(envelope.evidence_refs, "evidence_ref:security_review:");
  const rollbackEvidence = hasRef(envelope.evidence_refs, "evidence_ref:rollback_plan:");
  const staleAuthority = envelope.authority_refs.some((ref) =>
    ref.includes(":expired") || ref.includes(":revoked") || ref.includes(":stale"),
  );
  const overbroadAuthority = envelope.authority_refs.some((ref) => ref.includes(":overbroad"));
  const hiddenSideEffects = envelope.tool_side_effect_refs.some((ref) =>
    ref.includes(":undeclared") || ref.includes(":hidden"),
  );
  const secretClass = envelope.data_labels.includes("secret");
  const labelsExceedSink = isHigherThan(envelope.effective_data_class, envelope.sink_allowed_max_class);
  const sinkIsExternal =
    envelope.destination_trust === "public" || envelope.destination_trust === "external";

  const checks = {
    source_labeled: !missingSourceLabels,
    reversible_transform_detected: Boolean(reversibleTransform),
    covert_channel_risk_detected: Boolean(hiddenOrCovertTransform),
    transformation_summary: transformationSummary(envelope.transformations),
    transformations_preserve_sensitivity_by_default: true,
    declassification_ref_present: hasDeclassification,
    destination_allows_effective_data_class: !labelsExceedSink,
    untrusted_input_detected: untrustedInput,
    sink_is_external: sinkIsExternal,
    privacy_evidence_present: privacyEvidence,
    retention_evidence_present: retentionEvidence,
    field_value_evidence_present: fieldEvidence,
    package_integrity_evidence_present: provenanceEvidence,
    human_approval_present: humanApproval,
    security_review_present: securityReview,
    rollback_evidence_present: rollbackEvidence,
    stale_authority_detected: staleAuthority,
    overbroad_authority_detected: overbroadAuthority,
    hidden_side_effects_detected: hiddenSideEffects,
    secret_class_detected: secretClass,
  };

  if (staleAuthority) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "stale_or_revoked_authority",
      reason: "The authority ref is expired, revoked, or stale for this consequential action.",
      next_required_refs: ["current_authority_ref", "revocation_check_ref", "fresh_human_approval_ref"],
      checks,
    };
  }

  if (hiddenSideEffects) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "hidden_tool_side_effects",
      reason: "The tool has undeclared side effects that are not covered by the proposed Action Card.",
      next_required_refs: ["tool_side_effect_manifest_ref", "side_effect_policy_ref", "human_review_ref"],
      checks,
    };
  }

  if (overbroadAuthority || envelope.action_family === "excessive_agency") {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "excessive_agency_scope_creep",
      reason: "The proposed agent scope is broader than the task authority and could enable unintended actions.",
      next_required_refs: ["least_privilege_scope_ref", "single_action_intent_ref", "short_lived_authority_ref"],
      checks,
    };
  }

  if (secretClass && sinkIsExternal) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "secret_leakage_to_untrusted_sink",
      reason: "Secret-class data cannot move to an external or public sink.",
      next_required_refs: ["secret_handling_policy_ref", "redaction_attestation_ref", "approved_secret_sink_ref"],
      checks,
    };
  }

  if (envelope.action_family === "tool_poisoning") {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "tool_poisoning_schema_or_metadata",
      reason: "The tool schema, metadata, or output is untrusted and can alter tool-selection or action intent.",
      next_required_refs: ["tool_attestation_ref", "schema_integrity_ref", "trusted_tool_catalog_ref"],
      checks,
    };
  }

  if (envelope.action_family === "memory_poisoning") {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "memory_poisoning_persistent_context",
      reason: "Untrusted content is attempting to persist future-agent context.",
      next_required_refs: ["memory_source_trust_ref", "operator_memory_intent_ref", "deletion_review_ref"],
      checks,
    };
  }

  if (missingSourceLabels) {
    return {
      decision: "human_review",
      route: "human_review",
      failure_class: "lost_or_missing_flow_labels",
      reason: "The runtime lost source labels before a consequential action, so authority cannot be evaluated safely.",
      next_required_refs: ["source_label_attestation_ref", "handoff_context_integrity_ref"],
      checks,
    };
  }

  if (untrustedInput && sinkIsExternal && envelope.action_ref.includes("send")) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "indirect_prompt_injection_to_external_action",
      reason: "Untrusted content is influencing an external side-effecting action.",
      next_required_refs: ["trusted_plan_ref", "human_review_ref", "tool_chain_analysis_ref"],
      checks,
    };
  }

  if (envelope.action_family === "cross_tenant_export") {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "cross_tenant_boundary_violation",
      reason: "The action attempts to move data across a tenant boundary without scoped tenant authority.",
      next_required_refs: ["tenant_scope_ref", "recipient_authority_ref", "privacy_review_ref"],
      checks,
    };
  }

  if (hiddenOrCovertTransform && sinkIsExternal && labelsExceedSink) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "covert_exfiltration_channel",
      reason: "A covert or hidden transform would move sensitive data to an external sink.",
      next_required_refs: ["remove_covert_channel_ref", "declassification_review_ref"],
      checks,
    };
  }

  if (reversibleTransform && sinkIsExternal && labelsExceedSink && !declassificationEvidence) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "reversible_obfuscation_exfiltration",
      reason: "A reversible transform does not declassify sensitive data before an external sink.",
      next_required_refs: ["declassification_review_ref", "destination_policy_ref"],
      checks,
    };
  }

  if (labelsExceedSink && sinkIsExternal && !hasDeclassification) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "unauthorized_data_to_public_or_external_sink",
      reason: "The effective data class exceeds the destination policy for this sink.",
      next_required_refs: ["declassification_review_ref", "privacy_review_ref", "approved_destination_ref"],
      checks,
    };
  }

  if (envelope.action_family === "browser_submit" && !fieldEvidence) {
    return {
      decision: "revise",
      route: "revise",
      failure_class: "browser_submit_missing_field_value_refs",
      reason: "An external browser submit needs reviewed field-value refs before execution.",
      next_required_refs: ["field_value_review_ref", "confirmation_or_reversal_ref"],
      checks,
    };
  }

  if (envelope.action_family === "permission_change" && !securityReview) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "permission_change_without_security_review",
      reason: "Permission or admin changes need security review, owner intent, least-privilege, and revocation refs.",
      next_required_refs: ["security_review_ref", "owner_intent_ref", "least_privilege_scope_ref", "revocation_window_ref"],
      checks,
    };
  }

  if (envelope.action_family === "workflow_transition" && !rollbackEvidence) {
    return {
      decision: "revise",
      route: "revise",
      failure_class: "workflow_state_change_missing_rollback",
      reason: "Workflow state changes need current-state, next-state, rollback, and operator-release refs.",
      next_required_refs: ["current_state_ref", "next_state_ref", "rollback_plan_ref", "operator_release_ref"],
      checks,
    };
  }

  if (envelope.action_family === "memory_write" && !retentionEvidence) {
    if (envelope.transformations.some((item) => item.type === "embedding") || envelope.tool_ref.includes("vector_store")) {
      return {
        decision: "human_review",
        route: "human_review",
        failure_class: "privacy_sensitive_flow_needs_review",
        reason: "Confidential memory or vector-store movement needs retention scope and privacy review before execution.",
        next_required_refs: ["retention_scope_ref", "privacy_review_ref", "dataset_scope_ref"],
        checks,
      };
    }

    return {
      decision: "revise",
      route: "revise",
      failure_class: "memory_write_missing_retention_scope",
      reason: "Persistent memory requires subject intent and bounded retention scope refs.",
      next_required_refs: ["subject_intent_ref", "retention_scope_ref", "deletion_review_ref"],
      checks,
    };
  }

  if (envelope.action_family === "package_publish" && !provenanceEvidence) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "supply_chain_release_needs_manual_review",
      reason: "Package publication needs package integrity, provenance, security, and manual release refs.",
      next_required_refs: ["package_integrity_ref", "release_approval_ref", "claim_boundary_ref"],
      checks,
    };
  }

  if (envelope.action_family === "production_deployment" && !humanApproval) {
    return {
      decision: "stop",
      route: "stop",
      failure_class: "critical_runtime_change_needs_human_release",
      reason: "Production changes remain human-release actions even when refs are mostly complete.",
      next_required_refs: ["human_approval_ref", "rollback_runbook_ref", "change_window_ref"],
      checks,
    };
  }

  if (labelsExceedSink && !privacyEvidence) {
    return {
      decision: "human_review",
      route: "human_review",
      failure_class: "privacy_sensitive_flow_needs_review",
      reason: "Sensitive data movement needs privacy review even when the sink is not public.",
      next_required_refs: ["privacy_review_ref", "dataset_scope_ref", "retention_scope_ref"],
      checks,
    };
  }

  return {
    decision: "proceed",
    route: "proceed",
    failure_class: "flow_authorized",
    reason: "Source labels, transformation refs, destination policy, purpose, authority, and evidence align.",
    next_required_refs: [],
    checks,
  };
}

function buildDecisionReceipt(actionCard, evaluation) {
  const flow = actionCard.flow_authority;
  const receiptSeed = {
    envelope_hash: flow.envelope_hash,
    decision: evaluation.decision,
    route: evaluation.route,
  };

  return {
    receipt_ref: compactRef("receipt_ref_flow_gate", receiptSeed),
    receipt_id: compactRef("receipt_ref_flow_gate", receiptSeed),
    trace_ref: compactRef("trace_ref_flow_gate", flow.envelope_hash),
    transaction_ref: compactRef("relay_txn_flow_gate", receiptSeed),
    decision: evaluation.decision,
    route: evaluation.route,
    reason: evaluation.reason,
    failure_class: evaluation.failure_class,
    next_required_refs: evaluation.next_required_refs,
    authority_layer: "neura",
    binding: {
      call_ref: actionCard.derived_from_call_ref,
      envelope_hash: flow.envelope_hash,
      bound_refs: flow.bound_refs,
      binding_fields: FLOW_BINDING_FIELDS,
      valid_only_for_exact_flow: true,
    },
    flow_gate: {
      version: "0.1",
      source_refs: flow.source_refs,
      transformation_refs: flow.transformations.map((item) => item.ref),
      sink_ref: flow.sink_ref,
      destination_trust: flow.destination_trust,
      purpose_ref: flow.purpose_ref,
      authority_refs: flow.authority_refs,
      tool_side_effect_refs: flow.tool_side_effect_refs,
      data_labels: flow.data_labels,
      effective_data_class: flow.effective_data_class,
      checks: evaluation.checks,
      transformations_preserve_sensitivity_by_default: true,
      reversible_obfuscation_is_not_declassification: true,
      fail_closed_when_flow_refs_missing: true,
      refs_only: true,
    },
    refs_only: true,
    private_payload_persisted: false,
    downstream_execution_by_neura: false,
  };
}

function buildRuntimeRoute(receipt) {
  return {
    route_owner: "developer_runtime",
    route: receipt.route,
    receipt_ref: receipt.receipt_ref,
    trace_ref: receipt.trace_ref,
    proceed_allowed_by_receipt: receipt.decision === "proceed",
    runtime_must_recheck_flow_binding_before_execution: true,
    runtime_owns_execution_decision: true,
    downstream_tool_executed_in_dry_run: false,
    execution_performed_by_neura: false,
  };
}

function checkReceiptApplicability(receipt, candidateEnvelope) {
  const candidateHash = flowHash(candidateEnvelope);
  const changedFields = changedBindingFields(receipt.binding.bound_refs, candidateEnvelope);
  const applicable = candidateHash === receipt.binding.envelope_hash && changedFields.length === 0;

  return {
    applicable,
    reason: applicable ? "flow_envelope_hash_match" : "flow_envelope_hash_mismatch",
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
    NEURA_SESSION_REF: process.env.NEURA_SESSION_REF ?? "flow_authority_gate_session:dry_run",
  },
  defaultSource: "flow_aware_authority_gate",
  defaultCampaign: "andrew_objection_security_depth",
  defaultSurface: "examples/flow-aware-authority/run-proof",
});

const source = attribution.neura_source ?? "flow_aware_authority_gate";
const campaign = attribution.neura_campaign ?? "andrew_objection_security_depth";
const surface = attribution.neura_surface ?? "examples/flow-aware-authority/run-proof";

function envelope(config) {
  const dataLabels = config.data_labels;
  const effectiveDataClass = config.effective_data_class ?? maxSensitivity(dataLabels);
  return {
    ...config,
    authority_refs: config.authority_refs ?? ["authority_ref:developer_supplied_scope:local_dry_run"],
    tool_side_effect_refs:
      config.tool_side_effect_refs ?? [`tool_side_effect_ref:${config.action_family}:declared`],
    params_hash: paramsHash(config.id),
    effective_data_class: effectiveDataClass,
    source,
    campaign,
    surface,
  };
}

const flowEnvelopes = [
  envelope({
    id: "sql-confidential-base64-reddit",
    title: "Confidential SQL result encoded and sent to public posting tool",
    call_ref: "call_ref:flow_gate:sql_base64_reddit:001",
    actor_ref: "actor_ref:agent:analytics_assistant",
    runtime_ref: "runtime_ref:mcp_tool_chain:local_dry_run",
    tool_ref: "tool_ref:social.post",
    action_ref: "action_ref:social.post.send",
    action_family: "external_post",
    target_ref: "target_ref:public_forum:reddit_thread",
    source_refs: [
      {
        ref: "data_source_ref:warehouse_customer_table",
        class: "restricted",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:base64_encode:sql_result",
        type: "base64_encode",
        reversible: true,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:public_forum_post",
    destination_trust: "public",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:answer_user_question",
    data_labels: ["restricted", "confidential"],
    policy_refs: ["policy_ref:public_destination_blocks_restricted_data"],
    evidence_refs: ["evidence_ref:sql_query_ref:customer_table"],
  }),
  envelope({
    id: "markdown-image-url-exfiltration",
    title: "Hidden markdown image URL carries encoded data to attacker-controlled host",
    call_ref: "call_ref:flow_gate:markdown_image_exfil:001",
    actor_ref: "actor_ref:agent:browser_assistant",
    runtime_ref: "runtime_ref:markdown_renderer:local_dry_run",
    tool_ref: "tool_ref:browser.render_markdown",
    action_ref: "action_ref:browser.render_markdown",
    action_family: "external_render",
    target_ref: "target_ref:browser_markdown_surface",
    source_refs: [
      {
        ref: "data_source_ref:private_workspace_note",
        class: "confidential",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:url_parameter_encode:workspace_note",
        type: "url_parameter_encode",
        reversible: true,
        covert_channel_risk: true,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_image_request",
    destination_trust: "external",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:render_summary",
    data_labels: ["confidential"],
    policy_refs: ["policy_ref:block_untrusted_external_url_exfiltration"],
    evidence_refs: ["evidence_ref:renderer_ref:markdown_output"],
  }),
  envelope({
    id: "poisoned-tool-output-send-payment-link",
    title: "Untrusted tool output tries to drive an external message",
    call_ref: "call_ref:flow_gate:poisoned_tool_output:001",
    actor_ref: "actor_ref:agent:support_assistant",
    runtime_ref: "runtime_ref:mcp_tool_adapter:local_dry_run",
    tool_ref: "tool_ref:message.send",
    action_ref: "action_ref:message.send.external",
    action_family: "outbound_message",
    target_ref: "target_ref:external_recipient:unverified",
    source_refs: [
      {
        ref: "tool_output_ref:untrusted_webpage_context",
        class: "public",
        trust: "untrusted",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:model_generated_message:draft",
        type: "model_draft",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_message",
    destination_trust: "external",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:customer_support_response",
    data_labels: ["public"],
    policy_refs: ["policy_ref:tool_output_cannot_control_external_send"],
    evidence_refs: ["evidence_ref:untrusted_input_ref:web_context"],
  }),
  envelope({
    id: "tool-poisoned-schema-shadow",
    title: "Poisoned tool schema attempts to shadow a trusted tool",
    call_ref: "call_ref:flow_gate:tool_poisoning:001",
    actor_ref: "actor_ref:agent:tool_using_assistant",
    runtime_ref: "runtime_ref:mcp_tool_catalog:local_dry_run",
    tool_ref: "tool_ref:untrusted_tool_catalog_entry",
    action_ref: "action_ref:tool.invoke.external",
    action_family: "tool_poisoning",
    target_ref: "target_ref:shadow_tool:payment_link_sender",
    source_refs: [
      {
        ref: "tool_schema_ref:untrusted_shadow_tool",
        class: "public",
        trust: "untrusted",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:tool_schema_to_action_plan:shadow_tool",
        type: "tool_schema_interpretation",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_tool_invocation",
    destination_trust: "external",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:select_runtime_tool",
    data_labels: ["public"],
    policy_refs: ["policy_ref:trusted_tool_catalog_required"],
    evidence_refs: ["evidence_ref:tool_schema_source:untrusted"],
  }),
  envelope({
    id: "excessive-agency-bulk-action-plan",
    title: "Agent requests broad workspace powers for a narrow task",
    call_ref: "call_ref:flow_gate:excessive_agency:001",
    actor_ref: "actor_ref:agent:workspace_assistant",
    runtime_ref: "runtime_ref:agent_orchestrator:local_dry_run",
    tool_ref: "tool_ref:workspace.execute_many",
    action_ref: "action_ref:workspace.bulk_execute",
    action_family: "excessive_agency",
    target_ref: "target_ref:workspace:all_resources",
    source_refs: [
      {
        ref: "task_ref:single_file_review",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:task_to_broad_plan:scope_creep",
        type: "scope_expansion",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:workspace_bulk_action",
    destination_trust: "internal",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:single_file_review",
    authority_refs: ["authority_ref:workspace_task:overbroad"],
    data_labels: ["internal"],
    policy_refs: ["policy_ref:least_privilege_required"],
    evidence_refs: ["evidence_ref:user_intent:single_file_review"],
  }),
  envelope({
    id: "secret-ref-to-public-log",
    title: "Secret-class runtime value would be written to a public log sink",
    call_ref: "call_ref:flow_gate:secret_public_log:001",
    actor_ref: "actor_ref:agent:debugging_assistant",
    runtime_ref: "runtime_ref:runtime_logger:local_dry_run",
    tool_ref: "tool_ref:log.write",
    action_ref: "action_ref:log.write.public",
    action_family: "secret_leakage",
    target_ref: "target_ref:public_build_log",
    source_refs: [
      {
        ref: "secret_ref:runtime_environment_value",
        class: "secret",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:mask_claim:debug_value",
        type: "mask_claim",
        reversible: true,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:public_build_log",
    destination_trust: "public",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:debug_runtime_failure",
    data_labels: ["secret"],
    policy_refs: ["policy_ref:secret_values_never_public"],
    evidence_refs: ["evidence_ref:debug_intent:runtime_failure"],
  }),
  envelope({
    id: "browser-submit-missing-field-refs",
    title: "External account form submit lacks reviewed field-value refs",
    call_ref: "call_ref:flow_gate:browser_submit:001",
    actor_ref: "actor_ref:agent:computer_use_operator",
    runtime_ref: "runtime_ref:browser_control:local_dry_run",
    tool_ref: "tool_ref:browser.submit_form",
    action_ref: "action_ref:browser.submit_form",
    action_family: "browser_submit",
    target_ref: "target_ref:vendor_admin_form",
    source_refs: [
      {
        ref: "form_state_ref:vendor_account_change",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:fill_form_fields:account_change",
        type: "field_mapping",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:vendor_account_submit",
    destination_trust: "external",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:update_vendor_account",
    data_labels: ["internal"],
    policy_refs: ["policy_ref:external_browser_submit_requires_field_review"],
    evidence_refs: ["evidence_ref:user_intent:vendor_update"],
  }),
  envelope({
    id: "memory-write-private-note-no-retention",
    title: "Persistent memory write lacks retention scope",
    call_ref: "call_ref:flow_gate:memory_write:001",
    actor_ref: "actor_ref:agent:workspace_assistant",
    runtime_ref: "runtime_ref:agent_memory:local_dry_run",
    tool_ref: "tool_ref:memory.write",
    action_ref: "action_ref:memory.write",
    action_family: "memory_write",
    target_ref: "target_ref:durable_agent_memory",
    source_refs: [
      {
        ref: "session_note_ref:private_strategy_context",
        class: "confidential",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:summarize:session_note",
        type: "summary",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:durable_agent_memory",
    destination_trust: "internal",
    sink_allowed_max_class: "confidential",
    purpose_ref: "purpose_ref:future_agent_context",
    data_labels: ["confidential"],
    policy_refs: ["policy_ref:memory_write_requires_retention_scope"],
    evidence_refs: ["evidence_ref:operator_intent:memory_review"],
  }),
  envelope({
    id: "memory-poisoning-untrusted-context",
    title: "Untrusted content attempts to persist future-agent memory",
    call_ref: "call_ref:flow_gate:memory_poisoning:001",
    actor_ref: "actor_ref:agent:workspace_assistant",
    runtime_ref: "runtime_ref:agent_memory:local_dry_run",
    tool_ref: "tool_ref:memory.write",
    action_ref: "action_ref:memory.write",
    action_family: "memory_poisoning",
    target_ref: "target_ref:durable_agent_memory",
    source_refs: [
      {
        ref: "webpage_context_ref:untrusted_instruction",
        class: "public",
        trust: "untrusted",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:untrusted_context_to_memory:future_instruction",
        type: "memory_instruction",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:durable_agent_memory",
    destination_trust: "internal",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:future_agent_context",
    data_labels: ["public"],
    policy_refs: ["policy_ref:untrusted_content_cannot_write_memory"],
    evidence_refs: ["evidence_ref:untrusted_input_ref:web_context"],
  }),
  envelope({
    id: "package-publish-missing-provenance",
    title: "Package publication lacks integrity and claim-boundary refs",
    call_ref: "call_ref:flow_gate:package_publish:001",
    actor_ref: "actor_ref:agent:release_assistant",
    runtime_ref: "runtime_ref:package_release:local_dry_run",
    tool_ref: "tool_ref:npm.publish",
    action_ref: "action_ref:npm.publish",
    action_family: "package_publish",
    target_ref: "target_ref:npm_package:neurarelay_preflight_adapter",
    source_refs: [
      {
        ref: "repo_state_ref:release_candidate",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:pack_artifact:release_candidate",
        type: "package_build",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:public_package_registry",
    destination_trust: "public",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:community_package_release",
    data_labels: ["internal"],
    policy_refs: ["policy_ref:package_release_requires_manual_review"],
    evidence_refs: ["evidence_ref:release_intent:package_publish"],
  }),
  envelope({
    id: "permission-change-without-security-review",
    title: "Admin permission change lacks security review and revocation refs",
    call_ref: "call_ref:flow_gate:permission_change:001",
    actor_ref: "actor_ref:agent:admin_assistant",
    runtime_ref: "runtime_ref:identity_admin:local_dry_run",
    tool_ref: "tool_ref:iam.permission_update",
    action_ref: "action_ref:permission.change",
    action_family: "permission_change",
    target_ref: "target_ref:production_admin_role",
    source_refs: [
      {
        ref: "access_request_ref:role_change_request",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:request_to_permission_patch:admin_role",
        type: "permission_patch",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:identity_provider_admin_api",
    destination_trust: "internal",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:update_access_role",
    data_labels: ["internal"],
    policy_refs: ["policy_ref:permission_change_requires_security_review"],
    evidence_refs: ["evidence_ref:owner_intent:role_change"],
  }),
  envelope({
    id: "workflow-transition-missing-rollback",
    title: "Workflow transition lacks rollback and operator-release refs",
    call_ref: "call_ref:flow_gate:workflow_transition:001",
    actor_ref: "actor_ref:agent:workflow_assistant",
    runtime_ref: "runtime_ref:workflow_engine:local_dry_run",
    tool_ref: "tool_ref:workflow.transition",
    action_ref: "action_ref:workflow.transition",
    action_family: "workflow_transition",
    target_ref: "target_ref:customer_workflow:closed",
    source_refs: [
      {
        ref: "workflow_state_ref:customer_case_current",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:case_summary_to_transition:close_case",
        type: "state_transition",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:workflow_state_store",
    destination_trust: "internal",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:close_customer_case",
    data_labels: ["internal"],
    policy_refs: ["policy_ref:workflow_transition_requires_rollback"],
    evidence_refs: [
      "evidence_ref:current_state:customer_case_open",
      "evidence_ref:operator_intent:close_case",
    ],
  }),
  envelope({
    id: "cross-tenant-export-wrong-recipient",
    title: "Cross-tenant export points at a recipient outside delegated scope",
    call_ref: "call_ref:flow_gate:cross_tenant_export:001",
    actor_ref: "actor_ref:agent:account_ops_assistant",
    runtime_ref: "runtime_ref:crm_export:local_dry_run",
    tool_ref: "tool_ref:crm.export",
    action_ref: "action_ref:data.export",
    action_family: "cross_tenant_export",
    target_ref: "target_ref:external_workspace:wrong_tenant",
    source_refs: [
      {
        ref: "dataset_ref:tenant_a_account_records",
        class: "regulated",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:csv_export:tenant_records",
        type: "export_format",
        reversible: true,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_workspace",
    destination_trust: "external",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:account_handoff",
    data_labels: ["regulated", "confidential"],
    policy_refs: ["policy_ref:tenant_boundary_export_control"],
    evidence_refs: ["evidence_ref:privacy_review:missing_tenant_scope"],
  }),
  envelope({
    id: "stale-authority-after-revocation",
    title: "Previously valid authority was revoked before the action",
    call_ref: "call_ref:flow_gate:stale_authority:001",
    actor_ref: "actor_ref:agent:support_assistant",
    runtime_ref: "runtime_ref:message_runtime:local_dry_run",
    tool_ref: "tool_ref:message.send",
    action_ref: "action_ref:message.send.external",
    action_family: "outbound_message",
    target_ref: "target_ref:external_customer_contact",
    source_refs: [
      {
        ref: "draft_ref:support_message_followup",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:draft_to_send_request:support_followup",
        type: "message_send_request",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_message",
    destination_trust: "external",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:support_followup",
    authority_refs: ["authority_ref:delegation:revoked"],
    data_labels: ["internal"],
    policy_refs: ["policy_ref:revocation_check_required"],
    evidence_refs: ["evidence_ref:user_intent:previously_valid"],
  }),
  envelope({
    id: "hidden-tool-side-effect-webhook",
    title: "Tool call declares a read but triggers an undeclared webhook side effect",
    call_ref: "call_ref:flow_gate:hidden_side_effect:001",
    actor_ref: "actor_ref:agent:research_assistant",
    runtime_ref: "runtime_ref:tool_adapter:local_dry_run",
    tool_ref: "tool_ref:repo.lookup",
    action_ref: "action_ref:repo.lookup",
    action_family: "read_with_hidden_side_effect",
    target_ref: "target_ref:repo_metadata_lookup",
    source_refs: [
      {
        ref: "query_ref:repo_metadata_lookup",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:lookup_query_to_tool_call:repo_metadata",
        type: "tool_call",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_webhook_observer",
    destination_trust: "external",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:read_repo_metadata",
    tool_side_effect_refs: ["tool_side_effect_ref:webhook:hidden"],
    data_labels: ["internal"],
    policy_refs: ["policy_ref:declared_tool_side_effects_required"],
    evidence_refs: ["evidence_ref:tool_manifest:missing_side_effect"],
  }),
  envelope({
    id: "ocr-screenshot-confidential-to-chat",
    title: "Screenshot OCR extracts confidential text into an external chat tool",
    call_ref: "call_ref:flow_gate:ocr_screenshot_chat:001",
    actor_ref: "actor_ref:agent:computer_use_assistant",
    runtime_ref: "runtime_ref:screen_reader:local_dry_run",
    tool_ref: "tool_ref:chat.send",
    action_ref: "action_ref:chat.send.external",
    action_family: "outbound_message",
    target_ref: "target_ref:external_chat_channel",
    source_refs: [
      {
        ref: "screen_region_ref:confidential_dashboard",
        class: "confidential",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:ocr_extract:dashboard_region",
        type: "ocr_extract",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_chat_channel",
    destination_trust: "external",
    sink_allowed_max_class: "public",
    purpose_ref: "purpose_ref:ask_external_helper",
    data_labels: ["confidential"],
    policy_refs: ["policy_ref:screen_data_external_send_block"],
    evidence_refs: ["evidence_ref:screen_region_ref:dashboard"],
  }),
  envelope({
    id: "embedding-confidential-shared-vector-store",
    title: "Confidential data is embedded into a shared vector store",
    call_ref: "call_ref:flow_gate:shared_vector_store:001",
    actor_ref: "actor_ref:agent:retrieval_assistant",
    runtime_ref: "runtime_ref:embedding_pipeline:local_dry_run",
    tool_ref: "tool_ref:vector_store.upsert",
    action_ref: "action_ref:memory.vector_upsert",
    action_family: "memory_write",
    target_ref: "target_ref:shared_vector_store",
    source_refs: [
      {
        ref: "document_ref:confidential_contract_summary",
        class: "confidential",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:embedding:contract_summary",
        type: "embedding",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:shared_vector_store",
    destination_trust: "internal",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:retrieval_memory",
    data_labels: ["confidential"],
    policy_refs: ["policy_ref:embedding_requires_memory_scope_and_privacy_review"],
    evidence_refs: ["evidence_ref:operator_intent:retrieval_memory"],
  }),
  envelope({
    id: "multi-agent-handoff-loses-labels",
    title: "Worker handoff loses source labels before federation message",
    call_ref: "call_ref:flow_gate:agent_handoff_labels:001",
    actor_ref: "actor_ref:agent:coordinator",
    runtime_ref: "runtime_ref:multi_agent_orchestrator:local_dry_run",
    tool_ref: "tool_ref:agent.dispatch",
    action_ref: "action_ref:federation.message",
    action_family: "multi_agent_handoff",
    target_ref: "target_ref:worker_agent:external_runtime",
    source_refs: [
      {
        ref: "handoff_context_ref:strategy_context",
        class: "confidential",
        trust: "internal",
        labels_current: false,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:compress_context:handoff",
        type: "context_compression",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:external_worker_runtime",
    destination_trust: "external",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:delegate_research_task",
    data_labels: ["confidential"],
    policy_refs: ["policy_ref:multi_agent_handoff_requires_label_integrity"],
    evidence_refs: ["evidence_ref:handoff_intent:research_task"],
  }),
  envelope({
    id: "approved-aggregate-internal-dashboard",
    title: "Aggregated metrics update approved for internal dashboard",
    call_ref: "call_ref:flow_gate:aggregate_dashboard:001",
    actor_ref: "actor_ref:agent:analytics_assistant",
    runtime_ref: "runtime_ref:internal_dashboard_writer:local_dry_run",
    tool_ref: "tool_ref:dashboard.update",
    action_ref: "action_ref:dashboard.update",
    action_family: "internal_report",
    target_ref: "target_ref:internal_dashboard:operator_metrics",
    source_refs: [
      {
        ref: "dataset_ref:usage_metrics_daily_rollup",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:aggregate_redact:daily_rollup",
        type: "aggregate_redact",
        reversible: false,
        reduces_sensitivity: true,
        declassification_ref: "declassification_ref:aggregate_metrics_policy",
      },
    ],
    sink_ref: "sink_ref:internal_dashboard",
    destination_trust: "internal",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:operator_metric_review",
    data_labels: ["internal"],
    policy_refs: ["policy_ref:internal_dashboard_metric_update"],
    evidence_refs: [
      "evidence_ref:declassification_review:aggregate_metrics",
      "evidence_ref:privacy_review:aggregate_metrics",
      "evidence_ref:dataset_scope:daily_rollup",
    ],
  }),
  envelope({
    id: "production-deploy-complete-refs",
    title: "Production deploy has refs but still needs human release",
    call_ref: "call_ref:flow_gate:production_deploy:001",
    actor_ref: "actor_ref:agent:deployment_assistant",
    runtime_ref: "runtime_ref:deployment_runtime:local_dry_run",
    tool_ref: "tool_ref:deployment.promote",
    action_ref: "action_ref:deployment.promote",
    action_family: "production_deployment",
    target_ref: "target_ref:production:neurarelay_web",
    source_refs: [
      {
        ref: "artifact_ref:production_candidate",
        class: "internal",
        trust: "internal",
        labels_current: true,
      },
    ],
    transformations: [
      {
        ref: "transform_ref:build_artifact:deployment_bundle",
        type: "deployment_build",
        reversible: false,
        reduces_sensitivity: false,
        declassification_ref: null,
      },
    ],
    sink_ref: "sink_ref:production_runtime",
    destination_trust: "internal",
    sink_allowed_max_class: "internal",
    purpose_ref: "purpose_ref:production_release",
    data_labels: ["internal"],
    policy_refs: ["policy_ref:production_deploy_requires_human_release"],
    evidence_refs: [
      "evidence_ref:rollback_runbook:current",
      "evidence_ref:change_window:approved",
      "evidence_ref:deployment_plan:current",
    ],
  }),
];

const only = argValue("only");
const selectedEnvelopes = only
  ? flowEnvelopes.filter((item) => item.id === only)
  : flowEnvelopes;

if (listOnly) {
  const output = flowEnvelopes.map(({ id, title, action_family, sink_ref }) => ({
    id,
    title,
    action_family,
    sink_ref,
  }));
  console.log(jsonOutput ? JSON.stringify(output, null, 2) : output.map((item) => item.id).join("\n"));
  process.exit(0);
}

if (only && selectedEnvelopes.length === 0) {
  console.error(`Unknown Flow-Aware Authority Gate scenario: ${only}`);
  console.error(`Available scenarios: ${flowEnvelopes.map((item) => item.id).join(", ")}`);
  process.exit(1);
}

if (!dryRun) {
  console.error("Live mode is intentionally not implemented for this proof packet. Use --dry-run.");
  process.exit(1);
}

const results = selectedEnvelopes.map((flowEnvelope) => {
  const actionCard = deriveActionCardFromFlow(flowEnvelope);
  const evaluation = evaluateFlow(flowEnvelope);
  const receipt = buildDecisionReceipt(actionCard, evaluation);

  return {
    scenario: flowEnvelope.id,
    title: flowEnvelope.title,
    failure_class: evaluation.failure_class,
    flow_invocation_envelope: {
      ...flowEnvelope,
      captured_at: "tool_boundary_before_execution",
      refs_only: true,
      params_hash_only: true,
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
    },
    action_card: actionCard,
    decision_receipt: receipt,
    runtime_owned_route: buildRuntimeRoute(receipt),
    trace: {
      trace_ref: receipt.trace_ref,
      events: [
        "flow_runtime_invocation_captured",
        "source_transformation_sink_refs_bound",
        "action_card_derived_from_flow_envelope",
        "flow_gate_evaluated_before_execution",
        "decision_receipt_bound_to_flow_hash",
        "runtime_rechecks_flow_binding_before_execution",
        "runtime_execution_remains_developer_owned",
      ],
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
    },
    boundaries: {
      refs_only: true,
      source_transformation_sink_bound: true,
      receipt_valid_only_for_exact_flow: true,
      transformations_preserve_sensitivity_by_default: true,
      reversible_obfuscation_is_not_declassification: true,
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
      runtime_owned_execution: true,
      provider_listing_or_partnership_claim: false,
      endorsement_or_approval_claim: false,
      full_runtime_taint_tracking_claim: false,
      all_possible_scenarios_claim: false,
    },
  };
});

const baseEnvelope = flowEnvelopes[0];
const baseActionCard = deriveActionCardFromFlow(baseEnvelope);
const baseEvaluation = evaluateFlow(baseEnvelope);
const baseReceipt = buildDecisionReceipt(baseActionCard, baseEvaluation);

const changedSink = clone(baseEnvelope);
changedSink.sink_ref = "sink_ref:another_public_destination";

const changedTransform = clone(baseEnvelope);
changedTransform.transformations = [
  {
    ref: "transform_ref:summarize:sql_result",
    type: "summary",
    reversible: false,
    reduces_sensitivity: false,
    declassification_ref: null,
  },
];

const changedSourceLabels = clone(baseEnvelope);
changedSourceLabels.data_labels = ["public"];

const changedDestinationTrust = clone(baseEnvelope);
changedDestinationTrust.destination_trust = "internal";

const bindingChecks = [
  {
    scenario: "unchanged-flow",
    expected: "receipt remains applicable",
    ...checkReceiptApplicability(baseReceipt, clone(baseEnvelope)),
  },
  {
    scenario: "changed-sink",
    expected: "old receipt no longer applies",
    ...checkReceiptApplicability(baseReceipt, changedSink),
  },
  {
    scenario: "changed-transformation",
    expected: "old receipt no longer applies",
    ...checkReceiptApplicability(baseReceipt, changedTransform),
  },
  {
    scenario: "changed-source-labels",
    expected: "old receipt no longer applies",
    ...checkReceiptApplicability(baseReceipt, changedSourceLabels),
  },
  {
    scenario: "changed-destination-trust",
    expected: "old receipt no longer applies",
    ...checkReceiptApplicability(baseReceipt, changedDestinationTrust),
  },
];

const failureClasses = [...new Set(results.map((result) => result.failure_class))].sort();
const decisions = results.reduce((counts, result) => {
  const decision = result.decision_receipt.decision;
  counts[decision] = (counts[decision] ?? 0) + 1;
  return counts;
}, {});

const output = {
  ok: true,
  proof: "flow-aware-authority-gate-proof",
  version: "0.1",
  mode: "local_dry_run_flow_gate_no_downstream_execution",
  command: "npm run proof:flow-aware-authority -- --dry-run --json",
  thesis:
    "Authority must bind not only to the tool call, but to the source, transformation, destination, purpose, policy, and evidence of the flow.",
  pattern: [
    "runtime/tool invocation",
    "source refs",
    "transformation refs",
    "sink/destination refs",
    "purpose and authority refs",
    "Flow-Aware Action Card",
    "Decision Receipt",
    "developer-owned execution",
  ],
  attribution: publicAttributionSummary(attribution),
  binding_fields: FLOW_BINDING_FIELDS,
  count: results.length,
  decisions,
  failure_classes: failureClasses,
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
    full_runtime_taint_tracking_claim: false,
    all_possible_scenarios_claim: false,
    public_distribution_action: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Flow-Aware Authority Gate Proof v0.1");
  console.log("");
  console.log(output.thesis);
  console.log("");
  for (const result of results) {
    console.log(`${result.scenario}`);
    console.log(`  Flow: ${transformationSummary(result.flow_invocation_envelope.transformations)} -> ${result.flow_invocation_envelope.sink_ref}`);
    console.log(`  Decision: ${result.decision_receipt.decision}`);
    console.log(`  Failure class: ${result.failure_class}`);
    console.log(`  Receipt: ${result.decision_receipt.receipt_ref}`);
  }
  console.log("");
  console.log("Changed source, transform, sink, or destination trust invalidates the old receipt.");
  console.log("Neura returns the decision record. The developer runtime owns execution.");
}
