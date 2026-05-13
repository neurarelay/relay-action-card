#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const jsonOutput = process.argv.includes("--json");
const liveReceipts =
  process.argv.includes("--live") || process.env.NEURA_OPENCLAW_PROOF_LIVE === "true";

function rel(path) {
  return path ? relative(repoRoot, path) : null;
}

function parseJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  return JSON.parse(trimmed);
}

function runStep({ id, label, args, parse = false }) {
  if (!jsonOutput) console.log(`-> ${label}`);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const step = {
    id,
    label,
    command: `node ${args.join(" ")}`,
    ok: result.status === 0,
    status: result.status,
    duration_ms: Date.now() - startedAt,
  };

  if (parse && result.stdout.trim()) {
    try {
      step.output = parseJson(result.stdout);
    } catch (error) {
      step.ok = false;
      step.parse_error = error.message;
    }
  }

  if (!step.ok) {
    step.stdout = result.stdout.slice(-4000);
    step.stderr = result.stderr.slice(-4000);
  }

  return step;
}

const localSteps = [
  {
    id: "workbench",
    label: "Generate visual near-miss workbench",
    args: ["examples/openclaw/run-near-miss-workbench.mjs", "--json"],
    parse: true,
  },
  {
    id: "workspace_surface",
    label: "Generate OpenClaw OS workspace receipt surface",
    args: ["examples/openclaw/run-workspace-decision-surface.mjs", "--json"],
    parse: true,
  },
  {
    id: "severe_scenario",
    label: "Generate severe end-to-end scenario proof",
    args: ["examples/openclaw/run-severe-scenario-proof.mjs", "--json"],
    parse: true,
  },
  {
    id: "severe_preflight_queue",
    label: "Generate severe preflight queue transcript",
    args: ["examples/openclaw/run-severe-preflight-queue.mjs", "--json"],
    parse: true,
  },
  {
    id: "dry_run",
    label: "Dry-run all refs-only Action Card fixtures",
    args: ["examples/openclaw/run-action-receipt-kit.mjs", "--dry-run", "--json"],
    parse: true,
  },
  {
    id: "preflight_dry_run",
    label: "Dry-run OpenClaw-style preflight adapter",
    args: ["examples/openclaw/run-preflight-adapter.mjs", "--dry-run", "--json"],
    parse: true,
  },
  {
    id: "verify_workbench",
    label: "Verify near-miss workbench contract",
    args: ["scripts/verify-openclaw-near-miss-workbench.mjs"],
  },
  {
    id: "verify_workspace_surface",
    label: "Verify OpenClaw OS workspace receipt surface",
    args: ["scripts/verify-openclaw-workspace-surface.mjs"],
  },
  {
    id: "verify_severe_scenario",
    label: "Verify severe scenario proof contract",
    args: ["scripts/verify-openclaw-severe-scenario-proof.mjs"],
  },
  {
    id: "verify_severe_preflight",
    label: "Verify severe preflight queue contract",
    args: ["scripts/verify-openclaw-severe-preflight-queue.mjs"],
  },
  {
    id: "verify_kit",
    label: "Verify Action Receipt Kit contract",
    args: ["scripts/verify-openclaw-action-receipt-kit.mjs"],
  },
  {
    id: "verify_pack",
    label: "Verify Action Receipt Pack docs and boundaries",
    args: ["scripts/verify-openclaw-action-receipt-pack.mjs"],
  },
  {
    id: "verify_preflight",
    label: "Verify preflight adapter contract",
    args: ["scripts/verify-openclaw-preflight-adapter.mjs"],
  },
  {
    id: "verify_plugin_rc",
    label: "Verify plugin release-candidate packet",
    args: ["scripts/verify-openclaw-plugin-rc.mjs"],
  },
  {
    id: "test_kit",
    label: "Run Action Receipt Kit unit tests",
    args: ["--test", "tests/openclaw-action-receipt-kit.test.mjs"],
  },
  {
    id: "test_workbench",
    label: "Run near-miss workbench unit tests",
    args: ["--test", "tests/openclaw-near-miss-workbench.test.mjs"],
  },
  {
    id: "test_workspace_surface",
    label: "Run workspace receipt surface unit tests",
    args: ["--test", "tests/openclaw-workspace-surface.test.mjs"],
  },
  {
    id: "test_severe_scenario",
    label: "Run severe scenario proof unit tests",
    args: ["--test", "tests/openclaw-severe-scenario-proof.test.mjs"],
  },
  {
    id: "test_severe_preflight",
    label: "Run severe preflight queue unit tests",
    args: ["--test", "tests/openclaw-severe-preflight-queue.test.mjs"],
  },
  {
    id: "test_preflight",
    label: "Run preflight adapter unit tests",
    args: ["--test", "tests/openclaw-preflight-adapter.test.mjs"],
  },
];

const liveSteps = liveReceipts
  ? [
      {
        id: "live_receipt",
        label: "Request one live Relay Decision Receipt",
        args: [
          "examples/openclaw/run-action-receipt-kit.mjs",
          "--only=send-message",
          "--json",
        ],
        parse: true,
      },
      {
        id: "live_preflight_receipt",
        label: "Request one live preflight Decision Receipt",
        args: ["examples/openclaw/run-preflight-adapter.mjs", "--json"],
        parse: true,
      },
    ]
  : [];

const startedAt = new Date().toISOString();
const steps = [];

for (const definition of [...localSteps, ...liveSteps]) {
  const step = runStep(definition);
  steps.push(step);
  if (!step.ok) break;
}

const workbench = steps.find((step) => step.id === "workbench")?.output;
const workspaceSurface = steps.find((step) => step.id === "workspace_surface")?.output;
const severeScenario = steps.find((step) => step.id === "severe_scenario")?.output;
const severePreflight = steps.find((step) => step.id === "severe_preflight_queue")?.output;
const dryRun = steps.find((step) => step.id === "dry_run")?.output;
const preflightDryRun = steps.find((step) => step.id === "preflight_dry_run")?.output;
const liveReceipt = steps.find((step) => step.id === "live_receipt")?.output;
const livePreflight = steps.find((step) => step.id === "live_preflight_receipt")?.output;
const ok = steps.every((step) => step.ok) && steps.length === localSteps.length + liveSteps.length;

const output = {
  ok,
  proof: "openclaw-developer-journey",
  mode: liveReceipts ? "local_plus_live_receipts" : "local_only",
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  commands: {
    local: "npm run openclaw:proof",
    live: "npm run openclaw:proof -- --live",
  },
  artifacts: {
    workbench_html: rel(workbench?.files?.html),
    workbench_markdown: rel(workbench?.files?.markdown),
    workbench_json: rel(workbench?.files?.json),
    workspace_surface_html: rel(workspaceSurface?.files?.html),
    workspace_surface_markdown: rel(workspaceSurface?.files?.markdown),
    workspace_surface_json: rel(workspaceSurface?.files?.json),
    severe_scenario_html: rel(severeScenario?.files?.html),
    severe_scenario_markdown: rel(severeScenario?.files?.markdown),
    severe_scenario_json: rel(severeScenario?.files?.json),
    severe_preflight_html: rel(severePreflight?.files?.html),
    severe_preflight_markdown: rel(severePreflight?.files?.markdown),
    severe_preflight_json: rel(severePreflight?.files?.json),
  },
  local_summary: {
    journeys: workbench?.count?.journeys ?? null,
    steps: workbench?.count?.steps ?? null,
    workspace_actions: workspaceSurface?.count?.actions ?? null,
    workspace_decisions: workspaceSurface?.count?.decisions ?? null,
    severe_checkpoints: severeScenario?.count?.checkpoints ?? null,
    severe_decisions: severeScenario?.count?.decisions ?? null,
    severe_preflight_actions: severePreflight?.count?.actions ?? null,
    severe_preflight_adapter_gates: severePreflight?.count?.dry_run_adapter_gates ?? null,
    decisions: workbench?.count?.decisions ?? null,
    dry_run_fixtures: dryRun?.count ?? null,
    preflight_route: preflightDryRun?.result?.route ?? null,
    relay_calls_skipped_in_local_mode: true,
  },
  live_summary: liveReceipts
    ? {
        enabled: true,
        receipt_decision: liveReceipt?.results?.[0]?.decision ?? null,
        receipt_id: liveReceipt?.results?.[0]?.receipt_id ?? null,
        trace_ref: liveReceipt?.results?.[0]?.trace_ref ?? null,
        preflight_decision: livePreflight?.result?.receipt?.decision ?? null,
        preflight_receipt_id: livePreflight?.result?.receipt?.receipt_id ?? null,
      }
    : {
        enabled: false,
        reason: "local proof is deterministic; run npm run openclaw:proof -- --live for live Relay receipts",
      },
  steps: steps.map(({ output: _output, ...step }) => step),
  boundaries: {
    official_openclaw_or_clawhub_claim: false,
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
  next_steps: [
    "Open artifacts/openclaw-near-miss-workbench/report.html",
    "Open artifacts/openclaw-workspace-decision-surface/report.html",
    "Open artifacts/openclaw-severe-scenario-proof/report.html",
    "Open artifacts/openclaw-severe-preflight-queue/transcript.html",
    "Read docs/openclaw-developer-journey.md",
    "Read docs/openclaw-os-decision-receipt-surface.md",
    "Read docs/openclaw-severe-scenario-proof-pack.md",
    "Read docs/openclaw-severe-preflight-queue.md",
    "Use examples/openclaw/preflight-adapter before local runtime execution",
  ],
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("");
  console.log(ok ? "OpenClaw developer journey proof passed." : "OpenClaw developer journey proof failed.");
  console.log(`Mode: ${output.mode}`);
  console.log(`Workbench: ${output.artifacts.workbench_html}`);
  console.log(`Workspace surface: ${output.artifacts.workspace_surface_html}`);
  console.log(`Severe scenario: ${output.artifacts.severe_scenario_html}`);
  console.log(`Severe preflight queue: ${output.artifacts.severe_preflight_html}`);
  console.log(`Dry-run fixtures: ${output.local_summary.dry_run_fixtures}`);
  console.log(
    liveReceipts
      ? `Live receipt: ${output.live_summary.receipt_decision} (${output.live_summary.receipt_id})`
      : "Live receipt: skipped. Run npm run openclaw:proof -- --live",
  );
  console.log("Developer-owned execution preserved. No downstream action is executed by Neura.");
}

if (!ok) process.exit(1);
