#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const packageName = "@neurarelay/openclaw-preflight-adapter";
const packageVersion = "0.1.4";
const pluginId = "neurarelay-openclaw-preflight-adapter";
const fallbackPackage = "@rpelevin/neura-relay-preflight-adapter@0.1.1";

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
  });
}

const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "docs/openclaw-clawhub-submission-readiness.md",
  "docs/openclaw-plugin-release-candidate.md",
  "docs/openclaw-preflight-adapter.md",
  "docs/openclaw-runtime-verification-and-publish-approval.md",
  "examples/openclaw/README.md",
  "examples/openclaw/preflight-adapter/README.md",
  "examples/openclaw/preflight-adapter/openclaw.plugin.json",
  "examples/openclaw/preflight-adapter/package.json",
  "examples/openclaw/preflight-adapter/index.mjs",
  "examples/openclaw/preflight-adapter/adapter.mjs",
  "scripts/verify-openclaw-npm-package.mjs",
  "scripts/verify-openclaw-plugin-rc.mjs",
  "scripts/verify-openclaw-runtime-approval.mjs",
  "scripts/verify-openclaw-clawhub-release-gate.mjs",
  "scripts/verify-openclaw-founder-clawhub-publisher.mjs",
];

for (const file of requiredFiles) requireFile(file);

const rootPackage = readJson("package.json");
if (
  rootPackage.scripts?.["verify:openclaw-submission-readiness"] !==
  "node scripts/verify-openclaw-submission-readiness.mjs"
) {
  failures.push("root_package_missing_submission_readiness_script");
}
if (
  rootPackage.scripts?.["verify:openclaw-clawhub-release"] !==
  "node scripts/verify-openclaw-clawhub-release-gate.mjs"
) {
  failures.push("root_package_missing_clawhub_release_gate_script");
}
if (
  rootPackage.scripts?.["verify:openclaw-founder-clawhub-publisher"] !==
  "node scripts/verify-openclaw-founder-clawhub-publisher.mjs"
) {
  failures.push("root_package_missing_founder_clawhub_publisher_script");
}

const adapterPackage = readJson("examples/openclaw/preflight-adapter/package.json");
if (adapterPackage.name !== packageName) {
  failures.push("adapter_package_wrong_name");
}
if (adapterPackage.version !== packageVersion) failures.push("adapter_package_wrong_version");
if (adapterPackage.openclaw?.install?.npmSpec !== `${adapterPackage.name}@${adapterPackage.version}`) {
  failures.push("adapter_package_npm_spec_mismatch");
}
if (adapterPackage.openclaw?.compat?.pluginApi !== ">=2026.3.24-beta.2") {
  failures.push("adapter_package_plugin_api_mismatch");
}
if (adapterPackage.openclaw?.build?.openclawVersion !== "2026.3.24-beta.2") {
  failures.push("adapter_package_build_version_mismatch");
}
if (adapterPackage.neura?.officialOpenClawOrClawHubClaim !== false) {
  failures.push("adapter_package_claim_boundary_missing");
}
if (adapterPackage.neura?.officialSubmissionRequiresRomanApproval !== true) {
  failures.push("adapter_package_approval_gate_missing");
}
if (adapterPackage.neura?.downstreamExecutionByNeura !== false) {
  failures.push("adapter_package_downstream_execution_boundary_missing");
}

const manifest = readJson("examples/openclaw/preflight-adapter/openclaw.plugin.json");
if (manifest.id !== pluginId) failures.push("manifest_wrong_id");
if (manifest.version !== adapterPackage.version) failures.push("manifest_version_mismatch");
if (!manifest.contracts?.tools?.includes("neura_relay_preflight_action")) {
  failures.push("manifest_missing_tool_contract");
}
if (Object.hasOwn(manifest, "entry")) failures.push("manifest_must_not_hold_runtime_entry");
if (Object.hasOwn(manifest, "build")) failures.push("manifest_must_not_hold_build_metadata");
if (Object.hasOwn(manifest, "compat")) failures.push("manifest_must_not_hold_compat_metadata");

const packet = read("docs/openclaw-clawhub-submission-readiness.md");
requireIncludes("submission_packet", packet, [
  "OpenClaw / ClawHub Submission Readiness Packet",
  "canonical `@neurarelay` ClawHub community package `0.1.4` published",
  packageName,
  packageVersion,
  pluginId,
  fallbackPackage,
  `npm install ${packageName}`,
  "beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route",
  "Neura does not execute the downstream action",
  "https://docs.openclaw.ai/plugins/manifest",
  "https://docs.openclaw.ai/plugins/building-plugins",
  "https://documentation.openclaw.ai/clawhub",
  "npm run verify:openclaw-submission-readiness",
  "npm run verify:openclaw-clawhub-release",
  "npm run verify:openclaw-founder-clawhub-publisher",
  "https://github.com/openclaw/clawhub/issues/2190",
  "founder-publisher fallback remains published",
  "no official OpenClaw / ClawHub approval or listing claim",
  "toolNames=[\"neura_relay_preflight_action\"]",
  "releaseId\": \"rd72j7xj1e8y2tajcf4h21k9v586z1tw\"",
  "artifactSha256\": \"9e0df97f7d2e1e44a4d2c30d785a91ed1792219eddb0bfbec06af0a37a8f3eae\"",
  "ClawScan pending",
  "VirusTotal pending",
  "npm run verify:openclaw-runtime-approval",
  "clawhub package publish examples/openclaw/preflight-adapter --family code-plugin",
  "--dry-run --json",
  `openclaw plugins install clawhub:${packageName}@${packageVersion}`,
  "Public-Safe Copy",
  "Claim Boundaries",
  "Roman Approval Decision",
  `Approved: run ClawHub dry-run only for ${packageName}@${packageVersion}.`,
  "Approved: publish a future README-only ClawHub polish release",
  "Approved: publish @rpelevin/neura-relay-preflight-adapter@0.1.0 to ClawHub as the founder-publisher fallback",
  "Approved: publish @rpelevin/neura-relay-preflight-adapter@0.1.1 to ClawHub as a community founder-publisher metadata/readme correction",
]);
rejectUnsafe("submission_packet", packet);

const readme = read("README.md");
requireIncludes("readme", readme, [
  "docs/openclaw-clawhub-submission-readiness.md",
  "npm run verify:openclaw-submission-readiness",
  "npm run verify:openclaw-clawhub-release",
  "verify-openclaw-founder-clawhub-publisher.mjs",
  `${packageName}@${packageVersion}`,
  fallbackPackage,
  "No official OpenClaw or ClawHub listing, approval, endorsement, partnership, or integration claim exists.",
]);
rejectUnsafe("readme", readme);

const changelog = read("CHANGELOG.md");
requireIncludes("changelog", changelog, [
  "docs/openclaw-clawhub-submission-readiness.md",
  "npm run verify:openclaw-submission-readiness",
  "npm run verify:openclaw-clawhub-release",
  "final Roman approval packet",
]);
rejectUnsafe("changelog", changelog);

const releaseCandidateDoc = read("docs/openclaw-plugin-release-candidate.md");
requireIncludes("release_candidate_doc", releaseCandidateDoc, [
  "openclaw-clawhub-submission-readiness.md",
  "npm run verify:openclaw-submission-readiness",
]);
rejectUnsafe("release_candidate_doc", releaseCandidateDoc);

const runtimeDoc = read("docs/openclaw-runtime-verification-and-publish-approval.md");
requireIncludes("runtime_doc", runtimeDoc, [
  "openclaw-clawhub-submission-readiness.md",
  "npm run verify:openclaw-submission-readiness",
  `${packageName}@${packageVersion}`,
]);
rejectUnsafe("runtime_doc", runtimeDoc);

const preflightDoc = read("docs/openclaw-preflight-adapter.md");
requireIncludes("preflight_doc", preflightDoc, [
  "docs/openclaw-clawhub-submission-readiness.md",
  "Submission-readiness packet",
]);
rejectUnsafe("preflight_doc", preflightDoc);

const adapterReadme = read("examples/openclaw/preflight-adapter/README.md");
requireIncludes("adapter_readme", adapterReadme, [
  `${packageName}@${packageVersion}`,
  "not an official OpenClaw or ClawHub",
  pluginId,
]);
rejectUnsafe("adapter_readme", adapterReadme);

const pack = run("npm", ["pack", "--dry-run", "--json"], {
  cwd: path("examples/openclaw/preflight-adapter"),
});
let packFiles = [];
if (pack.status !== 0) {
  failures.push(`npm_pack_dry_run_failed_${pack.stderr || pack.stdout}`);
} else {
  try {
    const payload = JSON.parse(pack.stdout);
    packFiles = payload[0]?.files?.map((file) => file.path) ?? [];
  } catch (error) {
    failures.push(`npm_pack_output_not_json_${error.message}`);
  }
}
for (const file of [
  "README.md",
  "adapter.mjs",
  "fixtures/send-message.preflight.json",
  "index.mjs",
  "openclaw.plugin.json",
  "package.json",
]) {
  if (!packFiles.includes(file)) failures.push(`npm_pack_missing_${file}`);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-submission-readiness",
      package: {
        name: adapterPackage.name,
        version: adapterPackage.version,
        npm_spec: adapterPackage.openclaw?.install?.npmSpec,
        source_path: "examples/openclaw/preflight-adapter",
        runtime_tool: "neura_relay_preflight_action",
        pack_files: packFiles,
      },
      submission_gate: {
        roman_approval_required: true,
        dry_run_command_documented: true,
        publish_command_documented: true,
        official_openclaw_or_clawhub_claim: false,
      },
      boundaries: {
        downstream_execution_by_neura: false,
        private_payload_exposure: false,
        public_token_or_key_issuance: false,
        registry_auto_approval: false,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
