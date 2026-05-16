#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

function rejectUnsafeClaims(label, text) {
  const forbidden = [
    "Grok Build integration",
    "Claude integration",
    "Codex integration",
    "Cursor integration",
    "official OpenAI approval",
    "official Anthropic approval",
    "official xAI approval",
    "provider partnership",
    "provider endorsement",
    "public API-key issuance",
    "public production MCP token issuance",
    "public A2A token issuance",
    "downstream execution by Neura is enabled",
    "Authority Layer v1.0 is complete",
    "Authority Layer v1.0 is production-ready",
  ];

  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_claim_${phrase}`);
  }
}

function rejectUnsafeFixture(label, text) {
  const forbidden = [
    "PRIVATE_",
    "SECRET",
    "API_KEY",
    "PASSWORD",
    "token_value",
    "access_token",
    "customer@example.com",
    "\"rawCustomerData\"",
    "\"rawPolicyDocument\"",
    "\"rawCommand\"",
    "\"fileContents\"",
    "\"formValues\"",
    "\"privatePayload\"",
  ];

  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_fixture_${phrase}`);
  }
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const requiredFiles = [
  "docs/agentic-execution-governance-demo.md",
  "examples/agentic-execution-governance/manifest.json",
  "examples/agentic-execution-governance/run-demo.mjs",
  "examples/agentic-execution-governance/action-cards/permitted-file-edit.json",
  "examples/agentic-execution-governance/action-cards/blocked-shell-command.json",
  "examples/agentic-execution-governance/action-cards/challenged-browser-submit.json",
  "examples/agentic-execution-governance/action-cards/human-review-data-export.json",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["agentic-execution:demo"] !==
  "node examples/agentic-execution-governance/run-demo.mjs"
) {
  failures.push("package_script_missing_agentic_execution_demo");
}
if (
  packageJson.scripts?.["verify:agentic-execution-governance-demo"] !==
  "node scripts/verify-agentic-execution-governance-demo.mjs"
) {
  failures.push("package_script_missing_agentic_execution_verifier");
}

const docs = read("docs/agentic-execution-governance-demo.md");
requireIncludes("docs", docs, [
  "When agents move from chat into execution, every consequential action needs a governed pre-action decision.",
  "agent proposes action",
  "Neura checks identity / authority / policy / evidence",
  "Decision Receipt + trace",
  "developer-owned execution",
  "npm run agentic-execution:demo",
  "npm run verify:agentic-execution-governance-demo",
  "permitted-file-edit",
  "blocked-shell-command",
  "challenged-browser-submit",
  "human-review-data-export",
  "no downstream execution by Neura",
  "no private payloads",
  "no raw customer data",
  "no raw policy documents",
  "no provider-specific integration",
  "Authority Layer v1.0 milestone status remains outside this demo",
]);
rejectUnsafeClaims("docs", docs);

const manifest = readJson("examples/agentic-execution-governance/manifest.json");
if (manifest.version !== "0.1") failures.push("manifest_wrong_version");
if (manifest.status !== "local_demo") failures.push("manifest_wrong_status");
if (manifest.examples?.length !== 4) failures.push("manifest_wrong_scenario_count");

const expected = {
  "permitted-file-edit": { route: "allow", decision: "proceed" },
  "blocked-shell-command": { route: "block", decision: "stop" },
  "challenged-browser-submit": { route: "challenge", decision: "revise" },
  "human-review-data-export": { route: "human_review", decision: "human_review" },
};

for (const [key, value] of Object.entries(manifest.boundaries ?? {})) {
  if (key === "refs_only") {
    if (value !== true) failures.push("manifest_refs_only_not_true");
  } else if (value !== false) {
    failures.push(`manifest_boundary_${key}_not_false`);
  }
}

for (const scenario of manifest.examples ?? []) {
  const expectation = expected[scenario.id];
  if (!expectation) failures.push(`manifest_unexpected_scenario_${scenario.id}`);
  if (expectation && scenario.expectedRoute !== expectation.route) {
    failures.push(`${scenario.id}_wrong_expected_route`);
  }
  if (expectation && scenario.expectedDecision !== expectation.decision) {
    failures.push(`${scenario.id}_wrong_expected_decision`);
  }
  requireFile(scenario.path);
}

for (const scenario of manifest.examples ?? []) {
  const serialized = read(scenario.path);
  const actionCard = JSON.parse(serialized);
  const authority = actionCard.context?.authorityContext;

  rejectUnsafeFixture(scenario.id, serialized);

  if (actionCard.version !== "0.1") failures.push(`${scenario.id}_wrong_version`);
  if (!actionCard.agent?.id) failures.push(`${scenario.id}_missing_agent_id`);
  if (!actionCard.agent?.capabilityVersion) {
    failures.push(`${scenario.id}_missing_capability_version`);
  }
  if (!actionCard.proposedAction?.type?.startsWith("agentic_cli.")) {
    failures.push(`${scenario.id}_missing_agentic_cli_family`);
  }
  if (!actionCard.proposedAction?.target) failures.push(`${scenario.id}_missing_target`);
  if (!authority?.authorityScopeRef) failures.push(`${scenario.id}_missing_authority_scope_ref`);
  if (!authority?.standingRef) failures.push(`${scenario.id}_missing_standing_ref`);
  if (!Array.isArray(authority?.policyRefs)) failures.push(`${scenario.id}_missing_policy_refs`);
  if (!Array.isArray(actionCard.context?.evidenceRefs)) {
    failures.push(`${scenario.id}_missing_evidence_refs`);
  }
  if (!Array.isArray(actionCard.context?.ruleRefs)) {
    failures.push(`${scenario.id}_missing_rule_refs`);
  }
}

const runner = read("examples/agentic-execution-governance/run-demo.mjs");
requireIncludes("runner", runner, [
  "agent_proposed_action",
  "identity_checked",
  "authority_checked",
  "policy_and_evidence_checked",
  "decision_gate_only_developer_keeps_execution",
  "downstream_execution_performed: false",
  "neura_executed_downstream_action: false",
]);
rejectUnsafeClaims("runner", runner);

const runResult = run("node", ["examples/agentic-execution-governance/run-demo.mjs", "--json"]);
if (runResult.status !== 0) {
  failures.push(`demo_command_failed_${runResult.status}_${runResult.stderr || runResult.stdout}`);
}

let output = null;
try {
  output = JSON.parse(runResult.stdout);
} catch {
  failures.push("demo_output_not_json");
}

if (output) {
  if (output.ok !== true) failures.push("demo_output_not_ok");
  if (output.mode !== "local_simulated_receipts") failures.push("demo_wrong_mode");
  if (output.count !== 4) failures.push("demo_wrong_count");
  requireIncludes("demo_loop", (output.loop ?? []).join(" -> "), [
    "agent proposes action",
    "Neura checks identity / authority / policy / evidence",
    "Decision Receipt + trace",
    "developer-owned execution",
  ]);

  const seen = new Map((output.results ?? []).map((result) => [result.scenario, result]));
  for (const [scenarioId, expectation] of Object.entries(expected)) {
    const result = seen.get(scenarioId);
    if (!result) {
      failures.push(`demo_missing_result_${scenarioId}`);
      continue;
    }
    if (result.route !== expectation.route) failures.push(`${scenarioId}_wrong_route_${result.route}`);
    if (result.decision_receipt?.decision !== expectation.decision) {
      failures.push(`${scenarioId}_wrong_decision_${result.decision_receipt?.decision}`);
    }
    if (!result.decision_receipt?.receipt_id) failures.push(`${scenarioId}_missing_receipt`);
    if (!result.decision_receipt?.trace_ref) failures.push(`${scenarioId}_missing_receipt_trace`);
    if (!result.decision_receipt?.transaction_ref) failures.push(`${scenarioId}_missing_transaction_ref`);
    if (!result.trace?.trace_ref) failures.push(`${scenarioId}_missing_trace`);
    if (result.trace?.private_payload_stored !== false) {
      failures.push(`${scenarioId}_private_payload_storage_not_false`);
    }
    if (result.trace?.downstream_execution_performed !== false) {
      failures.push(`${scenarioId}_downstream_execution_not_false`);
    }
    if (result.neura_executed_downstream_action !== false) {
      failures.push(`${scenarioId}_neura_execution_not_false`);
    }
    if (result.decision_receipt?.authority_context?.refs_only !== true) {
      failures.push(`${scenarioId}_authority_context_not_refs_only`);
    }
    if (
      result.decision_receipt?.relay_boundary !==
      "decision_gate_only_developer_keeps_execution"
    ) {
      failures.push(`${scenarioId}_wrong_relay_boundary`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "agentic-execution-governance-demo",
      scenarios: Object.keys(expected),
      command: "npm run agentic-execution:demo -- --json",
      boundaries: [
        "refs-only Action Cards",
        "local simulated Decision Receipts",
        "no downstream execution by Neura",
        "no provider integration or approval claim",
        "Authority Layer v1.0 milestone status remains outside this demo",
      ],
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
