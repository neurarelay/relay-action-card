#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
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
    "\"body\"",
    "\"content\"",
    "\"messageBody\"",
    "\"fileContents\"",
    "\"formValues\"",
    "\"rawCommand\"",
    "\"token\"",
    "\"secret\"",
    "\"password\"",
  ];
  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_${phrase}`);
  }
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const requiredFiles = [
  "docs/openclaw-preflight-adapter.md",
  "docs/openclaw-runtime-verification-and-publish-approval.md",
  "examples/openclaw/preflight-adapter/README.md",
  "examples/openclaw/preflight-adapter/openclaw.plugin.json",
  "examples/openclaw/preflight-adapter/package.json",
  "examples/openclaw/preflight-adapter/index.mjs",
  "examples/openclaw/preflight-adapter/adapter.mjs",
  "examples/openclaw/preflight-adapter/fixtures/send-message.preflight.json",
  "examples/openclaw/run-preflight-adapter.mjs",
  "scripts/verify-openclaw-npm-package.mjs",
  "scripts/verify-openclaw-runtime-approval.mjs",
  "tests/openclaw-preflight-adapter.test.mjs",
  "tests/openclaw-preflight-adapter.e2e.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
const expectedScripts = {
  "openclaw:preflight:dry-run": "node examples/openclaw/run-preflight-adapter.mjs --dry-run",
  "openclaw:preflight:receipt": "node examples/openclaw/run-preflight-adapter.mjs",
  "openclaw:plugin:pack:dry-run":
    "cd examples/openclaw/preflight-adapter && npm pack --dry-run --json",
  "test:openclaw-preflight-adapter": "node --test tests/openclaw-preflight-adapter.test.mjs",
  "test:openclaw-preflight-adapter:e2e":
    "node --test tests/openclaw-preflight-adapter.e2e.mjs",
  "verify:openclaw-preflight-adapter":
    "node scripts/verify-openclaw-preflight-adapter.mjs",
  "verify:openclaw-plugin-rc": "node scripts/verify-openclaw-plugin-rc.mjs",
  "verify:openclaw-npm-package": "node scripts/verify-openclaw-npm-package.mjs",
  "verify:openclaw-runtime-approval": "node scripts/verify-openclaw-runtime-approval.mjs",
};
for (const [script, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[script] !== command) {
    failures.push(`package_script_${script}_expected_${command}`);
  }
}

const adapterPackage = readJson("examples/openclaw/preflight-adapter/package.json");
if (adapterPackage.name !== "@neurarelay/openclaw-preflight-adapter") {
  failures.push("adapter_package_wrong_name");
}
if (adapterPackage.private !== false) failures.push("adapter_package_must_be_publish_ready");
if (adapterPackage.engines?.node !== ">=22.14.0") failures.push("adapter_package_wrong_node_engine");
if (adapterPackage.dependencies?.["@neurarelay/sdk"] !== "0.1.0") {
  failures.push("adapter_package_missing_sdk_dependency");
}
if (!adapterPackage.openclaw?.extensions?.includes("./index.mjs")) {
  failures.push("adapter_package_missing_openclaw_extension");
}
if (!adapterPackage.openclaw?.tools?.some((tool) => tool?.name === "neura_relay_preflight_action")) {
  failures.push("adapter_package_missing_clawhub_tool_metadata");
}
for (const tag of ["policy-evidence", "authority-decision", "computer-use"]) {
  if (!adapterPackage.keywords?.includes(tag)) {
    failures.push(`adapter_package_missing_keyword_${tag}`);
  }
}
if (!adapterPackage.openclaw?.compat?.pluginApi || !adapterPackage.openclaw?.build?.openclawVersion) {
  failures.push("adapter_package_missing_openclaw_compat_or_build");
}
if (
  adapterPackage.openclaw?.install?.npmSpec !==
  "@neurarelay/openclaw-preflight-adapter@0.1.0"
) {
  failures.push("adapter_package_missing_install_npm_spec");
}
if (adapterPackage.neura?.officialOpenClawOrClawHubClaim !== false) {
  failures.push("adapter_package_claim_boundary_missing");
}
if (adapterPackage.neura?.officialSubmissionRequiresRomanApproval !== true) {
  failures.push("adapter_package_approval_gate_missing");
}

const nativeManifest = readJson("examples/openclaw/preflight-adapter/openclaw.plugin.json");
if (nativeManifest.id !== "neura-relay-preflight-adapter") {
  failures.push("native_manifest_wrong_id");
}
if (!nativeManifest.configSchema || nativeManifest.configSchema.type !== "object") {
  failures.push("native_manifest_missing_config_schema");
}
if (!nativeManifest.contracts?.tools?.includes("neura_relay_preflight_action")) {
  failures.push("native_manifest_missing_tool_contract");
}
if (!nativeManifest.tools?.some((tool) => tool?.name === "neura_relay_preflight_action")) {
  failures.push("native_manifest_missing_clawhub_tool_metadata");
}
for (const forbiddenManifestField of ["entry", "compat", "build", "capabilities", "neura"]) {
  if (Object.hasOwn(nativeManifest, forbiddenManifestField)) {
    failures.push(`native_manifest_has_runtime_or_custom_field_${forbiddenManifestField}`);
  }
}

const docs = read("docs/openclaw-preflight-adapter.md");
requireIncludes("docs", docs, [
  "OpenClaw-Style Preflight Adapter v0.1",
  "not an official OpenClaw, ClawHub",
  "beforeAction(preflightAction)",
  "register(api)",
  "openclaw.plugin.json",
  "https://docs.openclaw.ai/plugins/manifest",
  "https://docs.openclaw.ai/plugins/building-plugins",
  "https://documentation.openclaw.ai/clawhub",
  "docs/openclaw-plugin-release-candidate.md",
  "npm run openclaw:preflight:dry-run",
  "npm run openclaw:preflight:receipt",
  "npm run verify:openclaw-preflight-adapter",
  "npm run verify:openclaw-npm-package",
  "docs/openclaw-runtime-verification-and-publish-approval.md",
  "Node `24`",
  "developer-owned execution",
]);
rejectUnsafe("docs", docs);

const adapterReadme = read("examples/openclaw/preflight-adapter/README.md");
requireIncludes("adapter_readme", adapterReadme, [
  "beforeAction(preflightAction)",
  "not an official OpenClaw or ClawHub",
  "@rpelevin/neura-relay-preflight-adapter@0.1.0",
  "openclaw/clawhub#2190",
  "neura_relay_preflight_action",
  "openclaw.plugin.json",
  "npm run openclaw:plugin:pack:dry-run",
  "npm run openclaw:preflight:dry-run",
  "npm run verify:openclaw-preflight-adapter",
  "never executes downstream actions",
  "hold_for_registry_backed_authority",
]);
rejectUnsafe("adapter_readme", adapterReadme);

const adapter = read("examples/openclaw/preflight-adapter/adapter.mjs");
requireIncludes("adapter", adapter, [
  "createActionCardFromPreflightAction",
  "createNeuraPreflightAdapter",
  "beforeAction",
  "isRegistryBackedAuthorityReady",
  "hold_for_registry_backed_authority",
  "decision_gate_only_developer_keeps_execution",
  "developer_runtime",
  "@neurarelay/sdk",
]);

const pluginEntry = read("examples/openclaw/preflight-adapter/index.mjs");
requireIncludes("plugin_entry", pluginEntry, [
  "register(api)",
  "api.registerTool",
  "neura_relay_preflight_action",
  "officialOpenClawOrClawHubClaim: false",
]);
rejectUnsafe("plugin_entry", pluginEntry);

const runner = read("examples/openclaw/run-preflight-adapter.mjs");
requireIncludes("runner", runner, [
  "createNeuraPreflightAdapter",
  "--dry-run",
  "--fixture=",
  "Developer runtime keeps execution ownership",
]);
rejectUnsafe("runner", runner);

const fixture = read("examples/openclaw/preflight-adapter/fixtures/send-message.preflight.json");
rejectUnsafe("fixture", fixture);
const fixtureJson = JSON.parse(fixture);
if (fixtureJson.proposedAction?.type !== "message.send") {
  failures.push("fixture_wrong_action_type");
}
if (!fixtureJson.authority?.allowedActions?.includes(fixtureJson.proposedAction?.type)) {
  failures.push("fixture_authority_does_not_cover_action");
}
if (!fixtureJson.authority?.allowedResources?.includes(fixtureJson.proposedAction?.target)) {
  failures.push("fixture_authority_does_not_cover_target");
}

const dryRun = run("node", [
  "examples/openclaw/run-preflight-adapter.mjs",
  "--dry-run",
  "--json",
]);
if (dryRun.status !== 0) {
  failures.push(`dry_run_failed_${dryRun.stderr || dryRun.stdout}`);
} else {
  const payload = JSON.parse(dryRun.stdout);
  if (payload.result?.mode !== "dry_run") failures.push("dry_run_wrong_mode");
  if (payload.result?.action_card?.version !== "0.1") failures.push("dry_run_missing_action_card");
  if (payload.result?.relay_call_skipped !== true) failures.push("dry_run_must_skip_relay");
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-preflight-adapter",
      files: requiredFiles,
      scripts: Object.keys(expectedScripts),
      boundaries: {
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
