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
    "official OpenAI approval",
    "official Anthropic approval",
    "OpenAI partnership",
    "Anthropic partnership",
    "Claude partnership",
    "public API key issuance",
    "public production MCP token issuance",
    "public A2A token issuance",
    "downstream execution by Neura",
    "PRIVATE_KEY",
    "SECRET",
    "PASSWORD",
    "token_value",
    "private_payload_value",
  ];
  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_${phrase}`);
  }
}

const requiredFiles = [
  "skills/neura-action-card/SKILL.md",
  "skills/neura-action-card/templates/action-card.v0.1.json",
  "skills/neura-action-card/examples/support-reply.md",
  "skills/neura-action-card/examples/crm-update.md",
  "skills/neura-authority-review/SKILL.md",
  "skills/neura-authority-review/references/authority-decision-checklist.md",
  "skills/neura-authority-review/examples/review-output.md",
  "skills/neura-first-receipt/SKILL.md",
  "skills/neura-first-receipt/scripts/run-first-receipt.mjs",
  "skills/neura-first-receipt/examples/first-receipt-output.md",
  "docs/skills-adoption-pack.md",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["verify:skills-adoption-pack"] !==
  "node scripts/verify-skills-adoption-pack.mjs"
) {
  failures.push("package_script_missing_skills_adoption_pack");
}

const skillFiles = [
  "skills/neura-action-card/SKILL.md",
  "skills/neura-authority-review/SKILL.md",
  "skills/neura-first-receipt/SKILL.md",
];

for (const file of skillFiles) {
  const text = read(file);
  requireIncludes(file, text, ["---", "name:", "description:"]);
  requireIncludes(file, text, ["Decision Receipt", "downstream execution"]);
  rejectUnsafe(file, text);
}

const template = JSON.parse(read("skills/neura-action-card/templates/action-card.v0.1.json"));
if (template.version !== "0.1") failures.push("template_wrong_version");
if (!template.agent?.id || !template.agent?.capabilityVersion) {
  failures.push("template_missing_agent_refs");
}
if (!template.context?.authorityContext?.allowedActions?.length) {
  failures.push("template_missing_authority_allowed_actions");
}
if (!Array.isArray(template.context?.evidenceRefs)) {
  failures.push("template_missing_evidence_refs");
}

const docs = read("docs/skills-adoption-pack.md");
requireIncludes("docs", docs, [
  "Skills Adoption Pack v0.1",
  "not an official OpenAI, Codex, Anthropic, Claude, MCP, or A2A marketplace integration",
  "developer-owned execution",
  "npm run verify:skills-adoption-pack",
]);
rejectUnsafe("docs", docs);

const script = read("skills/neura-first-receipt/scripts/run-first-receipt.mjs");
requireIncludes("first_receipt_script", script, [
  "https://www.neurarelay.com",
  "/api/resolve",
  "decision_receipt",
  "transaction_ledger",
]);
rejectUnsafe("first_receipt_script", script);

const readme = read("README.md");
requireIncludes("readme", readme, ["docs/skills-adoption-pack.md", "skills/neura-action-card"]);

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "skills-adoption-pack",
      skills: [
        "skills/neura-action-card",
        "skills/neura-authority-review",
        "skills/neura-first-receipt",
      ],
      boundaries: {
        official_provider_integration_claim: false,
        public_api_key_issuance: false,
        public_production_mcp_token_issuance: false,
        public_a2a_token_issuance: false,
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
