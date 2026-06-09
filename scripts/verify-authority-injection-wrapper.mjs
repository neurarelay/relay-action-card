#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const decisions = new Set(["allow", "revise", "human_review", "stop"]);
const requiredMethods = ["beforeAction", "resolveAuthority", "wrapTool", "afterAction"];
const requiredEventTypes = ["tool.call.proposed", "decision.issued", "execution.completed"];

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
    /official\s+(OpenAI|Anthropic|MCP|ADK|Google|Microsoft|Shopify|Stripe|IBM)\s+(integration|listing|approval|endorsement|partnership)/i,
    /(OpenAI|Anthropic|MCP|ADK|Google|Microsoft|Shopify|Stripe|IBM)\s+(approved|endorsed|listed|partnered|validated)\b/i,
    /provider\s+(approval|listing|endorsement|partnership)\s+(exists|is claimed|is live)/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /Neura\s+performs\s+(the\s+)?tool/i,
    /is\s+an\s+OS\s+kernel\s+driver/i,
    /is\s+an\s+IAM\s+provider/i,
    /is\s+a\s+SIEM/i,
    /compliance\s+(certification|approval)\s+(exists|is live|is active|is confirmed)/i,
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

function collectExactKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectExactKeys(item, keys);
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectExactKeys(nested, keys);
    }
  }
  return keys;
}

function validateAgentIoEvent(result, event, expectedType, index) {
  expectEqual(`${result.scenario}_event_${index}_standard`, event?.standard, "neura-agent-io-event-envelope-v0.1-draft");
  expectEqual(`${result.scenario}_event_${index}_type`, event?.event_type, expectedType);
  if (!event?.event_ref) failures.push(`${result.scenario}_event_${index}_missing_ref`);
  if (!event?.trace_ref) failures.push(`${result.scenario}_event_${index}_missing_trace_ref`);
  if (!event?.io?.args_hash?.startsWith("sha256:")) failures.push(`${result.scenario}_event_${index}_bad_args_hash`);
  expectEqual(`${result.scenario}_event_${index}_payload_tier`, event?.payload?.tier, "T0");
  expectEqual(
    `${result.scenario}_event_${index}_redaction`,
    event?.payload?.redaction_status,
    "metadata_refs_hashes_only",
  );
  expectEqual(`${result.scenario}_event_${index}_private_payload`, event?.payload?.private_payload_stored, false);
  expectEqual(
    `${result.scenario}_event_${index}_boundary_downstream`,
    event?.boundary?.downstream_execution_performed_by_neura,
    false,
  );
  expectEqual(`${result.scenario}_event_${index}_boundary_private`, event?.boundary?.private_payload_stored, false);
  expectEqual(`${result.scenario}_event_${index}_boundary_provider`, event?.boundary?.provider_approval_claimed, false);
  expectEqual(
    `${result.scenario}_event_${index}_boundary_compliance`,
    event?.boundary?.compliance_certification_claimed,
    false,
  );
}

const requiredFiles = [
  "docs/authority-injection-wrapper.md",
  "examples/authority-injection-wrapper/run-proof.mjs",
  "scripts/verify-authority-injection-wrapper.mjs",
  "schemas/agent-io-event-envelope.v0.1.json",
  "schemas/action-card.v0.1.json",
  "schemas/decision-receipt.v0.1.json",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
expectEqual(
  "package_script_proof_authority_injection",
  packageJson.scripts?.["proof:authority-injection-wrapper"],
  "node examples/authority-injection-wrapper/run-proof.mjs",
);
expectEqual(
  "package_script_verify_authority_injection",
  packageJson.scripts?.["verify:authority-injection-wrapper"],
  "node scripts/verify-authority-injection-wrapper.mjs",
);

const docs = read("docs/authority-injection-wrapper.md");
const readme = read("README.md");
const proofMap = read("docs/current-public-proof-map.md");
const runner = read("examples/authority-injection-wrapper/run-proof.mjs");

requireIncludes("docs", docs, [
  "Tool-call Authority Injection Wrapper v0.1",
  "wrapTool -> beforeAction -> Agent I/O Event -> Action Card -> resolveAuthority -> Decision Receipt -> runtime-owned execution gate -> afterAction",
  "npm run proof:authority-injection-wrapper -- --dry-run --json",
  "npm run verify:authority-injection-wrapper",
  "changed args",
  "expired receipt",
  "one-shot reuse",
  "one wrapped tool",
  "no downstream execution by Neura",
  "no private payload persistence",
]);
requireIncludes("readme", readme, [
  "authority injection wrapper proof",
  "npm run proof:authority-injection-wrapper -- --dry-run --json",
  "npm run verify:authority-injection-wrapper",
]);
requireIncludes("proof_map", proofMap, [
  "Show injected authority before a tool executes",
  "Tool-call Authority Injection Wrapper",
  "npm run proof:authority-injection-wrapper -- --dry-run --json",
]);
requireIncludes("runner", runner, [
  "function beforeAction",
  "function resolveAuthority",
  "function wrapTool",
  "function afterAction",
  "canExecuteWithReceipt",
  "changed-args-rejection",
  "expired-receipt-rejection",
  "one-shot-reuse-rejection",
  "downstream_execution_by_neura: false",
  "private_payload_persisted: false",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("proof_map", proofMap);
rejectUnsafeClaims("runner", runner);

const firstRun = run("npm", ["run", "proof:authority-injection-wrapper", "--", "--dry-run", "--json"]);
const secondRun = run("npm", ["run", "proof:authority-injection-wrapper", "--", "--dry-run", "--json"]);
const output = parseJsonOutput(firstRun, "proof_command");
parseJsonOutput(secondRun, "proof_command_second_run");

if (firstRun.stdout !== secondRun.stdout) failures.push("proof_output_not_deterministic");

if (output) {
  expectEqual("output_ok", output.ok, true);
  expectEqual("proof_name", output.proof, "authority-injection-wrapper");
  expectEqual("proof_mode", output.mode, "local_dry_run_authority_injection_no_downstream_execution");
  expectEqual("scenario_count", output.scenario_count, 4);

  if (JSON.stringify(output.contract_methods) !== JSON.stringify(requiredMethods)) {
    failures.push("contract_methods_changed");
  }

  expectEqual("one_wrapped_tool", output.boundaries?.one_wrapped_tool, true);
  expectEqual("root_private_payload", output.boundaries?.private_payload_persisted, false);
  expectEqual("root_downstream", output.boundaries?.downstream_execution_by_neura, false);
  expectEqual("root_runtime_owned", output.boundaries?.runtime_owned_execution, true);
  expectEqual("root_public_distribution", output.boundaries?.public_distribution_action, false);

  const expectedDecisions = {
    "customer-note-allow": "allow",
    "customer-note-revise": "revise",
    "customer-note-human-review": "human_review",
    "customer-note-stop": "stop",
  };

  for (const decision of decisions) {
    if (output.decision_counts?.[decision] !== 1) failures.push(`decision_count_${decision}_not_one`);
  }

  const seenTools = new Set();
  const seenResults = new Map((output.results ?? []).map((result) => [result.scenario, result]));
  for (const [scenario, expectedDecision] of Object.entries(expectedDecisions)) {
    const result = seenResults.get(scenario);
    if (!result) {
      failures.push(`missing_result_${scenario}`);
      continue;
    }

    seenTools.add(result.tool?.tool_ref);
    expectEqual(`${scenario}_contract_before`, result.authority_injection_contract?.beforeAction, true);
    expectEqual(`${scenario}_contract_resolve`, result.authority_injection_contract?.resolveAuthority, true);
    expectEqual(`${scenario}_contract_wrap`, result.authority_injection_contract?.wrapTool, true);
    expectEqual(`${scenario}_contract_after`, result.authority_injection_contract?.afterAction, true);
    expectEqual(`${scenario}_decision`, result.decision_receipt?.decision, expectedDecision);
    expectEqual(`${scenario}_route`, result.decision_receipt?.route, expectedDecision);
    expectEqual(`${scenario}_receipt_refs_only`, result.decision_receipt?.refs_only, true);
    expectEqual(`${scenario}_receipt_private`, result.decision_receipt?.private_payload_persisted, false);
    expectEqual(`${scenario}_receipt_downstream`, result.decision_receipt?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_action_derived`, result.action_card?.derived_from_agent_io_event, true);
    expectEqual(
      `${scenario}_action_event_ref`,
      result.action_card?.agent_io_event_ref,
      result.agent_io_events?.[0]?.event_ref,
    );
    expectEqual(
      `${scenario}_receipt_action_card_ref`,
      result.decision_receipt?.action_card_ref,
      result.action_card?.action_card_ref,
    );
    expectEqual(
      `${scenario}_receipt_event_ref`,
      result.decision_receipt?.agent_io_event_ref,
      result.agent_io_events?.[0]?.event_ref,
    );
    expectEqual(`${scenario}_runtime_recheck`, result.runtime_gate?.runtime_must_recheck_binding_before_execution, true);
    expectEqual(`${scenario}_runtime_dry_run_execution`, result.runtime_gate?.downstream_tool_executed_in_dry_run, false);
    expectEqual(`${scenario}_runtime_neura_execution`, result.runtime_gate?.execution_performed_by_neura, false);
    expectEqual(`${scenario}_boundary_private`, result.boundaries?.private_payload_persisted, false);
    expectEqual(`${scenario}_boundary_downstream`, result.boundaries?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_boundary_runtime_owned`, result.boundaries?.runtime_owned_execution, true);

    if ((result.agent_io_events ?? []).length !== 3) failures.push(`${scenario}_wrong_event_count`);
    for (const [index, eventType] of requiredEventTypes.entries()) {
      validateAgentIoEvent(result, result.agent_io_events?.[index], eventType, index);
    }

    if (expectedDecision === "allow") {
      expectEqual(`${scenario}_allow_gate`, result.runtime_gate?.receipt_allows_runtime_execution, true);
    } else {
      expectEqual(`${scenario}_non_allow_gate`, result.runtime_gate?.receipt_allows_runtime_execution, false);
    }
  }

  if (seenTools.size !== 1 || !seenTools.has("tool_ref:crm.customer_record.update")) {
    failures.push(`unexpected_wrapped_tools_${Array.from(seenTools).join(",")}`);
  }

  const checks = new Map((output.enforcement_checks ?? []).map((check) => [check.scenario, check]));
  expectEqual("unchanged_allow", checks.get("unchanged-allow-receipt")?.allowed, true);
  expectEqual("changed_args_denied", checks.get("changed-args-rejection")?.allowed, false);
  if (!(checks.get("changed-args-rejection")?.changed_fields ?? []).includes("args_hash")) {
    failures.push("changed_args_missing_args_hash");
  }
  expectEqual("expired_denied", checks.get("expired-receipt-rejection")?.allowed, false);
  expectEqual("expired_reason", checks.get("expired-receipt-rejection")?.reason, "receipt_expired");
  expectEqual("reuse_first_allowed", checks.get("one-shot-reuse-rejection")?.first_use?.allowed, true);
  expectEqual("reuse_second_denied", checks.get("one-shot-reuse-rejection")?.second_use?.allowed, false);
  expectEqual("reuse_second_reason", checks.get("one-shot-reuse-rejection")?.second_use?.reason, "receipt_already_consumed");
  expectEqual("revise_denied", checks.get("revise-route-rejection")?.allowed, false);
  expectEqual("revise_reason", checks.get("revise-route-rejection")?.reason, "decision_not_allow");

  const forbiddenKeys = new Set([
    "raw_args",
    "rawPayload",
    "privatePayload",
    "secret",
    "token",
    "access_token",
    "password",
    "email",
  ]);
  for (const key of collectExactKeys(output)) {
    if (forbiddenKeys.has(key)) failures.push(`forbidden_key_${key}`);
  }

  const serialized = JSON.stringify(output).toLowerCase();
  for (const unsafe of ["secret", "password", "bearer ", "private_key", "customer@example.com"]) {
    if (serialized.includes(unsafe)) failures.push(`unsafe_value_${unsafe.trim()}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "authority-injection-wrapper",
      command: "npm run proof:authority-injection-wrapper -- --dry-run --json",
      scenarios: [
        "customer-note-allow",
        "customer-note-revise",
        "customer-note-human-review",
        "customer-note-stop",
      ],
      checks: [
        "wrapTool uses beforeAction, resolveAuthority, and afterAction",
        "one wrapped tool covers allow, revise, human_review, and stop",
        "Agent I/O events are emitted before decision and after runtime gate",
        "changed args fail closed",
        "expired receipt fails closed",
        "one-shot reuse fails closed",
        "no private payload persistence",
        "no downstream execution by Neura",
      ],
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
