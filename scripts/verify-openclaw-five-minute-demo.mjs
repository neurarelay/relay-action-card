#!/usr/bin/env node

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageName = "@neurarelay/openclaw-preflight-adapter";
const failures = [];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`${label}_not_json_${error.message}`);
    return null;
  }
}

function assertScenarioSet(label, payload) {
  const expectedIds = ["send-customer-message", "delete-local-file", "publish-package"];
  const expectedActions = ["message.send", "file.delete", "package.publish"];
  const ids = payload?.scenarios?.map((scenario) => scenario.id) ?? [];
  const actions = payload?.scenarios?.map((scenario) => scenario.action_type) ?? [];

  if (payload?.ok !== true) failures.push(`${label}_not_ok`);
  if (payload?.summary?.developer_owned_execution !== true) {
    failures.push(`${label}_missing_developer_owned_execution`);
  }
  if (payload?.summary?.refs_only !== true) failures.push(`${label}_missing_refs_only`);
  if (payload?.boundaries?.official_openclaw_or_clawhub_claim !== false) {
    failures.push(`${label}_claim_boundary_changed`);
  }
  if (payload?.boundaries?.downstream_execution_by_neura !== false) {
    failures.push(`${label}_downstream_boundary_changed`);
  }
  for (const id of expectedIds) {
    if (!ids.includes(id)) failures.push(`${label}_missing_${id}`);
  }
  for (const action of expectedActions) {
    if (!actions.includes(action)) failures.push(`${label}_missing_action_${action}`);
  }
  for (const scenario of payload?.scenarios ?? []) {
    if (scenario.execution_owner !== "developer_runtime") {
      failures.push(`${label}_${scenario.id}_wrong_execution_owner`);
    }
    if (!scenario.route || !scenario.route.includes("before_execution")) {
      failures.push(`${label}_${scenario.id}_missing_before_execution_route`);
    }
  }
}

const localDemo = run("node", [
  "examples/openclaw/run-five-minute-receipt-demo.mjs",
  "--json",
]);
const localPayload = localDemo.status === 0 ? parseJson("local_demo", localDemo.stdout) : null;
if (localDemo.status !== 0) failures.push(`local_demo_failed_${localDemo.stderr || localDemo.stdout}`);
if (localPayload) assertScenarioSet("local_demo", localPayload);

const consumerDir = mkdtempSync(join(tmpdir(), "neura-openclaw-five-minute-demo-"));
writeFileSync(
  join(consumerDir, "package.json"),
  JSON.stringify({ private: true, type: "module" }, null, 2),
);
writeFileSync(
  join(consumerDir, "proof.mjs"),
  `
import { createNeuraPreflightAdapter } from "${packageName}";

const baseAuthority = {
  delegatedBy: "user_ref_local_operator",
  actingAgent: "11de8d9a-7e1e-42f9-86ae-5f9c26878624",
  expiresAt: "2026-12-31T23:59:59Z",
  revocationStatus: "active",
  standingRef: "registry_passport_standing_ref_demo"
};

const scenarios = [
  {
    id: "send-customer-message",
    preflightAction: {
      proposedAction: {
        type: "message.send",
        summary: "Send a support follow-up only after refs are checked.",
        target: "channel_message_ref:support_followup_2026_05_12"
      },
      authority: {
        ...baseAuthority,
        authorityScope: "support_channel_response",
        allowedActions: ["message.send"],
        allowedResources: ["channel_message_ref:support_followup_2026_05_12"],
        policyRefs: ["policy_ref_customer_reply_review"],
        authorityScopeRef: "authority_scope_ref_support_channel"
      },
      evidenceRefs: ["intent_ref_support_followup"],
      ruleRefs: ["policy_ref_customer_reply_review"],
      riskCategory: "customer_communication"
    }
  },
  {
    id: "delete-local-file",
    preflightAction: {
      proposedAction: {
        type: "file.delete",
        summary: "Delete a generated artifact only after path and retention refs are checked.",
        target: "file_ref:project_artifacts/tmp/generated-report.csv"
      },
      authority: {
        ...baseAuthority,
        authorityScope: "workspace_file_cleanup",
        allowedActions: ["file.delete"],
        allowedResources: ["file_ref:project_artifacts/tmp/generated-report.csv"],
        policyRefs: ["policy_ref_workspace_file_retention"],
        authorityScopeRef: "authority_scope_ref_workspace_file_cleanup"
      },
      evidenceRefs: ["path_ref_generated_artifact"],
      ruleRefs: ["policy_ref_workspace_file_retention"],
      riskCategory: "local_file_mutation"
    }
  },
  {
    id: "publish-package",
    preflightAction: {
      proposedAction: {
        type: "package.publish",
        summary: "Publish a package only after version, provenance, and approval refs are checked.",
        target: "package_ref:@neurarelay/openclaw-preflight-adapter@0.1.1"
      },
      authority: {
        ...baseAuthority,
        authorityScope: "controlled_package_release",
        allowedActions: ["package.publish"],
        allowedResources: ["package_ref:@neurarelay/openclaw-preflight-adapter@0.1.1"],
        policyRefs: ["policy_ref_release_approval", "policy_ref_claim_boundary_review"],
        authorityScopeRef: "authority_scope_ref_package_release"
      },
      evidenceRefs: ["ci_ref_release_green", "npm_pack_ref_clean", "approval_ref_release_owner"],
      ruleRefs: ["policy_ref_release_approval", "policy_ref_claim_boundary_review"],
      riskCategory: "public_distribution"
    }
  }
];

const adapter = createNeuraPreflightAdapter();
const results = [];
for (const scenario of scenarios) {
  const result = await adapter.beforeAction(scenario.preflightAction, { dryRun: true });
  results.push({
    id: scenario.id,
    action_type: result.action_card.proposedAction.type,
    route: result.route,
    execution_owner: result.execution_owner,
    relay_call_skipped: result.relay_call_skipped
  });
}

console.log(JSON.stringify({
  ok: true,
  packageName: "${packageName}",
  mode: "dry_run",
  scenarios: results,
  boundaries: {
    official_openclaw_or_clawhub_claim: false,
    downstream_execution_by_neura: false,
    private_payload_exposure: false
  }
}, null, 2));
`,
);

const install = run("npm", ["install", packageName, "--prefer-online"], { cwd: consumerDir });
if (install.status !== 0) failures.push(`consumer_install_failed_${install.stderr || install.stdout}`);

let consumerPayload = null;
if (install.status === 0) {
  const consumerProof = run("node", ["proof.mjs"], { cwd: consumerDir });
  if (consumerProof.status !== 0) {
    failures.push(`consumer_proof_failed_${consumerProof.stderr || consumerProof.stdout}`);
  } else {
    consumerPayload = parseJson("consumer_proof", consumerProof.stdout);
  }
}

if (consumerPayload) {
  const ids = consumerPayload.scenarios.map((scenario) => scenario.id);
  const actions = consumerPayload.scenarios.map((scenario) => scenario.action_type);
  for (const id of ["send-customer-message", "delete-local-file", "publish-package"]) {
    if (!ids.includes(id)) failures.push(`consumer_missing_${id}`);
  }
  for (const action of ["message.send", "file.delete", "package.publish"]) {
    if (!actions.includes(action)) failures.push(`consumer_missing_action_${action}`);
  }
  for (const scenario of consumerPayload.scenarios) {
    if (scenario.execution_owner !== "developer_runtime") {
      failures.push(`consumer_${scenario.id}_wrong_execution_owner`);
    }
    if (scenario.relay_call_skipped !== true) {
      failures.push(`consumer_${scenario.id}_must_skip_relay_in_dry_run`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-five-minute-demo",
      local_demo: {
        mode: localPayload?.mode,
        scenarios: localPayload?.scenarios?.map((scenario) => ({
          id: scenario.id,
          action_type: scenario.action_type,
          route: scenario.route,
          execution_owner: scenario.execution_owner,
        })),
      },
      clean_consumer: {
        directory: consumerDir,
        install: install.status === 0 ? "passed" : "failed",
        package: packageName,
        scenarios: consumerPayload?.scenarios,
      },
      boundaries: {
        official_openclaw_or_clawhub_claim: false,
        downstream_execution_by_neura: false,
        developer_owned_execution: true,
        private_payload_exposure: false,
        public_token_or_key_issuance: false,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
