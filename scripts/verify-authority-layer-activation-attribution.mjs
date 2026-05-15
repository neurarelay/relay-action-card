#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
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

function rejectIncludes(label, text, phrases) {
  for (const phrase of phrases) {
    if (text.includes(phrase)) failures.push(`${label}_must_not_include_${phrase}`);
  }
}

const requiredFiles = [
  "examples/lib/activation-attribution.mjs",
  "examples/core/resolve-action-card.mjs",
  "examples/sdk/resolve-action-card-sdk.mjs",
  "examples/sdk/authority-routing.mjs",
  "examples/openclaw/run-action-receipt-kit.mjs",
  "examples/openclaw/run-preflight-adapter.mjs",
  "examples/openclaw/preflight-adapter/adapter.mjs",
  "examples/openclaw/run-developer-journey-proof.mjs",
  "README.md",
  "examples/openclaw/README.md",
  "examples/sdk/README.md",
  "docs/openclaw-developer-journey.md",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["verify:authority-layer-activation-attribution"] !==
  "node scripts/verify-authority-layer-activation-attribution.mjs"
) {
  failures.push("package_json_missing_authority_layer_activation_attribution_verifier");
}

const helper = read("examples/lib/activation-attribution.mjs");
requireIncludes("activation_helper", helper, [
  "NEURA_SOURCE",
  "NEURA_CAMPAIGN",
  "NEURA_SURFACE",
  "NEURA_SESSION_REF",
  "source",
  "campaign",
  "surface",
  "session-ref",
  "withRelayAttribution",
  "publicAttributionSummary",
]);
rejectIncludes("activation_helper", helper, [
  "password",
  "secret",
  "privatePayload",
]);

const exampleFiles = [
  "examples/core/resolve-action-card.mjs",
  "examples/sdk/resolve-action-card-sdk.mjs",
  "examples/sdk/authority-routing.mjs",
  "examples/openclaw/run-action-receipt-kit.mjs",
  "examples/openclaw/run-preflight-adapter.mjs",
];

for (const file of exampleFiles) {
  const text = read(file);
  requireIncludes(file, text, [
    "buildRelayAttribution",
    "publicAttributionSummary",
    "activation_attribution",
    "relay-action-card",
  ]);
}

for (const file of [
  "examples/core/resolve-action-card.mjs",
  "examples/sdk/resolve-action-card-sdk.mjs",
  "examples/sdk/authority-routing.mjs",
  "examples/openclaw/run-action-receipt-kit.mjs",
]) {
  const text = read(file);
  requireIncludes(file, text, [
    "withRelayAttribution({ action_card: actionCard }, activationAttribution)",
  ]);
}

const adapter = read("examples/openclaw/preflight-adapter/adapter.mjs");
requireIncludes("preflight_adapter", adapter, [
  "withRelayAttribution",
  "activationAttribution",
  "runOptions.activationAttribution",
  "activation_telemetry",
]);

const journey = read("examples/openclaw/run-developer-journey-proof.mjs");
requireIncludes("developer_journey", journey, [
  "attributionArgs",
  "buildRelayAttribution",
  "publicAttributionSummary",
  "withInheritedAttribution",
  "activation_attribution",
  "openclaw-developer-journey-proof",
]);

const docs = [
  "README.md",
  "examples/openclaw/README.md",
  "examples/sdk/README.md",
  "docs/openclaw-developer-journey.md",
];

for (const file of docs) {
  const text = read(file);
  requireIncludes(file, text, [
    "--source",
    "--campaign",
    "refs-only",
    "private payload",
  ]);
}

for (const file of [
  "README.md",
  "examples/openclaw/README.md",
  "docs/openclaw-developer-journey.md",
]) {
  const text = read(file);
  requireIncludes(file, text, [
    "chatgpt_gpt_store",
    "action_card_proof_runner",
    "gpt_store_helper",
  ]);
}

const forbiddenClaimPhrases = [
  "official OpenAI approval",
  "official Anthropic approval",
  "approved by OpenClaw",
  "approved by ClawHub",
  "listed on ClawHub",
  "partnership with OpenClaw",
  "partnership with ClawHub",
];
for (const file of requiredFiles) rejectIncludes(file, read(file), forbiddenClaimPhrases);

if (failures.length > 0) {
  console.error("Authority Layer activation attribution verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Authority Layer activation attribution verification passed.");
