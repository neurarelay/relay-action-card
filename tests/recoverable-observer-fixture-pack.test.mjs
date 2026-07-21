import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtures = JSON.parse(
  readFileSync(join(root, "examples/recoverable-observer/recoverable-observer-fixtures.v0.1.json"), "utf8"),
);

test("fixture pack verifier passes", () => {
  const output = execFileSync(process.execPath, ["scripts/verify-recoverable-observer-fixture-pack.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.match(output, /verification passed/);
});

test("retry uses a fresh attempt while preserving session and delegation identity", () => {
  const retry = fixtures.cases.find((item) => item.case_id === "retry_creates_fresh_run_attempt");
  const [oldAttempt, newAttempt] = retry.envelopes;
  assert.equal(oldAttempt.current_status, "failed");
  assert.notEqual(oldAttempt.identity.run_attempt_id, newAttempt.identity.run_attempt_id);
  assert.equal(oldAttempt.identity.session_id, newAttempt.identity.session_id);
  assert.equal(oldAttempt.identity.delegation_id, newAttempt.identity.delegation_id);
  assert.equal(newAttempt.run_sequence, 1);
});

test("all anomaly and closure outcomes require a fresh snapshot", () => {
  const guarded = fixtures.cases.flatMap((item) => item.envelopes).filter(
    (item) => item.event_kind === "resync_required" || item.event_kind === "stream_closed",
  );
  assert.ok(guarded.length > 0);
  for (const envelope of guarded) {
    const boundary = envelope.resync ?? envelope.closure;
    assert.equal(boundary.fresh_snapshot_required, true);
  }
});

test("fixtures remain payload-free and scope-bound", () => {
  for (const envelope of fixtures.cases.flatMap((item) => item.envelopes)) {
    assert.equal(envelope.payload_free, true);
    assert.deepEqual(envelope.scope, fixtures.scope);
    assert.doesNotMatch(JSON.stringify(envelope), /prompt|tool_args|tool_output|file_path|message_content/i);
  }
});
