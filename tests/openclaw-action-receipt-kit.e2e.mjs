import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";

function runLiveReceipt(exampleId) {
  return spawnSync(
    "node",
    [
      "examples/openclaw/run-action-receipt-kit.mjs",
      `--only=${exampleId}`,
      "--json",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, RELAY_BASE_URL: relayBaseUrl },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
}

test("OpenClaw kit can obtain a live Relay Decision Receipt", () => {
  const result = runLiveReceipt("send-message");
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "live_receipts");
  assert.equal(payload.relay, relayBaseUrl);
  assert.equal(payload.count, 1);

  const receipt = payload.results[0];
  assert.equal(receipt.id, "send-message");
  assert.equal(receipt.family, "outbound_message");
  assert.match(receipt.receipt_id, /^decision_receipt_/);
  assert.match(receipt.trace_ref, /^trace_ref_/);
  assert.match(receipt.transaction_ref, /^relay_txn_/);
  assert.ok(["proceed", "human_review", "blocked"].includes(receipt.decision));
  assert.equal(receipt.relay_boundary, "decision_gate_only_developer_keeps_execution");
  assert.equal(receipt.action_card_path, "examples/openclaw/action-cards/send-message.json");
  assert.ok([
    "ready_for_developer_owned_execution",
    "hold_for_registry_backed_authority",
    "route_to_human_review_before_execution",
    "stop_before_execution",
  ].includes(receipt.developer_route));
  if (
    receipt.decision === "proceed" &&
    receipt.authority_source !== "registry_reference_packet"
  ) {
    assert.equal(receipt.developer_route, "hold_for_registry_backed_authority");
    assert.equal(
      receipt.developer_next_step,
      "Receipt can proceed, but developer-owned execution should wait for Registry-backed delegated authority.",
    );
  }
  assert.ok(receipt.receipt_recommended_next_step);
});
