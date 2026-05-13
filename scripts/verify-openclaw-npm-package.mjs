#!/usr/bin/env node

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageName = "@neurarelay/openclaw-preflight-adapter";
const installSpec = process.env.NEURA_OPENCLAW_NPM_SPEC ?? `${packageName}@rc`;
const failures = [];
const warnings = [];

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

function readJson(file) {
  return JSON.parse(readFileSync(join(repoRoot, file), "utf8"));
}

const localPackage = readJson("examples/openclaw/preflight-adapter/package.json");

const view = run("npm", ["view", packageName, "name", "version", "dist-tags", "--json"]);
const registry = view.status === 0 ? parseJson("npm_view", view.stdout) : null;
if (view.status !== 0) failures.push(`npm_view_failed_${view.stderr || view.stdout}`);

if (registry) {
  if (registry.name !== packageName) failures.push("registry_wrong_package_name");
  if (!registry.version?.includes("-rc.")) warnings.push("registry_version_is_not_rc");
  if (!registry["dist-tags"]?.rc?.includes("-rc.")) failures.push("registry_rc_tag_missing");
  if (registry["dist-tags"]?.latest?.includes("-rc.")) {
    warnings.push("registry_latest_points_to_release_candidate_because_no_stable_version_exists");
  }
}

const consumerDir = mkdtempSync(join(tmpdir(), "neura-openclaw-npm-consumer-"));
writeFileSync(
  join(consumerDir, "package.json"),
  JSON.stringify({ private: true, type: "module" }, null, 2),
);
writeFileSync(
  join(consumerDir, "proof.mjs"),
  `
import { createNeuraPreflightAdapter, metadata } from "${packageName}";
import {
  createActionCardFromPreflightAction,
  routeFromDecision
} from "${packageName}/adapter";

const preflightAction = {
  proposedAction: {
    type: "message.send",
    summary: "Send a support follow-up only after refs are checked.",
    target: "channel_message_ref:support_followup_2026_05_12"
  },
  authority: {
    delegatedBy: "user_ref_local_operator",
    actingAgent: "11de8d9a-7e1e-42f9-86ae-5f9c26878624",
    authorityScope: "support_channel_response",
    allowedActions: ["message.send"],
    allowedResources: ["channel_message_ref:support_followup_2026_05_12"],
    expiresAt: "2026-12-31T23:59:59Z",
    revocationStatus: "active",
    policyRefs: ["policy_ref_customer_reply_review"],
    authorityScopeRef: "authority_scope_ref_support_channel",
    standingRef: "registry_passport_standing_ref_demo"
  },
  evidenceRefs: ["intent_ref_support_followup"],
  ruleRefs: ["policy_ref_customer_reply_review"],
  riskCategory: "customer_communication"
};

const card = createActionCardFromPreflightAction(preflightAction);
const adapter = createNeuraPreflightAdapter({ relayBaseUrl: "https://www.neurarelay.com" });
const result = await adapter.beforeAction(preflightAction, { dryRun: true });

if (metadata.packageName !== "${packageName}") {
  throw new Error("package metadata name mismatch");
}
if (card.version !== "0.1" || card.proposedAction.type !== "message.send") {
  throw new Error("Action Card conversion failed");
}
if (result.mode !== "dry_run" || result.relay_call_skipped !== true) {
  throw new Error("dry-run proof failed");
}

console.log(JSON.stringify({
  ok: true,
  packageName: metadata.packageName,
  packageVersion: metadata.version,
  mode: result.mode,
  route: result.route,
  helperRoute: routeFromDecision("human_review"),
  actionCardVersion: card.version,
  executionOwner: result.execution_owner
}, null, 2));
`,
);

const install = run("npm", ["install", installSpec, "--prefer-online"], { cwd: consumerDir });
if (install.status !== 0) {
  failures.push(`clean_consumer_install_failed_${install.stderr || install.stdout}`);
}

let proof = null;
if (install.status === 0) {
  const proofRun = run("node", ["proof.mjs"], { cwd: consumerDir });
  if (proofRun.status !== 0) {
    failures.push(`clean_consumer_proof_failed_${proofRun.stderr || proofRun.stdout}`);
  } else {
    proof = parseJson("clean_consumer_proof", proofRun.stdout);
  }
}

if (proof?.packageVersion && registry?.["dist-tags"]?.rc) {
  if (proof.packageVersion !== registry["dist-tags"].rc) {
    failures.push("installed_version_does_not_match_registry_rc_tag");
  }
}

if (localPackage.name !== packageName) failures.push("local_package_wrong_name");
if (localPackage.openclaw?.install?.npmSpec !== `${packageName}@${localPackage.version}`) {
  failures.push("local_package_install_spec_mismatch");
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-npm-package",
      install_spec: installSpec,
      registry,
      clean_consumer: {
        directory: consumerDir,
        install: install.status === 0 ? "passed" : "failed",
        proof,
      },
      local_package: {
        name: localPackage.name,
        version: localPackage.version,
        npm_spec: localPackage.openclaw?.install?.npmSpec,
      },
      boundaries: {
        official_openclaw_or_clawhub_claim: false,
        downstream_execution_by_neura: false,
        private_payload_exposure: false,
        public_token_or_key_issuance: false,
      },
      warnings,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
