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
    "IBM validation",
    "IBM endorsed",
    "Google approved",
    "Google endorsed",
    "official Google ADK integration",
    "official MCP integration",
    "provider partnership",
    "provider endorsement",
    "directory listing",
    "listed by Google",
    "listed by IBM",
    "listed by MCP",
    "public production MCP token issuance",
    "public API-key issuance",
    "downstream execution by Neura is enabled",
    "Neura executes the tool",
    "OpenAI approved",
    "Anthropic approved",
    "OpenClaw approved",
    "ClawHub approved"
  ];

  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_claim_${phrase}`);
  }
}

function rejectUnsafeFixture(label, text) {
  const forbidden = [
    "PRIVATE_",
    "SECRET",
    "PASSWORD",
    "token_value",
    "access_token",
    "customer@example.com",
    "\"rawCustomerData\"",
    "\"rawPolicyDocument\"",
    "\"rawCommand\"",
    "\"fileContents\"",
    "\"formValues\"",
    "\"privatePayload\""
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
  "docs/mcp-adk-authority-layer-proof.md",
  "examples/mcp-adk-authority/manifest.json",
  "examples/mcp-adk-authority/run-proof.mjs",
  "examples/mcp-adk-authority/action-cards/repo-search-proceed.json",
  "examples/mcp-adk-authority/action-cards/issue-comment-revise.json",
  "examples/mcp-adk-authority/action-cards/deployment-stop.json",
  "examples/mcp-adk-authority/action-cards/package-publish-human-review.json",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["proof:mcp-adk-authority"] !==
  "node examples/mcp-adk-authority/run-proof.mjs"
) {
  failures.push("package_script_missing_mcp_adk_authority_proof");
}
if (
  packageJson.scripts?.["verify:mcp-adk-authority-proof"] !==
  "node scripts/verify-mcp-adk-authority-proof.mjs"
) {
  failures.push("package_script_missing_mcp_adk_authority_verifier");
}

const docs = read("docs/mcp-adk-authority-layer-proof.md");
requireIncludes("docs", docs, [
  "ADK-style orchestration proposes an action",
  "Neura Action Card",
  "Relay Decision Receipt",
  "receipt_ref / trace_ref",
  "MCP/tool/runtime-owned execution route",
  "npm run proof:mcp-adk-authority -- --dry-run --json",
  "npm run verify:mcp-adk-authority-proof",
  "repo-search-proceed",
  "issue-comment-revise",
  "deployment-stop",
  "package-publish-human-review",
  "no downstream execution by Neura",
  "no private payload persistence",
  "no live ADK runtime dependency",
  "no live MCP server call",
  "no provider approval, listing, endorsement, validation, or partnership claim",
  "no website, package registry, public GitHub, directory, submission, or distribution action",
]);
rejectUnsafeClaims("docs", docs);

const manifest = readJson("examples/mcp-adk-authority/manifest.json");
if (manifest.version !== "0.1") failures.push("manifest_wrong_version");
if (manifest.status !== "local_dry_run_proof") failures.push("manifest_wrong_status");
if (manifest.examples?.length !== 4) failures.push("manifest_wrong_scenario_count");
for (const [key, value] of Object.entries(manifest.boundaries ?? {})) {
  if (
    [
      "refs_only",
      "local_dry_run",
      "runtime_owned_execution"
    ].includes(key)
  ) {
    if (value !== true) failures.push(`manifest_boundary_${key}_not_true`);
  } else if (value !== false) {
    failures.push(`manifest_boundary_${key}_not_false`);
  }
}

const expected = {
  "repo-search-proceed": { decision: "proceed", route: "proceed", tool: "repo.search" },
  "issue-comment-revise": {
    decision: "revise",
    route: "revise",
    tool: "github.issue_comment.create",
  },
  "deployment-stop": { decision: "stop", route: "stop", tool: "deployment.promote" },
  "package-publish-human-review": {
    decision: "human_review",
    route: "human_review",
    tool: "npm.publish",
  },
};

for (const scenario of manifest.examples ?? []) {
  const expectation = expected[scenario.id];
  if (!expectation) failures.push(`manifest_unexpected_scenario_${scenario.id}`);
  if (scenario.tool !== expectation?.tool) failures.push(`${scenario.id}_wrong_tool`);
  if (scenario.expectedDecision !== expectation?.decision) {
    failures.push(`${scenario.id}_wrong_expected_decision`);
  }
  if (scenario.expectedRoute !== expectation?.route) {
    failures.push(`${scenario.id}_wrong_expected_route`);
  }
  requireFile(scenario.path);
}

for (const scenario of manifest.examples ?? []) {
  const serialized = read(scenario.path);
  const actionCard = JSON.parse(serialized);
  const authority = actionCard.context?.authorityContext;
  const mcpTool = actionCard.context?.mcpTool;
  const runner = actionCard.context?.adkStyleRunner;

  rejectUnsafeFixture(scenario.id, serialized);

  if (actionCard.version !== "0.1") failures.push(`${scenario.id}_wrong_version`);
  if (!actionCard.agent?.id) failures.push(`${scenario.id}_missing_agent_id`);
  if (!actionCard.agent?.capabilityVersion) {
    failures.push(`${scenario.id}_missing_capability_version`);
  }
  if (!actionCard.proposedAction?.type?.startsWith("mcp_adk.")) {
    failures.push(`${scenario.id}_missing_mcp_adk_action_family`);
  }
  if (!actionCard.proposedAction?.target) failures.push(`${scenario.id}_missing_target`);
  if (!runner?.runnerRef || !runner?.eventRef) failures.push(`${scenario.id}_missing_runner_refs`);
  if (runner?.orchestrationPosture !== "proposed_tool_call_before_execution") {
    failures.push(`${scenario.id}_wrong_runner_posture`);
  }
  if (!mcpTool?.toolName || !mcpTool?.toolCallRef) failures.push(`${scenario.id}_missing_mcp_tool_refs`);
  if (mcpTool?.runtimeOwner !== "developer_runtime") failures.push(`${scenario.id}_wrong_runtime_owner`);
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

const runner = read("examples/mcp-adk-authority/run-proof.mjs");
requireIncludes("runner", runner, [
  "adk_style_runner_proposed_tool_call",
  "action_card_created",
  "neura_relay_decision_receipt_returned",
  "receipt_refs_attached_to_mcp_tool_event",
  "runtime_execution_remains_developer_owned",
  "tool_call_executed_in_dry_run: false",
  "neura_executed_tool_call: false",
  "downstream_execution_by_neura: false",
  "private_payload_persisted: false",
]);
rejectUnsafeClaims("runner", runner);

const runResult = run("npm", ["run", "proof:mcp-adk-authority", "--", "--dry-run", "--json"]);
if (runResult.status !== 0) {
  failures.push(`proof_command_failed_${runResult.status}_${runResult.stderr || runResult.stdout}`);
}

const runResultAgain = run("npm", ["run", "proof:mcp-adk-authority", "--", "--dry-run", "--json"]);
if (runResultAgain.status !== 0) {
  failures.push(`proof_command_second_run_failed_${runResultAgain.status}_${runResultAgain.stderr || runResultAgain.stdout}`);
}
if (runResult.stdout !== runResultAgain.stdout) {
  failures.push("proof_output_not_deterministic");
}

let output = null;
try {
  const start = runResult.stdout.search(/\{/);
  output = JSON.parse(runResult.stdout.slice(start));
} catch {
  failures.push("proof_output_not_json");
}

if (output) {
  if (output.ok !== true) failures.push("proof_output_not_ok");
  if (output.mode !== "local_dry_run_no_provider_runtime_no_downstream_execution") {
    failures.push(`proof_wrong_mode_${output.mode}`);
  }
  if (output.count !== 4) failures.push(`proof_wrong_count_${output.count}`);
  requireIncludes("proof_pattern", (output.pattern ?? []).join(" -> "), [
    "ADK-style runner proposes a tool action",
    "Neura Action Card captures actor, action, target, authority, policy, and evidence refs",
    "Relay returns a Decision Receipt with receipt_ref and trace_ref",
    "MCP/tool/runtime-owned execution route is attached after the receipt",
    "Neura does not execute the downstream action",
  ]);

  const seen = new Map((output.results ?? []).map((result) => [result.scenario, result]));
  for (const [scenarioId, expectation] of Object.entries(expected)) {
    const result = seen.get(scenarioId);
    if (!result) {
      failures.push(`proof_missing_result_${scenarioId}`);
      continue;
    }
    if (result.adk_style_runner_event?.event_type !== "tool_call_proposed") {
      failures.push(`${scenarioId}_wrong_runner_event_type`);
    }
    if (result.adk_style_runner_event?.proposed_tool !== expectation.tool) {
      failures.push(`${scenarioId}_wrong_proposed_tool`);
    }
    if (result.adk_style_runner_event?.attribution?.refs_only !== true) {
      failures.push(`${scenarioId}_runner_attribution_not_refs_only`);
    }
    if (result.action_card?.refs_only !== true) failures.push(`${scenarioId}_action_card_not_refs_only`);
    if (result.decision_receipt?.decision !== expectation.decision) {
      failures.push(`${scenarioId}_wrong_decision_${result.decision_receipt?.decision}`);
    }
    if (result.decision_receipt?.route !== expectation.route) {
      failures.push(`${scenarioId}_wrong_route_${result.decision_receipt?.route}`);
    }
    if (!/^receipt_ref_demo_[0-9a-f]{8}$/.test(result.decision_receipt?.receipt_ref ?? "")) {
      failures.push(`${scenarioId}_bad_receipt_ref`);
    }
    if (!/^trace_ref_demo_[0-9a-f]{8}$/.test(result.decision_receipt?.trace_ref ?? "")) {
      failures.push(`${scenarioId}_bad_trace_ref`);
    }
    if (!/^relay_txn_demo_[0-9a-f]{8}$/.test(result.decision_receipt?.transaction_ref ?? "")) {
      failures.push(`${scenarioId}_bad_transaction_ref`);
    }
    if (result.decision_receipt?.authority_layer !== "neura") {
      failures.push(`${scenarioId}_missing_authority_layer`);
    }
    if (result.mcp_tool_event_after_receipt?.execution_route !== "runtime_owned_after_neura_receipt") {
      failures.push(`${scenarioId}_wrong_execution_route`);
    }
    if (result.mcp_tool_event_after_receipt?.runtime_owner !== "developer_runtime") {
      failures.push(`${scenarioId}_wrong_runtime_owner_output`);
    }
    if (result.mcp_tool_event_after_receipt?.attached_decision !== expectation.decision) {
      failures.push(`${scenarioId}_tool_event_decision_mismatch`);
    }
    if (result.mcp_tool_event_after_receipt?.attached_receipt_ref !== result.decision_receipt?.receipt_ref) {
      failures.push(`${scenarioId}_tool_event_receipt_mismatch`);
    }
    if (result.mcp_tool_event_after_receipt?.attached_trace_ref !== result.decision_receipt?.trace_ref) {
      failures.push(`${scenarioId}_tool_event_trace_mismatch`);
    }
    if (result.mcp_tool_event_after_receipt?.attribution?.refs_only !== true) {
      failures.push(`${scenarioId}_tool_event_attribution_not_refs_only`);
    }
    if (result.mcp_tool_event_after_receipt?.tool_call_executed_in_dry_run !== false) {
      failures.push(`${scenarioId}_tool_call_executed_in_dry_run`);
    }
    if (result.mcp_tool_event_after_receipt?.neura_executed_tool_call !== false) {
      failures.push(`${scenarioId}_neura_executed_tool_call`);
    }
    if (result.trace?.private_payload_persisted !== false) {
      failures.push(`${scenarioId}_private_payload_persisted`);
    }
    if (result.trace?.downstream_execution_by_neura !== false) {
      failures.push(`${scenarioId}_downstream_execution_by_neura`);
    }
    if (result.boundaries?.provider_integration_claim !== false) {
      failures.push(`${scenarioId}_provider_claim_boundary_not_false`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "mcp-adk-authority-proof",
      command: "npm run proof:mcp-adk-authority -- --dry-run --json",
      scenarios: Object.keys(expected),
      boundaries: [
        "deterministic local dry-run output",
        "ADK-style runner pattern only",
        "MCP/tool execution remains runtime-owned",
        "no private payload persistence",
        "no downstream execution by Neura",
        "no provider/listing/endorsement/partnership claim",
      ],
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
