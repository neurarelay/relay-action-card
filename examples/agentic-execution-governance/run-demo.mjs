#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const manifestPath = join(exampleDir, "manifest.json");
const jsonOutput = process.argv.includes("--json");
const listOnly = process.argv.includes("--list");

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
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
    authority.expiresAt > "2026-05-16T00:00:00Z"
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
      route: "block",
      decision: "stop",
      reason: "Action exceeds the agent authority scope or targets an unauthorized resource.",
      nextStep: "Stop before execution and create a new Action Card with valid authority refs.",
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
      reason: "Authority is expired, changed, or review-required for this business-impacting action.",
      nextStep: "Route to an operator before the developer-owned runtime executes.",
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
      route: "challenge",
      decision: "revise",
      reason: "Action is plausible, but policy or evidence refs are incomplete for this risk posture.",
      nextStep: "Revise the Action Card with the missing refs before execution.",
      pressure: "policy_evidence",
      factorStatus: {
        identity: "ready",
        authority: "ready",
        policy: ruleRefs.length ? "incomplete" : "missing",
        evidence: missingRefs.length ? "incomplete" : "present",
      },
    };
  }

  return {
    route: "allow",
    decision: "proceed",
    reason: "Identity, authority, policy, evidence, and target refs align for developer-owned execution.",
    nextStep: "Proceed only in the developer-owned runtime while preserving receipt and trace refs.",
    pressure: "ready",
    factorStatus: {
      identity: "ready",
      authority: "ready",
      policy: "ready",
      evidence: "ready",
    },
  };
}

function buildReceipt({ scenario, actionCard, evaluation }) {
  const receiptSeed = `${scenario.id}:${actionCard.proposedAction.type}:${actionCard.proposedAction.target}:${evaluation.decision}`;
  return {
    scenario: scenario.id,
    action_card_path: scenario.path,
    proposed_action: actionCard.proposedAction.type,
    target: actionCard.proposedAction.target,
    route: evaluation.route,
    decision_receipt: {
      receipt_id: compactId("decision_receipt_demo", receiptSeed),
      decision: evaluation.decision,
      reason: evaluation.reason,
      recommended_next_step: evaluation.nextStep,
      trace_ref: compactId("trace_ref_demo", receiptSeed),
      transaction_ref: compactId("relay_txn_demo", receiptSeed),
      decision_factors: {
        identity_check: { status: evaluation.factorStatus.identity },
        authority_check: { status: evaluation.factorStatus.authority },
        policy_check: { status: evaluation.factorStatus.policy },
        evidence_check: { status: evaluation.factorStatus.evidence },
        risk_check: { status: evaluation.pressure },
      },
      authority_context: {
        source: "developer_supplied_refs",
        refs_only: true,
        delegated_by_ref: actionCard.context.authorityContext.delegatedBy,
        authority_scope_ref: actionCard.context.authorityContext.authorityScopeRef,
        standing_ref: actionCard.context.authorityContext.standingRef,
      },
      relay_boundary: "decision_gate_only_developer_keeps_execution",
    },
    trace: {
      trace_ref: compactId("trace_ref_demo", receiptSeed),
      events: [
        "agent_proposed_action",
        "identity_checked",
        "authority_checked",
        "policy_and_evidence_checked",
        `${evaluation.route}_decision_returned`,
      ],
      private_payload_stored: false,
      downstream_execution_performed: false,
    },
    developer_owned_execution: true,
    neura_executed_downstream_action: false,
  };
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const only = argValue("only");
const scenarios = only
  ? manifest.examples.filter((scenario) => scenario.id === only)
  : manifest.examples;

if (listOnly) {
  const output = manifest.examples.map(({ id, family, path }) => ({ id, family, path }));
  console.log(jsonOutput ? JSON.stringify(output, null, 2) : output.map((item) => item.id).join("\n"));
  process.exit(0);
}

if (only && scenarios.length === 0) {
  console.error(`Unknown agentic execution scenario: ${only}`);
  console.error(`Available scenarios: ${manifest.examples.map((scenario) => scenario.id).join(", ")}`);
  process.exit(1);
}

const results = [];

for (const scenario of scenarios) {
  const actionCard = JSON.parse(await readFile(join(repoRoot, scenario.path), "utf8"));
  const evaluation = evaluateActionCard(actionCard);
  results.push(buildReceipt({ scenario, actionCard, evaluation }));
}

const output = {
  ok: true,
  demo: manifest.name,
  version: manifest.version,
  thesis: manifest.thesis,
  loop: [
    "agent proposes action",
    "Neura checks identity / authority / policy / evidence",
    "allow / block / challenge / human_review",
    "Decision Receipt + trace",
    "developer-owned execution",
  ],
  mode: "local_simulated_receipts",
  count: results.length,
  results,
  boundaries: manifest.boundaries,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Agentic Execution Governance Demo v0.1");
  console.log("");
  console.log(manifest.thesis);
  console.log("");
  for (const result of results) {
    console.log(`${result.scenario}`);
    console.log(`  Action: ${result.proposed_action}`);
    console.log(`  Route: ${result.route}`);
    console.log(`  Decision: ${result.decision_receipt.decision}`);
    console.log(`  Receipt: ${result.decision_receipt.receipt_id}`);
    console.log(`  Trace: ${result.trace.trace_ref}`);
    console.log(`  Next: ${result.decision_receipt.recommended_next_step}`);
  }
  console.log("");
  console.log("Neura returns the governed pre-action decision. The developer-owned runtime keeps execution.");
}
