#!/usr/bin/env node

import { createNeuraPreflightAdapter } from "./preflight-adapter/adapter.mjs";

const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const dryRun = !process.argv.includes("--live");
const jsonOutput = process.argv.includes("--json");

const adapter = createNeuraPreflightAdapter({ relayBaseUrl });

const baseAuthority = {
  delegatedBy: "user_ref_local_operator",
  actingAgent: "local_agent_ref:openclaw_style_runtime",
  expiresAt: "2026-12-31T23:59:59Z",
  revocationStatus: "active",
  standingRef: "registry_passport_standing_ref_demo",
};

function buildPreflightAction(toolCall) {
  const shared = {
    family: toolCall.family,
    proposedAction: {
      type: toolCall.type,
      summary: toolCall.summary,
      target: toolCall.targetRef,
    },
    affectedObject: toolCall.targetRef,
    evidenceRefs: toolCall.evidenceRefs,
    ruleRefs: toolCall.ruleRefs,
    riskCategory: toolCall.riskCategory,
  };

  return {
    ...shared,
    authority: {
      ...baseAuthority,
      authorityScope: toolCall.authorityScope,
      allowedActions: [toolCall.type],
      allowedResources: [toolCall.targetRef],
      policyRefs: toolCall.ruleRefs,
      authorityScopeRef: toolCall.authorityScopeRef,
    },
  };
}

function shouldExecute(preflightResult) {
  const route = preflightResult.mode === "dry_run" ? preflightResult.route : preflightResult.receipt.route;
  return route === "ready_for_developer_owned_execution";
}

async function guardToolCall(toolCall) {
  const preflightAction = buildPreflightAction(toolCall);
  const preflight = await adapter.beforeAction(preflightAction, { dryRun });
  const executionAllowed = shouldExecute(preflight);

  return {
    id: toolCall.id,
    type: toolCall.type,
    target_ref: toolCall.targetRef,
    route: preflight.mode === "dry_run" ? preflight.route : preflight.receipt.route,
    decision: preflight.mode === "dry_run" ? null : preflight.receipt.decision,
    receipt_id: preflight.mode === "dry_run" ? null : preflight.receipt.receipt_id,
    trace_ref: preflight.mode === "dry_run" ? null : preflight.receipt.trace_ref,
    execution_owner: preflight.execution_owner,
    execution_attempted: false,
    execution_allowed: executionAllowed,
    next_step: executionAllowed
      ? "developer_runtime_may_execute_local_action"
      : "developer_runtime_must_hold_or_review_before_execution",
  };
}

const toolCalls = [
  {
    id: "before-message-send",
    family: "outbound_message",
    type: "message.send",
    summary: "Send a customer-visible support reply only after recipient, intent, and policy refs are checked.",
    targetRef: "message_ref:support_reply_2026_05_13",
    authorityScope: "support_channel_response",
    authorityScopeRef: "authority_scope_ref_support_channel",
    evidenceRefs: ["intent_ref_support_reply", "recipient_ref_support_contact"],
    ruleRefs: ["policy_ref_customer_reply_review"],
    riskCategory: "customer_communication",
  },
  {
    id: "before-file-delete",
    family: "file_operation",
    type: "file.delete",
    summary: "Delete a generated workspace artifact only after path and retention refs are checked.",
    targetRef: "file_ref:workspace/tmp/generated-export.csv",
    authorityScope: "workspace_file_cleanup",
    authorityScopeRef: "authority_scope_ref_workspace_file_cleanup",
    evidenceRefs: ["path_ref_generated_export", "retention_ref_temp_workspace_file"],
    ruleRefs: ["policy_ref_workspace_file_retention"],
    riskCategory: "local_file_mutation",
  },
  {
    id: "before-package-publish",
    family: "package_release",
    type: "package.publish",
    summary: "Publish a package only after version, provenance, approval, and claim-boundary refs are checked.",
    targetRef: "package_ref:@example/autonomous-agent-plugin@1.0.0",
    authorityScope: "controlled_package_release",
    authorityScopeRef: "authority_scope_ref_package_release",
    evidenceRefs: ["ci_ref_green", "npm_pack_ref_clean", "approval_ref_release_owner"],
    ruleRefs: ["policy_ref_release_approval", "policy_ref_claim_boundary_review"],
    riskCategory: "public_distribution",
  },
];

const results = [];
for (const toolCall of toolCalls) {
  results.push(await guardToolCall(toolCall));
}

const output = {
  ok: true,
  example: "openclaw-copy-paste-agent-integration",
  mode: dryRun ? "dry_run" : "live_receipt",
  relay: dryRun ? null : relayBaseUrl,
  integration_pattern: "guardToolCall(toolCall) -> adapter.beforeAction(preflightAction) -> local execution only if route is ready",
  scenarios: results,
  boundaries: {
    official_openclaw_or_clawhub_claim: false,
    downstream_execution_by_neura: false,
    developer_owned_execution: true,
    private_payload_exposure: false,
    public_token_or_key_issuance: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("OpenClaw-style copy-paste agent integration");
  console.log(`Mode: ${output.mode}`);
  for (const result of results) {
    console.log("");
    console.log(`${result.id}`);
    console.log(`Action: ${result.type}`);
    console.log(`Target: ${result.target_ref}`);
    console.log(`Route: ${result.route}`);
    console.log(`Execution attempted: ${result.execution_attempted}`);
    console.log(`Next step: ${result.next_step}`);
  }
  console.log("");
  console.log("Neura returns the pre-execution route. The developer runtime owns execution.");
}

