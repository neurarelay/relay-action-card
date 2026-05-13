#!/usr/bin/env node

import { createNeuraPreflightAdapter } from "./preflight-adapter/adapter.mjs";

const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const dryRun = !process.argv.includes("--live");
const jsonOutput = process.argv.includes("--json");

const baseAuthority = {
  delegatedBy: "user_ref_local_operator",
  actingAgent: "11de8d9a-7e1e-42f9-86ae-5f9c26878624",
  expiresAt: "2026-12-31T23:59:59Z",
  revocationStatus: "active",
  standingRef: "registry_passport_standing_ref_demo",
};

const scenarios = [
  {
    id: "send-customer-message",
    developerProblem: "An autonomous agent wants to send an external customer message.",
    severeFailurePrevented: "Unreviewed customer communication leaves the developer runtime.",
    preflightAction: {
      family: "outbound_message",
      proposedAction: {
        type: "message.send",
        summary: "Send a support follow-up only after intent, recipient, and policy refs are reviewed.",
        target: "channel_message_ref:support_followup_2026_05_12",
      },
      affectedObject: "channel_message_ref:support_followup_2026_05_12",
      authority: {
        ...baseAuthority,
        authorityScope: "support_channel_response",
        allowedActions: ["message.send"],
        allowedResources: ["channel_message_ref:support_followup_2026_05_12"],
        policyRefs: ["policy_ref_customer_reply_review"],
        authorityScopeRef: "authority_scope_ref_support_channel",
      },
      evidenceRefs: ["intent_ref_support_followup", "recipient_ref_support_followup"],
      ruleRefs: ["policy_ref_customer_reply_review"],
      riskCategory: "customer_communication",
    },
  },
  {
    id: "delete-local-file",
    developerProblem: "A computer-use agent wants to delete a local project file.",
    severeFailurePrevented: "A generated agent removes source or user data before authority is checked.",
    preflightAction: {
      family: "file_operation",
      proposedAction: {
        type: "file.delete",
        summary: "Delete a local build artifact only after path, authority, and retention refs are reviewed.",
        target: "file_ref:project_artifacts/tmp/generated-report.csv",
      },
      affectedObject: "file_ref:project_artifacts/tmp/generated-report.csv",
      authority: {
        ...baseAuthority,
        authorityScope: "workspace_file_cleanup",
        allowedActions: ["file.delete"],
        allowedResources: ["file_ref:project_artifacts/tmp/generated-report.csv"],
        policyRefs: ["policy_ref_workspace_file_retention"],
        authorityScopeRef: "authority_scope_ref_workspace_file_cleanup",
      },
      evidenceRefs: ["path_ref_generated_artifact", "retention_ref_tmp_artifact"],
      ruleRefs: ["policy_ref_workspace_file_retention"],
      riskCategory: "local_file_mutation",
    },
  },
  {
    id: "publish-package",
    developerProblem: "An autonomous coding agent wants to publish a package.",
    severeFailurePrevented: "A package or plugin ships publicly without release authority and evidence.",
    preflightAction: {
      family: "package_release",
      proposedAction: {
        type: "package.publish",
        summary: "Publish a package only after version, provenance, and approval refs are reviewed.",
        target: "package_ref:@neurarelay/openclaw-preflight-adapter@0.1.1",
      },
      affectedObject: "package_ref:@neurarelay/openclaw-preflight-adapter@0.1.1",
      authority: {
        ...baseAuthority,
        authorityScope: "controlled_package_release",
        allowedActions: ["package.publish"],
        allowedResources: ["package_ref:@neurarelay/openclaw-preflight-adapter@0.1.1"],
        policyRefs: ["policy_ref_release_approval", "policy_ref_claim_boundary_review"],
        authorityScopeRef: "authority_scope_ref_package_release",
      },
      evidenceRefs: ["ci_ref_release_green", "npm_pack_ref_clean", "approval_ref_release_owner"],
      ruleRefs: ["policy_ref_release_approval", "policy_ref_claim_boundary_review"],
      riskCategory: "public_distribution",
    },
  },
];

const adapter = createNeuraPreflightAdapter({ relayBaseUrl });
const results = [];

for (const scenario of scenarios) {
  const result = await adapter.beforeAction(scenario.preflightAction, { dryRun });
  results.push({
    id: scenario.id,
    developer_problem: scenario.developerProblem,
    severe_failure_prevented: scenario.severeFailurePrevented,
    mode: result.mode,
    execution_owner: result.execution_owner,
    action_type: result.action_card.proposedAction.type,
    target: result.action_card.proposedAction.target,
    risk_category: result.action_card.context.riskCategory,
    route: dryRun ? result.route : result.receipt.route,
    decision: dryRun ? null : result.receipt.decision,
    receipt_id: dryRun ? null : result.receipt.receipt_id,
    trace_ref: dryRun ? null : result.receipt.trace_ref,
    relay_call_skipped: dryRun ? result.relay_call_skipped : false,
  });
}

const output = {
  ok: true,
  demo: "openclaw-five-minute-receipt-demo",
  mode: dryRun ? "dry_run" : "live_receipt",
  relay: dryRun ? null : relayBaseUrl,
  summary: {
    scenarios: results.length,
    route: dryRun
      ? "relay_receipt_required_before_execution"
      : "decision_receipts_returned_before_execution",
    developer_owned_execution: true,
    refs_only: true,
  },
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
  console.log("OpenClaw-style 5-minute Neura receipt demo");
  console.log(`Mode: ${output.mode}`);
  for (const result of results) {
    console.log("");
    console.log(`${result.id}`);
    console.log(`Problem: ${result.developer_problem}`);
    console.log(`Prevents: ${result.severe_failure_prevented}`);
    console.log(`Action: ${result.action_type}`);
    console.log(`Risk: ${result.risk_category}`);
    console.log(`Route: ${result.route}`);
    if (result.receipt_id) {
      console.log(`Receipt: ${result.receipt_id}`);
      console.log(`Trace: ${result.trace_ref}`);
    }
  }
  console.log("");
  console.log("Neura returns the receipt route. The developer runtime keeps execution ownership.");
}
