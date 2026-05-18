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

const PLACEMENTS = [
  "before_consensus_proposal",
  "proposal_result_metadata",
  "before_broadcast_dispatch",
  "before_worker_tool_execution",
  "before_memory_write_or_federation_message",
];

const BINDING_FIELDS = [
  "call_ref",
  "swarm_ref",
  "coordinator_ref",
  "runtime_ref",
  "placement",
  "stage_ref",
  "proposal_ref",
  "consensus_ref",
  "broadcast_ref",
  "worker_ref",
  "tool_ref",
  "memory_ref",
  "federation_ref",
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

function compactRef(prefix, value) {
  return `${prefix}_${sha256(stableJson(value)).slice(0, 16)}`;
}

function paramsHash(seed) {
  return `sha256:${sha256(`swarm-authority-placement:${seed}`)}`;
}

function bindingSnapshot(envelope) {
  return Object.fromEntries(BINDING_FIELDS.map((field) => [field, envelope[field] ?? null]));
}

function bindingHash(envelope) {
  return `sha256:${sha256(stableJson(bindingSnapshot(envelope)))}`;
}

function deriveActionCardFromSwarmEnvelope(envelope) {
  const envelopeHash = bindingHash(envelope);

  return {
    version: "0.1",
    action_card_ref: compactRef("action_card_ref_swarm_authority", envelope),
    derived_from: "swarm_runtime_invocation_envelope",
    derived_from_call_ref: envelope.call_ref,
    proposed_action: {
      action_ref: envelope.action_ref,
      target_ref: envelope.target_ref,
      params_hash: envelope.params_hash,
      placement: envelope.placement,
    },
    swarm_binding: {
      call_ref: envelope.call_ref,
      swarm_ref: envelope.swarm_ref,
      coordinator_ref: envelope.coordinator_ref,
      runtime_ref: envelope.runtime_ref,
      placement: envelope.placement,
      stage_ref: envelope.stage_ref,
      proposal_ref: envelope.proposal_ref,
      consensus_ref: envelope.consensus_ref,
      broadcast_ref: envelope.broadcast_ref,
      worker_ref: envelope.worker_ref,
      tool_ref: envelope.tool_ref,
      memory_ref: envelope.memory_ref,
      federation_ref: envelope.federation_ref,
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
      valid_only_for_exact_swarm_stage: true,
    },
    context: {
      source: envelope.source,
      campaign: envelope.campaign,
      surface: envelope.surface,
      policy_context_ref: envelope.policy_context_ref,
      evidence_refs: envelope.evidence_refs,
    },
    refs_only: true,
  };
}

function evaluateSwarmActionCard(actionCard) {
  const placement = actionCard.swarm_binding.placement;
  const action = actionCard.proposed_action.action_ref;

  if (placement === "before_worker_tool_execution" && action.includes("worker_tool.execute")) {
    return {
      decision: "stop",
      route: "stop",
      reason: "The worker tool execution is blocked until tool scope, target, and operator authority refs are repaired.",
      runtime_route: "stop_before_worker_tool_execution",
    };
  }

  if (placement === "before_broadcast_dispatch") {
    return {
      decision: "human_review",
      route: "human_review",
      reason: "Broadcast or worker dispatch can fan out side effects and needs operator review before runtime dispatch.",
      runtime_route: "route_to_human_review_before_broadcast_or_dispatch",
    };
  }

  if (placement === "before_memory_write_or_federation_message") {
    return {
      decision: "human_review",
      route: "human_review",
      reason: "Memory write or federation message needs retention, destination, and trust-boundary refs before runtime execution.",
      runtime_route: "route_to_human_review_before_memory_or_federation_boundary",
    };
  }

  if (placement === "before_consensus_proposal") {
    return {
      decision: "revise",
      route: "revise",
      reason: "The consensus proposal needs stronger proposal-scope and quorum evidence refs before the swarm runtime proceeds.",
      runtime_route: "revise_before_consensus_proposal",
    };
  }

  return {
    decision: "proceed",
    route: "proceed",
    reason: "The proposal/result metadata is refs-only, bound to the swarm stage, and ready for runtime-owned continuation.",
    runtime_route: "ready_for_runtime_owned_metadata_attachment",
  };
}

function buildDecisionReceipt(actionCard, evaluation) {
  const binding = actionCard.swarm_binding;
  const receiptSeed = {
    envelope_hash: binding.envelope_hash,
    placement: binding.placement,
    decision: evaluation.decision,
  };

  return {
    receipt_ref: compactRef("receipt_ref_swarm_authority", receiptSeed),
    receipt_id: compactRef("receipt_ref_swarm_authority", receiptSeed),
    trace_ref: compactRef("trace_ref_swarm_authority", binding.envelope_hash),
    transaction_ref: compactRef("relay_txn_swarm_authority", receiptSeed),
    decision: evaluation.decision,
    route: evaluation.route,
    reason: evaluation.reason,
    authority_layer: "neura",
    binding: {
      call_ref: binding.call_ref,
      placement: binding.placement,
      envelope_hash: binding.envelope_hash,
      bound_refs: Object.fromEntries(BINDING_FIELDS.map((field) => [field, binding[field] ?? null])),
      binding_fields: BINDING_FIELDS,
      valid_only_for_exact_swarm_stage: true,
    },
    refs_only: true,
    private_payload_persisted: false,
    downstream_execution_by_neura: false,
  };
}

function buildRuntimeRoute(receipt, evaluation) {
  return {
    route_owner: "swarm_runtime",
    route: evaluation.route,
    runtime_route: evaluation.runtime_route,
    receipt_ref: receipt.receipt_ref,
    trace_ref: receipt.trace_ref,
    swarm_runtime_must_recheck_binding_before_execution: true,
    runtime_owns_execution_decision: true,
    worker_dispatched_in_dry_run: false,
    tool_executed_in_dry_run: false,
    memory_written_in_dry_run: false,
    federation_message_sent_in_dry_run: false,
    execution_performed_by_neura: false,
  };
}

const attribution = buildRelayAttribution({
  argv,
  env: {
    ...process.env,
    NEURA_SESSION_REF: process.env.NEURA_SESSION_REF ?? "swarm_authority_placement:dry_run",
  },
  defaultSource: "swarm_runtime",
  defaultCampaign: "swarm_authority_placement_proof",
  defaultSurface: "examples/swarm-authority-placement/run-proof",
});

const source = attribution.neura_source ?? "swarm_runtime";
const campaign = attribution.neura_campaign ?? "swarm_authority_placement_proof";
const surface = attribution.neura_surface ?? "examples/swarm-authority-placement/run-proof";

const swarmEnvelopes = [
  {
    id: "before-consensus-proposal",
    title: "Consensus proposal before swarm agreement",
    call_ref: "call_ref:swarm_authority:consensus_proposal:001",
    swarm_ref: "swarm_ref:local_swarm_runtime:dry_run",
    coordinator_ref: "coordinator_ref:swarm_planner",
    runtime_ref: "runtime_ref:swarm_runtime:local_dry_run",
    placement: "before_consensus_proposal",
    stage_ref: "stage_ref:proposal_intake",
    proposal_ref: "proposal_ref:namespace_change_candidate",
    consensus_ref: "consensus_ref:pending_quorum",
    broadcast_ref: null,
    worker_ref: null,
    tool_ref: null,
    memory_ref: null,
    federation_ref: null,
    action_ref: "swarm.consensus.propose",
    target_ref: "target_ref:publisher_namespace_change_candidate",
    params_hash: paramsHash("consensus_proposal:namespace_change_candidate"),
    policy_context_ref: "policy_context_ref:swarm_consensus:needs_quorum_scope",
    evidence_refs: ["evidence_ref:proposal_summary", "evidence_ref:no_provider_claim_boundary"],
    source,
    campaign,
    surface,
  },
  {
    id: "proposal-result-metadata",
    title: "Decision receipt attached as proposal/result metadata",
    call_ref: "call_ref:swarm_authority:proposal_metadata:001",
    swarm_ref: "swarm_ref:local_swarm_runtime:dry_run",
    coordinator_ref: "coordinator_ref:swarm_planner",
    runtime_ref: "runtime_ref:swarm_runtime:local_dry_run",
    placement: "proposal_result_metadata",
    stage_ref: "stage_ref:result_metadata_attach",
    proposal_ref: "proposal_ref:read_only_research_task",
    consensus_ref: "consensus_ref:quorum_refs_only",
    broadcast_ref: null,
    worker_ref: null,
    tool_ref: null,
    memory_ref: null,
    federation_ref: null,
    action_ref: "swarm.proposal.attach_decision_metadata",
    target_ref: "target_ref:proposal_result:read_only_research_task",
    params_hash: paramsHash("proposal_result_metadata:read_only_research_task"),
    policy_context_ref: "policy_context_ref:swarm_metadata:refs_only",
    evidence_refs: ["evidence_ref:consensus_result", "evidence_ref:receipt_metadata_scope"],
    source,
    campaign,
    surface,
  },
  {
    id: "before-broadcast-dispatch",
    title: "Broadcast before worker dispatch",
    call_ref: "call_ref:swarm_authority:broadcast_dispatch:001",
    swarm_ref: "swarm_ref:local_swarm_runtime:dry_run",
    coordinator_ref: "coordinator_ref:swarm_dispatcher",
    runtime_ref: "runtime_ref:swarm_runtime:local_dry_run",
    placement: "before_broadcast_dispatch",
    stage_ref: "stage_ref:broadcast_before_dispatch",
    proposal_ref: "proposal_ref:multi_worker_update",
    consensus_ref: "consensus_ref:quorum_for_worker_fanout",
    broadcast_ref: "broadcast_ref:worker_fanout_candidate",
    worker_ref: "worker_ref:all_workers",
    tool_ref: null,
    memory_ref: null,
    federation_ref: null,
    action_ref: "swarm.broadcast.dispatch_workers",
    target_ref: "target_ref:worker_group:production_ops",
    params_hash: paramsHash("broadcast_dispatch:production_ops"),
    policy_context_ref: "policy_context_ref:worker_dispatch:fanout_review",
    evidence_refs: ["evidence_ref:worker_fanout_plan", "evidence_ref:operator_review_required"],
    source,
    campaign,
    surface,
  },
  {
    id: "before-worker-tool-execution",
    title: "Worker tool execution checkpoint",
    call_ref: "call_ref:swarm_authority:worker_tool_execution:001",
    swarm_ref: "swarm_ref:local_swarm_runtime:dry_run",
    coordinator_ref: "coordinator_ref:swarm_dispatcher",
    runtime_ref: "runtime_ref:swarm_runtime:local_dry_run",
    placement: "before_worker_tool_execution",
    stage_ref: "stage_ref:worker_before_tool_call",
    proposal_ref: "proposal_ref:external_account_action",
    consensus_ref: "consensus_ref:worker_tool_scope_unverified",
    broadcast_ref: "broadcast_ref:worker_specific_task",
    worker_ref: "worker_ref:account_action_worker",
    tool_ref: "tool_ref:external_account.update",
    memory_ref: null,
    federation_ref: null,
    action_ref: "swarm.worker_tool.execute",
    target_ref: "target_ref:external_account:settings_change",
    params_hash: paramsHash("worker_tool_execution:external_account_settings"),
    policy_context_ref: "policy_context_ref:worker_tool:blocked_without_scope",
    evidence_refs: ["evidence_ref:worker_task_ref", "evidence_ref:no_downstream_execution_boundary"],
    source,
    campaign,
    surface,
  },
  {
    id: "before-memory-federation",
    title: "Memory write or federation message checkpoint",
    call_ref: "call_ref:swarm_authority:memory_federation:001",
    swarm_ref: "swarm_ref:local_swarm_runtime:dry_run",
    coordinator_ref: "coordinator_ref:swarm_memory_router",
    runtime_ref: "runtime_ref:swarm_runtime:local_dry_run",
    placement: "before_memory_write_or_federation_message",
    stage_ref: "stage_ref:memory_or_federation_boundary",
    proposal_ref: "proposal_ref:shared_memory_update",
    consensus_ref: "consensus_ref:memory_retention_review",
    broadcast_ref: "broadcast_ref:federation_candidate",
    worker_ref: "worker_ref:memory_writer",
    tool_ref: null,
    memory_ref: "memory_ref:shared_swarm_memory",
    federation_ref: "federation_ref:peer_swarm_message",
    action_ref: "swarm.memory.write_or_federate",
    target_ref: "target_ref:shared_memory_and_peer_swarm",
    params_hash: paramsHash("memory_federation:shared_memory_peer_swarm"),
    policy_context_ref: "policy_context_ref:memory_federation:retention_and_trust_boundary",
    evidence_refs: ["evidence_ref:memory_scope", "evidence_ref:federation_destination_ref"],
    source,
    campaign,
    surface,
  },
];

const only = argValue("only");
const selectedEnvelopes = only
  ? swarmEnvelopes.filter((envelope) => envelope.id === only)
  : swarmEnvelopes;

if (listOnly) {
  const output = swarmEnvelopes.map(({ id, title, placement, action_ref }) => ({
    id,
    title,
    placement,
    action_ref,
  }));
  console.log(jsonOutput ? JSON.stringify(output, null, 2) : output.map((item) => item.id).join("\n"));
  process.exit(0);
}

if (only && selectedEnvelopes.length === 0) {
  console.error(`Unknown Swarm Authority Placement scenario: ${only}`);
  console.error(`Available scenarios: ${swarmEnvelopes.map((envelope) => envelope.id).join(", ")}`);
  process.exit(1);
}

if (!dryRun) {
  console.error("Live mode is intentionally not implemented for this proof packet. Use --dry-run.");
  process.exit(1);
}

const results = selectedEnvelopes.map((envelope) => {
  const actionCard = deriveActionCardFromSwarmEnvelope(envelope);
  const evaluation = evaluateSwarmActionCard(actionCard);
  const receipt = buildDecisionReceipt(actionCard, evaluation);

  return {
    scenario: envelope.id,
    title: envelope.title,
    placement: envelope.placement,
    swarm_runtime_envelope: {
      ...envelope,
      captured_at: envelope.placement,
      refs_only: true,
      params_hash_only: true,
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
      runtime_execution_performed_in_dry_run: false,
    },
    action_card: actionCard,
    decision_receipt: receipt,
    runtime_owned_route: buildRuntimeRoute(receipt, evaluation),
    trace: {
      trace_ref: receipt.trace_ref,
      events: [
        "swarm_stage_envelope_captured",
        "action_card_derived_from_swarm_runtime_envelope",
        "relay_decision_receipt_bound_to_swarm_stage",
        "swarm_runtime_rechecks_binding_before_execution",
        "swarm_runtime_owns_execution_after_receipt",
      ],
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
    },
    boundaries: {
      refs_only: true,
      local_dry_run: true,
      action_card_derived_from_swarm_runtime_envelope: true,
      receipt_valid_only_for_exact_swarm_stage: true,
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
      runtime_owned_execution: true,
      ruflo_style_pattern_only: true,
      official_ruflo_integration_claim: false,
      ruflo_listing_or_approval_claim: false,
      provider_listing_or_partnership_claim: false,
      endorsement_or_approval_claim: false,
      public_distribution_action: false,
    },
  };
});

const output = {
  ok: true,
  proof: "swarm-authority-placement-proof",
  version: "0.1",
  mode: "local_dry_run_swarm_runtime_pattern_no_downstream_execution",
  command: "npm run proof:swarm-authority-placement -- --dry-run --json",
  thesis:
    "A swarm runtime can place Neura before consensus, metadata attachment, broadcast/dispatch, worker tool execution, memory writes, or federation messages while the runtime keeps execution ownership.",
  pattern: [
    "swarm proposal / consensus / broadcast / worker dispatch / memory write",
    "runtime-bound Action Card",
    "Relay Decision Receipt",
    "receipt_ref / trace_ref",
    "runtime-owned proceed / revise / stop / human_review route",
  ],
  attribution: publicAttributionSummary(attribution),
  placements: PLACEMENTS,
  binding_fields: BINDING_FIELDS,
  count: results.length,
  results,
  boundaries: {
    refs_only: true,
    local_dry_run: true,
    ruflo_style_swarm_runtime_pattern_only: true,
    official_ruflo_integration_claim: false,
    ruflo_listing_or_approval_claim: false,
    private_payload_persisted: false,
    downstream_execution_by_neura: false,
    runtime_owned_execution: true,
    provider_listing_or_partnership_claim: false,
    endorsement_or_approval_claim: false,
    public_distribution_action: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Swarm Authority Placement Proof v0.1");
  console.log("");
  console.log(output.thesis);
  console.log("");
  for (const result of results) {
    console.log(`${result.scenario}`);
    console.log(`  Placement: ${result.placement}`);
    console.log(`  Decision: ${result.decision_receipt.decision}`);
    console.log(`  Receipt: ${result.decision_receipt.receipt_ref}`);
    console.log(`  Trace: ${result.decision_receipt.trace_ref}`);
    console.log(`  Runtime route: ${result.runtime_owned_route.runtime_route}`);
  }
  console.log("");
  console.log("This is a local Ruflo-style / swarm-runtime pattern only. Neura does not execute downstream actions.");
}
