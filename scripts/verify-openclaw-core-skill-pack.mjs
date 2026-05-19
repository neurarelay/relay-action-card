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

const requiredFiles = [
  "skills/openclaw/neura-relay-core/SKILL.md",
  "skills/openclaw/neura-relay-core/references/scenario-corpus.md",
  "docs/openclaw-core-skill-pack.md",
  "examples/openclaw/preflight-adapter/package.json",
  "examples/openclaw/preflight-adapter/README.md",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["verify:openclaw-core-skill-pack"] !==
  "node scripts/verify-openclaw-core-skill-pack.mjs"
) {
  failures.push("package_script_missing_openclaw_core_skill_pack");
}

const skill = read("skills/openclaw/neura-relay-core/SKILL.md");
requireIncludes("skill", skill, [
  "---",
  "name: neura-openclaw-core",
  "Decision Receipt",
  "@neurarelay/openclaw-preflight-adapter@0.1.1",
  "@neurarelay/openclaw-preflight-adapter@0.1.4",
  "@rpelevin/neura-relay-preflight-adapter@0.1.1",
  "openclaw/clawhub#2190",
  "package/publisher",
  "Registry-backed",
  "Do not include message bodies, file contents, form values, raw command strings",
  "not an official OpenClaw or ClawHub integration, approval, endorsement, or partnership",
]);
rejectUnsafe("skill", skill);

const scenarios = read("skills/openclaw/neura-relay-core/references/scenario-corpus.md");
requireIncludes("scenarios", scenarios, [
  "Package Publish Or Version Release",
  "Publisher Namespace Or Organization Change",
  "External Message Send",
  "Browser Submit Or Account Change",
  "Customer Or Workspace Data Export",
  "artifact digest ref",
  "open access request or maintainer-thread ref",
  "no-official-claim boundary ref",
]);
rejectUnsafe("scenarios", scenarios);

const docs = read("docs/openclaw-core-skill-pack.md");
requireIncludes("docs", docs, [
  "OpenClaw Core Skill Pack",
  "community skill pack published on ClawHub",
  "@neurarelay/openclaw-preflight-adapter@0.1.1",
  "@neurarelay/openclaw-preflight-adapter@0.1.4",
  "neura-openclaw-core@0.1.0",
  "@rpelevin/neura-relay-preflight-adapter@0.1.1",
  "openclaw/clawhub#2190",
  "ClawHub Skill",
  "Skill name",
  "neura-openclaw-core",
  "Current status",
  "published as `neura-openclaw-core@0.1.0` under owner `neurarelay`",
  "https://clawhub.ai/neurarelay/neura-openclaw-core",
  "moderation `CLEAN`; security `PENDING`",
  "npm run verify:openclaw-core-skill-pack",
  "does not publish to ClawHub",
  "no official OpenClaw / ClawHub approval, listing, endorsement, partnership, or integration claim",
]);
rejectUnsafe("docs", docs);

const adapterPackage = JSON.parse(read("examples/openclaw/preflight-adapter/package.json"));
if (adapterPackage.name !== "@neurarelay/openclaw-preflight-adapter") {
  failures.push("adapter_package_wrong_canonical_name");
}
if (adapterPackage.version !== "0.1.4") failures.push("adapter_package_wrong_version");
if (adapterPackage.neura?.officialOpenClawOrClawHubClaim !== false) {
  failures.push("adapter_package_claim_boundary_not_false");
}

const submission = read("docs/openclaw-clawhub-submission-readiness.md");
requireIncludes("submission", submission, [
  "@rpelevin/neura-relay-preflight-adapter@0.1.1",
  "@neurarelay/openclaw-preflight-adapter@0.1.1",
  "@neurarelay/openclaw-preflight-adapter@0.1.4",
  "community publications only",
]);
rejectUnsafe("submission", submission);

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-core-skill-pack",
      skill: "skills/openclaw/neura-relay-core",
      canonicalNpmPackage: "@neurarelay/openclaw-preflight-adapter@0.1.1",
      sourcePackageVersion: "@neurarelay/openclaw-preflight-adapter@0.1.4",
      currentClawHubCommunityFallback: "@rpelevin/neura-relay-preflight-adapter@0.1.1",
      canonicalClawHubCommunityPackage: "@neurarelay/openclaw-preflight-adapter@0.1.4",
      clawHubHistoryThread: "openclaw/clawhub#2190",
      boundaries: {
        official_openclaw_or_clawhub_claim: false,
        official_provider_integration_claim: false,
        clawhub_skill_publication_action: false,
        downstream_execution_by_neura: false,
        private_payload_exposure: false,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
