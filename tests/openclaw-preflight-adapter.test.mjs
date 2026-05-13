import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import pluginEntry, {
  createNeuraPreflightAdapter,
  metadata,
} from "../examples/openclaw/preflight-adapter/index.mjs";
import {
  createActionCardFromPreflightAction,
  isRegistryBackedAuthorityReady,
  routeFromDecision,
} from "../examples/openclaw/preflight-adapter/adapter.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readJson(file) {
  return JSON.parse(readFileSync(join(repoRoot, file), "utf8"));
}

const fixture = readJson("examples/openclaw/preflight-adapter/fixtures/send-message.preflight.json");
const nativeManifest = readJson("examples/openclaw/preflight-adapter/openclaw.plugin.json");
const adapterPackage = readJson("examples/openclaw/preflight-adapter/package.json");

test("native plugin manifest stays schema-valid and runtime-free", () => {
  assert.equal(nativeManifest.id, "neura-relay-preflight-adapter");
  assert.equal(nativeManifest.version, "0.1.0-rc.2");
  assert.equal(nativeManifest.configSchema.type, "object");
  assert.deepEqual(nativeManifest.contracts.tools, ["neura_relay_preflight_action"]);
  assert.equal(Object.hasOwn(nativeManifest, "entry"), false);
  assert.equal(Object.hasOwn(nativeManifest, "compat"), false);
  assert.equal(Object.hasOwn(nativeManifest, "build"), false);
  assert.equal(Object.hasOwn(nativeManifest, "neura"), false);
});

test("package metadata is publish-ready but claim-safe", () => {
  assert.equal(adapterPackage.name, "@neurarelay/openclaw-preflight-adapter");
  assert.equal(adapterPackage.version, "0.1.0-rc.2");
  assert.equal(adapterPackage.private, false);
  assert.equal(adapterPackage.engines.node, ">=22.14.0");
  assert.deepEqual(adapterPackage.openclaw.extensions, ["./index.mjs"]);
  assert.equal(adapterPackage.openclaw.compat.pluginApi, ">=2026.3.24-beta.2");
  assert.equal(
    adapterPackage.openclaw.install.npmSpec,
    "@neurarelay/openclaw-preflight-adapter@0.1.0-rc.2",
  );
  assert.equal(adapterPackage.neura.officialOpenClawOrClawHubClaim, false);
  assert.equal(adapterPackage.neura.officialSubmissionRequiresRomanApproval, true);
});

test("preflight adapter converts refs-only local actions into Action Cards", () => {
  const card = createActionCardFromPreflightAction(fixture);
  assert.equal(card.version, "0.1");
  assert.equal(card.proposedAction.type, "message.send");
  assert.equal(card.context.requestedOutcome, "decision_receipt");
  assert.equal(card.context.authorityContext.allowedActions.includes("message.send"), true);
  assert.equal(
    card.context.authorityContext.allowedResources.includes(card.proposedAction.target),
    true,
  );
  assert.deepEqual(card.context.evidenceRefs, fixture.evidenceRefs);
});

test("preflight adapter rejects raw private payload keys", () => {
  assert.throws(
    () => createActionCardFromPreflightAction({ ...fixture, command: "rm -rf ." }),
    /refs-only/,
  );
});

test("route mapping keeps execution developer owned", () => {
  assert.equal(routeFromDecision("proceed"), "hold_for_registry_backed_authority");
  assert.equal(
    routeFromDecision("proceed", {
      source: "developer_supplied_unverified",
      registry_validation_status: "unavailable",
    }),
    "hold_for_registry_backed_authority",
  );
  assert.equal(
    routeFromDecision("proceed", {
      source: "registry_reference_packet",
      registry_validation_status: "ready",
    }),
    "ready_for_developer_owned_execution",
  );
  assert.equal(routeFromDecision("human_review"), "route_to_human_review_before_execution");
  assert.equal(routeFromDecision("revise"), "revise_action_card_before_execution");
  assert.equal(routeFromDecision("stop"), "stop_before_execution");
  assert.equal(routeFromDecision("blocked"), "stop_before_execution");
  assert.equal(
    isRegistryBackedAuthorityReady({
      source: "registry_reference_packet",
      registry_validation_status: "ready",
    }),
    true,
  );
});

test("dry-run preflight returns Action Card without calling Relay", async () => {
  const adapter = createNeuraPreflightAdapter();
  const result = await adapter.beforeAction(fixture, { dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry_run");
  assert.equal(result.relay_call_skipped, true);
  assert.equal(result.execution_owner, "developer_runtime");
  assert.equal(result.action_card.version, "0.1");
});

test("OpenClaw-style plugin entry registers preflight tool", async () => {
  const registered = [];
  pluginEntry.register({
    registerTool(tool) {
      registered.push(tool);
    },
  });

  assert.equal(metadata.officialOpenClawOrClawHubClaim, false);
  assert.equal(metadata.officialSubmissionRequiresRomanApproval, true);
  assert.equal(registered.length, 1);
  assert.equal(registered[0].name, "neura_relay_preflight_action");

  const output = await registered[0].execute(null, { ...fixture, dryRun: true });
  assert.equal(output.content[0].type, "text");
  const parsed = JSON.parse(output.content[0].text);
  assert.equal(parsed.mode, "dry_run");
  assert.equal(parsed.execution_owner, "developer_runtime");
});
