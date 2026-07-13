#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJson = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));
const failures = [];
const fixturePack = readJson("examples/recoverable-observer/recoverable-observer-fixtures.v0.1.json");
readJson("schemas/recoverable-observer-envelope.v0.1.json");

const requiredFields = [
  "standard",
  "event_id",
  "event_kind",
  "cursor",
  "scope",
  "identity",
  "run_sequence",
  "previous_status",
  "current_status",
  "reason_code",
  "occurred_at",
  "observed_at",
  "payload_free",
];
const terminal = new Set(["completed", "failed", "cancelled"]);
const eventIds = new Set();

function fail(message) {
  failures.push(message);
}

function sameScope(left, right) {
  return ["extension_id", "profile_id", "workspace_id", "remote_authority_id"].every(
    (field) => left[field] === right[field],
  );
}

for (const testCase of fixturePack.cases) {
  for (const envelope of testCase.envelopes) {
    for (const field of requiredFields) {
      if (!(field in envelope)) fail(`${testCase.case_id}:${envelope.event_id}:missing_${field}`);
    }
    if (eventIds.has(envelope.event_id)) fail(`${testCase.case_id}:duplicate_event_id:${envelope.event_id}`);
    eventIds.add(envelope.event_id);
    if (envelope.standard !== "recoverable-observer-envelope-v0.1-draft") {
      fail(`${testCase.case_id}:${envelope.event_id}:wrong_standard`);
    }
    if (envelope.payload_free !== true) fail(`${testCase.case_id}:${envelope.event_id}:payload_not_closed`);
    if (!sameScope(envelope.scope, fixturePack.scope)) fail(`${testCase.case_id}:${envelope.event_id}:scope_mismatch`);
    if (JSON.stringify(envelope).match(/prompt|tool_args|tool_output|file_path|message_content/i)) {
      fail(`${testCase.case_id}:${envelope.event_id}:forbidden_payload_field`);
    }
    if (envelope.event_kind === "snapshot" && envelope.snapshot?.resume_cursor !== envelope.cursor) {
      fail(`${testCase.case_id}:${envelope.event_id}:snapshot_cursor_mismatch`);
    }
    if (envelope.event_kind === "resync_required" && envelope.resync?.fresh_snapshot_required !== true) {
      fail(`${testCase.case_id}:${envelope.event_id}:resync_does_not_require_snapshot`);
    }
    if (envelope.event_kind === "stream_closed" && envelope.closure?.fresh_snapshot_required !== true) {
      fail(`${testCase.case_id}:${envelope.event_id}:closure_does_not_require_snapshot`);
    }
    if (envelope.current_status === "needs_input") {
      if (!envelope.needs_input?.request_id || !envelope.needs_input?.input_kind) {
        fail(`${testCase.case_id}:${envelope.event_id}:needs_input_missing_opaque_ref`);
      }
    }
  }
}

const retry = fixturePack.cases.find((item) => item.case_id === "retry_creates_fresh_run_attempt")?.envelopes ?? [];
if (retry.length !== 2) fail("retry_case_wrong_envelope_count");
else {
  const [oldAttempt, newAttempt] = retry;
  if (!terminal.has(oldAttempt.current_status)) fail("retry_old_attempt_not_terminal");
  if (oldAttempt.identity.run_attempt_id === newAttempt.identity.run_attempt_id) fail("retry_reused_run_attempt_id");
  if (newAttempt.run_sequence !== 1) fail("retry_new_attempt_sequence_not_one");
  if (oldAttempt.identity.session_id !== newAttempt.identity.session_id) fail("retry_changed_session_id");
  if (oldAttempt.identity.delegation_id !== newAttempt.identity.delegation_id) fail("retry_changed_delegation_id");
}

const anomalyCase = fixturePack.cases.find((item) => item.case_id === "event_anomalies_require_resync");
const anomalyCauses = new Set(anomalyCase?.envelopes.map((item) => item.resync?.cause));
for (const cause of ["missed_event", "duplicate_event", "reordered_event", "conflicting_event"]) {
  if (!anomalyCauses.has(cause)) fail(`missing_resync_cause:${cause}`);
}

const closureCase = fixturePack.cases.find((item) => item.case_id === "closure_outcomes_are_explicit");
const closureCauses = new Set(closureCase?.envelopes.map((item) => item.closure?.cause));
for (const cause of ["consent_revoked", "observer_disconnected", "cursor_expired", "buffer_overflow"]) {
  if (!closureCauses.has(cause)) fail(`missing_closure_cause:${cause}`);
}

for (const negative of fixturePack.negative_cases) {
  if (negative.expected_error === "scope_mismatch" && sameScope(negative.observer_scope, negative.envelope_scope)) {
    fail(`${negative.case_id}:negative_scope_not_mismatched`);
  }
}

if (fixturePack.boundary.vs_code_api_validated !== false || fixturePack.boundary.ventoview_tested !== false) {
  fail("claim_boundary_open");
}

if (failures.length) {
  console.error("Recoverable Observer Fixture Pack verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Recoverable Observer Fixture Pack verification passed: ${fixturePack.cases.length} cases, ${eventIds.size} envelopes, ${fixturePack.negative_cases.length} negative case.`,
);
