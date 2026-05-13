import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";

function runDemo(...args) {
  return spawnSync("node", ["examples/openclaw/run-five-minute-receipt-demo.mjs", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("five-minute demo proves the three severe developer scenarios in dry-run mode", () => {
  const result = runDemo("--json");
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "dry_run");
  assert.equal(payload.summary.scenarios, 3);
  assert.equal(payload.summary.developer_owned_execution, true);
  assert.equal(payload.summary.refs_only, true);
  assert.equal(payload.boundaries.official_openclaw_or_clawhub_claim, false);
  assert.equal(payload.boundaries.downstream_execution_by_neura, false);

  const byId = new Map(payload.scenarios.map((scenario) => [scenario.id, scenario]));
  assert.equal(byId.get("send-customer-message").action_type, "message.send");
  assert.equal(byId.get("delete-local-file").action_type, "file.delete");
  assert.equal(byId.get("publish-package").action_type, "package.publish");

  for (const scenario of byId.values()) {
    assert.equal(scenario.execution_owner, "developer_runtime");
    assert.equal(scenario.relay_call_skipped, true);
    assert.equal(scenario.route, "relay_receipt_required_before_execution");
    assert.equal(scenario.receipt_id, null);
  }
});
