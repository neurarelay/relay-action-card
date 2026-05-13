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
  return spawnSync("node", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const model = readJson("examples/openclaw/workspace-surface/scenarios.json");
const packageJson = readJson("package.json");

test("workspace surface exposes a one-command proof", () => {
  assert.equal(model.name, "neura-openclaw-os-decision-receipt-surface");
  assert.equal(model.status, "local_workspace_surface");
  assert.equal(model.official_openclaw_os_openui_openclaw_or_clawhub_claim, false);
  assert.equal(
    packageJson.scripts["openclaw:workspace-proof"],
    "node examples/openclaw/run-workspace-decision-surface.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-workspace-surface"],
    "node scripts/verify-openclaw-workspace-surface.mjs",
  );
  assert.equal(
    packageJson.scripts["test:openclaw-workspace-surface"],
    "node --test tests/openclaw-workspace-surface.test.mjs",
  );
});

test("workspace surface covers persistent autonomous workspace actions", () => {
  assert.deepEqual(
    model.actions.map((action) => action.id),
    [
      "generated-app-deploy",
      "artifact-publish",
      "scheduled-cron-action",
      "workflow-monitor-intervention",
      "session-memory-write",
      "browser-direct-control",
      "shell-file-operation",
    ],
  );
  assert.deepEqual(
    new Set(model.actions.map((action) => action.surface)),
    new Set([
      "generated_app",
      "artifact",
      "cron",
      "workflow_monitor",
      "session_memory",
      "direct_control",
      "shell_file",
    ]),
  );
});

test("workspace actions cover all receipt routes and stay refs-only", () => {
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
    new Set(model.actions.map((action) => action.decision)),
    new Set(["stop", "human_review", "revise", "proceed"]),
  );

  for (const action of model.actions) {
    assert.match(action.target_ref, /_ref:/);
    assert.match(action.affected_object_ref, /_ref:/);
    assert.ok(action.authority_engine_posture);
    assert.ok(action.readiness_path);
    assert.ok(action.developer_owned_next_step);
  }
});

test("workspace proof generation creates visual, markdown, and JSON reports", () => {
  const outDir = mkdtempSync(join(tmpdir(), "neura-openclaw-workspace-surface-test-"));
  const result = runNode([
    "examples/openclaw/run-workspace-decision-surface.mjs",
    `--out=${outDir}`,
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.count.actions, 7);
  assert.equal(payload.count.decisions.stop, 2);
  assert.equal(payload.count.decisions.human_review, 2);
  assert.equal(payload.count.decisions.revise, 2);
  assert.equal(payload.count.decisions.proceed, 1);

  const html = readFileSync(join(outDir, "report.html"), "utf8");
  const markdown = readFileSync(join(outDir, "report.md"), "utf8");
  const report = JSON.parse(readFileSync(join(outDir, "report.json"), "utf8"));

  assert.match(html, /OpenClaw OS Decision Receipt Surface/);
  assert.match(html, /Workspace action/);
  assert.match(html, /Authority Engine posture/);
  assert.match(html, /Decision Receipt/);
  assert.match(html, /Developer route/);
  assert.match(html, /Generated App Deploy/);
  assert.match(html, /Artifact Publish/);
  assert.match(html, /Scheduled Cron Action/);
  assert.match(markdown, /Workspace Actions/);
  assert.equal(report.count.actions, 7);
});

test("workspace docs and README expose the proof without official claims", () => {
  const docs = read("docs/openclaw-os-decision-receipt-surface.md");
  const readme = read("README.md");
  const examplesReadme = read("examples/openclaw/README.md");

  assert.equal(existsSync(join(repoRoot, "docs/openclaw-os-decision-receipt-surface.md")), true);
  assert.match(docs, /OpenClaw OS Decision Receipt Surface v0.1/);
  assert.match(docs, /npm run openclaw:workspace-proof/);
  assert.match(docs, /artifacts\/openclaw-workspace-decision-surface\/report\.html/);
  assert.match(docs, /not an official OpenClaw OS, OpenUI, OpenClaw, or ClawHub/);

  assert.match(readme, /OpenClaw OS Decision Receipt Surface/);
  assert.match(readme, /npm run openclaw:workspace-proof/);
  assert.match(examplesReadme, /Workspace Decision Receipt Surface/);
  assert.match(examplesReadme, /npm run openclaw:workspace-proof/);

  for (const text of [docs, readme, examplesReadme]) {
    assert.doesNotMatch(text, /approved by OpenClaw|partnered with OpenClaw|listed on ClawHub/);
    assert.doesNotMatch(text, /official OpenClaw OS integration|official OpenUI integration/);
    assert.doesNotMatch(text, /executes downstream actions by Neura/);
  }
});

test("workspace surface keeps every real execution boundary closed", () => {
  assert.equal(model.boundaries.refs_only, true);
  assert.equal(model.boundaries.safe_local_projection, true);
  for (const key of [
    "real_app_deploy",
    "real_artifact_publish",
    "real_cron_schedule",
    "real_workflow_transition",
    "real_memory_write",
    "real_browser_submit",
    "real_shell_or_file_execution",
    "downstream_execution_by_neura",
    "private_payload_exposure",
    "public_token_or_key_issuance",
    "registry_auto_approval",
    "official_openclaw_os_openui_openclaw_or_clawhub_claim",
  ]) {
    assert.equal(model.boundaries[key], false, `${key} must remain false`);
  }
});
