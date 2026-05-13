import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import { createActionCardFromPreflightAction } from "../examples/openclaw/preflight-adapter/adapter.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(file) {
  return readFileSync(join(repoRoot, file), "utf8");
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

test("severe preflight queue exposes one-command scripts", () => {
  assert.equal(
    packageJson.scripts["openclaw:severe-preflight"],
    "node examples/openclaw/run-severe-preflight-queue.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-severe-preflight"],
    "node scripts/verify-openclaw-severe-preflight-queue.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-severe-preflight"],
    "node --test tests/openclaw-severe-preflight-queue.test.mjs",
  );
});

test("queue runner uses the existing preflight adapter contract", () => {
  const runner = read("examples/openclaw/run-severe-preflight-queue.mjs");
  assert.match(runner, /createNeuraPreflightAdapter/);
  assert.match(runner, /adapter\.beforeAction/);
  assert.match(runner, /preflightActionForCheckpoint/);
});

test("adapter conversion keeps generated Action Cards refs-only", () => {
  const preflightAction = {
    family: "browser_submit",
    proposedAction: {
      type: "browser.submit_form",
      summary: "Submit only after external destination refs are reviewed.",
      target: "browser_form_ref:vendor_due_diligence_upload",
    },
    affectedObject: "external_destination_ref:vendor_due_diligence_portal",
    authority: {
      delegatedBy: "user_ref_local_operator",
      actingAgent: "openclaw-severe-preflight-agent",
      authorityScope: "customer_data_export_to_external_portal:browser_submit",
      allowedActions: ["browser.submit_form"],
      allowedResources: ["browser_form_ref:vendor_due_diligence_upload"],
      expiresAt: "2026-12-31T23:59:59Z",
      revocationStatus: "not_authorized",
      policyRefs: ["policy_ref:customer_data_export_to_external_portal:submit_external_portal"],
      authorityScopeRef: "authority_scope_ref:customer_data_export_to_external_portal:browser_submit",
      standingRef: "registry_passport_standing_ref_demo",
    },
    evidenceRefs: [
      "evidence_ref:customer_data_export_to_external_portal:submit_external_portal:operator_intent",
      "scenario_ref:customer_data_export_to_external_portal",
    ],
    ruleRefs: ["rule_ref:customer_data_export_to_external_portal:critical:browser_submit"],
    riskCategory: "critical",
  };

  const actionCard = createActionCardFromPreflightAction(preflightAction);
  assert.equal(actionCard.version, "0.1");
  assert.equal(actionCard.proposedAction.type, "browser.submit_form");
  assert.equal(actionCard.proposedAction.target, "browser_form_ref:vendor_due_diligence_upload");
  assert.equal(actionCard.context.authorityContext.revocationStatus, "not_authorized");
  assert.equal(actionCard.context.requestedOutcome, "decision_receipt");
  assert.equal(JSON.stringify(actionCard).includes("\"formValues\""), false);
});

test("severe preflight queue generates a dry-run transcript without execution", () => {
  const outDir = mkdtempSync(join(tmpdir(), "neura-openclaw-severe-preflight-test-"));
  const result = runNode([
    "examples/openclaw/run-severe-preflight-queue.mjs",
    `--out=${outDir}`,
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.proof, "openclaw-severe-preflight-queue");
  assert.equal(payload.mode, "dry_run");
  assert.equal(payload.count.actions, 5);
  assert.equal(payload.count.dry_run_adapter_gates, 5);
  assert.equal(payload.count.live_receipts, 0);
  assert.equal(payload.count.expected_decisions.human_review, 2);
  assert.equal(payload.count.expected_decisions.stop, 2);
  assert.equal(payload.count.expected_decisions.revise, 1);
  assert.equal(payload.boundaries.real_computer_use_execution, false);
  assert.equal(payload.boundaries.downstream_execution_by_neura, false);
  assert.equal(payload.boundaries.developer_owned_execution, true);
  assert.equal(existsSync(join(outDir, "transcript.html")), true);
  assert.equal(existsSync(join(outDir, "transcript.md")), true);
  assert.equal(existsSync(join(outDir, "transcript.json")), true);

  const report = JSON.parse(readFileSync(join(outDir, "transcript.json"), "utf8"));
  for (const row of report.queue) {
    assert.equal(row.execution_attempted, false);
    assert.equal(row.execution_owner, "developer_runtime");
    assert.equal(row.adapter_result.mode, "dry_run");
    assert.equal(row.adapter_result.route, "relay_receipt_required_before_execution");
    assert.equal(row.action_card.version, "0.1");
    assert.match(row.action_card.proposedAction.target, /_ref:/);
  }

  const html = readFileSync(join(outDir, "transcript.html"), "utf8");
  assert.match(html, /OpenClaw Severe Preflight Queue/);
  assert.match(html, /Adapter preflight/);
  assert.match(html, /Execution attempted/);
});

test("severe preflight docs and README expose the queue without approval claims", () => {
  const docs = read("docs/openclaw-severe-preflight-queue.md");
  const readme = read("README.md");
  const journeyDoc = read("docs/openclaw-developer-journey.md");

  assert.match(docs, /OpenClaw Severe Preflight Queue/);
  assert.match(docs, /npm run openclaw:severe-preflight/);
  assert.match(docs, /artifacts\/openclaw-severe-preflight-queue\/transcript\.html/);
  assert.match(readme, /docs\/openclaw-severe-preflight-queue\.md/);
  assert.match(journeyDoc, /Severe Preflight Queue/);

  for (const text of [docs, readme, journeyDoc]) {
    assert.doesNotMatch(text, /approved by OpenClaw|partnered with OpenClaw|listed on ClawHub/);
    assert.doesNotMatch(text, /official OpenClaw listing|official ClawHub listing/);
    assert.doesNotMatch(text, /executes downstream actions by Neura/);
  }
});
