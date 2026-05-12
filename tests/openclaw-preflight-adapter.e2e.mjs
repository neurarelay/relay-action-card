import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import { createNeuraPreflightAdapter } from "../examples/openclaw/preflight-adapter/adapter.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const fixture = JSON.parse(
  readFileSync(
    join(repoRoot, "examples/openclaw/preflight-adapter/fixtures/send-message.preflight.json"),
    "utf8",
  ),
);

test("preflight adapter obtains a live Relay Decision Receipt", async () => {
  const adapter = createNeuraPreflightAdapter({ relayBaseUrl });
  const result = await adapter.beforeAction(fixture);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "live_receipt");
  assert.equal(result.execution_owner, "developer_runtime");
  assert.match(result.receipt.receipt_id, /^decision_receipt_/);
  assert.match(result.receipt.trace_ref, /^trace_ref_/);
  assert.match(result.receipt.transaction_ref, /^relay_txn_/);
  assert.ok(["proceed", "human_review", "blocked", "stop"].includes(result.receipt.decision));
  assert.equal(result.receipt.relay_boundary, "decision_gate_only_developer_keeps_execution");
  assert.ok(result.receipt.route.endsWith("_before_execution") ||
    result.receipt.route === "ready_for_developer_owned_execution");
});
