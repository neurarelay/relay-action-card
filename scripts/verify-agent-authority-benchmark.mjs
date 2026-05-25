#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const failures = [];

function read(file) {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

function requireIncludes(label, text, phrase) {
  if (!text.includes(phrase)) {
    failures.push(`${label}_missing_${phrase.replaceAll(/\W+/g, "_")}`);
  }
}

function rejectPattern(label, text, pattern) {
  if (pattern.test(text)) {
    failures.push(`${label}_forbidden_${pattern.source}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
const readme = read("README.md");
const docsPath = "docs/agent-authority-benchmark.md";
const gapPath = "docs/ai-agent-authority-gap.md";
const runnerPath = "examples/agent-authority-benchmark/run-benchmark.mjs";

if (!existsSync(resolve(repoRoot, docsPath))) failures.push("missing_agent_authority_benchmark_docs");
if (!existsSync(resolve(repoRoot, gapPath))) failures.push("missing_ai_agent_authority_gap_docs");
if (!existsSync(resolve(repoRoot, runnerPath))) failures.push("missing_agent_authority_benchmark_runner");

const docs = existsSync(resolve(repoRoot, docsPath)) ? read(docsPath) : "";
const gap = existsSync(resolve(repoRoot, gapPath)) ? read(gapPath) : "";
const runner = existsSync(resolve(repoRoot, runnerPath)) ? read(runnerPath) : "";

if (
  packageJson.scripts?.["benchmark:agent-authority"] !==
  "node examples/agent-authority-benchmark/run-benchmark.mjs"
) {
  failures.push("package_missing_benchmark_agent_authority_script");
}

if (
  packageJson.scripts?.["verify:agent-authority-benchmark"] !==
  "node scripts/verify-agent-authority-benchmark.mjs"
) {
  failures.push("package_missing_verify_agent_authority_benchmark_script");
}

for (const phrase of [
  "Agent Authority Benchmark",
  "npm run benchmark:agent-authority -- --dry-run --json",
  "npm run verify:agent-authority-benchmark",
  "external_email_send",
  "credentialed_browser_submit",
  "customer_data_export",
  "package_publish",
  "production_deploy",
  "permission_change",
  "workflow_close",
  "persistent_memory_write",
  "source=benchmark",
  "campaign=agent_authority_week",
  "surface=agent_authority_benchmark_v0_1",
  "surface=browser_use_credentialed_submit",
  "surface=cline_consequential_actions",
  "surface=autogen_multi_agent_handoff",
  "surface=microsoft_agent_framework_delegated_action",
  "surface=smolagents_code_agent_tool_authority",
  "surface=google_adk_agent_authority",
  "surface=semantic_kernel_tool_authority",
  "surface=mcp_use_tool_authority",
  "surface=simular_agent_s_computer_use_authority",
  "surface=nanobrowser_browser_submit_authority",
  "surface=stagehand_browser_agent_authority",
  "surface=plandex_coding_side_effects",
  "surface=gptme_terminal_tool_authority",
  "surface=lastmile_mcp_agent_tool_authority",
  "surface=twelve_factor_agents_authority",
  "surface=haystack_agentic_pipeline_authority",
  "surface=dify_agentic_workflow_authority",
  "surface=gemini_cli_terminal_authority",
  "surface=llamaindex_tool_agent_authority",
  "surface=eliza_agentic_os_authority",
  "surface=superagi_autonomous_workflow_authority",
  "surface=camel_multi_agent_handoff_authority",
  "surface=open_multi_agent_mcp_dag_authority",
  "This benchmark does not say that any named framework fails, passes, endorses, integrates, approves, lists, or partners with Neura.",
]) {
  requireIncludes("docs", docs, phrase);
}

for (const phrase of [
  "Agent Authority Benchmark",
  "benchmark:agent-authority",
  "agent_authority_week",
  "surface=smolagents_code_agent_tool_authority",
  "surface=google_adk_agent_authority",
  "surface=semantic_kernel_tool_authority",
  "surface=mcp_use_tool_authority",
  "surface=simular_agent_s_computer_use_authority",
  "surface=nanobrowser_browser_submit_authority",
  "surface=stagehand_browser_agent_authority",
  "surface=plandex_coding_side_effects",
  "surface=gptme_terminal_tool_authority",
  "surface=lastmile_mcp_agent_tool_authority",
  "surface=twelve_factor_agents_authority",
  "surface=haystack_agentic_pipeline_authority",
  "surface=dify_agentic_workflow_authority",
  "surface=gemini_cli_terminal_authority",
  "surface=llamaindex_tool_agent_authority",
  "surface=eliza_agentic_os_authority",
  "surface=superagi_autonomous_workflow_authority",
  "surface=camel_multi_agent_handoff_authority",
  "surface=open_multi_agent_mcp_dag_authority",
  "docs/ai-agent-authority-gap.md",
]) {
  requireIncludes("readme", readme, phrase);
}

for (const phrase of [
  "The AI Agent Authority Gap",
  "Can the workflow prove authority for this exact action before execution?",
  "Action Card -> Relay -> Decision Receipt -> developer-owned execution or restraint",
  "npm run benchmark:agent-authority -- --dry-run --json",
  "npm run verify:agent-authority-benchmark",
  "first_proof_next_command",
  "This report does not claim:",
  "It does claim:",
]) {
  requireIncludes("gap", gap, phrase);
}

for (const phrase of [
  "agent_authority_benchmark_v0_1",
  "external_email_send",
  "credentialed_browser_submit",
  "downstream_execution_by_neura: false",
  "provider_listing_or_partnership_claim: false",
  "target_framework_endorsement_claim: false",
  "target_framework_pass_fail_claim: false",
]) {
  requireIncludes("runner", runner, phrase);
}

for (const [label, text] of [
  ["docs", docs],
  ["gap", gap],
  ["readme", readme],
]) {
  rejectPattern(label, text, /OpenAI\s+(approved|endorsed|listed|partnered)/i);
  rejectPattern(label, text, /Anthropic\s+(approved|endorsed|listed|partnered)/i);
  rejectPattern(label, text, /OpenClaw\s+(approved|endorsed|listed|partnered)/i);
  rejectPattern(label, text, /ClawHub\s+(approved|endorsed|listed|partnered)/i);
  rejectPattern(label, text, /LangChain\s+(approved|endorsed|integrated|partnered)/i);
  rejectPattern(label, text, /CrewAI\s+(approved|endorsed|integrated|partnered)/i);
  rejectPattern(label, text, /AutoGen\s+(approved|endorsed|integrated|partnered)/i);
  rejectPattern(label, text, /Cline\s+(approved|endorsed|integrated|partnered)/i);
  rejectPattern(label, text, /OpenHands\s+(approved|endorsed|integrated|partnered)/i);
  rejectPattern(label, text, /browser-use\s+(approved|endorsed|integrated|partnered)/i);
  rejectPattern(label, text, /Neura executes downstream/i);
  rejectPattern(label, text, /public production token\s+(is|issued|available|enabled)\b/i);
}

const run = spawnSync(
  "npm",
  [
    "run",
    "benchmark:agent-authority",
    "--",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=agent_authority_week",
    "--surface=agent_authority_benchmark_v0_1",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (run.status !== 0) {
  failures.push(`benchmark_run_failed_${run.status}_${run.stderr.slice(-200)}`);
} else {
  try {
    const output = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")));
    if (output.ok !== true) failures.push("benchmark_output_not_ok");
    if (output.benchmark !== "agent_authority_benchmark_v0_1") {
      failures.push("benchmark_wrong_name");
    }
    if (output.mode !== "dry_run_no_downstream_execution") {
      failures.push("benchmark_wrong_mode");
    }
    if (output.scenario_count !== 8) failures.push("benchmark_wrong_scenario_count");
    if (output.authority_ready_count !== 8) failures.push("benchmark_not_all_ready");
    if (output.activation_attribution?.neura_source !== "verifier") {
      failures.push("benchmark_missing_source_attribution");
    }
    if (output.activation_attribution?.neura_campaign !== "agent_authority_week") {
      failures.push("benchmark_missing_campaign_attribution");
    }
    if (output.activation_attribution?.neura_surface !== "agent_authority_benchmark_v0_1") {
      failures.push("benchmark_missing_surface_attribution");
    }
    if (
      output.first_proof_next_command !==
      "npm run first-proof -- --source=verifier --campaign=agent_authority_week --surface=agent_authority_benchmark_v0_1 --json"
    ) {
      failures.push("benchmark_first_proof_command_does_not_preserve_attribution");
    }
    if (!Array.isArray(output.results) || output.results.length !== 8) {
      failures.push("benchmark_results_missing");
    }
    for (const result of output.results ?? []) {
      if (result.authority_ready !== true) {
        failures.push(`scenario_not_ready_${result.scenario_id}`);
      }
      if (result.score < 90) {
        failures.push(`scenario_score_too_low_${result.scenario_id}`);
      }
      if (result.missing_receipt_fields?.length !== 0) {
        failures.push(`scenario_missing_fields_${result.scenario_id}`);
      }
      if (result.receipt_preview?.developer_owned_execution !== true) {
        failures.push(`scenario_missing_developer_execution_boundary_${result.scenario_id}`);
      }
      if (result.receipt_preview?.downstream_execution_by_neura !== false) {
        failures.push(`scenario_downstream_boundary_open_${result.scenario_id}`);
      }
      if (result.receipt_preview?.private_payload_required !== false) {
        failures.push(`scenario_private_payload_required_${result.scenario_id}`);
      }
    }
    if (output.boundaries?.target_framework_endorsement_claim !== false) {
      failures.push("benchmark_endorsement_boundary_open");
    }
    if (output.boundaries?.target_framework_pass_fail_claim !== false) {
      failures.push("benchmark_pass_fail_boundary_open");
    }
  } catch (error) {
    failures.push(`benchmark_json_parse_failed_${error.message}`);
  }
}

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        verifier: "agent-authority-benchmark",
        failures,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      verifier: "agent-authority-benchmark",
      scenario_count: 8,
      boundary_locked: true,
    },
    null,
    2,
  ),
);
