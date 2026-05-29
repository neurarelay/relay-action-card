#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function read(file) {
  return readFileSync(join(repoRoot, file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function requireIncludes(label, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) failures.push(`${label}_missing_${phrase}`);
  }
}

function rejectIncludes(label, text, phrases) {
  for (const phrase of phrases) {
    if (text.includes(phrase)) failures.push(`${label}_forbidden_${phrase}`);
  }
}

function requireCommandIncludes(label, command, phrases) {
  for (const phrase of phrases) {
    if (!command?.includes(phrase)) failures.push(`${label}_missing_${phrase}`);
  }
}

function parseJson(stdout) {
  const start = stdout.search(/[{[]/);
  if (start < 0) throw new Error("no JSON found");
  return JSON.parse(stdout.slice(start));
}

const packageJson = readJson("package.json");
const readme = read("README.md");
const ecosystemDocs = read("docs/ecosystem-availability.md");
const sdkReadme = read("examples/sdk/README.md");
const adapterReadme = read("examples/openclaw/preflight-adapter/README.md");
const firstProofScript = read("scripts/run-first-proof.mjs");

if (packageJson.scripts?.["first-proof"] !== "node scripts/run-first-proof.mjs") {
  failures.push("package_missing_first_proof_script");
}

if (packageJson.scripts?.["verify:first-proof"] !== "node scripts/verify-first-proof.mjs") {
  failures.push("package_missing_verify_first_proof_script");
}

for (const [label, text] of [
  ["readme", readme],
  ["ecosystem_docs", ecosystemDocs],
  ["sdk_readme", sdkReadme],
  ["adapter_readme", adapterReadme],
  ["first_proof_script", firstProofScript],
]) {
  requireIncludes(label, text, [
    "npm run first-proof",
    "package_reality_first_proof",
    "source/campaign",
  ]);
  rejectIncludes(label, text, [
    "downloads prove adoption",
    "clones prove adoption",
    "official OpenAI approval",
    "official Anthropic approval",
    "official ClawHub listing",
    "Neura executes downstream actions",
    "public production MCP tokens are available",
    "public A2A tokens are available",
  ]);
}

requireIncludes("readme", readme, [
  "completion_artifact",
  "artifact_type",
  "neura_first_proof_completion",
  "dry_run_preview_completed",
  "metric_target",
  "npm run first-proof -- --json",
  "npm run first-proof -- --dry-run --json",
  "npm run first-proof -- --source=linkedin --campaign=linkedin_first_publication --surface=developers_first_proof --json",
  "LinkedIn attention -> Relay first-proof page -> attributed live receipt refs",
]);

requireIncludes("ecosystem_docs", ecosystemDocs, [
  "No-signup first-proof preview",
  "static_no_signup_first_proof_preview",
  "creates_production_receipt",
  "sample_proposed_agent_action",
  "derived_action_card_summary",
  "decision_receipt_preview",
  "receipt_ref_preview_first_proof_support_reply_001",
  "trace_ref_preview_first_proof_support_reply_001",
  '"route": "human_review"',
  "developer_owned_next_step",
  "npm run first-proof -- --json",
  "npm run first-proof -- --dry-run --json",
  "completion_artifact",
  "neura_first_proof_completion",
  "dry_run_preview_completed",
  "next_live_command",
  "source=npm_github",
  "campaign=package_reality_first_proof",
  "surface=scripts/run-first-proof",
  "source=linkedin",
  "campaign=linkedin_first_publication",
  "surface=developers_first_proof",
  "artifact_type=neura_first_proof_completion",
  '"private_payload_collected": false',
  '"private_payload_stored": false',
  '"downstream_execution_by_neura": false',
  '"provider_listing_or_partnership_claim": false',
]);

requireIncludes("first_proof_script", firstProofScript, [
  "static_no_signup_first_proof_preview",
  "receipt_ref_preview_first_proof_support_reply_001",
  "trace_ref_preview_first_proof_support_reply_001",
  "npm run first-proof -- --json",
  "completionArtifact",
  "neura_first_proof_completion",
  "dry_run_preview_completed",
  "live_first_proof_receipt_created",
  "firstProofCommand",
  "nextLiveCommand",
  "completion_artifact.attribution",
  "private_payload_stored: false",
  "public_token_issued: false",
  "provider_listing_or_partnership_claim: false",
  "linkedin_first_publication_command",
  "source=linkedin",
  "campaign=linkedin_first_publication",
  "surface=developers_first_proof",
]);

const dryRun = spawnSync(
  process.execPath,
  [
    "scripts/run-first-proof.mjs",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=package_reality_first_proof",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (dryRun.status !== 0) {
  failures.push(`dry_run_failed_${dryRun.stderr || dryRun.stdout}`);
} else {
  const proof = parseJson(dryRun.stdout);
  if (proof.ok !== true) failures.push("dry_run_not_ok");
  if (proof.mode !== "dry_run_no_production_receipts") failures.push("dry_run_wrong_mode");
  requireCommandIncludes("dry_run_command", proof.command, [
    "npm run first-proof -- --dry-run --json",
    "--source=verifier",
    "--campaign=package_reality_first_proof",
    "--surface=scripts/run-first-proof",
    "--session-ref=first_proof_session:",
  ]);
  const artifact = proof.completion_artifact;
  if (!artifact) failures.push("completion_artifact_missing");
  if (artifact?.artifact_type !== "neura_first_proof_completion") {
    failures.push("completion_artifact_wrong_type");
  }
  if (artifact?.artifact_version !== "0.1") {
    failures.push("completion_artifact_wrong_version");
  }
  if (artifact?.status !== "dry_run_preview_completed") {
    failures.push("completion_artifact_wrong_dry_status");
  }
  if (artifact?.proof !== "package-reality-first-proof") {
    failures.push("completion_artifact_wrong_proof");
  }
  requireCommandIncludes("completion_artifact_command", artifact?.command, [
    "npm run first-proof -- --dry-run --json",
    "--source=verifier",
    "--campaign=package_reality_first_proof",
    "--surface=scripts/run-first-proof",
    "--session-ref=first_proof_session:",
  ]);
  if (artifact?.creates_production_receipt !== false) {
    failures.push("completion_artifact_dry_run_must_not_create_receipt");
  }
  if (artifact?.metric_target !== "package_reality_first_proof") {
    failures.push("completion_artifact_wrong_metric_target");
  }
  requireCommandIncludes("completion_artifact_next_live_command", artifact?.next_live_command, [
    "npm run first-proof -- --json",
    "--source=verifier",
    "--campaign=package_reality_first_proof",
    "--surface=scripts/run-first-proof",
    "--session-ref=first_proof_session:",
  ]);
  requireCommandIncludes(
    "completion_artifact_default_live_command",
    artifact?.attribution_examples?.default_live_command,
    [
      "npm run first-proof -- --json",
      "--source=verifier",
      "--campaign=package_reality_first_proof",
      "--surface=scripts/run-first-proof",
      "--session-ref=first_proof_session:",
    ],
  );
  if (
    artifact?.attribution_examples?.linkedin_first_publication_command !==
    "npm run first-proof -- --source=linkedin --campaign=linkedin_first_publication --surface=developers_first_proof --json"
  ) {
    failures.push("completion_artifact_missing_linkedin_first_publication_command");
  }
  if (artifact?.attribution?.source !== "verifier") {
    failures.push("completion_artifact_wrong_source");
  }
  if (artifact?.attribution?.campaign !== "package_reality_first_proof") {
    failures.push("completion_artifact_wrong_campaign");
  }
  if (artifact?.attribution?.surface !== "scripts/run-first-proof") {
    failures.push("completion_artifact_wrong_surface");
  }
  if (!artifact?.attribution?.session_ref?.startsWith("first_proof_session:")) {
    failures.push("completion_artifact_missing_session_ref");
  }
  if (artifact?.attribution?.refs_only !== true) {
    failures.push("completion_artifact_refs_only_missing");
  }
  if (!Array.isArray(artifact?.receipt_refs) || artifact.receipt_refs.length !== 0) {
    failures.push("completion_artifact_dry_run_receipts_must_be_empty");
  }
  if (
    artifact?.preview_receipt?.receipt_ref !==
    "receipt_ref_preview_first_proof_support_reply_001"
  ) {
    failures.push("completion_artifact_missing_preview_receipt");
  }
  if (
    artifact?.boundaries?.private_payload_stored !== false ||
    artifact?.boundaries?.downstream_execution_by_neura !== false ||
    artifact?.boundaries?.public_token_issued !== false ||
    artifact?.boundaries?.provider_listing_or_partnership_claim !== false ||
    artifact?.boundaries?.registry_auto_approval !== false
  ) {
    failures.push("completion_artifact_boundaries_changed");
  }
  if (!artifact?.shareable_summary?.includes("Completed Neura local first-proof preview")) {
    failures.push("completion_artifact_missing_shareable_summary");
  }
  if (proof.static_no_signup_preview?.creates_production_receipt !== false) {
    failures.push("static_preview_must_not_create_production_receipt");
  }
  if (
    proof.static_no_signup_preview?.decision_receipt_preview?.receipt_ref !==
    "receipt_ref_preview_first_proof_support_reply_001"
  ) {
    failures.push("static_preview_missing_receipt_ref");
  }
  if (
    proof.static_no_signup_preview?.decision_receipt_preview?.trace_ref !==
    "trace_ref_preview_first_proof_support_reply_001"
  ) {
    failures.push("static_preview_missing_trace_ref");
  }
  if (proof.static_no_signup_preview?.decision_receipt_preview?.route !== "human_review") {
    failures.push("static_preview_missing_route");
  }
  if (
    proof.static_no_signup_preview?.boundaries?.private_payload_stored !== false ||
    proof.static_no_signup_preview?.boundaries?.downstream_execution_by_neura !== false ||
    proof.static_no_signup_preview?.boundaries?.provider_listing_or_partnership_claim !== false
  ) {
    failures.push("static_preview_boundary_changed");
  }
  if (proof.proof_execution_metric?.executed !== 0) {
    failures.push("dry_run_created_execution_metric");
  }
  if (proof.boundaries?.downstream_execution_by_neura !== false) {
    failures.push("boundary_downstream_execution_changed");
  }
  if (proof.boundaries?.developer_owned_execution !== true) {
    failures.push("boundary_developer_owned_execution_missing");
  }
  if (!proof.activation_attribution?.refs_only) {
    failures.push("activation_attribution_refs_only_missing");
  }
}

if (failures.length > 0) {
  console.error(
    JSON.stringify({ ok: false, verifier: "first-proof", failures }, null, 2),
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, verifier: "first-proof" }, null, 2));
