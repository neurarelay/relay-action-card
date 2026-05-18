#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRelayAttribution,
  publicAttributionSummary,
} from "../lib/activation-attribution.mjs";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const manifestPath = join(exampleDir, "manifest.json");
const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const dryRun = argv.includes("--dry-run") || !argv.includes("--live");
const listOnly = argv.includes("--list");

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function compactId(prefix, value) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return `${prefix}_${hash.toString(16).padStart(8, "0")}`;
}

function includesValue(values, value) {
  return Array.isArray(values) && values.includes(value);
}

function activeAuthority(authority) {
  return (
    authority?.revocationStatus === "active" &&
    typeof authority.expiresAt === "string" &&
    authority.expiresAt > "2026-05-18T00:00:00Z"
  );
}

function evaluateActionCard(actionCard) {
  const authority = actionCard.context?.authorityContext ?? {};
  const evidenceRefs = actionCard.context?.evidenceRefs ?? [];
  const ruleRefs = actionCard.context?.ruleRefs ?? [];
  const missingRefs = actionCard.context?.missingRefs ?? [];
  const actionType = actionCard.proposedAction?.type;
  const target = actionCard.proposedAction?.target;
  const actionAllowed = includesValue(authority.allowedActions, actionType);
  const targetAllowed = includesValue(authority.allowedResources, target);
  const authorityReady = activeAuthority(authority);
  const refsReady = evidenceRefs.length > 0 && ruleRefs.length > 0;

  if (!actionAllowed || !targetAllowed) {
    return {
      route: "stop",
      decision: "stop",
      reason: "The orchestrated tool action exceeds the delegated authority scope or target refs.",
      nextStep: "Do not call the runtime tool. Create a new Action Card with valid authority refs.",
      executionState: "blocked_before_runtime_tool_call",
      pressure: "authority_scope",
      factorStatus: {
        identity: "ready",
        authority: "blocked",
        policy: ruleRefs.length ? "present" : "missing",
        evidence: evidenceRefs.length ? "present" : "missing",
      },
    };
  }

  if (!authorityReady || authority.reviewRequiredWhenMissingOrChanged === true) {
    return {
      route: "human_review",
      decision: "human_review",
      reason: "The action may be valid, but authority changed or expired before a high-impact tool call.",
      nextStep: "Attach receipt refs to the runner event and route to a human operator before execution.",
      executionState: "held_for_operator_before_runtime_tool_call",
      pressure: "authority_change",
      factorStatus: {
        identity: "ready",
        authority: "review_required",
        policy: ruleRefs.length ? "present" : "missing",
        evidence: evidenceRefs.length ? "present" : "missing",
      },
    };
  }

  if (!refsReady || missingRefs.length > 0 || /elevated/.test(actionCard.context?.riskCategory ?? "")) {
    return {
      route: "revise",
      decision: "revise",
      reason: "The tool call needs stronger policy or evidence refs before it can become executable.",
      nextStep: "Revise the Action Card and retry the runner step with complete refs.",
      executionState: "revision_required_before_runtime_tool_call",
      pressure: "policy_evidence",
      factorStatus: {
        identity: "ready",
        authority: "ready",
        policy: missingRefs.length ? "incomplete" : "present",
        evidence: missingRefs.length ? "incomplete" : "present",
      },
    };
  }

  return {
    route: "proceed",
    decision: "proceed",
    reason: "Identity, authority, policy, evidence, and target refs align for this runtime-owned tool action.",
    nextStep: "Proceed only in the developer-owned runtime while preserving receipt and trace refs.",
    executionState: "authorized_for_runtime_owned_execution",
    pressure: "ready",
    factorStatus: {
      identity: "ready",
      authority: "ready",
      policy: "ready",
      evidence: "ready",
    },
  };
}

function buildProofResult({ scenario, actionCard, evaluation, attribution }) {
  const seed = `${scenario.id}:${scenario.tool}:${actionCard.proposedAction.type}:${actionCard.proposedAction.target}:${evaluation.decision}`;
  const receiptRef = compactId("receipt_ref_demo", seed);
  const traceRef = compactId("trace_ref_demo", seed);
  const transactionRef = compactId("relay_txn_demo", seed);
  const runner = actionCard.context.adkStyleRunner;
  const mcpTool = actionCard.context.mcpTool;
  const attributionSummary = publicAttributionSummary(attribution);

  return {
    scenario: scenario.id,
    action_card_path: scenario.path,
    adk_style_runner_event: {
      runner_ref: runner.runnerRef,
      event_ref: runner.eventRef,
      event_type: "tool_call_proposed",
      orchestration_posture: runner.orchestrationPosture,
      proposed_tool: mcpTool.toolName,
      proposed_target_ref: actionCard.proposedAction.target,
      attribution: attributionSummary,
    },
    action_card: {
      version: actionCard.version,
      agent_ref: actionCard.agent.id,
      capability_version_ref: actionCard.agent.capabilityVersion,
      proposed_action: actionCard.proposedAction.type,
      target_ref: actionCard.proposedAction.target,
      evidence_refs: actionCard.context.evidenceRefs,
      rule_refs: actionCard.context.ruleRefs,
      authority_scope_ref: actionCard.context.authorityContext.authorityScopeRef,
      standing_ref: actionCard.context.authorityContext.standingRef,
      refs_only: true,
    },
    decision_receipt: {
      receipt_ref: receiptRef,
      receipt_id: receiptRef,
      trace_ref: traceRef,
      transaction_ref: transactionRef,
      decision: evaluation.decision,
      route: evaluation.route,
      reason: evaluation.reason,
      recommended_next_step: evaluation.nextStep,
      authority_layer: "neura",
      decision_factors: {
        identity_check: { status: evaluation.factorStatus.identity },
        authority_check: { status: evaluation.factorStatus.authority },
        policy_check: { status: evaluation.factorStatus.policy },
        evidence_check: { status: evaluation.factorStatus.evidence },
        risk_check: { status: evaluation.pressure },
      },
      attribution: attributionSummary,
      refs_only: true,
    },
    mcp_tool_event_after_receipt: {
      server_ref: mcpTool.serverRef,
      tool_name: mcpTool.toolName,
      tool_call_ref: mcpTool.toolCallRef,
      runtime_owner: mcpTool.runtimeOwner,
      execution_route: "runtime_owned_after_neura_receipt",
      execution_state: evaluation.executionState,
      attached_receipt_ref: receiptRef,
      attached_trace_ref: traceRef,
      attached_decision: evaluation.decision,
      attribution: attributionSummary,
      tool_call_executed_in_dry_run: false,
      neura_executed_tool_call: false,
    },
    trace: {
      trace_ref: traceRef,
      events: [
        "adk_style_runner_proposed_tool_call",
        "action_card_created",
        "neura_relay_decision_receipt_returned",
        "receipt_refs_attached_to_mcp_tool_event",
        "runtime_execution_remains_developer_owned",
      ],
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
    },
    boundaries: {
      refs_only: true,
      private_payload_persisted: false,
      downstream_execution_by_neura: false,
      runtime_owned_execution: true,
      provider_integration_claim: false,
      directory_listing_claim: false,
      endorsement_or_partnership_claim: false,
    },
  };
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const only = argValue("only");
const scenarios = only
  ? manifest.examples.filter((scenario) => scenario.id === only)
  : manifest.examples;

if (listOnly) {
  const output = manifest.examples.map(({ id, family, tool, path }) => ({
    id,
    family,
    tool,
    path,
  }));
  console.log(jsonOutput ? JSON.stringify(output, null, 2) : output.map((item) => item.id).join("\n"));
  process.exit(0);
}

if (only && scenarios.length === 0) {
  console.error(`Unknown MCP + ADK Authority scenario: ${only}`);
  console.error(`Available scenarios: ${manifest.examples.map((scenario) => scenario.id).join(", ")}`);
  process.exit(1);
}

if (!dryRun) {
  console.error("Live mode is intentionally not implemented for this proof packet. Use --dry-run.");
  process.exit(1);
}

const attribution = buildRelayAttribution({
  argv,
  env: {
    ...process.env,
    NEURA_SESSION_REF: process.env.NEURA_SESSION_REF ?? "mcp_adk_authority_session:dry_run",
  },
  defaultSource: "ibm_mcp_adk_video",
  defaultCampaign: "mcp_adk_authority_layer",
  defaultSurface: "examples/mcp-adk-authority/run-proof",
});

const results = [];

for (const scenario of scenarios) {
  const actionCard = JSON.parse(await readFile(join(repoRoot, scenario.path), "utf8"));
  const evaluation = evaluateActionCard(actionCard);
  results.push(buildProofResult({ scenario, actionCard, evaluation, attribution }));
}

const output = {
  ok: true,
  proof: manifest.name,
  version: manifest.version,
  mode: "local_dry_run_no_provider_runtime_no_downstream_execution",
  command: "npm run proof:mcp-adk-authority -- --dry-run --json",
  thesis: manifest.thesis,
  pattern: manifest.pattern,
  count: results.length,
  attribution: publicAttributionSummary(attribution),
  results,
  boundaries: manifest.boundaries,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("MCP + ADK Authority Layer Proof v0.1");
  console.log("");
  console.log(manifest.thesis);
  console.log("");
  for (const result of results) {
    console.log(`${result.scenario}`);
    console.log(`  Tool: ${result.adk_style_runner_event.proposed_tool}`);
    console.log(`  Decision: ${result.decision_receipt.decision}`);
    console.log(`  Receipt: ${result.decision_receipt.receipt_ref}`);
    console.log(`  Trace: ${result.decision_receipt.trace_ref}`);
    console.log(`  Runtime route: ${result.mcp_tool_event_after_receipt.execution_state}`);
  }
  console.log("");
  console.log("Neura returns pre-action receipt refs. The developer runtime owns tool execution.");
}
