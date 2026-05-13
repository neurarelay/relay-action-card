import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";

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

const model = readJson("examples/openclaw/severe-scenario-proof/scenario.json");
const packageJson = readJson("package.json");

test("severe proof exposes one-command scripts", () => {
  assert.equal(model.name, "OpenClaw Severe End-to-End Proof Pack");
  assert.equal(model.mode, "safe_local_projection");
  assert.equal(
    packageJson.scripts["openclaw:severe-proof"],
    "node examples/openclaw/run-severe-scenario-proof.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-severe-proof"],
    "node scripts/verify-openclaw-severe-scenario-proof.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-severe-proof"],
    "node --test tests/openclaw-severe-scenario-proof.test.mjs",
  );
});

test("severe scenario covers one complete autonomous computer-use flow", () => {
  assert.deepEqual(
    model.checkpoints.map((checkpoint) => checkpoint.id),
    [
      "export_customer_accounts",
      "submit_external_portal",
      "send_channel_update",
      "delete_working_copy",
      "close_workflow",
    ],
  );
  assert.deepEqual(
    new Set(model.checkpoints.map((checkpoint) => checkpoint.proposed_action)),
    new Set([
      "data.export",
      "browser.submit_form",
      "message.send",
      "file.delete",
      "workflow.transition",
    ]),
  );
});

test("severe checkpoints stay refs-only and cover blocked routes", () => {
  const serialized = JSON.stringify(model);
  for (const forbidden of [
    "\"body\"",
    "\"content\"",
    "\"messageBody\"",
    "\"fileContents\"",
    "\"formValues\"",
    "\"rawCommand\"",
    "\"token\"",
    "\"secret\"",
    "\"password\"",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `forbidden raw field: ${forbidden}`);
  }

  assert.deepEqual(
    new Set(model.checkpoints.map((checkpoint) => checkpoint.decision)),
    new Set(["human_review", "stop", "revise"]),
  );
  assert.deepEqual(
    new Set(model.checkpoints.map((checkpoint) => checkpoint.risk_class)),
    new Set(["critical", "high"]),
  );

  for (const checkpoint of model.checkpoints) {
    assert.match(checkpoint.target_ref, /_ref:/);
    assert.match(checkpoint.affected_object_ref, /_ref:/);
    assert.ok(checkpoint.what_neura_catches);
    assert.ok(checkpoint.developer_next_step);
  }
});

test("severe proof generation creates visual, markdown, and JSON reports", () => {
  const outDir = mkdtempSync(join(tmpdir(), "neura-openclaw-severe-proof-test-"));
  const result = runNode([
    "examples/openclaw/run-severe-scenario-proof.mjs",
    `--out=${outDir}`,
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.proof, "openclaw-severe-scenario-proof");
  assert.equal(payload.mode, "safe_local_projection");
  assert.equal(payload.count.checkpoints, 5);
  assert.equal(payload.count.decisions.human_review, 2);
  assert.equal(payload.count.decisions.stop, 2);
  assert.equal(payload.count.decisions.revise, 1);
  assert.equal(payload.boundaries.developer_owned_execution, true);
  assert.equal(payload.boundaries.refs_only, true);
  assert.equal(payload.boundaries.downstream_execution_by_neura, false);
  assert.equal(existsSync(join(outDir, "report.html")), true);
  assert.equal(existsSync(join(outDir, "report.md")), true);
  assert.equal(existsSync(join(outDir, "report.json")), true);

  const html = readFileSync(join(outDir, "report.html"), "utf8");
  const markdown = readFileSync(join(outDir, "report.md"), "utf8");
  const report = JSON.parse(readFileSync(join(outDir, "report.json"), "utf8"));

  assert.match(html, /OpenClaw Severe Scenario Proof Pack/);
  assert.match(html, /What Neura catches/);
  assert.match(html, /Developer-owned next step/);
  assert.match(html, /No downstream execution/);
  assert.match(markdown, /Export customer account dataset/);
  assert.match(markdown, /Submit exported data to external vendor portal/);
  assert.equal(report.checkpoints.length, 5);
  assert.equal(report.checkpoints[1].receipt_projection.route, "stop_before_execution");
});

test("severe proof docs and README expose the proof without approval claims", () => {
  const docs = read("docs/openclaw-severe-scenario-proof-pack.md");
  const readme = read("README.md");
  const examplesReadme = read("examples/openclaw/README.md");

  assert.match(docs, /OpenClaw Severe Scenario Proof Pack/);
  assert.match(docs, /npm run openclaw:severe-proof/);
  assert.match(docs, /artifacts\/openclaw-severe-scenario-proof\/report\.html/);
  assert.match(readme, /docs\/openclaw-severe-scenario-proof-pack\.md/);
  assert.match(examplesReadme, /Severe Scenario Proof Pack/);

  for (const text of [docs, readme, examplesReadme]) {
    assert.doesNotMatch(text, /approved by OpenClaw|partnered with OpenClaw|listed on ClawHub/);
    assert.doesNotMatch(text, /official OpenClaw listing|official ClawHub listing/);
    assert.doesNotMatch(text, /executes downstream actions by Neura/);
  }
});
