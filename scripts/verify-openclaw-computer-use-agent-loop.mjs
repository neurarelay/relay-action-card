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

const result = run("node", ["examples/openclaw/integrations/computer-use-agent-loop.mjs", "--json"]);
let payload = null;

if (result.status !== 0) {
  failures.push(`loop_failed_${result.stderr || result.stdout}`);
} else {
  try {
    payload = JSON.parse(result.stdout);
  } catch (error) {
    failures.push(`loop_not_json_${error.message}`);
  }
}

if (payload) {
  if (payload.ok !== true) failures.push("payload_not_ok");
  if (payload.mode !== "dry_run") failures.push("payload_not_dry_run");
  if (payload.loop?.planned_actions !== 3) failures.push("wrong_planned_action_count");
  if (payload.loop?.execution_attempted !== false) failures.push("loop_attempted_execution");
  if (payload.boundaries?.official_openclaw_or_clawhub_claim !== false) {
    failures.push("claim_boundary_changed");
  }
  if (payload.boundaries?.downstream_execution_by_neura !== false) {
    failures.push("downstream_boundary_changed");
  }

  const expected = ["message.send", "file.delete", "package.publish"];
  const actual = (payload.checkpoints ?? []).map((checkpoint) => checkpoint.action_type);
  for (const action of expected) {
    if (!actual.includes(action)) failures.push(`missing_action_${action}`);
  }
  for (const checkpoint of payload.checkpoints ?? []) {
    if (checkpoint.execution_attempted !== false) failures.push(`${checkpoint.action_id}_attempted`);
    if (checkpoint.execution_owner !== "developer_runtime") failures.push(`${checkpoint.action_id}_owner`);
    if (checkpoint.loop_state !== "paused_before_execution") failures.push(`${checkpoint.action_id}_state`);
    if (!checkpoint.route?.includes("before_execution")) failures.push(`${checkpoint.action_id}_route`);
  }
}

const doc = readFileSync(join(repoRoot, "docs/openclaw-computer-use-agent-loop.md"), "utf8");
for (const required of [
  "beforeExecute(action)",
  "adapter.beforeAction(preflightAction)",
  "message.send",
  "file.delete",
  "package.publish",
  "execution_attempted: false",
  "developer runtime owns execution",
  "not an official OpenClaw or ClawHub integration",
]) {
  if (!doc.includes(required)) failures.push(`doc_missing_${required}`);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-computer-use-agent-loop",
      checkpoints: payload?.checkpoints?.map((checkpoint) => ({
        action_id: checkpoint.action_id,
        action_type: checkpoint.action_type,
        route: checkpoint.route,
        execution_attempted: checkpoint.execution_attempted,
        loop_state: checkpoint.loop_state,
      })),
      boundaries: {
        official_openclaw_or_clawhub_claim: false,
        downstream_execution_by_neura: false,
        developer_owned_execution: true,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);

