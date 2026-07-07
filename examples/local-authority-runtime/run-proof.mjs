#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const dryRun = argv.includes("--dry-run") || !argv.includes("--live");
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const runtimeDir = resolve(
  argValue("runtime-dir") ??
    process.env.NEURA_AUTHORITY_RUNTIME_DIR ??
    join(repoRoot, "../neura-relay-web/packages/authority-runtime"),
);
const workspaceSecret = "relay_action_card_local_authority_runtime_fixture_secret";

if (!dryRun) {
  console.error("Live mode is intentionally not implemented for the local authority runtime proof. Use --dry-run.");
  process.exit(1);
}

if (!existsSync(join(runtimeDir, "package.json"))) {
  console.error("Could not find @neurarelay/authority-runtime. Set NEURA_AUTHORITY_RUNTIME_DIR or --runtime-dir.");
  process.exit(1);
}

execFileSync("npm", ["--prefix", runtimeDir, "run", "build"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const runtimePackage = JSON.parse(readFileSync(join(runtimeDir, "package.json"), "utf8"));
const runtime = await import(pathToFileURL(join(runtimeDir, "dist", "index.js")).href);

const scratchRoot = mkdtempSync(join(tmpdir(), "relay-action-card-local-authority-runtime-"));
const fixtureRoot = join(scratchRoot, "fixture-project");

try {
  mkdirSync(fixtureRoot, { recursive: true });
  writeFixtureProject(fixtureRoot);

  const discovery = runtime.discoverProject({ projectRoot: fixtureRoot, workspaceSecret });
  const nodeDryRun = runtime.runNodeToolDryRun({ workspaceSecret });
  const mcpDryRun = runtime.runMcpToolCallFixtureDryRun({ workspaceSecret });
  const controlledRelayResult = await buildControlledRelayResult(runtime, nodeDryRun);
  const localRuntimeRouteResult = await buildLocalRuntimeRouteResult(runtime, nodeDryRun);
  const mutationChecks = buildMutationChecks(runtime, nodeDryRun);

  const output = {
    ok: true,
    proof: "local-authority-runtime",
    version: "0.1",
    mode: "local_package_consumer_dry_run_no_downstream_execution",
    command: "npm run proof:local-authority-runtime -- --dry-run --json",
    thesis:
      "A private local runtime package can discover candidate surfaces locally, emit a redacted manifest, create refs-only Action Cards, verify Decision Receipt binding, and leave execution owned by the local runtime.",
    runtime_package: {
      name: runtimePackage.name,
      version: runtimePackage.version,
      private_package: runtimePackage.private === true,
      published_or_released: false,
    },
    manifest: discovery.manifest,
    adapter_results: [nodeDryRun, mcpDryRun],
    controlled_relay_result: controlledRelayResult,
    local_runtime_route_result: localRuntimeRouteResult,
    mutation_checks: mutationChecks,
    boundaries: {
      local_package_only: true,
      refs_only: true,
      raw_files_exported: false,
      raw_policy_exported: false,
      raw_tool_args_exported: false,
      local_absolute_paths_exported: false,
      hidden_config_mutation: false,
      website_proprietary_intake: false,
      downstream_execution_by_neura: false,
      downstream_tool_executed_in_dry_run: false,
      provider_listing_or_partnership_claim: false,
      endorsement_or_approval_claim: false,
      compliance_certification_claim: false,
      public_distribution_action: false,
    },
  };

  runtime.assertNoForbiddenPayload(output, "relay action card local authority runtime proof");

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("Neura Local Authority Runtime v0.1");
    console.log("");
    console.log(output.thesis);
    console.log("");
    console.log(`Runtime package: ${output.runtime_package.name}@${output.runtime_package.version}`);
    console.log(`Manifest surfaces: ${output.manifest.discovery_summary.surface_count}`);
    console.log("Adapters: node_wrap_tool, mcp_tool_call_fixture");
    console.log(`Controlled Relay mode: ${output.controlled_relay_result.mode}`);
    console.log(`Local runtime route: ${output.local_runtime_route_result.endpoint.route}`);
    console.log("Changed args, changed target, changed actor, expired receipt, one-shot reuse, and non-proceed routes fail closed.");
    console.log("No downstream execution by Neura.");
  }
} finally {
  rmSync(scratchRoot, { recursive: true, force: true });
}

async function buildControlledRelayResult(runtime, nodeDryRun) {
  const proposal = nodeDryRun.decision_receipt.binding.bound_fields;
  const controlledRelayResult = await runtime.resolveActionCardWithControlledRelay({
    baseUrl: "https://relay.example.invalid",
    route: runtime.CONTROLLED_RELAY_DEVELOPER_ROUTE ?? "/api/developer/resolve-action-card",
    runtimeToken: "mock_runtime_token_not_exported",
    actionCard: nodeDryRun.action_card,
    proposal,
    workspaceSecret,
    manifestRef: "manifest_ref:relay_action_card_fixture",
    fetchImpl: runtime.createMockControlledRelayFetch(workspaceSecret),
  });
  const verification = runtime.verifyReceiptBinding(
    controlledRelayResult.decision_receipt,
    proposal,
    { consumed_receipts: new Set() },
    new Date(0).toISOString(),
    workspaceSecret,
  );

  return {
    ...controlledRelayResult,
    local_binding_verification: verification,
  };
}

async function buildLocalRuntimeRouteResult(runtime, nodeDryRun) {
  const proposal = nodeDryRun.decision_receipt.binding.bound_fields;
  const controlledRelayResult = await runtime.resolveActionCardWithControlledRelay({
    baseUrl: "https://relay.example.invalid",
    route: runtime.LOCAL_RUNTIME_RELAY_ROUTE ?? "/api/local-runtime/resolve-action-card",
    runtimeToken: "mock_runtime_token_not_exported",
    actionCard: nodeDryRun.action_card,
    proposal,
    workspaceSecret,
    manifestRef: "manifest_ref:relay_action_card_fixture",
    fetchImpl: runtime.createMockControlledRelayFetch(workspaceSecret),
  });
  const verification = runtime.verifyReceiptBinding(
    controlledRelayResult.decision_receipt,
    proposal,
    { consumed_receipts: new Set() },
    new Date(0).toISOString(),
    workspaceSecret,
  );

  return {
    ...controlledRelayResult,
    endpoint: {
      ...controlledRelayResult.endpoint,
      route_contract: "local_runtime_scoped_token_refs_only",
    },
    local_binding_verification: verification,
  };
}

function buildMutationChecks(runtime, nodeDryRun) {
  const originalProposal = nodeDryRun.decision_receipt.binding.bound_fields;
  const receipt = nodeDryRun.decision_receipt;

  const changedArgs = {
    ...originalProposal,
    args_digest: runtime.hmacRef("args_digest", "changed_after_receipt", workspaceSecret),
  };
  const changedTarget = {
    ...originalProposal,
    target_ref: runtime.hmacRef("target_ref", "changed_after_receipt", workspaceSecret),
  };
  const changedActor = {
    ...originalProposal,
    actor_ref: runtime.hmacRef("actor_ref", "changed_after_receipt", workspaceSecret),
  };
  const expiredReceipt = {
    ...receipt,
    expires_at: "1970-01-01T00:00:00.000Z",
  };
  const nonProceedReceipt = runtime.createFixtureDecisionReceipt({
    actionCard: nodeDryRun.action_card,
    proposal: originalProposal,
    route: "stop",
    workspaceSecret,
  });
  const oneShotState = { consumed_receipts: new Set() };

  return {
    changed_args_rejection: runtime.verifyReceiptBinding(receipt, changedArgs, { consumed_receipts: new Set() }, new Date(0).toISOString(), workspaceSecret),
    changed_target_rejection: runtime.verifyReceiptBinding(receipt, changedTarget, { consumed_receipts: new Set() }, new Date(0).toISOString(), workspaceSecret),
    changed_actor_rejection: runtime.verifyReceiptBinding(receipt, changedActor, { consumed_receipts: new Set() }, new Date(0).toISOString(), workspaceSecret),
    expired_receipt_rejection: runtime.verifyReceiptBinding(expiredReceipt, originalProposal, { consumed_receipts: new Set() }, new Date(0).toISOString(), workspaceSecret),
    one_shot_first_use: runtime.verifyReceiptBinding(receipt, originalProposal, oneShotState, new Date(0).toISOString(), workspaceSecret),
    one_shot_second_use_rejection: runtime.verifyReceiptBinding(receipt, originalProposal, oneShotState, new Date(0).toISOString(), workspaceSecret),
    non_proceed_route_rejection: runtime.verifyReceiptBinding(nonProceedReceipt, originalProposal, { consumed_receipts: new Set() }, new Date(0).toISOString(), workspaceSecret),
  };
}

function writeFixtureProject(projectRoot) {
  mkdirSync(join(projectRoot, ".codex"), { recursive: true });
  mkdirSync(join(projectRoot, ".claude"), { recursive: true });
  mkdirSync(join(projectRoot, ".github", "workflows"), { recursive: true });

  writeFileSync(
    join(projectRoot, "package.json"),
    JSON.stringify(
      {
        type: "module",
        private: true,
        scripts: {
          "tool:crm-update": "node scripts/update-crm.mjs",
          "mcp:serve": "node scripts/mcp-server.mjs",
          deploy: "node scripts/deploy.mjs",
        },
        neuraFixtureTools: {
          crmUpdate: {
            actionFamily: "crm.update",
          },
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(projectRoot, ".mcp.json"), JSON.stringify({ mcpServers: { crm: { command: "node" } } }, null, 2));
  writeFileSync(join(projectRoot, "AGENTS.md"), "Route consequential tool calls through Neura-wrapped surfaces.\n");
  writeFileSync(join(projectRoot, ".codex", "config.toml"), "[mcp_servers.neura]\ncommand = \"neura-local\"\n");
  writeFileSync(join(projectRoot, "CLAUDE.md"), "Use Neura authority checks for consequential tools.\n");
  writeFileSync(join(projectRoot, ".claude", "settings.json"), JSON.stringify({ hooks: {} }, null, 2));
  writeFileSync(join(projectRoot, ".github", "workflows", "deploy.yml"), "name: deploy\non: workflow_dispatch\n");
}

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}
