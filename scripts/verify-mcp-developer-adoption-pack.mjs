#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const notes = [];
const expectedTools = [
  "validate_action_card",
  "resolve_action_card",
  "get_decision_receipt",
  "get_trace_replay",
  "lookup_agent_passport",
];
const mcpUrl =
  process.env.NEURA_RELAY_MCP_URL ?? "https://www.neurarelay.com/mcp";
const mcpProtocolVersion =
  process.env.NEURA_RELAY_MCP_PROTOCOL_VERSION ?? "2025-11-25";

function fail(message) {
  failures.push(message);
}

async function readText(relativePath) {
  return await readFile(join(repoRoot, relativePath), "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const requiredFiles = [
  "examples/README.md",
  "examples/core/action-card-high-risk.json",
  "examples/mcp/README.md",
  "examples/mcp/compatibility-matrix.md",
  "examples/mcp/provider-runtime-paths.md",
  "examples/mcp/direct-mcp-client.mjs",
  "examples/mcp/openai-responses-remote-mcp.mjs",
  "examples/mcp/anthropic-messages-mcp.mjs",
  "examples/mcp/google-adk-remote-mcp.py",
  "examples/mcp/microsoft-agent-framework-mcp.py",
  "examples/mcp/claude-code-neura.mcp.example.json",
  "examples/mcp/agent-passport-authority-standing.example.json",
  "examples/mcp/action-cards/customer-reply.json",
  "examples/mcp/action-cards/crm-update.json",
  "examples/mcp/action-cards/refund-review.json",
  "examples/mcp/action-cards/deploy-change.json",
  "examples/mcp/action-cards/registry-ready-evidence-capture.json",
  "examples/mcp/action-cards/blocked-funds-transfer.json",
];

for (const file of requiredFiles) {
  assert(existsSync(join(repoRoot, file)), `missing_${file}`);
}

const examplesReadme = await readText("examples/README.md");
const rootReadme = await readText("README.md");
const readme = await readText("examples/mcp/README.md");
const matrix = await readText("examples/mcp/compatibility-matrix.md");
const providerRuntimePaths = await readText("examples/mcp/provider-runtime-paths.md");
const directClient = await readText("examples/mcp/direct-mcp-client.mjs");
const openaiTemplate = await readText(
  "examples/mcp/openai-responses-remote-mcp.mjs",
);
const anthropicTemplate = await readText(
  "examples/mcp/anthropic-messages-mcp.mjs",
);
const googleAdkTemplate = await readText(
  "examples/mcp/google-adk-remote-mcp.py",
);
const microsoftTemplate = await readText(
  "examples/mcp/microsoft-agent-framework-mcp.py",
);
const claudeConfig = await readJson("examples/mcp/claude-code-neura.mcp.example.json");
const authorityStandingExample = await readJson(
  "examples/mcp/agent-passport-authority-standing.example.json",
);

const combinedDocs = [
  rootReadme,
  examplesReadme,
  readme,
  matrix,
  providerRuntimePaths,
].join("\n");

assert(
  examplesReadme.includes("Core Relay") &&
    examplesReadme.includes("Optional MCP") &&
    examplesReadme.includes("MCP runtime -> protected Neura MCP tool -> same Relay decision spine"),
  "examples_readme_must_separate_core_and_optional_mcp_paths",
);
assert(
  examplesReadme.includes("It is not a separate protocol") &&
    examplesReadme.includes("does not replace `examples/core`"),
  "examples_readme_must_explain_mcp_action_card_folder",
);

assert(
  readme.includes("Add Neura as the governed decision gate"),
  "readme_missing_developer_positioning",
);
assert(
  readme.includes("optional MCP path") && readme.includes("../core"),
  "readme_must_distinguish_mcp_from_core_path",
);
assert(
  readme.includes("one-time sandbox MCP token") &&
    readme.includes("does not offer public production MCP token issuance"),
  "readme_must_preserve_no_public_token_boundary",
);
assert(
  readme.includes("Five MCP Tools") &&
    readme.includes("lookup_agent_passport") &&
    readme.includes("authority-standing"),
  "readme_must_explain_five_tools_and_authority_standing",
);
assert(
  matrix.includes("Production verified") &&
    matrix.includes("Source-aligned template prepared") &&
    matrix.includes("live OpenAI client verification is pending") &&
    matrix.includes("Anthropic Claude Messages MCP") &&
    matrix.includes("mcp-client-2025-11-20") &&
    matrix.includes("authority_standing"),
  "matrix_must_distinguish_verified_from_prepared",
);
assert(
  matrix.includes("A2A discoverability") &&
    matrix.includes("Separate later story"),
  "matrix_must_keep_a2a_separate",
);
assert(
  providerRuntimePaths.includes("MCP Provider Example Pack v0.4") &&
    providerRuntimePaths.includes("OpenAI Responses remote MCP") &&
    providerRuntimePaths.includes("Claude Messages MCP connector") &&
    providerRuntimePaths.includes("Google ADK remote MCP") &&
    providerRuntimePaths.includes("Microsoft Agent Framework / Foundry MCP") &&
    providerRuntimePaths.includes("A2A discoverability is a separate later story"),
  "provider_runtime_paths_must_explain_provider_rollout_and_boundaries",
);
assert(
  directClient.includes("tools/list") &&
    directClient.includes("tools/call") &&
    directClient.includes("resolve_action_card") &&
    directClient.includes("validate_action_card") &&
    directClient.includes("get_decision_receipt") &&
    directClient.includes("get_trace_replay") &&
    directClient.includes("lookup_agent_passport") &&
    directClient.includes("authority_standing") &&
    directClient.includes("--proof") &&
    directClient.includes("NEURA_RELAY_MCP_ACCESS_TOKEN"),
  "direct_client_must_call_all_mcp_tools_with_token",
);
assert(
  openaiTemplate.includes('type: "mcp"') &&
    openaiTemplate.includes("server_url") &&
    openaiTemplate.includes("authorization") &&
    openaiTemplate.includes("allowed_tools") &&
    openaiTemplate.includes("require_approval") &&
    openaiTemplate.includes("mcp_approval_response") &&
    openaiTemplate.includes("OPENAI_AUTO_APPROVE_MCP") &&
    openaiTemplate.includes("mcp_list_tools") &&
    openaiTemplate.includes("mcp_call") &&
    openaiTemplate.includes("validate_action_card") &&
    openaiTemplate.includes("resolve_action_card") &&
    openaiTemplate.includes("get_decision_receipt") &&
    openaiTemplate.includes("get_trace_replay") &&
    openaiTemplate.includes("lookup_agent_passport"),
  "openai_template_must_match_remote_mcp_shape",
);
assert(
  anthropicTemplate.includes("ANTHROPIC_API_KEY") &&
    anthropicTemplate.includes('"anthropic-beta"') &&
    anthropicTemplate.includes("mcp-client-2025-11-20") &&
    anthropicTemplate.includes("mcp_servers") &&
    anthropicTemplate.includes("authorization_token") &&
    anthropicTemplate.includes('"mcp_toolset"') &&
    anthropicTemplate.includes("default_config") &&
    anthropicTemplate.includes("validate_action_card") &&
    anthropicTemplate.includes("resolve_action_card") &&
    anthropicTemplate.includes("get_decision_receipt") &&
    anthropicTemplate.includes("get_trace_replay") &&
    anthropicTemplate.includes("lookup_agent_passport"),
  "anthropic_template_must_match_messages_mcp_connector_shape",
);
assert(
  googleAdkTemplate.includes("McpToolset") &&
    googleAdkTemplate.includes("StreamableHTTPConnectionParams") &&
    googleAdkTemplate.includes("tool_filter=ALLOWED_NEURA_TOOLS") &&
    googleAdkTemplate.includes("NEURA_RELAY_MCP_ACCESS_TOKEN") &&
    googleAdkTemplate.includes("Authorization") &&
    googleAdkTemplate.includes("validate_action_card") &&
    googleAdkTemplate.includes("resolve_action_card") &&
    googleAdkTemplate.includes("get_decision_receipt") &&
    googleAdkTemplate.includes("get_trace_replay") &&
    googleAdkTemplate.includes("lookup_agent_passport") &&
    googleAdkTemplate.includes("source_aligned_template"),
  "google_adk_template_must_match_remote_mcp_shape",
);
assert(
  microsoftTemplate.includes("MCPStreamableHTTPTool") &&
    microsoftTemplate.includes("headers=neura_mcp_headers()") &&
    microsoftTemplate.includes("allowed_tools=ALLOWED_NEURA_TOOLS") &&
    microsoftTemplate.includes('approval_mode="always_require"') &&
    microsoftTemplate.includes("server_url") &&
    microsoftTemplate.includes("server_label") &&
    microsoftTemplate.includes("allowed_tools") &&
    microsoftTemplate.includes("require_approval") &&
    microsoftTemplate.includes("project_connection_id") &&
    microsoftTemplate.includes("validate_action_card") &&
    microsoftTemplate.includes("resolve_action_card") &&
    microsoftTemplate.includes("get_decision_receipt") &&
    microsoftTemplate.includes("get_trace_replay") &&
    microsoftTemplate.includes("lookup_agent_passport") &&
    microsoftTemplate.includes("source_aligned_template"),
  "microsoft_template_must_match_agent_framework_and_foundry_mcp_shape",
);
assert(
  claudeConfig.mcpServers?.["neura-relay"]?.type === "http",
  "claude_config_must_use_http_mcp",
);
assert(
  claudeConfig.mcpServers?.["neura-relay"]?.url?.includes(
    "https://www.neurarelay.com/mcp",
  ),
  "claude_config_must_point_to_neura_mcp",
);
assert(
  claudeConfig.mcpServers?.["neura-relay"]?.headers?.Authorization?.includes(
    "NEURA_RELAY_MCP_ACCESS_TOKEN",
  ),
  "claude_config_must_use_token_env",
);

assert(
  authorityStandingExample.tool === "lookup_agent_passport" &&
    authorityStandingExample.ok === true &&
    authorityStandingExample.authority_standing?.authority_reference_status ===
      "ready_for_relay_authority_reference" &&
    authorityStandingExample.authority_standing?.owner_authority
      ?.human_authority_mode === "not_modeled_as_ai_agent" &&
    authorityStandingExample.authority_standing?.standing_audit
      ?.registry_standing_is_not_relay_acceptance === true &&
    authorityStandingExample.authority_standing?.boundaries
      ?.enablesDownstreamExecution === false,
  "authority_standing_example_must_show_safe_lookup_shape",
);

for (const forbidden of [
  "npm install @neura",
  "public token issuance is available",
  "self-serve token issuance is available",
  "official OpenAI partnership",
  "official Anthropic partnership",
  "official Google partnership",
  "official Microsoft partnership",
  "Neura executes downstream actions",
  "Google ADK support is live verified",
  "Microsoft Agent Framework support is live verified",
]) {
  assert(!combinedDocs.includes(forbidden), `docs_must_not_claim:${forbidden}`);
}

for (const scenario of [
  "customer-reply",
  "crm-update",
  "refund-review",
  "deploy-change",
  "registry-ready-evidence-capture",
  "blocked-funds-transfer",
]) {
  const actionCard = await readJson(`examples/mcp/action-cards/${scenario}.json`);
  assert(actionCard.version === "0.1", `${scenario}_version_must_be_0_1`);
  assert(actionCard.agent?.id, `${scenario}_must_have_agent_id`);
  assert(actionCard.agent?.capability, `${scenario}_must_have_capability`);
  assert(actionCard.proposedAction?.summary, `${scenario}_must_have_summary`);
  assert(actionCard.affectedObject, `${scenario}_must_have_affected_object`);
  assert(
    Array.isArray(actionCard.context?.evidenceRefs) &&
      (scenario === "blocked-funds-transfer"
        ? actionCard.context.evidenceRefs.length === 0
        : actionCard.context.evidenceRefs.length > 0),
    `${scenario}_must_have_expected_evidence_refs`,
  );
  assert(Array.isArray(actionCard.context?.ruleRefs), `${scenario}_must_have_rule_refs`);
  if (scenario === "blocked-funds-transfer") {
    assert(
      actionCard.proposedAction.type === "send_funds" &&
        actionCard.context.riskCategory.includes("financial") &&
        actionCard.context.ruleRefs.length === 0,
      "blocked_funds_transfer_must_model_unsafe_financial_action",
    );
  }
  if (scenario === "registry-ready-evidence-capture") {
    assert(
      actionCard.agent.id === "3df67d18-319a-4115-9dac-705e107ccf5f" &&
        actionCard.agent.capabilityVersion ===
          "6c6fd9ff-1a2e-4780-ab30-ff8c3086f9f2",
      "registry_ready_scenario_must_use_known_registry_refs",
    );
  }
  assert(
    !JSON.stringify(actionCard).includes("PRIVATE_"),
    `${scenario}_must_not_include_private_canary`,
  );
}

const coreHighRisk = await readJson("examples/core/action-card-high-risk.json");
assert(
  coreHighRisk.proposedAction?.type === "send_funds" &&
    coreHighRisk.context?.riskCategory?.includes("financial") &&
    coreHighRisk.context?.evidenceRefs?.length === 0 &&
    coreHighRisk.context?.ruleRefs?.length === 0,
  "core_high_risk_example_must_route_away_from_auto_execution",
);

for (const pythonTemplate of [
  "examples/mcp/google-adk-remote-mcp.py",
  "examples/mcp/microsoft-agent-framework-mcp.py",
]) {
  const syntaxCheck = spawnSync(
    "python3",
    [
      "-c",
      "import os, py_compile, sys, tempfile; f=tempfile.NamedTemporaryFile(delete=False); cfile=f.name; f.close(); os.unlink(cfile); py_compile.compile(sys.argv[1], cfile=cfile, doraise=True); os.unlink(cfile)",
      pythonTemplate,
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      encoding: "utf8",
    },
  );

  if (syntaxCheck.status !== 0) {
    fail(`python_template_syntax_failed:${pythonTemplate}:${syntaxCheck.stderr}`);
  }
}

for (const [script, provider] of [
  ["examples/mcp/google-adk-remote-mcp.py", "google_adk"],
  ["examples/mcp/microsoft-agent-framework-mcp.py", "microsoft_agent_framework_foundry"],
]) {
  const configCheck = spawnSync("python3", [script, "--print-config"], {
    cwd: repoRoot,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    encoding: "utf8",
  });

  if (configCheck.status !== 0) {
    fail(`provider_config_print_failed:${script}:${configCheck.stderr}`);
  } else {
    const payload = JSON.parse(configCheck.stdout);
    assert(payload.status === "source_aligned_template", `${provider}_must_be_source_aligned`);
    assert(payload.provider === provider, `${provider}_must_report_provider`);
    assert(
      JSON.stringify(payload).includes("validate_action_card") &&
        JSON.stringify(payload).includes("resolve_action_card") &&
        JSON.stringify(payload).includes("lookup_agent_passport"),
      `${provider}_must_report_neura_tool_allowlist`,
    );
    if (provider === "microsoft_agent_framework_foundry") {
      assert(
        payload.agent_framework_auth?.approval_mode === "always_require",
        "microsoft_agent_framework_must_require_approval",
      );
      assert(
        JSON.stringify(payload.agent_framework_auth).includes("Authorization"),
        "microsoft_agent_framework_must_report_authorization_header",
      );
    }
  }
}

if (process.env.NEURA_RELAY_MCP_ACCESS_TOKEN) {
  const unauthenticatedMcp = await fetch(mcpUrl, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "unauthenticated-check",
      method: "initialize",
      params: {
        protocolVersion: mcpProtocolVersion,
        capabilities: {},
        clientInfo: {
          name: "relay-action-card-mcp-pack-verifier",
          version: "0.1.0",
        },
      },
    }),
  });
  const unauthenticatedPayload = await unauthenticatedMcp.json();
  assert(unauthenticatedMcp.status === 401, "live_mcp_auth_rejection_must_return_401");
  assert(
    unauthenticatedPayload?.error?.message?.toLowerCase?.().includes("unauthorized"),
    "live_mcp_auth_rejection_must_be_mcp_shaped",
  );
  notes.push("live_mcp_auth_rejection=passed");

  const liveToolsList = spawnSync(
    process.execPath,
    ["examples/mcp/direct-mcp-client.mjs", "--list-tools", "--json"],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    },
  );

  if (liveToolsList.status !== 0) {
    fail(`live_mcp_tools_list_failed:${liveToolsList.stderr || liveToolsList.stdout}`);
  } else {
    const payload = JSON.parse(liveToolsList.stdout);
    assert(
      JSON.stringify([...(payload.tools ?? [])].sort()) ===
        JSON.stringify([...expectedTools].sort()),
      "live_mcp_tools_list_must_return_exact_tool_set",
    );
    notes.push("live_mcp_tools_list=passed");
  }

  const liveValidation = spawnSync(
    process.execPath,
    [
      "examples/mcp/direct-mcp-client.mjs",
      "--tool=validate_action_card",
      "--action-card=examples/mcp/action-cards/customer-reply.json",
      "--json",
    ],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    },
  );

  if (liveValidation.status !== 0) {
    fail(`live_mcp_validation_failed:${liveValidation.stderr || liveValidation.stdout}`);
  } else {
    const payload = JSON.parse(liveValidation.stdout);
    assert(payload.ok === true, "live_mcp_validation_must_pass");
    assert(
      payload.downstream_execution_performed === "false",
      "live_mcp_validation_must_not_execute_downstream",
    );
    notes.push("live_mcp_validation=passed");
  }

  const liveResolution = spawnSync(
    process.execPath,
    [
      "examples/mcp/direct-mcp-client.mjs",
      "--tool=resolve_action_card",
      "--action-card=examples/mcp/action-cards/customer-reply.json",
      "--json",
    ],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    },
  );

  if (liveResolution.status !== 0) {
    fail(`live_mcp_resolution_failed:${liveResolution.stderr || liveResolution.stdout}`);
  } else {
    const payload = JSON.parse(liveResolution.stdout);
    assert(payload.ok === true, "live_mcp_resolution_must_pass");
    assert(payload.receipt_id, "live_mcp_resolution_must_return_receipt");
    assert(payload.trace_ref, "live_mcp_resolution_must_return_trace");
    assert(payload.transaction_ref, "live_mcp_resolution_must_return_transaction");
    assert(
      payload.private_payload_returned === false,
      "live_mcp_resolution_must_not_return_private_payload",
    );
    assert(
      payload.downstream_execution_performed === false,
      "live_mcp_resolution_must_not_execute_downstream",
    );
    notes.push("live_mcp_resolution=passed");
  }

  const liveProof = spawnSync(
    process.execPath,
    ["examples/mcp/direct-mcp-client.mjs", "--proof", "--json"],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    },
  );

  if (liveProof.status !== 0) {
    fail(`live_mcp_proof_sequence_failed:${liveProof.stderr || liveProof.stdout}`);
  } else {
    const payload = JSON.parse(liveProof.stdout);
    assert(payload.ok === true, "live_mcp_proof_sequence_must_pass");
    assert(
      payload.resolve_action_card?.receipt_id &&
        payload.get_decision_receipt?.trace_ref &&
        payload.get_trace_replay?.event_count,
      "live_mcp_proof_must_return_receipt_trace_refs",
    );
    assert(
      payload.lookup_agent_passport?.authority_reference_status ===
        "ready_for_relay_authority_reference",
      "live_mcp_proof_must_return_authority_standing",
    );
    assert(
      payload.lookup_agent_passport?.human_authority_mode ===
        "not_modeled_as_ai_agent",
      "live_mcp_proof_must_preserve_human_authority_boundary",
    );
    assert(
      payload.private_payload_returned === false &&
        payload.downstream_execution_performed === false,
      "live_mcp_proof_must_preserve_private_and_execution_boundaries",
    );
    notes.push("live_mcp_proof_sequence=passed");
  }

  const liveBlockedResolution = spawnSync(
    process.execPath,
    [
      "examples/mcp/direct-mcp-client.mjs",
      "--tool=resolve_action_card",
      "--action-card=examples/mcp/action-cards/blocked-funds-transfer.json",
      "--json",
    ],
    {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    },
  );

  if (liveBlockedResolution.status !== 0) {
    fail(
      `live_mcp_blocked_resolution_failed:${liveBlockedResolution.stderr || liveBlockedResolution.stdout}`,
    );
  } else {
    const payload = JSON.parse(liveBlockedResolution.stdout);
    assert(payload.ok === true, "live_mcp_blocked_resolution_must_pass");
    assert(
      payload.decision === "stop" || payload.decision === "human_review",
      "live_mcp_blocked_resolution_must_not_auto_proceed",
    );
    assert(
      payload.downstream_execution_performed === false,
      "live_mcp_blocked_resolution_must_not_execute_downstream",
    );
    notes.push(`live_mcp_blocked_resolution=${payload.decision}`);
  }
} else {
  notes.push("live_mcp_direct_client=skipped_missing_token");
}

const result = {
  ok: failures.length === 0,
  checked_files: requiredFiles.length,
  notes,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
