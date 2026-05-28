#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRelayAttribution,
  publicAttributionSummary,
} from "../examples/lib/activation-attribution.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const dryRun = argv.includes("--dry-run") || !argv.includes("--live");
const sessionRef =
  argValue("session-ref") ??
  process.env.NEURA_SESSION_REF ??
  `ecosystem_availability:${randomUUID()}`;
const ecosystem = argValue("ecosystem");

const ecosystems = {
  mcp: {
    title: "MCP Registry / generic MCP clients",
    source: "mcp_registry",
    campaign: "ecosystem_availability_mcp",
    surface: "scripts/run-ecosystem-proof:mcp",
    usableToday:
      "Use Neura Relay as a protected remote MCP server at https://www.neurarelay.com/mcp.",
    protectedAccess:
      "Requires a workspace sandbox or controlled private Neura Relay MCP access token.",
    dryRunCommand: "npm run proof:mcp -- --dry-run --json",
    liveCommand:
      "NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json",
    requiredEnv: ["NEURA_RELAY_MCP_ACCESS_TOKEN"],
    requestTemplate: {
      transport: "streamable-http",
      server_url: "https://www.neurarelay.com/mcp",
      authorization: "Bearer NEURA_RELAY_MCP_ACCESS_TOKEN",
      tools: [
        "validate_action_card",
        "resolve_action_card",
        "get_decision_receipt",
        "get_trace_replay",
        "lookup_agent_passport",
      ],
    },
  },
  openai: {
    title: "OpenAI Responses API / ChatGPT Developer Mode remote MCP",
    source: "openai_remote_mcp",
    campaign: "ecosystem_availability_openai",
    surface: "scripts/run-ecosystem-proof:openai",
    usableToday:
      "Use the protected Neura Relay MCP server from OpenAI Responses API or ChatGPT Developer Mode when the developer has the required OpenAI account/API access and a controlled Neura token.",
    protectedAccess:
      "Requires OPENAI_API_KEY for API proof and NEURA_RELAY_MCP_ACCESS_TOKEN for Neura MCP access.",
    dryRunCommand: "npm run proof:openai -- --dry-run --json",
    liveCommand:
      "OPENAI_API_KEY=... NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:openai-mcp",
    requiredEnv: ["OPENAI_API_KEY", "NEURA_RELAY_MCP_ACCESS_TOKEN"],
    requestTemplate: {
      model: "gpt-5",
      tools: [
        {
          type: "mcp",
          server_label: "neura_relay",
          server_url: "https://www.neurarelay.com/mcp",
          authorization: "NEURA_RELAY_MCP_ACCESS_TOKEN",
          require_approval: "always",
          allowed_tools: [
            "validate_action_card",
            "resolve_action_card",
            "get_decision_receipt",
            "get_trace_replay",
            "lookup_agent_passport",
          ],
        },
      ],
      input:
        "Use Neura Relay to validate this Action Card before any downstream execution.",
    },
  },
  claude: {
    title: "Anthropic Claude Messages API MCP connector",
    source: "anthropic_claude_mcp",
    campaign: "ecosystem_availability_claude",
    surface: "scripts/run-ecosystem-proof:claude",
    usableToday:
      "Use the protected Neura Relay MCP server from Claude Messages API with the MCP connector beta.",
    protectedAccess:
      "Requires ANTHROPIC_API_KEY and NEURA_RELAY_MCP_ACCESS_TOKEN for a live call.",
    dryRunCommand: "npm run proof:claude -- --dry-run --json",
    liveCommand:
      "ANTHROPIC_API_KEY=... NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:anthropic-mcp",
    requiredEnv: ["ANTHROPIC_API_KEY", "NEURA_RELAY_MCP_ACCESS_TOKEN"],
    requestTemplateFromCommand: [
      "examples/mcp/anthropic-messages-mcp.mjs",
      "--print-request",
    ],
  },
  a2a: {
    title: "A2A Agent Card discovery",
    source: "a2a_agent_card",
    campaign: "ecosystem_availability_a2a",
    surface: "scripts/run-ecosystem-proof:a2a",
    usableToday:
      "Discover Neura Relay through the public A2A Agent Card; protected /a2a message/send requires controlled access.",
    protectedAccess:
      "Public discovery is open. Execution remains protected with RELAY_A2A_ACCESS_TOKEN.",
    dryRunCommand: "npm run proof:a2a -- --agent-card-only --json",
    liveCommand: "RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json",
    requiredEnv: ["RELAY_A2A_ACCESS_TOKEN"],
    requestTemplateFromCommand: [
      "examples/a2a/resolve-action-card-a2a.mjs",
      "--agent-card-only",
      "--json",
    ],
  },
  openclaw: {
    title: "OpenClaw / ClawHub package path",
    source: "openclaw_clawhub",
    campaign: "ecosystem_availability_openclaw",
    surface: "scripts/run-ecosystem-proof:openclaw",
    usableToday:
      "Run the OpenClaw-style preflight adapter and local proof surfaces before local autonomous-agent actions execute.",
    protectedAccess:
      "Local proof is credential-free. Live Relay receipts are optional and developer-owned.",
    dryRunCommand: "npm run proof:openclaw -- --dry-run --json",
    liveCommand:
      "npm run openclaw:proof -- --live --source=openclaw_clawhub --campaign=ecosystem_availability_openclaw",
    requiredEnv: [],
    requestTemplate: {
      package: "@neurarelay/openclaw-preflight-adapter",
      package_latest_expected: "0.1.4",
      local_proof: "npm run openclaw:proof",
      live_receipt_proof:
        "npm run openclaw:proof -- --live --source=openclaw_clawhub --campaign=ecosystem_availability_openclaw",
      claim_boundary:
        "OpenClaw-style public proof only; no official OpenClaw or ClawHub approval/listing claim.",
    },
  },
  "swarm-authority": {
    title: "Swarm runtimes such as Ruflo / Claude Flow-style orchestration",
    source: "swarm_runtime",
    campaign: "ecosystem_availability_swarm_authority",
    surface: "scripts/run-ecosystem-proof:swarm-authority",
    usableToday:
      "Use Neura as the pre-action authority checkpoint before a swarm runtime routes, dispatches, invokes MCP tools, writes memory, or crosses federation trust boundaries.",
    protectedAccess:
      "This is a local architecture proof and placement pattern, not a Ruflo integration or endorsement claim.",
    dryRunCommand: "npm run proof:swarm-authority -- --dry-run --json",
    liveCommand:
      "Create an Action Card from the swarm's proposed action, resolve it through Relay, then let the swarm/runtime own execution.",
    requiredEnv: [],
    requestTemplate: {
      placement: [
        "before_plan_to_execution_transition",
        "before_worker_dispatch",
        "before_mcp_tool_invocation",
        "before_memory_write",
        "at_federation_trust_boundary",
      ],
      action_card_pattern: {
        proposed_action: "swarm_runtime.proposed_consequential_action",
        authority: "refs_only_registry_or_developer_supplied_authority",
        evidence: "task_ref / plan_ref / tool_call_ref / policy_ref",
        expected_receipt_routes: ["proceed", "revise", "human_review", "stop"],
      },
      claim_boundary:
        "No Ruflo integration, endorsement, validation, listing, or partnership claim.",
    },
  },
};

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function runTemplateCommand(commandArgs) {
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      stderr: result.stderr.trim().slice(-2000),
    };
  }

  try {
    return {
      ok: true,
      output: JSON.parse(result.stdout.trim()),
    };
  } catch (error) {
    return {
      ok: false,
      parse_error: error.message,
      stdout: result.stdout.trim().slice(-2000),
    };
  }
}

function packageVersion(name) {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  return pkg.dependencies?.[name] ?? null;
}

if (!ecosystem || !ecosystems[ecosystem]) {
  const payload = {
    ok: false,
    error: "unknown_or_missing_ecosystem",
    allowed_ecosystems: Object.keys(ecosystems),
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const config = ecosystems[ecosystem];
const attribution = buildRelayAttribution({
  argv,
  env: {
    ...process.env,
    NEURA_SESSION_REF: sessionRef,
  },
  defaultSource: config.source,
  defaultCampaign: config.campaign,
  defaultSurface: config.surface,
});

let dryRunEvidence = null;
if (dryRun && config.requestTemplateFromCommand) {
  dryRunEvidence = runTemplateCommand(config.requestTemplateFromCommand);
}

const output = {
  ok: dryRunEvidence ? dryRunEvidence.ok : true,
  ecosystem,
  title: config.title,
  mode: dryRun ? "dry_run_no_private_credentials" : "live_requirements",
  dry_run_credential_free: dryRun,
  usable_today: config.usableToday,
  protected_access: config.protectedAccess,
  commands: {
    dry_run: config.dryRunCommand,
    live: config.liveCommand,
  },
  required_env_for_live: config.requiredEnv,
  activation_attribution: publicAttributionSummary(attribution),
  request_template: config.requestTemplate ?? null,
  dry_run_evidence: dryRunEvidence,
  package_versions:
    ecosystem === "openclaw"
      ? {
          "@neurarelay/sdk": packageVersion("@neurarelay/sdk"),
          "@neurarelay/openclaw-preflight-adapter":
            "published on npm; verify with npm view before public claims",
        }
      : undefined,
  boundaries: {
    official_openai_claim: false,
    official_anthropic_claim: false,
    official_openclaw_or_clawhub_claim: false,
    official_a2a_claim: false,
    provider_listing_or_partnership_claim: false,
    public_api_key_issuance: false,
    public_production_mcp_token_issuance: false,
    public_a2a_token_issuance: false,
    unprotected_a2a_execution: false,
    downstream_execution_by_neura: false,
    private_payload_exposure: false,
    registry_auto_approval: false,
    developer_owned_execution: true,
    refs_only: true,
  },
  next_step:
    "Use this dry-run output as the ecosystem-specific path. For live proof, supply the required controlled credentials and preserve the same source/campaign/surface attribution.",
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`${config.title}`);
  console.log(`Mode: ${output.mode}`);
  console.log(`Dry run: ${config.dryRunCommand}`);
  console.log(`Live: ${config.liveCommand}`);
  console.log("Developer-owned execution preserved. No provider approval claim is made.");
}

if (!output.ok) process.exit(1);
