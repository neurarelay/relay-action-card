import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";

function runLoop(...args) {
  return spawnSync("node", ["examples/openclaw/integrations/computer-use-agent-loop.mjs", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("generic computer-use agent loop pauses before severe local execution", () => {
  const result = runLoop("--json");
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "dry_run");
  assert.equal(payload.loop.planned_actions, 3);
  assert.equal(payload.loop.execution_attempted, false);
  assert.equal(payload.loop.execution_owner, "developer_runtime");
  assert.equal(payload.boundaries.official_openclaw_or_clawhub_claim, false);
  assert.equal(payload.boundaries.downstream_execution_by_neura, false);

  const types = payload.checkpoints.map((checkpoint) => checkpoint.action_type);
  assert.deepEqual(types, ["message.send", "file.delete", "package.publish"]);

  for (const checkpoint of payload.checkpoints) {
    assert.equal(checkpoint.execution_owner, "developer_runtime");
    assert.equal(checkpoint.execution_attempted, false);
    assert.equal(checkpoint.loop_state, "paused_before_execution");
    assert.equal(checkpoint.runtime_next_step, "hold_for_review_or_registry_backed_authority");
    assert.equal(checkpoint.route, "relay_receipt_required_before_execution");
    assert.equal(checkpoint.receipt_id, null);
  }
});

