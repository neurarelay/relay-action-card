#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const docPath = join(repoRoot, "docs/openclaw-clawhub-response-checklist.md");
const doc = readFileSync(docPath, "utf8");
const failures = [];

for (const required of [
  "If Publisher Access Is Granted",
  "If Maintainers Ask For Authority Proof",
  "If Maintainers Request Package Changes",
  "If Access Is Rejected Or Deferred",
  "npm run verify:openclaw-clawhub-release",
  "clawhub package publish examples/openclaw/preflight-adapter",
  "--dry-run --json",
  "Approved: publish @neurarelay/openclaw-preflight-adapter@0.1.0 to ClawHub.",
  "openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.0",
  "no official OpenClaw / ClawHub integration",
  "no downstream execution by Neura",
  "no private payload exposure",
]) {
  if (!doc.includes(required)) failures.push(`missing_${required}`);
}

if (/official OpenClaw \/ ClawHub (integration|listing|approval|publication|partnership)[^.\\n]*\\./i.test(doc)) {
  const allowed = [
    "no official OpenClaw / ClawHub integration, listing, approval, publication, partnership, endorsement, or namespace approval claim until it is real",
  ];
  for (const line of doc.split("\n")) {
    if (
      /official OpenClaw \/ ClawHub (integration|listing|approval|publication|partnership)/i.test(line) &&
      !allowed.some((text) => line.includes(text))
    ) {
      failures.push(`possible_forbidden_claim_${line.trim()}`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-clawhub-response-checklist",
      doc: "docs/openclaw-clawhub-response-checklist.md",
      gates: {
        roman_approval_required_before_publish: doc.includes(
          "Approved: publish @neurarelay/openclaw-preflight-adapter@0.1.0 to ClawHub.",
        ),
        dry_run_before_publish: doc.includes("--dry-run --json"),
        post_publish_install_check: doc.includes(
          "openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.0",
        ),
      },
      boundaries: {
        official_openclaw_or_clawhub_claim: false,
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

