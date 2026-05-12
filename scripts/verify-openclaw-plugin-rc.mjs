#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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
];

for (const file of requiredFiles) requireFile(file);

const rootPackage = readJson("package.json");
const expectedRootScripts = {
  "openclaw:plugin:pack:dry-run":
    "cd examples/openclaw/preflight-adapter && npm pack --dry-run --json",
  "verify:openclaw-plugin-rc": "node scripts/verify-openclaw-plugin-rc.mjs",
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
if (pluginPackage.version !== "0.1.0-rc.1") failures.push("plugin_package_wrong_version");
if (pluginPackage.private !== false) failures.push("plugin_package_must_be_publish_ready");
if (pluginPackage.type !== "module") failures.push("plugin_package_must_be_esm");
if (pluginPackage.license !== "MIT") failures.push("plugin_package_missing_license");
if (pluginPackage.engines?.node !== ">=22") failures.push("plugin_package_wrong_node_engine");
if (pluginPackage.publishConfig?.access !== "public") failures.push("plugin_package_publish_access");
if (pluginPackage.publishConfig?.tag !== "rc") failures.push("plugin_package_publish_tag");
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
  "@neurarelay/openclaw-preflight-adapter@0.1.0-rc.1"
) {
  failures.push("plugin_package_wrong_install_spec");
}
if (pluginPackage.neura?.releaseCandidateOnly !== true) {
  failures.push("plugin_package_missing_rc_boundary");
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
for (const forbiddenManifestField of ["entry", "compat", "build", "capabilities", "neura"]) {
  if (Object.hasOwn(manifest, forbiddenManifestField)) {
    failures.push(`manifest_has_package_or_custom_field_${forbiddenManifestField}`);
  }
}

const releaseDoc = read("docs/openclaw-plugin-release-candidate.md");
requireIncludes("release_doc", releaseDoc, [
  "OpenClaw Plugin Release Candidate v0.1",
  "@neurarelay/openclaw-preflight-adapter",
  "0.1.0-rc.1",
  "npm run openclaw:plugin:pack:dry-run",
  "npm run verify:openclaw-plugin-rc",
  "clawhub package publish your-org/your-plugin --dry-run",
  "No OpenClaw / ClawHub submission or publication has been performed",
  "Roman's explicit approval",
  "https://docs.openclaw.ai/plugins/manifest",
  "https://docs.openclaw.ai/plugins/building-plugins",
  "https://documentation.openclaw.ai/clawhub",
]);
rejectUnsafe("release_doc", releaseDoc);

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
  "release candidate",
  "npm run openclaw:plugin:pack:dry-run",
  "not an official OpenClaw or ClawHub",
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
      verifier: "openclaw-plugin-release-candidate",
      package: {
        name: pluginPackage.name,
        version: pluginPackage.version,
        npm_pack_dry_run_files: packFiles,
      },
      cli_verification: {
        openclaw_cli_available: openclawCliAvailable,
        openclaw_runtime_inspect: runtimeInspect,
        clawhub_cli_available: clawhubCliAvailable,
        clawhub_package_publish_dry_run: clawhubDryRun,
      },
      boundaries: {
        release_candidate_only: true,
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
