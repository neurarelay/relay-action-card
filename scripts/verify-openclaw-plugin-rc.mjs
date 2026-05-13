#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginRoot = join(repoRoot, "examples/openclaw/preflight-adapter");
const failures = [];

function path(file) {
  return join(repoRoot, file);
}

function read(file) {
  return readFileSync(path(file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function requireFile(file) {
  if (!existsSync(path(file))) failures.push(`missing_${file}`);
}

function requireIncludes(label, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) failures.push(`${label}_missing_${phrase}`);
  }
}

function rejectUnsafe(label, text) {
  const forbidden = [
    "approved by OpenClaw",
    "partnered with OpenClaw",
    "listed on ClawHub",
    "official ClawHub listing",
    "official OpenClaw listing",
    "official OpenAI approval",
    "official Anthropic approval",
    "OpenAI partnership",
    "Anthropic partnership",
    "Claude partnership",
    "enables public API key issuance",
    "enables public production MCP token issuance",
    "enables public A2A token issuance",
    "enables unprotected A2A execution",
    "executes downstream actions by Neura",
    "full Authority Decision Engine is complete",
    "PRIVATE_KEY",
    "SECRET",
    "PASSWORD",
    "token_value",
    "private_payload_value",
    "rawMessageBody",
    "rawFileContents",
    "rawBrowserFormValues",
    "rawShellCommand",
  ];
  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_${phrase}`);
  }
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

function hasCommand(command) {
  const result = spawnSync(command, ["--version"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

const requiredFiles = [
  "docs/openclaw-plugin-release-candidate.md",
  "docs/openclaw-runtime-verification-and-publish-approval.md",
  "docs/openclaw-preflight-adapter.md",
  "examples/openclaw/preflight-adapter/README.md",
  "examples/openclaw/preflight-adapter/openclaw.plugin.json",
  "examples/openclaw/preflight-adapter/package.json",
  "examples/openclaw/preflight-adapter/index.mjs",
  "examples/openclaw/preflight-adapter/adapter.mjs",
  "examples/openclaw/preflight-adapter/fixtures/send-message.preflight.json",
  "examples/openclaw/run-preflight-adapter.mjs",
  "tests/openclaw-preflight-adapter.test.mjs",
  "tests/openclaw-preflight-adapter.e2e.mjs",
  "scripts/verify-openclaw-npm-package.mjs",
  "scripts/verify-openclaw-runtime-approval.mjs",
];

for (const file of requiredFiles) requireFile(file);

const rootPackage = readJson("package.json");
if (rootPackage.engines?.node !== ">=22.14.0") failures.push("root_package_node_engine");

const nvmrc = read(".nvmrc").trim();
if (nvmrc !== "24") failures.push("nvmrc_must_pin_node_24");

const expectedRootScripts = {
  "openclaw:plugin:pack:dry-run":
    "cd examples/openclaw/preflight-adapter && npm pack --dry-run --json",
  "verify:openclaw-plugin-rc": "node scripts/verify-openclaw-plugin-rc.mjs",
  "verify:openclaw-npm-package": "node scripts/verify-openclaw-npm-package.mjs",
  "verify:openclaw-runtime-approval": "node scripts/verify-openclaw-runtime-approval.mjs",
};
for (const [script, command] of Object.entries(expectedRootScripts)) {
  if (rootPackage.scripts?.[script] !== command) {
    failures.push(`root_package_script_${script}_expected_${command}`);
  }
}

const pluginPackage = readJson("examples/openclaw/preflight-adapter/package.json");
if (pluginPackage.name !== "@neurarelay/openclaw-preflight-adapter") {
  failures.push("plugin_package_wrong_name");
}
if (pluginPackage.version !== "0.1.0") failures.push("plugin_package_wrong_version");
if (pluginPackage.private !== false) failures.push("plugin_package_must_be_publish_ready");
if (pluginPackage.type !== "module") failures.push("plugin_package_must_be_esm");
if (pluginPackage.license !== "MIT") failures.push("plugin_package_missing_license");
if (pluginPackage.engines?.node !== ">=22.14.0") failures.push("plugin_package_wrong_node_engine");
if (pluginPackage.publishConfig?.access !== "public") failures.push("plugin_package_publish_access");
if (pluginPackage.publishConfig?.tag !== "latest") failures.push("plugin_package_publish_tag");
if (pluginPackage.dependencies?.["@neurarelay/sdk"] !== "0.1.0") {
  failures.push("plugin_package_missing_sdk_dependency");
}
if (!pluginPackage.files?.includes("openclaw.plugin.json")) {
  failures.push("plugin_package_files_missing_manifest");
}
if (!pluginPackage.files?.includes("fixtures/*.json")) {
  failures.push("plugin_package_files_missing_fixtures");
}
if (!pluginPackage.openclaw?.extensions?.includes("./index.mjs")) {
  failures.push("plugin_package_missing_extension");
}
if (pluginPackage.openclaw?.compat?.pluginApi !== ">=2026.3.24-beta.2") {
  failures.push("plugin_package_wrong_plugin_api");
}
if (pluginPackage.openclaw?.build?.openclawVersion !== "2026.3.24-beta.2") {
  failures.push("plugin_package_wrong_build_version");
}
if (
  pluginPackage.openclaw?.install?.npmSpec !==
  "@neurarelay/openclaw-preflight-adapter@0.1.0"
) {
  failures.push("plugin_package_wrong_install_spec");
}
if (pluginPackage.neura?.releaseCandidateOnly !== false || pluginPackage.neura?.stableRelease !== true) {
  failures.push("plugin_package_missing_stable_release_boundary");
}
if (pluginPackage.neura?.officialOpenClawOrClawHubClaim !== false) {
  failures.push("plugin_package_claim_boundary_missing");
}
if (pluginPackage.neura?.officialSubmissionRequiresRomanApproval !== true) {
  failures.push("plugin_package_missing_roman_approval_gate");
}

const manifest = readJson("examples/openclaw/preflight-adapter/openclaw.plugin.json");
if (manifest.id !== "neura-relay-preflight-adapter") failures.push("manifest_wrong_id");
if (manifest.version !== pluginPackage.version) failures.push("manifest_version_mismatch");
if (!manifest.configSchema || manifest.configSchema.type !== "object") {
  failures.push("manifest_missing_config_schema");
}
if (!manifest.contracts?.tools?.includes("neura_relay_preflight_action")) {
  failures.push("manifest_missing_tool_contract");
}
if (!manifest.tools?.some((tool) => tool?.name === "neura_relay_preflight_action")) {
  failures.push("manifest_missing_clawhub_tool_metadata");
}
if (manifest.kind !== "preflight-governance") {
  failures.push("manifest_missing_preflight_governance_kind");
}
for (const forbiddenManifestField of ["entry", "compat", "build", "capabilities", "neura"]) {
  if (Object.hasOwn(manifest, forbiddenManifestField)) {
    failures.push(`manifest_has_package_or_custom_field_${forbiddenManifestField}`);
  }
}

const releaseDoc = read("docs/openclaw-plugin-release-candidate.md");
requireIncludes("release_doc", releaseDoc, [
  "OpenClaw Plugin Stable Package v0.1",
  "@neurarelay/openclaw-preflight-adapter",
  "0.1.0",
  "npm run openclaw:plugin:pack:dry-run",
  "npm run verify:openclaw-plugin-rc",
  "npm run verify:openclaw-npm-package",
  "npm run verify:openclaw-runtime-approval",
  "Node `24`",
  "clawhub package publish examples/openclaw/preflight-adapter --family code-plugin",
  "No OpenClaw / ClawHub submission or publication has been performed",
  "Roman's explicit approval",
  "https://docs.openclaw.ai/plugins/manifest",
  "https://docs.openclaw.ai/plugins/building-plugins",
  "https://documentation.openclaw.ai/clawhub",
]);
rejectUnsafe("release_doc", releaseDoc);

const approvalDoc = read("docs/openclaw-runtime-verification-and-publish-approval.md");
requireIncludes("approval_doc", approvalDoc, [
  "OpenClaw Runtime Verification And Publish Approval Packet",
  "@neurarelay/openclaw-preflight-adapter@0.1.0",
  "npm run verify:openclaw-npm-package",
  "Use Node `24`",
  "openclaw --profile neura-rc plugins install -l examples/openclaw/preflight-adapter",
  "registered tool: `neura_relay_preflight_action`",
  "ClawHub publish dry-run succeeded",
  "Do not run this without Roman approval",
  "no OpenClaw / ClawHub submission or publication has been performed",
]);
rejectUnsafe("approval_doc", approvalDoc);

const preflightDoc = read("docs/openclaw-preflight-adapter.md");
requireIncludes("preflight_doc", preflightDoc, [
  "docs/openclaw-plugin-release-candidate.md",
  "@neurarelay/openclaw-preflight-adapter",
  "npm run openclaw:plugin:pack:dry-run",
  "Roman approval",
]);
rejectUnsafe("preflight_doc", preflightDoc);

const adapterReadme = read("examples/openclaw/preflight-adapter/README.md");
requireIncludes("adapter_readme", adapterReadme, [
  "@neurarelay/openclaw-preflight-adapter",
  "stable npm install path",
  "@rpelevin/neura-relay-preflight-adapter@0.1.0",
  "neura_relay_preflight_action",
  "npm run openclaw:plugin:pack:dry-run",
  "not an official OpenClaw or ClawHub",
  "hold_for_registry_backed_authority",
]);
rejectUnsafe("adapter_readme", adapterReadme);

const entry = await import("../examples/openclaw/preflight-adapter/index.mjs");
const registered = [];
entry.default.register({
  registerTool(tool) {
    registered.push(tool);
  },
});
if (entry.metadata?.packageName !== pluginPackage.name) failures.push("entry_wrong_package_name");
if (entry.metadata?.version !== pluginPackage.version) failures.push("entry_version_mismatch");
if (entry.metadata?.officialSubmissionRequiresRomanApproval !== true) {
  failures.push("entry_missing_approval_gate");
}
if (registered.length !== 1 || registered[0]?.name !== "neura_relay_preflight_action") {
  failures.push("entry_did_not_register_expected_tool");
}

const pack = run("npm", ["pack", "--dry-run", "--json"], { cwd: pluginRoot });
let packFiles = [];
if (pack.status !== 0) {
  failures.push(`npm_pack_dry_run_failed_${pack.stderr || pack.stdout}`);
} else {
  try {
    const packPayload = JSON.parse(pack.stdout);
    packFiles = packPayload[0]?.files?.map((file) => file.path) ?? [];
  } catch (error) {
    failures.push(`npm_pack_output_not_json_${error.message}`);
  }
}
for (const expectedPackFile of [
  "package.json",
  "README.md",
  "openclaw.plugin.json",
  "index.mjs",
  "adapter.mjs",
  "fixtures/send-message.preflight.json",
]) {
  if (!packFiles.includes(expectedPackFile)) {
    failures.push(`npm_pack_missing_${expectedPackFile}`);
  }
}

let cleanConsumerInstall = "not_run";
let cleanConsumerDryRun = null;
const consumerPackDir = mkdtempSync(join(tmpdir(), "neura-openclaw-adapter-pack-"));
const packForConsumer = run("npm", ["pack", "--json", "--pack-destination", consumerPackDir], {
  cwd: pluginRoot,
});
if (packForConsumer.status !== 0) {
  cleanConsumerInstall = "failed_pack";
  failures.push(`npm_pack_failed_${packForConsumer.stderr || packForConsumer.stdout}`);
} else {
  try {
    const packPayload = JSON.parse(packForConsumer.stdout);
    const tarballName = packPayload[0]?.filename;
    const tarballPath = tarballName ? join(consumerPackDir, tarballName) : null;
    if (!tarballPath) {
      cleanConsumerInstall = "failed_missing_tarball";
      failures.push("npm_pack_missing_tarball_for_consumer");
    } else {
      const consumerDir = mkdtempSync(join(tmpdir(), "neura-openclaw-adapter-consumer-"));
      writeFileSync(
        join(consumerDir, "package.json"),
        JSON.stringify({ private: true, type: "module" }, null, 2),
      );
      writeFileSync(
        join(consumerDir, "proof.mjs"),
        `
import { createNeuraPreflightAdapter } from "@neurarelay/openclaw-preflight-adapter";

const adapter = createNeuraPreflightAdapter({ relayBaseUrl: "https://www.neurarelay.com" });
const result = await adapter.beforeAction({
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
}, { dryRun: true });

if (result.mode !== "dry_run" || result.relay_call_skipped !== true) {
  throw new Error("adapter tarball dry-run proof failed");
}

console.log(JSON.stringify({
  ok: true,
  mode: result.mode,
  route: result.route,
  execution_owner: result.execution_owner,
  action_card_version: result.action_card.version
}, null, 2));
`,
      );
      const install = run("npm", ["install", tarballPath, "--prefer-online"], {
        cwd: consumerDir,
      });
      if (install.status !== 0) {
        cleanConsumerInstall = "failed_install";
        failures.push(`clean_consumer_install_failed_${install.stderr || install.stdout}`);
      } else {
        cleanConsumerInstall = "passed";
        const proof = run("node", ["proof.mjs"], { cwd: consumerDir });
        if (proof.status !== 0) {
          failures.push(`clean_consumer_dry_run_failed_${proof.stderr || proof.stdout}`);
        } else {
          try {
            cleanConsumerDryRun = JSON.parse(proof.stdout);
          } catch (error) {
            failures.push(`clean_consumer_output_not_json_${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    cleanConsumerInstall = "failed_exception";
    failures.push(`clean_consumer_exception_${error.message}`);
  }
}

const openclawCliAvailable = hasCommand("openclaw");
const clawhubCliAvailable = hasCommand("clawhub");
let runtimeInspect = "skipped_cli_not_installed";
let clawhubDryRun = "skipped_cli_not_installed";

if (openclawCliAvailable) {
  runtimeInspect =
    "available_not_run_to_avoid_mutating_local_openclaw_config_without_explicit_env";
  if (process.env.NEURA_OPENCLAW_RUNTIME_INSPECT === "1") {
    const inspect = run("openclaw", [
      "plugins",
      "inspect",
      "neura-relay-preflight-adapter",
      "--runtime",
      "--json",
    ]);
    runtimeInspect = inspect.status === 0 ? "passed" : `failed_${inspect.stderr || inspect.stdout}`;
    if (inspect.status !== 0) failures.push("openclaw_runtime_inspect_failed");
  }
}

if (clawhubCliAvailable) {
  clawhubDryRun =
    "available_not_run_to_avoid_registry_auth_or_network_publish_flow_without_explicit_env";
  if (process.env.NEURA_CLAWHUB_PACKAGE_DRY_RUN === "1") {
    const dryRun = run("clawhub", ["package", "publish", pluginRoot, "--dry-run", "--json"]);
    clawhubDryRun = dryRun.status === 0 ? "passed" : `failed_${dryRun.stderr || dryRun.stdout}`;
    if (dryRun.status !== 0) failures.push("clawhub_package_dry_run_failed");
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-plugin-stable-package",
      package: {
        name: pluginPackage.name,
        version: pluginPackage.version,
        npm_pack_dry_run_files: packFiles,
        clean_consumer_install: cleanConsumerInstall,
        clean_consumer_dry_run: cleanConsumerDryRun,
      },
      cli_verification: {
        openclaw_cli_available: openclawCliAvailable,
        openclaw_runtime_inspect: runtimeInspect,
        clawhub_cli_available: clawhubCliAvailable,
        clawhub_package_publish_dry_run: clawhubDryRun,
      },
      boundaries: {
        release_candidate_only: false,
        stable_release: true,
        roman_approval_required_before_submission_or_publication: true,
        official_openclaw_or_clawhub_claim: false,
        downstream_execution_by_neura: false,
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
