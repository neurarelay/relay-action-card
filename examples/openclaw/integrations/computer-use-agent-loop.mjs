#!/usr/bin/env node

import { createNeuraPreflightAdapter } from "../preflight-adapter/adapter.mjs";

const dryRun = !process.argv.includes("--live");
const jsonOutput = process.argv.includes("--json");
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const adapter = createNeuraPreflightAdapter({ relayBaseUrl });

const baseAuthority = {
  delegatedBy: "user_ref_local_operator",
  actingAgent: "agent_ref:generic_computer_use_loop",
  expiresAt: "2026-12-31T23:59:59Z",
  revocationStatus: "active",
  standingRef: "registry_passport_standing_ref_demo",
};

const plannedActions = [
  {
    id: "draft-support-reply",
    type: "message.send",
    summary: "Send a customer-visible support reply after recipient, intent, and policy refs are checked.",
    targetRef: "message_ref:support_reply_2026_05_13",
    authorityScope: "support_channel_response",
    authorityScopeRef: "authority_scope_ref_support_channel",
    evidenceRefs: ["intent_ref_support_reply", "recipient_ref_support_contact"],
    ruleRefs: ["policy_ref_customer_reply_review"],
    riskCategory: "customer_communication",
  },
  {
    id: "remove-generated-export",
    type: "file.delete",
    summary: "Delete a generated local export only after path and retention refs are checked.",
    targetRef: "file_ref:workspace/tmp/generated-export.csv",
    authorityScope: "workspace_file_cleanup",
    authorityScopeRef: "authority_scope_ref_workspace_file_cleanup",
    evidenceRefs: ["path_ref_generated_export", "retention_ref_temp_workspace_file"],
    ruleRefs: ["policy_ref_workspace_file_retention"],
    riskCategory: "local_file_mutation",
  },
  {
    id: "publish-agent-plugin",
    type: "package.publish",
    summary: "Publish an agent plugin only after version, provenance, approval, and claim refs are checked.",
    targetRef: "package_ref:@example/computer-use-plugin@1.0.0",
    authorityScope: "controlled_package_release",
    authorityScopeRef: "authority_scope_ref_package_release",
    evidenceRefs: ["ci_ref_green", "npm_pack_ref_clean", "approval_ref_release_owner"],
    ruleRefs: ["policy_ref_release_approval", "policy_ref_claim_boundary_review"],
    riskCategory: "public_distribution",
  },
];

function createPreflightAction(action) {
  return {
    proposedAction: {
      type: action.type,
      summary: action.summary,
      target: action.targetRef,
    },
    affectedObject: action.targetRef,
    authority: {
      ...baseAuthority,
      authorityScope: action.authorityScope,
      allowedActions: [action.type],
      allowedResources: [action.targetRef],
      policyRefs: action.ruleRefs,
      authorityScopeRef: action.authorityScopeRef,
    },
    evidenceRefs: action.evidenceRefs,
    ruleRefs: action.ruleRefs,
    riskCategory: action.riskCategory,
  };
}

function routeOf(result) {
  return result.mode === "dry_run" ? result.route : result.receipt.route;
}

async function beforeExecute(action) {
  const result = await adapter.beforeAction(createPreflightAction(action), { dryRun });
  const route = routeOf(result);
  const ready = route === "ready_for_developer_owned_execution";

  return {
    action_id: action.id,
    action_type: action.type,
    target_ref: action.targetRef,
    route,
    decision: result.mode === "dry_run" ? null : result.receipt.decision,
    receipt_id: result.mode === "dry_run" ? null : result.receipt.receipt_id,
    trace_ref: result.mode === "dry_run" ? null : result.receipt.trace_ref,
    execution_owner: result.execution_owner,
    execution_attempted: false,
    loop_state: ready ? "ready_for_runtime_execution" : "paused_before_execution",
    runtime_next_step: ready
      ? "execute_local_action_in_developer_runtime"
      : "hold_for_review_or_registry_backed_authority",
  };
}

const checkpoints = [];
for (const action of plannedActions) {
  checkpoints.push(await beforeExecute(action));
}

const output = {
  ok: true,
  example: "openclaw-generic-computer-use-agent-loop",
  mode: dryRun ? "dry_run" : "live_receipt",
  relay: dryRun ? null : relayBaseUrl,
  loop: {
    planned_actions: plannedActions.length,
    execution_attempted: false,
    execution_owner: "developer_runtime",
  },
  checkpoints,
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
  console.log("Generic computer-use agent loop with Neura preflight receipts");
  console.log(`Mode: ${output.mode}`);
  for (const checkpoint of checkpoints) {
    console.log("");
    console.log(`${checkpoint.action_id}`);
    console.log(`Action: ${checkpoint.action_type}`);
    console.log(`Route: ${checkpoint.route}`);
    console.log(`Loop state: ${checkpoint.loop_state}`);
    console.log(`Execution attempted: ${checkpoint.execution_attempted}`);
  }
  console.log("");
  console.log("The loop pauses before execution unless the route is ready.");
}

