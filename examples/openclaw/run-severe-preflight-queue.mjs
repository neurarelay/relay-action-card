#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createNeuraPreflightAdapter } from "./preflight-adapter/adapter.mjs";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const scenarioPath = join(exampleDir, "severe-scenario-proof/scenario.json");
const defaultOutDir = join(repoRoot, "artifacts/openclaw-severe-preflight-queue");
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const jsonOutput = process.argv.includes("--json");
const liveReceipts =
  process.argv.includes("--live") ||
  process.env.NEURA_OPENCLAW_SEVERE_PREFLIGHT_LIVE === "true";

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleCase(value) {
  return String(value)
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) counts[item[key]] = (counts[item[key]] ?? 0) + 1;
  return counts;
}

function preflightActionForCheckpoint(model, checkpoint) {
  const notAuthorized =
    checkpoint.authority_status.includes("not_authorized") ||
    checkpoint.authority_status.includes("blocked");

  return {
    family: checkpoint.family,
    proposedAction: {
      type: checkpoint.proposed_action,
      summary: checkpoint.summary,
      target: checkpoint.target_ref,
    },
    affectedObject: checkpoint.affected_object_ref,
    authority: {
      delegatedBy: "user_ref_local_operator",
      actingAgent: "openclaw-severe-preflight-agent",
      authorityScope: `${model.scenario.id}:${checkpoint.family}`,
      allowedActions: [checkpoint.proposed_action],
      allowedResources: [checkpoint.target_ref],
      expiresAt: "2026-12-31T23:59:59Z",
      revocationStatus: notAuthorized ? "not_authorized" : "active",
      policyRefs: [`policy_ref:${model.scenario.id}:${checkpoint.id}`],
      authorityScopeRef: `authority_scope_ref:${model.scenario.id}:${checkpoint.family}`,
      standingRef: "registry_passport_standing_ref_demo",
    },
    evidenceRefs: [
      `evidence_ref:${model.scenario.id}:${checkpoint.id}:operator_intent`,
      `scenario_ref:${model.scenario.id}`,
    ],
    ruleRefs: [`rule_ref:${model.scenario.id}:${checkpoint.risk_class}:${checkpoint.family}`],
    riskCategory: checkpoint.risk_class,
  };
}

function projectedReceipt(model, checkpoint) {
  return {
    receipt_id: `local_severe_preflight_receipt_ref:${checkpoint.phase}:${checkpoint.id}`,
    decision: checkpoint.decision,
    route: checkpoint.route,
    reason: checkpoint.what_neura_catches,
    trace_ref: `local_severe_preflight_trace_ref:${model.scenario.id}:${checkpoint.id}`,
    developer_owned_next_step: checkpoint.developer_next_step,
    relay_boundary: "decision_gate_only_developer_keeps_execution",
  };
}

function summarizeAdapterResult(result) {
  const summary = {
    mode: result.mode,
    execution_owner: result.execution_owner,
    action_card_version: result.action_card?.version,
    action_type: result.action_card?.proposedAction?.type,
    target_ref: result.action_card?.proposedAction?.target,
  };

  if (result.mode === "dry_run") {
    return {
      ...summary,
      route: result.route,
      relay_call_skipped: result.relay_call_skipped,
    };
  }

  return {
    ...summary,
    relay: result.relay,
    route: result.receipt?.route,
    decision: result.receipt?.decision,
    receipt_id: result.receipt?.receipt_id,
    trace_ref: result.receipt?.trace_ref,
    transaction_ref: result.receipt?.transaction_ref,
    relay_boundary: result.receipt?.relay_boundary,
    authority_decision_engine: result.receipt?.authority_decision_engine ?? null,
  };
}

async function buildQueue(model) {
  const adapter = createNeuraPreflightAdapter({ relayBaseUrl });
  const rows = [];

  for (const checkpoint of model.checkpoints) {
    const preflightAction = preflightActionForCheckpoint(model, checkpoint);
    const adapterResult = await adapter.beforeAction(preflightAction, {
      dryRun: !liveReceipts,
    });
    const projected = projectedReceipt(model, checkpoint);
    const receipt = liveReceipts ? adapterResult.receipt : projected;

    rows.push({
      id: checkpoint.id,
      phase: checkpoint.phase,
      title: checkpoint.title,
      family: checkpoint.family,
      proposed_action: checkpoint.proposed_action,
      target_ref: checkpoint.target_ref,
      risk_class: checkpoint.risk_class,
      expected_decision: checkpoint.decision,
      expected_route: checkpoint.route,
      expected_catch: checkpoint.what_neura_catches,
      developer_next_step: checkpoint.developer_next_step,
      preflight_action: preflightAction,
      action_card: adapterResult.action_card,
      adapter_result: summarizeAdapterResult(adapterResult),
      receipt,
      execution_attempted: false,
      execution_owner: "developer_runtime",
    });
  }

  return rows;
}

function buildReport(model, queue) {
  return {
    ok: true,
    proof: "openclaw-severe-preflight-queue",
    name: "OpenClaw Severe Preflight Queue",
    version: "0.1",
    mode: liveReceipts ? "local_plus_live_receipts" : "dry_run",
    generated_at: new Date().toISOString(),
    relay: liveReceipts ? relayBaseUrl : null,
    scenario: model.scenario,
    path:
      "preflight action -> adapter.beforeAction -> Action Card -> Decision Receipt route -> developer-owned execution decision",
    count: {
      actions: queue.length,
      dry_run_adapter_gates: queue.filter((row) => row.adapter_result.mode === "dry_run").length,
      live_receipts: queue.filter((row) => row.adapter_result.mode === "live_receipt").length,
      expected_decisions: countBy(queue, "expected_decision"),
      receipt_decisions: liveReceipts
        ? countBy(queue.map((row) => ({ decision: row.receipt?.decision ?? "unknown" })), "decision")
        : countBy(queue, "expected_decision"),
    },
    queue,
    boundaries: {
      official_openclaw_or_clawhub_claim: false,
      public_api_key_issuance: false,
      public_production_mcp_token_issuance: false,
      public_a2a_token_issuance: false,
      unprotected_a2a_execution: false,
      downstream_execution_by_neura: false,
      private_payload_exposure: false,
      registry_auto_approval: false,
      real_computer_use_execution: false,
      developer_owned_execution: true,
      refs_only: true,
      safe_local_projection: true,
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# OpenClaw Severe Preflight Queue",
    "",
    `Mode: ${report.mode}`,
    "",
    report.scenario.developer_problem,
    "",
    `Path: ${report.path}`,
    "",
    "## Queue Summary",
    "",
    `- Actions: ${report.count.actions}`,
    `- Dry-run adapter gates: ${report.count.dry_run_adapter_gates}`,
    `- Live receipts: ${report.count.live_receipts}`,
    "- Real computer-use execution: false",
    "",
    "## Transcript",
    "",
  ];

  for (const row of report.queue) {
    lines.push(`### ${row.phase}. ${row.title}`, "");
    lines.push(`- Preflight action: ${row.proposed_action} -> ${row.target_ref}`);
    lines.push(`- Adapter mode: ${row.adapter_result.mode}`);
    lines.push(`- Adapter route: ${row.adapter_result.route}`);
    lines.push(`- Expected receipt route: ${row.expected_route}`);
    lines.push(`- Receipt decision: ${row.receipt?.decision ?? row.expected_decision}`);
    lines.push(`- Developer route: ${row.developer_next_step}`);
    lines.push(`- Execution attempted: ${row.execution_attempted}`);
    if (row.adapter_result.receipt_id) lines.push(`- Live receipt: ${row.adapter_result.receipt_id}`);
    lines.push("");
  }

  lines.push("## Boundaries", "");
  for (const [key, value] of Object.entries(report.boundaries)) {
    lines.push(`- ${key}: ${value}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderHtml(report) {
  const metricTiles = [
    ["Actions", report.count.actions],
    ["Adapter gates", report.count.dry_run_adapter_gates || report.count.live_receipts],
    ["Stops", report.count.expected_decisions.stop ?? 0],
    ["Human review", report.count.expected_decisions.human_review ?? 0],
  ]
    .map(
      ([label, value]) => `
        <div class="metric">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>`,
    )
    .join("");

  const rows = report.queue
    .map(
      (row) => `
        <article class="queue-row queue-${escapeHtml(row.expected_decision)}">
          <div class="phase">${row.phase}</div>
          <div class="row-body">
            <div class="row-topline">
              <span>${escapeHtml(titleCase(row.family))}</span>
              <strong>${escapeHtml(titleCase(row.expected_decision))}</strong>
            </div>
            <h2>${escapeHtml(row.title)}</h2>
            <p class="mono">${escapeHtml(row.proposed_action)} -> ${escapeHtml(row.target_ref)}</p>
            <div class="flow">
              <div><span>Preflight action</span><strong>${escapeHtml(row.preflight_action.proposedAction.type)}</strong></div>
              <div><span>Adapter route</span><strong>${escapeHtml(titleCase(row.adapter_result.route))}</strong></div>
              <div><span>Receipt route</span><strong>${escapeHtml(titleCase(row.receipt?.route ?? row.expected_route))}</strong></div>
              <div><span>Execution attempted</span><strong>${escapeHtml(String(row.execution_attempted))}</strong></div>
            </div>
            <section class="receipt">
              <div>
                <span>What Neura catches</span>
                <strong>${escapeHtml(row.expected_catch)}</strong>
              </div>
              <div>
                <span>Developer-owned next step</span>
                <strong>${escapeHtml(row.developer_next_step)}</strong>
              </div>
            </section>
            <code>${escapeHtml(row.receipt?.receipt_id ?? "local_preflight_projection")}</code>
          </div>
        </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenClaw Severe Preflight Queue</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17201d;
      --muted: #5d6964;
      --line: #d6dfdb;
      --paper: #f5f8f6;
      --panel: #ffffff;
      --soft: #edf2ef;
      --review: #8a5a00;
      --revise: #265fa6;
      --stop: #b42318;
      --proceed: #0d7c59;
    }
    * { box-sizing: border-box; min-width: 0; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--paper);
      line-height: 1.5;
    }
    main { max-width: 1260px; margin: 0 auto; padding: 34px 24px 56px; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 24px; margin-bottom: 24px; }
    .eyebrow {
      display: inline-flex;
      margin-bottom: 14px;
      padding: 5px 8px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--muted);
      text-transform: uppercase;
      font-size: 12px;
      font-weight: 700;
    }
    h1 { max-width: none; margin: 0 0 12px; font-size: 46px; line-height: 1.04; letter-spacing: 0; }
    h2 { margin: 7px 0 8px; font-size: 23px; line-height: 1.18; letter-spacing: 0; }
    p { margin: 0 0 12px; color: var(--muted); max-width: 960px; }
    header p { max-width: none; }
    .path, code {
      display: block;
      padding: 8px 10px;
      border: 1px solid var(--line);
      background: var(--soft);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .path { display: block; width: 100%; margin-top: 8px; background: var(--panel); word-break: break-word; }
    .proof-line {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 20px;
    }
    .proof-line span {
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 10px;
      color: var(--ink);
      font-weight: 700;
      min-height: 48px;
      white-space: nowrap;
    }
    .summary {
      display: grid;
      grid-template-columns: 1.2fr .8fr;
      gap: 14px;
      margin: 22px 0;
    }
    .scenario, .metric, .queue-row {
      background: var(--panel);
      border: 1px solid var(--line);
    }
    .scenario { padding: 20px; border-top: 4px solid var(--stop); }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .metric { border-top: 4px solid var(--muted); padding: 14px; min-height: 104px; }
    .metric span { display: block; color: var(--muted); text-transform: uppercase; font-size: 12px; }
    .metric strong { display: block; margin-top: 6px; font-size: 32px; line-height: 1; }
    .queue { display: grid; gap: 12px; margin-top: 22px; }
    .queue-row { display: grid; grid-template-columns: 54px 1fr; min-height: 250px; }
    .phase {
      padding-top: 22px;
      text-align: center;
      color: var(--muted);
      background: var(--soft);
      border-right: 1px solid var(--line);
      font-weight: 800;
      font-size: 18px;
    }
    .row-body { padding: 20px; }
    .row-topline { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .row-topline span { color: var(--muted); text-transform: uppercase; font-size: 11px; font-weight: 700; }
    .row-topline strong { padding: 4px 8px; color: #fff; background: var(--muted); text-transform: uppercase; font-size: 11px; white-space: nowrap; }
    .queue-human_review .row-topline strong { background: var(--review); }
    .queue-revise .row-topline strong { background: var(--revise); }
    .queue-stop .row-topline strong { background: var(--stop); }
    .queue-proceed .row-topline strong { background: var(--proceed); }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--ink);
      overflow-wrap: anywhere;
      font-size: 13px;
    }
    .flow, .receipt {
      display: grid;
      gap: 8px;
      margin: 14px 0;
    }
    .flow { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .receipt { grid-template-columns: 1fr 1fr; }
    .flow div, .receipt div {
      border: 1px solid var(--line);
      background: var(--soft);
      padding: 9px;
    }
    .flow span, .receipt span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .flow strong, .receipt strong { display: block; overflow-wrap: anywhere; }
    footer { margin-top: 28px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 18px; }
    @media (max-width: 860px) {
      body { padding: 0; }
      main { width: 358px; max-width: none; margin: 0 16px; padding: 28px 0 40px; }
      h1 { font-size: 30px; }
      header p, .proof-line span { white-space: normal; }
      .path {
        display: block;
        width: 100%;
        max-width: 100%;
        white-space: normal;
        word-break: break-all;
      }
      .proof-line, .summary, .metrics, .flow, .receipt { grid-template-columns: 1fr; }
      .queue-row { grid-template-columns: 42px 1fr; }
      .row-body { padding: 16px; }
      .row-topline { align-items: flex-start; flex-direction: column; }
    }
    @media (max-width: 374px) {
      main { width: calc(100vw - 32px); }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">Runtime-style preflight queue - no local execution</span>
      <h1>Severe Preflight Queue</h1>
      <p>The same five-checkpoint incident routed through adapter preflight before any local computer-use execution.</p>
      <span class="path">Adapter preflight -&gt; Receipt -&gt; Developer route</span>
      <div class="proof-line" aria-label="Queue path">
        <span>Agent action</span>
        <span>Adapter preflight</span>
        <span>Action Card</span>
        <span>Receipt route</span>
        <span>Developer route</span>
      </div>
    </header>
    <section class="summary" aria-label="Queue summary">
      <article class="scenario">
        <span class="eyebrow">${escapeHtml(report.mode)}</span>
        <h2>${escapeHtml(report.scenario.title)}</h2>
        <p><strong>Impact:</strong> ${escapeHtml(report.scenario.impact)}</p>
        <p><strong>Adapter:</strong> existing beforeAction(preflightAction) path. Execution remains false for every row.</p>
      </article>
      <section class="metrics">${metricTiles}</section>
    </section>
    <section class="queue" aria-label="Preflight transcript">${rows}</section>
    <footer>
      Safe local projection. No export, browser submit, message send, file delete, workflow transition, credential issuance, or downstream action is performed by Neura.
    </footer>
  </main>
</body>
</html>
`;
}

const outDir = resolve(repoRoot, argValue("out") ?? defaultOutDir);
const model = JSON.parse(await readFile(scenarioPath, "utf8"));
const queue = await buildQueue(model);
const report = buildReport(model, queue);

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "transcript.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(outDir, "transcript.md"), renderMarkdown(report));
await writeFile(join(outDir, "transcript.html"), renderHtml(report));

const output = {
  ok: true,
  proof: report.proof,
  mode: report.mode,
  relay: report.relay,
  out_dir: outDir,
  files: {
    json: join(outDir, "transcript.json"),
    markdown: join(outDir, "transcript.md"),
    html: join(outDir, "transcript.html"),
  },
  count: report.count,
  boundaries: report.boundaries,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("OpenClaw Severe Preflight Queue generated.");
  console.log(`Mode: ${output.mode}`);
  console.log(`HTML: ${output.files.html}`);
  console.log(`Markdown: ${output.files.markdown}`);
  console.log(`JSON: ${output.files.json}`);
  console.log("Execution attempted: false for every queued action.");
}
