#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`${label}_not_json_${error.message}`);
    return null;
  }
}

const result = run("node", ["examples/openclaw/run-copy-paste-agent-integration.mjs", "--json"]);
if (result.status !== 0) failures.push(`integration_failed_${result.stderr || result.stdout}`);

const payload = result.status === 0 ? parseJson("integration", result.stdout) : null;
const expected = new Map([
  ["before-message-send", "message.send"],
  ["before-file-delete", "file.delete"],
  ["before-package-publish", "package.publish"],
]);

if (payload) {
  if (payload.ok !== true) failures.push("payload_not_ok");
  if (payload.mode !== "dry_run") failures.push("payload_not_dry_run");
  if (payload.boundaries?.official_openclaw_or_clawhub_claim !== false) {
    failures.push("claim_boundary_changed");
  }
  if (payload.boundaries?.downstream_execution_by_neura !== false) {
    failures.push("downstream_boundary_changed");
  }
  if (payload.boundaries?.developer_owned_execution !== true) {
    failures.push("developer_owned_execution_missing");
  }

  const byId = new Map((payload.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  for (const [id, type] of expected) {
    const scenario = byId.get(id);
    if (!scenario) {
      failures.push(`missing_${id}`);
      continue;
    }
    if (scenario.type !== type) failures.push(`${id}_wrong_type`);
    if (scenario.execution_owner !== "developer_runtime") failures.push(`${id}_wrong_owner`);
    if (scenario.execution_attempted !== false) failures.push(`${id}_attempted_execution`);
    if (scenario.execution_allowed !== false) failures.push(`${id}_should_hold_in_dry_run`);
    if (!scenario.route?.includes("before_execution")) failures.push(`${id}_missing_before_route`);
  }
}

const doc = readFileSync(join(repoRoot, "docs/openclaw-copy-paste-agent-integration.md"), "utf8");
for (const required of [
  "guardToolCall(toolCall)",
  "adapter.beforeAction(preflightAction)",
  "message.send",
  "file.delete",
  "package.publish",
  "developer runtime keeps execution ownership",
  "not an official OpenClaw or ClawHub integration",
]) {
  if (!doc.includes(required)) failures.push(`doc_missing_${required}`);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-copy-paste-agent-integration",
      scenarios: payload?.scenarios?.map((scenario) => ({
        id: scenario.id,
        type: scenario.type,
        route: scenario.route,
        execution_owner: scenario.execution_owner,
        execution_attempted: scenario.execution_attempted,
      })),
      boundaries: {
        official_openclaw_or_clawhub_claim: false,
        downstream_execution_by_neura: false,
        developer_owned_execution: true,
        private_payload_exposure: false,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);

