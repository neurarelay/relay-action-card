import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { deriveStructuredResultTrustDecision } from "../examples/lib/structured-result-trust.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function fixture(name) {
  return JSON.parse(
    readFileSync(join(repoRoot, `examples/structured-result-trust/${name}.example.json`), "utf8"),
  );
}

function decide(receipt) {
  return deriveStructuredResultTrustDecision(structuredClone(receipt));
}

test("fixture assertions match the independently derived trust route", () => {
  for (const name of [
    "healthy-first-attempt",
    "recovered-after-validation-retry",
    "retry-exhausted-placeholder",
    "unvalidated-raw-schema",
    "provider-fallback-shape-only",
    "result-channel-lost",
  ]) {
    const receipt = fixture(name);
    const decision = decide(receipt);
    assert.equal(decision.state, receipt.trust.asserted_state, name);
    assert.equal(decision.route, receipt.downstream.asserted_route, name);
    assert.equal(decision.overrideRequired, receipt.downstream.override_required, name);
  }
});

test("a lost structured output channel rejects an otherwise healthy result", () => {
  const receipt = fixture("healthy-first-attempt");
  receipt.contract.channel_preserved = false;
  receipt.contract.observed_channel = "assistant_text";

  assert.deepEqual(decide(receipt), {
    state: "rejected",
    route: "stop",
    overrideRequired: true,
  });
});

test("shape-only provider enforcement cannot silently route to allow", () => {
  const receipt = fixture("healthy-first-attempt");
  receipt.contract.enforcement_mode = "shape_only";

  assert.deepEqual(decide(receipt), {
    state: "degraded",
    route: "human_review",
    overrideRequired: true,
  });
});

test("retry exhaustion cannot inherit recovered allow authority", () => {
  const receipt = fixture("recovered-after-validation-retry");
  receipt.generation.attempts_used = receipt.generation.max_attempts;
  receipt.generation.retry_exhausted = true;

  assert.deepEqual(decide(receipt), {
    state: "degraded",
    route: "human_review",
    overrideRequired: true,
  });
});

test("failed semantic checks stop a schema-valid result", () => {
  const receipt = fixture("healthy-first-attempt");
  receipt.semantic_checks.status = "failed";

  assert.deepEqual(decide(receipt), {
    state: "degraded",
    route: "stop",
    overrideRequired: true,
  });
});

test("missing validation evidence remains unknown and stopped", () => {
  const receipt = fixture("healthy-first-attempt");
  receipt.contract.enforcement_mode = "none";
  receipt.contract.validation_engine = "none";
  receipt.contract.validation_passed = null;

  assert.deepEqual(decide(receipt), {
    state: "unknown",
    route: "stop",
    overrideRequired: true,
  });
});
