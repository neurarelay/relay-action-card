import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";

function runIntegration(...args) {
  return spawnSync("node", ["examples/openclaw/run-copy-paste-agent-integration.mjs", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("copy-paste agent integration guards severe tool calls before execution", () => {
  const result = runIntegration("--json");
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "dry_run");
  assert.equal(payload.boundaries.official_openclaw_or_clawhub_claim, false);
  assert.equal(payload.boundaries.downstream_execution_by_neura, false);
  assert.equal(payload.boundaries.developer_owned_execution, true);
  assert.equal(payload.scenarios.length, 3);

  const byId = new Map(payload.scenarios.map((scenario) => [scenario.id, scenario]));
  assert.equal(byId.get("before-message-send").type, "message.send");
  assert.equal(byId.get("before-file-delete").type, "file.delete");
  assert.equal(byId.get("before-package-publish").type, "package.publish");

  for (const scenario of payload.scenarios) {
    assert.equal(scenario.execution_owner, "developer_runtime");
    assert.equal(scenario.execution_attempted, false);
    assert.equal(scenario.execution_allowed, false);
    assert.equal(scenario.route, "relay_receipt_required_before_execution");
    assert.equal(scenario.next_step, "developer_runtime_must_hold_or_review_before_execution");
    assert.equal(scenario.receipt_id, null);
    assert.equal(scenario.trace_ref, null);
  }
});

