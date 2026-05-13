import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readJson(file) {
  return JSON.parse(readFileSync(join(repoRoot, file), "utf8"));
}

function runNode(args) {
  return spawnSync("node", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const model = readJson("examples/openclaw/near-miss-workbench/scenarios.json");
const packageJson = readJson("package.json");

test("near-miss workbench exposes one visual command", () => {
  assert.equal(packageJson.scripts["openclaw:workbench"], "node examples/openclaw/run-near-miss-workbench.mjs");
  assert.equal(
    packageJson.scripts["verify:openclaw-workbench"],
    "node scripts/verify-openclaw-near-miss-workbench.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-workbench"],
    "node --test tests/openclaw-near-miss-workbench.test.mjs",
  );
});

test("workbench includes the three flagship near-miss journeys", () => {
  assert.equal(model.name, "neura-openclaw-near-miss-workbench");
  assert.equal(model.status, "local_visual_workbench");
  assert.deepEqual(
    model.journeys.map((journey) => journey.id),
    [
      "customer-data-exfiltration",
      "production-deployment",
      "expired-delegated-authority",
    ],
  );
});

test("journeys cover all decision routes and remain refs-only", () => {
  const decisions = new Set();
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

  for (const journey of model.journeys) {
    assert.equal(journey.steps.length >= 3, true);
    for (const step of journey.steps) {
      decisions.add(step.decision);
      assert.match(step.target_ref, /_ref:/);
      assert.match(step.affected_object_ref, /_ref:/);
    }
  }

  assert.deepEqual(decisions, new Set(["proceed", "human_review", "stop", "revise"]));
});

test("workbench generation creates visual, markdown, and JSON reports", () => {
  const outDir = mkdtempSync(join(tmpdir(), "neura-openclaw-workbench-test-"));
  const result = runNode([
    "examples/openclaw/run-near-miss-workbench.mjs",
    `--out=${outDir}`,
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.count.journeys, 3);
  assert.equal(payload.count.decisions.proceed, 5);
  assert.equal(payload.count.decisions.human_review, 2);
  assert.equal(payload.count.decisions.revise, 2);
  assert.equal(payload.count.decisions.stop, 3);

  const html = readFileSync(join(outDir, "report.html"), "utf8");
  const markdown = readFileSync(join(outDir, "report.md"), "utf8");
  const report = JSON.parse(readFileSync(join(outDir, "report.json"), "utf8"));

  assert.match(html, /OpenClaw Near-Miss Workbench/);
  assert.match(html, /Receipt before execution/);
  assert.match(html, /Customer Data Exfiltration/);
  assert.match(html, /Production Deployment/);
  assert.match(html, /Expired Delegated Authority/);
  assert.match(html, /What the agent was about to do/);
  assert.match(html, /What Neura caught/);
  assert.match(html, /Receipt route/);
  assert.match(html, /Developer next step/);
  assert.match(html, /scenario-cards/);
  assert.match(html, /proof-line/);
  assert.match(markdown, /Decision Summary/);
  assert.match(markdown, /What the agent was about to do/);
  assert.equal(report.count.journeys, 3);
});

test("GitHub adoption surface carries the visual proof", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  const docs = readFileSync(join(repoRoot, "docs/openclaw-near-miss-workbench.md"), "utf8");

  assert.equal(
    existsSync(join(repoRoot, "docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png")),
    true,
  );
  assert.equal(
    existsSync(join(repoRoot, "docs/assets/openclaw-near-miss-workbench/near-miss-workbench-mobile.png")),
    true,
  );
  assert.equal(
    readme.includes("docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png"),
    true,
  );
  assert.match(readme, /OpenClaw Developer Journey Proof/);
  assert.match(readme, /Repository Map/);
  assert.equal(readme.includes("examples/openclaw/"), true);
  assert.equal(readme.includes("near-miss-workbench/"), true);
  assert.equal(readme.includes("docs/assets/openclaw-near-miss-workbench/"), true);
  assert.match(readme, /npm run openclaw:proof/);
  assert.match(readme, /npm run openclaw:proof -- --live/);
  assert.equal(
    docs.includes("assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png"),
    true,
  );
});

test("workbench keeps every real execution boundary closed", () => {
  assert.equal(model.boundaries.refs_only, true);
  assert.equal(model.boundaries.safe_local_projection, true);
  for (const key of [
    "real_email_send",
    "real_browser_submit",
    "real_file_delete",
    "real_shell_execution",
    "real_deployment",
    "downstream_execution_by_neura",
    "private_payload_exposure",
    "public_token_or_key_issuance",
    "registry_auto_approval",
    "official_openclaw_or_clawhub_claim",
  ]) {
    assert.equal(model.boundaries[key], false, `${key} must remain false`);
  }
});
