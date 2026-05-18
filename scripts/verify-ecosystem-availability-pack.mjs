#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const failures = [];
const requiredScripts = {
  "proof:mcp": "node scripts/run-ecosystem-proof.mjs --ecosystem=mcp",
  "proof:openai": "node scripts/run-ecosystem-proof.mjs --ecosystem=openai",
  "proof:claude": "node scripts/run-ecosystem-proof.mjs --ecosystem=claude",
  "proof:a2a": "node scripts/run-ecosystem-proof.mjs --ecosystem=a2a",
  "proof:openclaw": "node scripts/run-ecosystem-proof.mjs --ecosystem=openclaw",
  "proof:swarm-authority":
    "node scripts/run-ecosystem-proof.mjs --ecosystem=swarm-authority",
  "verify:ecosystem-availability-pack":
    "node scripts/verify-ecosystem-availability-pack.mjs",
};
const proofCommands = [
  "proof:mcp",
  "proof:openai",
  "proof:claude",
  "proof:a2a",
  "proof:openclaw",
  "proof:swarm-authority",
];
const docsPath = resolve(repoRoot, "docs/ecosystem-availability.md");
const readmePath = resolve(repoRoot, "README.md");
const packageJsonPath = resolve(repoRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

function requireIncludes(label, source, phrase) {
  if (!source.includes(phrase)) {
    failures.push(`${label}_missing_${phrase.replaceAll(/\W+/g, "_")}`);
  }
}

function runProof(script) {
  const run = spawnSync("npm", ["run", script, "--", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (run.status !== 0) {
    failures.push(`${script}_dry_run_failed_${run.status}_${run.stderr.slice(-200)}`);
    return null;
  }

  try {
    return JSON.parse(run.stdout.slice(run.stdout.indexOf("{")));
  } catch (error) {
    failures.push(`${script}_dry_run_json_parse_failed_${error.message}`);
    return null;
  }
}

if (!existsSync(docsPath)) failures.push("missing_docs_ecosystem_availability");

const docs = existsSync(docsPath) ? readFileSync(docsPath, "utf8") : "";
const readme = readFileSync(readmePath, "utf8");
const runner = readFileSync(resolve(repoRoot, "scripts/run-ecosystem-proof.mjs"), "utf8");

for (const [name, command] of Object.entries(requiredScripts)) {
  if (packageJson.scripts?.[name] !== command) {
    failures.push(`package_json_missing_${name}`);
  }
}

for (const phrase of [
  "Use Neura Today",
  "npm run proof:mcp -- --dry-run --json",
  "npm run proof:openai -- --dry-run --json",
  "npm run proof:claude -- --dry-run --json",
  "npm run proof:a2a -- --agent-card-only --json",
  "npm run proof:openclaw -- --dry-run --json",
  "npm run proof:swarm-authority -- --dry-run --json",
  "source/campaign/surface",
  "No provider approval, listing, endorsement, integration, or partnership is claimed",
]) {
  requireIncludes("docs", docs, phrase);
}

requireIncludes(
  "readme",
  readme,
  "Ecosystem Availability: Use Neura Today",
);
requireIncludes("runner", runner, "provider_listing_or_partnership_claim: false");
requireIncludes("runner", runner, "public_production_mcp_token_issuance: false");
requireIncludes("runner", runner, "downstream_execution_by_neura: false");

const forbiddenPositiveClaims = [
  /OpenAI\s+(approved|endorsed|listed|partnered)/i,
  /Anthropic\s+(approved|endorsed|listed|partnered)/i,
  /OpenClaw\s+(approved|endorsed|listed|partnered)/i,
  /ClawHub\s+(approved|endorsed|listed|partnered)/i,
  /A2A\s+(approved|endorsed|listed|partnered)/i,
  /public production MCP token\s+(is|issued|available|enabled)\b/i,
  /public A2A token\s+(is|issued|available|enabled)\b/i,
  /Neura executes downstream/i,
];

for (const pattern of forbiddenPositiveClaims) {
  if (pattern.test(docs)) failures.push(`docs_forbidden_claim_${pattern.source}`);
}

const dryRunOutputs = [];
for (const script of proofCommands) {
  const output = runProof(script);
  if (!output) continue;
  dryRunOutputs.push(output);

  if (output.ok !== true) failures.push(`${script}_output_not_ok`);
  if (output.dry_run_credential_free !== true) {
    failures.push(`${script}_dry_run_not_credential_free`);
  }
  if (!output.activation_attribution?.enabled) {
    failures.push(`${script}_missing_attribution`);
  }
  if (!output.activation_attribution?.neura_source) {
    failures.push(`${script}_missing_source`);
  }
  if (!output.activation_attribution?.neura_campaign) {
    failures.push(`${script}_missing_campaign`);
  }
  if (!output.activation_attribution?.neura_surface) {
    failures.push(`${script}_missing_surface`);
  }
  if (output.boundaries?.provider_listing_or_partnership_claim !== false) {
    failures.push(`${script}_provider_claim_boundary_open`);
  }
  if (output.boundaries?.downstream_execution_by_neura !== false) {
    failures.push(`${script}_downstream_execution_boundary_open`);
  }
}

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        verifier: "ecosystem-availability-pack",
        failures,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      verifier: "ecosystem-availability-pack",
      proof_commands: proofCommands,
      ecosystems: dryRunOutputs.map((output) => output.ecosystem),
      boundary_locked: true,
    },
    null,
    2,
  ),
);
