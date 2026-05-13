import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function path(file) {
  return join(repoRoot, file);
}

function read(file) {
  return readFileSync(path(file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function runNode(args) {
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const packageJson = readJson("package.json");

test("package exposes one OpenClaw developer journey command", () => {
  assert.equal(
    packageJson.scripts["openclaw:proof"],
    "node examples/openclaw/run-developer-journey-proof.mjs",
  );
  assert.equal(
    packageJson.scripts["openclaw:workspace-proof"],
    "node examples/openclaw/run-workspace-decision-surface.mjs",
  );
  assert.equal(
    packageJson.scripts["openclaw:severe-proof"],
    "node examples/openclaw/run-severe-scenario-proof.mjs",
  );
  assert.equal(
    packageJson.scripts["openclaw:severe-preflight"],
    "node examples/openclaw/run-severe-preflight-queue.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-developer-journey"],
    "node scripts/verify-openclaw-developer-journey.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-workspace-surface"],
    "node scripts/verify-openclaw-workspace-surface.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-severe-proof"],
    "node scripts/verify-openclaw-severe-scenario-proof.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-severe-preflight"],
    "node scripts/verify-openclaw-severe-preflight-queue.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-developer-journey"],
    "node --test tests/openclaw-developer-journey.test.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-workspace-surface"],
    "node --test tests/openclaw-workspace-surface.test.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-severe-proof"],
    "node --test tests/openclaw-severe-scenario-proof.test.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-severe-preflight"],
    "node --test tests/openclaw-severe-preflight-queue.test.mjs",
  );
});

test("developer journey docs make clone to confidence explicit", () => {
  const doc = read("docs/openclaw-developer-journey.md");
  assert.match(doc, /git clone https:\/\/github\.com\/neurarelay\/relay-action-card\.git/);
  assert.match(doc, /npm run openclaw:proof/);
  assert.match(doc, /npm run openclaw:proof -- --live/);
  assert.match(doc, /npm run openclaw:workspace-proof/);
  assert.match(doc, /npm run openclaw:severe-proof/);
  assert.match(doc, /npm run openclaw:severe-preflight/);
  assert.match(doc, /artifacts\/openclaw-near-miss-workbench\/report\.html/);
  assert.match(doc, /artifacts\/openclaw-workspace-decision-surface\/report\.html/);
  assert.match(doc, /artifacts\/openclaw-severe-scenario-proof\/report\.html/);
  assert.match(doc, /artifacts\/openclaw-severe-preflight-queue\/transcript\.html/);
  assert.match(doc, /what the agent was about to do/);
  assert.match(doc, /what Neura caught/);
  assert.match(doc, /the receipt route/);
  assert.match(doc, /developer-owned next step/);
  assert.match(doc, /beforeAction\(preflightAction\)/);
  assert.match(doc, /not submitted, listed, approved, or partnered/);
});

test("README points OpenClaw developers to the one-command proof", () => {
  const readme = read("README.md");
  assert.match(readme, /OpenClaw Developer Journey Proof/);
  assert.match(readme, /OpenClaw OS Decision Receipt Surface/);
  assert.match(readme, /Severe Scenario Proof Pack/);
  assert.match(readme, /Severe Preflight Queue/);
  assert.match(readme, /docs\/openclaw-developer-journey\.md/);
  assert.match(readme, /docs\/openclaw-os-decision-receipt-surface\.md/);
  assert.match(readme, /docs\/openclaw-severe-scenario-proof-pack\.md/);
  assert.match(readme, /docs\/openclaw-severe-preflight-queue\.md/);
  assert.match(readme, /npm run openclaw:proof/);
  assert.match(readme, /npm run openclaw:proof -- --live/);
  assert.match(readme, /npm run openclaw:workspace-proof/);
  assert.match(readme, /npm run openclaw:severe-proof/);
  assert.match(readme, /npm run openclaw:severe-preflight/);
});

test("local journey proof runs without live Relay receipt calls", () => {
  const result = runNode(["examples/openclaw/run-developer-journey-proof.mjs", "--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.proof, "openclaw-developer-journey");
  assert.equal(payload.mode, "local_only");
  assert.equal(payload.artifacts.workbench_html, "artifacts/openclaw-near-miss-workbench/report.html");
  assert.equal(
    payload.artifacts.workspace_surface_html,
    "artifacts/openclaw-workspace-decision-surface/report.html",
  );
  assert.equal(
    payload.artifacts.severe_scenario_html,
    "artifacts/openclaw-severe-scenario-proof/report.html",
  );
  assert.equal(
    payload.artifacts.severe_preflight_html,
    "artifacts/openclaw-severe-preflight-queue/transcript.html",
  );
  assert.equal(payload.local_summary.journeys, 3);
  assert.equal(payload.local_summary.workspace_actions, 7);
  assert.equal(payload.local_summary.severe_checkpoints, 5);
  assert.equal(payload.local_summary.severe_preflight_actions, 5);
  assert.equal(payload.local_summary.severe_preflight_adapter_gates, 5);
  assert.equal(payload.local_summary.dry_run_fixtures, 8);
  assert.equal(payload.live_summary.enabled, false);
  assert.equal(payload.boundaries.official_openclaw_or_clawhub_claim, false);
  assert.equal(payload.boundaries.downstream_execution_by_neura, false);
  assert.equal(payload.boundaries.private_payload_exposure, false);
  assert.equal(payload.boundaries.developer_owned_execution, true);
  assert.equal(payload.boundaries.refs_only, true);
  assert.equal(existsSync(path(payload.artifacts.workbench_html)), true);
  assert.equal(existsSync(path(payload.artifacts.workspace_surface_html)), true);
  assert.equal(existsSync(path(payload.artifacts.severe_scenario_html)), true);
  assert.equal(existsSync(path(payload.artifacts.severe_preflight_html)), true);
});
