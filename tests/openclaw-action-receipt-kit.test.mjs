import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  return spawnSync("node", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const manifest = readJson("examples/openclaw/action-receipt-kit.manifest.json");
const packageJson = readJson("package.json");
const disallowedCardKeys = new Set([
  "body",
  "content",
  "messageBody",
  "fileContents",
  "formValues",
  "command",
  "rawCommand",
  "token",
  "secret",
  "password",
]);

test("OpenClaw Action Receipt Kit exposes the one-command contract", () => {
  assert.equal(manifest.name, "neura-openclaw-action-receipt-kit");
  assert.equal(manifest.version, "0.1-rc");
  assert.equal(manifest.status, "local_release_candidate");
  assert.equal(manifest.official_openclaw_or_clawhub_claim, false);
  assert.equal(manifest.boundaries.refs_only, true);

  for (const [key, value] of Object.entries(manifest.boundaries)) {
    if (key !== "refs_only") assert.equal(value, false, `${key} must remain false`);
  }

  assert.equal(
    packageJson.scripts["openclaw:dry-run"],
    "node examples/openclaw/run-action-receipt-kit.mjs --dry-run",
  );
  assert.equal(
    packageJson.scripts["openclaw:receipts"],
    "node examples/openclaw/run-action-receipt-kit.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-action-receipt-kit"],
    "node scripts/verify-openclaw-action-receipt-kit.mjs",
  );
  assert.equal(
    packageJson.scripts["openclaw:workbench"],
    "node examples/openclaw/run-near-miss-workbench.mjs",
  );
  assert.equal(
    packageJson.scripts["verify:openclaw-workbench"],
    "node scripts/verify-openclaw-near-miss-workbench.mjs",
  );
});

test("manifest covers the adoption-critical action families", () => {
  const families = new Set(manifest.examples.map((example) => example.family));
  assert.deepEqual(families, new Set([
    "outbound_message",
    "file_edit",
    "file_delete",
    "browser_submit",
    "shell_command",
    "workflow_transition",
    "memory_write",
    "data_export",
  ]));

  const ids = manifest.examples.map((example) => example.id);
  assert.deepEqual(ids, [
    "send-message",
    "edit-file",
    "delete-file",
    "browser-submit",
    "shell-command",
    "workflow-state-change",
    "memory-write",
    "data-export",
  ]);
});

test("all Action Cards are refs-only and authority-scoped", () => {
  const actionCardFiles = readdirSync(path("examples/openclaw/action-cards"))
    .filter((file) => file.endsWith(".json"))
    .sort();
  const manifestPaths = new Set(manifest.examples.map((example) => example.path));

  assert.equal(actionCardFiles.length, manifest.examples.length);

  for (const file of actionCardFiles) {
    const relative = `examples/openclaw/action-cards/${file}`;
    const card = readJson(relative);
    assert.equal(manifestPaths.has(relative), true, `${relative} missing from manifest`);
    assert.equal(card.version, "0.1");
    assert.ok(card.agent.id);
    assert.ok(card.agent.capabilityVersion);
    assert.ok(card.proposedAction.type);
    assert.ok(card.proposedAction.target);
    assert.ok(card.affectedObject);
    assert.equal(card.context.requestedOutcome, "decision_receipt");
    assert.ok(card.context.evidenceRefs.length > 0);
    assert.ok(card.context.ruleRefs.length > 0);
    assert.equal(
      card.context.authorityContext.allowedActions.includes(card.proposedAction.type),
      true,
    );
    assert.equal(
      card.context.authorityContext.allowedResources.includes(card.proposedAction.target),
      true,
    );

    const serialized = JSON.stringify(card);
    for (const key of disallowedCardKeys) {
      assert.equal(serialized.includes(`"${key}"`), false, `${relative} includes ${key}`);
    }
  }
});

test("core example aliases expose every OpenClaw fixture", () => {
  const runner = read("examples/core/resolve-action-card.mjs");
  for (const alias of [
    "openclaw-send-message",
    "openclaw-edit-file",
    "openclaw-delete-file",
    "openclaw-browser-submit",
    "openclaw-shell-command",
    "openclaw-workflow-state-change",
    "openclaw-memory-write",
    "openclaw-data-export",
  ]) {
    assert.match(runner, new RegExp(alias));
  }
});

test("docs and skills keep the public-safe boundary", () => {
  const docs = [
    "README.md",
    "CHANGELOG.md",
    ".github/workflows/openclaw-action-receipt-kit.yml",
    "docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png",
    "docs/assets/openclaw-near-miss-workbench/near-miss-workbench-mobile.png",
    "docs/openclaw-action-receipt-pack.md",
    "docs/openclaw-near-miss-workbench.md",
    "examples/openclaw/README.md",
    "skills/openclaw/neura-action-card/SKILL.md",
    "skills/openclaw/neura-before-send/SKILL.md",
    "skills/openclaw/neura-file-change-review/SKILL.md",
    "skills/openclaw/neura-browser-action-review/SKILL.md",
    "skills/openclaw/neura-shell-command-review/SKILL.md",
    "skills/openclaw/neura-memory-write-review/SKILL.md",
    "skills/openclaw/neura-data-export-review/SKILL.md",
  ];

  for (const file of docs) {
    assert.equal(existsSync(path(file)), true, `${file} missing`);
    if (file.endsWith(".png")) continue;
    const text = read(file);
    assert.doesNotMatch(text, /approved by OpenClaw|partnered with OpenClaw|listed on ClawHub/);
    assert.doesNotMatch(text, /official OpenAI approval|official Anthropic approval/);
    assert.doesNotMatch(text, /enables public API key issuance|enables public A2A token issuance/);
    assert.doesNotMatch(text, /executes downstream actions by Neura/);
  }
});

test("GitHub Actions keeps local checks automatic and live receipts manual", () => {
  const workflow = read(".github/workflows/openclaw-action-receipt-kit.yml");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.equal(workflow.includes("docs/assets/openclaw-near-miss-workbench/**"), true);
  assert.match(workflow, /npm run test:openclaw-kit/);
  assert.match(workflow, /npm run verify:openclaw-action-receipt-kit/);
  assert.match(workflow, /npm run verify:openclaw-action-receipt-pack/);
  assert.match(workflow, /npm run openclaw:dry-run -- --json/);
  assert.match(workflow, /npm run openclaw:workbench/);
  assert.match(workflow, /npm run test:openclaw-kit:e2e/);
  assert.match(workflow, /npm run openclaw:receipts -- --json/);
  assert.match(workflow, /npm run test:openclaw-preflight-adapter/);
  assert.match(workflow, /npm run verify:openclaw-preflight-adapter/);
  assert.match(workflow, /npm run openclaw:preflight:dry-run -- --json/);
});

test("README exposes the visual OpenClaw proof before setup", () => {
  const readme = read("README.md");
  assert.equal(
    readme.includes("docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png"),
    true,
  );
  assert.match(readme, /OpenClaw 60-second local proof/);
  assert.match(readme, /Repository Map/);
  assert.equal(readme.includes("examples/openclaw/"), true);
  assert.equal(readme.includes("near-miss-workbench/"), true);
  assert.equal(readme.includes("preflight-adapter/"), true);
  assert.equal(readme.includes("skills/openclaw/"), true);
  assert.match(readme, /npm run openclaw:workbench/);
  assert.match(readme, /npm run openclaw:dry-run -- --json/);
  assert.match(readme, /npm run openclaw:receipts -- --only=send-message --json/);
  assert.equal(readme.includes("artifacts/openclaw-near-miss-workbench/report.html"), true);
});

test("dry-run returns every fixture and skips Relay calls", () => {
  const result = runNode([
    "examples/openclaw/run-action-receipt-kit.mjs",
    "--dry-run",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "dry_run");
  assert.equal(payload.count, manifest.examples.length);
  assert.equal(payload.relay, null);
  assert.equal(payload.results.length, manifest.examples.length);

  for (const item of payload.results) {
    assert.equal(item.relay_call_skipped, true);
    assert.equal(item.refs_only, true);
  }
});

test("list command is machine-readable", () => {
  const result = runNode([
    "examples/openclaw/run-action-receipt-kit.mjs",
    "--list",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.length, manifest.examples.length);
  assert.deepEqual(payload.map((item) => item.id), manifest.examples.map((item) => item.id));
});
