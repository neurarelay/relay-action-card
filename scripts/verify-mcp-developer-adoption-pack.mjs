#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const notes = [];

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
  "examples/mcp/README.md",
  "examples/mcp/compatibility-matrix.md",
  "examples/mcp/direct-mcp-client.mjs",
  "examples/mcp/openai-responses-remote-mcp.mjs",
  "examples/mcp/claude-code-neura.mcp.example.json",
  "examples/mcp/action-cards/customer-reply.json",
  "examples/mcp/action-cards/crm-update.json",
  "examples/mcp/action-cards/refund-review.json",
  "examples/mcp/action-cards/deploy-change.json",
];

for (const file of requiredFiles) {
  assert(existsSync(join(repoRoot, file)), `missing_${file}`);
}

const readme = await readText("examples/mcp/README.md");
const matrix = await readText("examples/mcp/compatibility-matrix.md");
const directClient = await readText("examples/mcp/direct-mcp-client.mjs");
const openaiTemplate = await readText(
  "examples/mcp/openai-responses-remote-mcp.mjs",
);
const claudeConfig = await readJson("examples/mcp/claude-code-neura.mcp.example.json");

assert(
  readme.includes("Add Neura as the governed decision gate"),
  "readme_missing_developer_positioning",
);
assert(
  readme.includes("optional MCP path") && readme.includes("../core"),
  "readme_must_distinguish_mcp_from_core_path",
);
assert(
  readme.includes("does not currently offer public self-serve token issuance"),
  "readme_must_preserve_no_public_token_boundary",
);
assert(
  matrix.includes("Production verified") &&
    matrix.includes("Source-aligned template prepared") &&
    matrix.includes("live OpenAI client verification is pending"),
  "matrix_must_distinguish_verified_from_prepared",
);
assert(
  matrix.includes("A2A discoverability") &&
    matrix.includes("Separate later story"),
  "matrix_must_keep_a2a_separate",
);
assert(
  directClient.includes("tools/list") &&
    directClient.includes("tools/call") &&
    directClient.includes("resolve_action_card") &&
    directClient.includes("validate_action_card") &&
    directClient.includes("NEURA_RELAY_MCP_ACCESS_TOKEN"),
  "direct_client_must_call_mcp_tools_with_token",
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
    openaiTemplate.includes("resolve_action_card"),
  "openai_template_must_match_remote_mcp_shape",
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

for (const scenario of [
  "customer-reply",
  "crm-update",
  "refund-review",
  "deploy-change",
]) {
  const actionCard = await readJson(`examples/mcp/action-cards/${scenario}.json`);
  assert(actionCard.version === "0.1", `${scenario}_version_must_be_0_1`);
  assert(actionCard.agent?.id, `${scenario}_must_have_agent_id`);
  assert(actionCard.agent?.capability, `${scenario}_must_have_capability`);
  assert(actionCard.proposedAction?.summary, `${scenario}_must_have_summary`);
  assert(actionCard.affectedObject, `${scenario}_must_have_affected_object`);
  assert(
    Array.isArray(actionCard.context?.evidenceRefs) &&
      actionCard.context.evidenceRefs.length > 0,
    `${scenario}_must_have_evidence_refs`,
  );
  assert(
    !JSON.stringify(actionCard).includes("PRIVATE_"),
    `${scenario}_must_not_include_private_canary`,
  );
}

if (process.env.NEURA_RELAY_MCP_ACCESS_TOKEN) {
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
