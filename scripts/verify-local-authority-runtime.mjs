#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function path(file) {
  return join(repoRoot, file);
}

function read(file) {
  return readFileSync(path(file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function requireFile(file) {
  if (!existsSync(path(file))) failures.push(`missing_${file}`);
}

function requireIncludes(label, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) failures.push(`${label}_missing_${phrase}`);
  }
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) failures.push(`${label}_expected_${expected}_got_${actual}`);
}

function rejectUnsafeClaims(label, text) {
  const forbidden = [
    /supports\s+universal\s+(interception|injection|control)/i,
    /automatically\s+controls\s+every/i,
    /takes\s+over\s+(your|the)\s+environment/i,
    /website\s+scan(s|ning)?\s+(your|the)\s+(company|environment)/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /compliance\s+(certification|approval)\s+(exists|is live|is active|is confirmed)/i,
    /(OpenAI|Anthropic|Claude|Codex)\s+(approved|endorsed|partnered|certified)/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseJsonOutput(result, label) {
  if (result.status !== 0) {
    failures.push(`${label}_failed_${result.status}_${result.stderr || result.stdout}`);
    return null;
  }

  try {
    return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
  } catch (error) {
    failures.push(`${label}_not_json_${error.message}`);
    return null;
  }
}

const requiredFiles = [
  "docs/local-authority-runtime.md",
  "examples/local-authority-runtime/run-proof.mjs",
  "scripts/verify-local-authority-runtime.mjs",
  "docs/current-public-proof-map.md",
  "README.md",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
expectEqual(
  "package_script_proof_local_authority_runtime",
  packageJson.scripts?.["proof:local-authority-runtime"],
  "node examples/local-authority-runtime/run-proof.mjs",
);
expectEqual(
  "package_script_verify_local_authority_runtime",
  packageJson.scripts?.["verify:local-authority-runtime"],
  "node scripts/verify-local-authority-runtime.mjs",
);

const docs = read("docs/local-authority-runtime.md");
const readme = read("README.md");
const proofMap = read("docs/current-public-proof-map.md");
const runner = read("examples/local-authority-runtime/run-proof.mjs");

requireIncludes("docs", docs, [
  "Neura Local Authority Runtime v0.1",
  "local discovery -> redacted manifest -> refs-only Action Card -> controlled Relay receipt bridge -> scoped local-runtime route bridge -> local binding verifier -> local ledger event",
  "npm run proof:local-authority-runtime -- --dry-run --json",
  "npm run verify:local-authority-runtime",
  "private local runtime package",
  "Controlled Relay mode",
  "Scoped local-runtime route mode",
  "/api/local-runtime/resolve-action-card",
  "no downstream execution by Neura",
  "no proprietary website intake",
]);
requireIncludes("readme", readme, [
  "local authority runtime proof",
  "docs/local-authority-runtime.md",
  "npm run proof:local-authority-runtime -- --dry-run --json",
  "npm run verify:local-authority-runtime",
]);
requireIncludes("proof_map", proofMap, [
  "Show local runtime authority binding",
  "Local Authority Runtime",
  "scoped local-runtime route bridge",
  "npm run proof:local-authority-runtime -- --dry-run --json",
]);
requireIncludes("runner", runner, [
  "NEURA_AUTHORITY_RUNTIME_DIR",
  "runNodeToolDryRun",
  "runMcpToolCallFixtureDryRun",
  "changed_args_rejection",
  "changed_target_rejection",
  "changed_actor_rejection",
  "expired_receipt_rejection",
  "one_shot_second_use_rejection",
  "non_proceed_route_rejection",
  "downstream_execution_by_neura: false",
  "resolveActionCardWithControlledRelay",
  "createMockControlledRelayFetch",
  "/api/developer/resolve-action-card",
  "/api/local-runtime/resolve-action-card",
  "LOCAL_RUNTIME_RELAY_ROUTE",
  "buildLocalRuntimeRouteResult",
  "local_runtime_route_result",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("proof_map", proofMap);
rejectUnsafeClaims("runner", runner);

const firstRun = run("npm", ["run", "proof:local-authority-runtime", "--", "--dry-run", "--json"]);
const secondRun = run("npm", ["run", "proof:local-authority-runtime", "--", "--dry-run", "--json"]);
const output = parseJsonOutput(firstRun, "proof_command");
parseJsonOutput(secondRun, "proof_command_second_run");

if (firstRun.stdout !== secondRun.stdout) failures.push("proof_output_not_deterministic");
if (/\/Users\/roman|\/tmp\/|\/var\/folders\//.test(firstRun.stdout)) failures.push("proof_output_leaks_local_path");

if (output) {
  expectEqual("output_ok", output.ok, true);
  expectEqual("proof_name", output.proof, "local-authority-runtime");
  expectEqual("proof_mode", output.mode, "local_package_consumer_dry_run_no_downstream_execution");
  expectEqual("runtime_package_name", output.runtime_package?.name, "@neurarelay/authority-runtime");
  expectEqual("runtime_package_private", output.runtime_package?.private_package, true);
  expectEqual("runtime_package_published", output.runtime_package?.published_or_released, false);
  expectEqual("manifest_standard", output.manifest?.standard, "neura-local-authority-manifest-v0.1");
  expectEqual("manifest_authority_inference", output.manifest?.discovery_summary?.authority_inference_performed, false);
  expectEqual("manifest_refs_only", output.manifest?.boundaries?.refs_only, true);
  expectEqual("manifest_hidden_mutation", output.manifest?.boundaries?.hidden_config_mutation, false);
  expectEqual("root_private_payload", output.boundaries?.raw_tool_args_exported, false);
  expectEqual("root_downstream", output.boundaries?.downstream_execution_by_neura, false);
  expectEqual("root_dry_run_execution", output.boundaries?.downstream_tool_executed_in_dry_run, false);
  expectEqual("root_public_distribution", output.boundaries?.public_distribution_action, false);

  const adapters = new Set((output.adapter_results ?? []).map((result) => result.adapter));
  if (!adapters.has("node_wrap_tool")) failures.push("missing_node_wrap_tool_adapter");
  if (!adapters.has("mcp_tool_call_fixture")) failures.push("missing_mcp_tool_call_fixture_adapter");

  for (const result of output.adapter_results ?? []) {
    expectEqual(`${result.adapter}_action_refs_only`, result.action_card?.refs_only, true);
    expectEqual(`${result.adapter}_action_private_payload`, result.action_card?.private_payload_included, false);
    expectEqual(`${result.adapter}_receipt_refs_only`, result.decision_receipt?.refs_only, true);
    expectEqual(`${result.adapter}_receipt_downstream`, result.decision_receipt?.downstream_execution_by_neura, false);
    expectEqual(`${result.adapter}_ledger_downstream`, result.local_ledger_event?.downstream_execution_by_neura, false);
    expectEqual(`${result.adapter}_ledger_dry_run`, result.local_ledger_event?.downstream_tool_executed_in_dry_run, false);
  }

  expectEqual("controlled_relay_ok", output.controlled_relay_result?.ok, true);
  expectEqual("controlled_relay_mode", output.controlled_relay_result?.mode, "controlled_relay_refs_only");
  expectEqual(
    "controlled_relay_route",
    output.controlled_relay_result?.endpoint?.route,
    "/api/developer/resolve-action-card",
  );
  expectEqual("controlled_relay_auth_marker", output.controlled_relay_result?.endpoint?.auth_header_sent, true);
  expectEqual("controlled_relay_request_refs", output.controlled_relay_result?.request_contract?.body_refs_only, true);
  expectEqual(
    "controlled_relay_token_retained",
    output.controlled_relay_result?.request_contract?.token_value_retained,
    false,
  );
  expectEqual(
    "controlled_relay_response_posture",
    output.controlled_relay_result?.relay_response_contract?.response_posture,
    "decision_receipt_validation_registry_ledger_trace_refs_only",
  );
  expectEqual(
    "controlled_relay_private_payload",
    output.controlled_relay_result?.relay_response_contract?.private_payload_returned,
    false,
  );
  expectEqual(
    "controlled_relay_downstream",
    output.controlled_relay_result?.relay_response_contract?.downstream_execution_by_relay,
    false,
  );
  expectEqual("controlled_relay_receipt_route", output.controlled_relay_result?.decision_receipt?.route, "proceed");
  expectEqual(
    "controlled_relay_binding_verification",
    output.controlled_relay_result?.local_binding_verification?.allowed,
    true,
  );
  expectEqual("local_runtime_route_ok", output.local_runtime_route_result?.ok, true);
  expectEqual("local_runtime_route_mode", output.local_runtime_route_result?.mode, "controlled_relay_refs_only");
  expectEqual(
    "local_runtime_route_route",
    output.local_runtime_route_result?.endpoint?.route,
    "/api/local-runtime/resolve-action-card",
  );
  expectEqual(
    "local_runtime_route_contract",
    output.local_runtime_route_result?.endpoint?.route_contract,
    "local_runtime_scoped_token_refs_only",
  );
  expectEqual("local_runtime_route_auth_marker", output.local_runtime_route_result?.endpoint?.auth_header_sent, true);
  expectEqual("local_runtime_route_request_refs", output.local_runtime_route_result?.request_contract?.body_refs_only, true);
  expectEqual(
    "local_runtime_route_token_retained",
    output.local_runtime_route_result?.request_contract?.token_value_retained,
    false,
  );
  expectEqual(
    "local_runtime_route_response_posture",
    output.local_runtime_route_result?.relay_response_contract?.response_posture,
    "decision_receipt_validation_registry_ledger_trace_refs_only",
  );
  expectEqual(
    "local_runtime_route_private_payload",
    output.local_runtime_route_result?.relay_response_contract?.private_payload_returned,
    false,
  );
  expectEqual(
    "local_runtime_route_downstream",
    output.local_runtime_route_result?.relay_response_contract?.downstream_execution_by_relay,
    false,
  );
  expectEqual("local_runtime_route_receipt_route", output.local_runtime_route_result?.decision_receipt?.route, "proceed");
  expectEqual(
    "local_runtime_route_binding_verification",
    output.local_runtime_route_result?.local_binding_verification?.allowed,
    true,
  );

  expectEqual("changed_args_rejection", output.mutation_checks?.changed_args_rejection?.reason, "binding_mismatch");
  expectEqual("changed_target_rejection", output.mutation_checks?.changed_target_rejection?.reason, "binding_mismatch");
  expectEqual("changed_actor_rejection", output.mutation_checks?.changed_actor_rejection?.reason, "binding_mismatch");
  expectEqual("expired_receipt_rejection", output.mutation_checks?.expired_receipt_rejection?.reason, "receipt_expired");
  expectEqual(
    "one_shot_second_use_rejection",
    output.mutation_checks?.one_shot_second_use_rejection?.reason,
    "receipt_already_consumed",
  );
  expectEqual("non_proceed_route_rejection", output.mutation_checks?.non_proceed_route_rejection?.reason, "route_not_proceed");
}

if (failures.length > 0) {
  console.error("Local authority runtime verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Local authority runtime verifier passed.");
