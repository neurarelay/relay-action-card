#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const scenarioPath = join(exampleDir, "severe-scenario-proof/scenario.json");
const defaultOutDir = join(repoRoot, "artifacts/openclaw-severe-scenario-proof");
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const jsonOutput = process.argv.includes("--json");
const liveReceipts =
  process.argv.includes("--live") || process.env.NEURA_OPENCLAW_SEVERE_PROOF_LIVE === "true";

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

function statusLabel(value) {
  return titleCase(value);
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) counts[item[key]] = (counts[item[key]] ?? 0) + 1;
  return counts;
}

function actionCardForCheckpoint(model, checkpoint) {
  const expiresAt =
    checkpoint.authority_status === "expired"
      ? "2026-05-11T00:00:00Z"
      : "2026-12-31T23:59:59Z";
  const revoked =
    checkpoint.authority_status.includes("not_authorized") ||
    checkpoint.authority_status.includes("blocked");

  return {
    version: "0.1",
    agent: {
      id: "openclaw-severe-proof-agent",
      owner: "neura_relay",
      capability: "severe_computer_use_receipt_proof",
      capabilityVersion: "0.1-rc",
    },
    proposedAction: {
      type: checkpoint.proposed_action,
      summary: checkpoint.summary,
      target: checkpoint.target_ref,
    },
    affectedObject: checkpoint.affected_object_ref,
    context: {
      authorityContext: {
        delegatedBy: "user_ref_local_operator",
        actingAgent: "openclaw-severe-proof-agent",
        authorityScope: `${model.scenario.id}:${checkpoint.family}`,
        allowedActions: [checkpoint.proposed_action],
        allowedResources: [checkpoint.target_ref],
        expiresAt,
        revocationStatus: revoked ? "not_authorized" : "active",
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
      requestedOutcome: "decision_receipt",
    },
  };
}

function receiptProjection(model, checkpoint) {
  return {
    receipt_id: `local_severe_receipt_ref:${checkpoint.phase}:${checkpoint.id}`,
    decision: checkpoint.decision,
    trace_ref: `local_severe_trace_ref:${model.scenario.id}:${checkpoint.id}`,
    risk_class: checkpoint.risk_class,
    confidence_band: checkpoint.confidence_band,
    authority_status: checkpoint.authority_status,
    policy_status: checkpoint.policy_status,
    evidence_status: checkpoint.evidence_status,
    route: checkpoint.route,
    reason: checkpoint.what_neura_catches,
    developer_owned_next_step: checkpoint.developer_next_step,
    relay_boundary: "decision_gate_only_developer_keeps_execution",
  };
}

function developerRouteFromReceipt(receipt) {
  if (receipt?.decision === "proceed") return "ready_for_developer_owned_execution";
  if (receipt?.decision === "human_review") return "route_to_human_review_before_execution";
  if (receipt?.decision === "revise") return "revise_action_card_before_execution";
  if (receipt?.decision === "stop" || receipt?.decision === "blocked") return "stop_before_execution";
  return "hold_for_review_before_execution";
}

function publicLiveReceipt(receipt, response) {
  return {
    receipt_id: receipt?.receipt_id,
    decision: receipt?.decision,
    developer_route: developerRouteFromReceipt(receipt),
    reason: receipt?.reason,
    trace_ref: receipt?.trace_ref,
    transaction_ref: response.transaction_ledger?.transaction_ref,
    relay_boundary: receipt?.relay_boundary,
    authority_decision_engine: receipt?.authority_decision_engine
      ? {
          authority_status: receipt.authority_decision_engine.authority_graph?.status,
          risk_class: receipt.authority_decision_engine.risk?.class,
          policy_status: receipt.authority_decision_engine.policy_evidence?.policy?.status,
          evidence_status: receipt.authority_decision_engine.policy_evidence?.evidence?.status,
          confidence_band:
            receipt.authority_decision_engine.confidence_scoring?.confidence_band,
        }
      : null,
  };
}

async function liveReceiptsForCheckpoints(checkpoints) {
  let createNeuraRelaySdk = null;
  try {
    ({ createNeuraRelaySdk } = await import("@neurarelay/sdk"));
  } catch {
    throw new Error("Install dependencies with npm install before running live severe proof.");
  }

  const relay = createNeuraRelaySdk({ baseUrl: relayBaseUrl });
  const receipts = [];
  for (const checkpoint of checkpoints) {
    const response = await relay.resolve.resolve({ action_card: checkpoint.action_card });
    const receipt = response.decision_receipt;
    if (!receipt?.receipt_id || !receipt?.trace_ref) {
      throw new Error(`Relay response missing receipt or trace for ${checkpoint.id}`);
    }
    receipts.push({
      checkpoint_id: checkpoint.id,
      ...publicLiveReceipt(receipt, response),
    });
  }
  return receipts;
}

function buildReport(model, liveReceiptRows = []) {
  const checkpoints = model.checkpoints.map((checkpoint) => ({
    ...checkpoint,
    action_card: actionCardForCheckpoint(model, checkpoint),
    receipt_projection: receiptProjection(model, checkpoint),
  }));

  return {
    ok: true,
    proof: "openclaw-severe-scenario-proof",
    name: model.name,
    version: model.version,
    mode: liveReceipts ? "local_plus_live_receipts" : model.mode,
    generated_at: new Date().toISOString(),
    path: model.relay_path,
    scenario: model.scenario,
    count: {
      checkpoints: checkpoints.length,
      decisions: countBy(checkpoints, "decision"),
      risk_classes: countBy(checkpoints, "risk_class"),
      families: countBy(checkpoints, "family"),
      live_receipts: liveReceiptRows.length,
    },
    checkpoints,
    live_receipts: liveReceiptRows,
    boundaries: model.boundaries,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# OpenClaw Severe Scenario Proof Pack",
    "",
    `Mode: ${report.mode}`,
    "",
    report.scenario.developer_problem,
    "",
    `Impact: ${report.scenario.impact}`,
    "",
    `Path: ${report.path}`,
    "",
    "## Decision Summary",
    "",
  ];

  for (const decision of ["proceed", "human_review", "revise", "stop"]) {
    lines.push(`- ${titleCase(decision)}: ${report.count.decisions[decision] ?? 0}`);
  }

  lines.push("", "## Checkpoints", "");
  for (const checkpoint of report.checkpoints) {
    lines.push(`### ${checkpoint.phase}. ${checkpoint.title}`, "");
    lines.push(`- Proposed action: ${checkpoint.proposed_action}`);
    lines.push(`- Target ref: ${checkpoint.target_ref}`);
    lines.push(`- Risk: ${checkpoint.risk_class}`);
    lines.push(`- Decision: ${checkpoint.decision}`);
    lines.push(`- Receipt route: ${checkpoint.route}`);
    lines.push(`- What Neura catches: ${checkpoint.what_neura_catches}`);
    lines.push(`- Developer next step: ${checkpoint.developer_next_step}`);
    lines.push(`- Receipt ref: ${checkpoint.receipt_projection.receipt_id}`);
    lines.push("");
  }

  if (report.live_receipts.length > 0) {
    lines.push("## Live Receipt Refs", "");
    for (const receipt of report.live_receipts) {
      lines.push(
        `- ${receipt.checkpoint_id}: ${receipt.decision} / ${receipt.developer_route} / ${receipt.receipt_id}`,
      );
    }
    lines.push("");
  }

  lines.push("## Boundaries", "");
  for (const [key, value] of Object.entries(report.boundaries)) {
    lines.push(`- ${key}: ${value}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderHtml(report) {
  const decisionTiles = ["human_review", "revise", "stop", "proceed"]
    .map(
      (decision) => `
        <div class="metric metric-${escapeHtml(decision)}">
          <span>${escapeHtml(titleCase(decision))}</span>
          <strong>${report.count.decisions[decision] ?? 0}</strong>
        </div>`,
    )
    .join("");

  const checkpointRows = report.checkpoints
    .map(
      (checkpoint) => `
        <article class="checkpoint checkpoint-${escapeHtml(checkpoint.decision)}">
          <div class="checkpoint-index">${checkpoint.phase}</div>
          <div class="checkpoint-body">
            <div class="checkpoint-topline">
              <span>${escapeHtml(titleCase(checkpoint.family))}</span>
              <strong>${escapeHtml(titleCase(checkpoint.decision))}</strong>
            </div>
            <h2>${escapeHtml(checkpoint.title)}</h2>
            <p class="intent">${escapeHtml(checkpoint.summary)}</p>
            <p class="mono">${escapeHtml(checkpoint.proposed_action)} -> ${escapeHtml(checkpoint.target_ref)}</p>
            <div class="receipt-grid">
              <div><span>Risk</span><strong>${escapeHtml(statusLabel(checkpoint.risk_class))}</strong></div>
              <div><span>Authority</span><strong>${escapeHtml(statusLabel(checkpoint.authority_status))}</strong></div>
              <div><span>Policy</span><strong>${escapeHtml(statusLabel(checkpoint.policy_status))}</strong></div>
              <div><span>Evidence</span><strong>${escapeHtml(statusLabel(checkpoint.evidence_status))}</strong></div>
            </div>
            <section class="catch-panel">
              <div>
                <span>What Neura catches</span>
                <strong>${escapeHtml(checkpoint.what_neura_catches)}</strong>
              </div>
              <div>
                <span>Developer-owned next step</span>
                <strong>${escapeHtml(checkpoint.developer_next_step)}</strong>
              </div>
              <div>
                <span>Receipt route</span>
                <strong>${escapeHtml(titleCase(checkpoint.route))}</strong>
              </div>
            </section>
            <code>${escapeHtml(checkpoint.receipt_projection.receipt_id)}</code>
          </div>
        </article>`,
    )
    .join("");

  const liveRows = report.live_receipts.length
    ? `
      <section class="live">
        <h2>Live Receipt Refs</h2>
        ${report.live_receipts
          .map(
            (receipt) => `
              <div class="live-row">
                <span>${escapeHtml(receipt.checkpoint_id)}</span>
                <strong>${escapeHtml(receipt.decision)}</strong>
                <code>${escapeHtml(receipt.receipt_id)}</code>
              </div>`,
          )
          .join("")}
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenClaw Severe Scenario Proof Pack</title>
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
      --critical: #7f1d1d;
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
    p { margin: 0 0 12px; color: var(--muted); max-width: 950px; }
    header p { max-width: none; }
    .path {
      display: block;
      margin-top: 8px;
      padding: 8px 10px;
      border: 1px solid var(--line);
      background: var(--panel);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .proof-line {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 20px;
      max-width: 1180px;
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
    .summary-band {
      display: grid;
      grid-template-columns: 1.35fr .65fr;
      gap: 14px;
      margin: 22px 0;
      align-items: stretch;
    }
    .scenario {
      background: var(--panel);
      border: 1px solid var(--line);
      border-top: 4px solid var(--critical);
      padding: 20px;
    }
    .scenario strong { color: var(--ink); }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      background: var(--panel);
      border: 1px solid var(--line);
      border-top: 4px solid var(--muted);
      padding: 14px;
      min-height: 96px;
    }
    .metric span { display: block; color: var(--muted); text-transform: uppercase; font-size: 12px; }
    .metric strong { display: block; margin-top: 6px; font-size: 32px; line-height: 1; }
    .metric-human_review { border-top-color: var(--review); }
    .metric-revise { border-top-color: var(--revise); }
    .metric-stop { border-top-color: var(--stop); }
    .metric-proceed { border-top-color: var(--proceed); }
    .timeline {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 22px;
    }
    .checkpoint {
      display: grid;
      grid-template-columns: 54px 1fr;
      border: 1px solid var(--line);
      background: var(--panel);
      min-height: 240px;
    }
    .checkpoint-index {
      padding-top: 22px;
      text-align: center;
      color: var(--muted);
      background: var(--soft);
      border-right: 1px solid var(--line);
      font-weight: 800;
      font-size: 18px;
    }
    .checkpoint-body { padding: 20px; }
    .checkpoint-topline {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }
    .checkpoint-topline span {
      color: var(--muted);
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 700;
    }
    .checkpoint-topline strong {
      padding: 4px 8px;
      color: #fff;
      background: var(--muted);
      text-transform: uppercase;
      font-size: 11px;
      white-space: nowrap;
    }
    .checkpoint-human_review .checkpoint-topline strong { background: var(--review); }
    .checkpoint-revise .checkpoint-topline strong { background: var(--revise); }
    .checkpoint-stop .checkpoint-topline strong { background: var(--stop); }
    .checkpoint-proceed .checkpoint-topline strong { background: var(--proceed); }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--ink);
      overflow-wrap: anywhere;
      font-size: 13px;
    }
    .receipt-grid, .catch-panel {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 14px 0;
    }
    .catch-panel { grid-template-columns: 1.2fr 1.2fr .8fr; }
    .receipt-grid div, .catch-panel div {
      border: 1px solid var(--line);
      background: var(--soft);
      padding: 9px;
    }
    .receipt-grid span, .catch-panel span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .receipt-grid strong, .catch-panel strong { display: block; overflow-wrap: anywhere; }
    code {
      display: block;
      margin-top: 12px;
      padding: 8px;
      background: var(--soft);
      overflow-wrap: anywhere;
      font-size: 12px;
    }
    .live {
      margin-top: 24px;
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 18px;
    }
    .live-row {
      display: grid;
      grid-template-columns: 1fr .5fr 1.4fr;
      gap: 8px;
      align-items: center;
      border-top: 1px solid var(--line);
      padding: 10px 0;
    }
    footer {
      margin-top: 28px;
      color: var(--muted);
      border-top: 1px solid var(--line);
      padding-top: 18px;
    }
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
      .proof-line, .summary-band, .metrics, .receipt-grid, .catch-panel, .live-row {
        grid-template-columns: 1fr;
      }
      .checkpoint { grid-template-columns: 42px 1fr; }
      .checkpoint-body { padding: 16px; }
      .checkpoint-topline { align-items: flex-start; flex-direction: column; }
    }
    @media (max-width: 374px) {
      main { width: calc(100vw - 32px); }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">Severe local proof - Receipt before execution</span>
      <h1>Severe Scenario Proof</h1>
      <p>A five-checkpoint computer-use incident: export data, upload externally, notify a channel, delete the copy, and close the workflow.</p>
      <span class="path">Preflight -&gt; Receipt -&gt; Developer route</span>
      <div class="proof-line" aria-label="Receipt path">
        <span>Agent intent</span>
        <span>Action Card</span>
        <span>Decision Receipt</span>
        <span>Developer route</span>
        <span>No execution</span>
      </div>
    </header>
    <section class="summary-band" aria-label="Scenario summary">
      <article class="scenario">
        <span class="eyebrow">${escapeHtml(report.scenario.severity)}</span>
        <h2>${escapeHtml(report.scenario.title)}</h2>
        <p><strong>Impact:</strong> ${escapeHtml(report.scenario.impact)}</p>
        <p><strong>Agent intent:</strong> ${escapeHtml(report.scenario.agent_intent)}</p>
        <p><strong>Receipt goal:</strong> ${escapeHtml(report.scenario.receipt_goal)}</p>
      </article>
      <section class="metrics">${decisionTiles}</section>
    </section>
    <section class="timeline" aria-label="Severe scenario checkpoints">${checkpointRows}</section>
    ${liveRows}
    <footer>
      Safe local projection. No real data export, external browser submit, message send, file delete, workflow transition, credential issuance, or downstream execution by Neura occurs.
    </footer>
  </main>
</body>
</html>
`;
}

const outDir = resolve(repoRoot, argValue("out") ?? defaultOutDir);
const model = JSON.parse(await readFile(scenarioPath, "utf8"));
const localCheckpoints = model.checkpoints.map((checkpoint) => ({
  ...checkpoint,
  action_card: actionCardForCheckpoint(model, checkpoint),
  receipt_projection: receiptProjection(model, checkpoint),
}));
const liveReceiptRows = liveReceipts ? await liveReceiptsForCheckpoints(localCheckpoints) : [];
const report = buildReport(model, liveReceiptRows);

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(outDir, "report.md"), renderMarkdown(report));
await writeFile(join(outDir, "report.html"), renderHtml(report));

const output = {
  ok: true,
  proof: report.proof,
  mode: report.mode,
  relay: liveReceipts ? relayBaseUrl : null,
  out_dir: outDir,
  files: {
    json: join(outDir, "report.json"),
    markdown: join(outDir, "report.md"),
    html: join(outDir, "report.html"),
  },
  count: report.count,
  boundaries: report.boundaries,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("OpenClaw Severe Scenario Proof Pack generated.");
  console.log(`Mode: ${output.mode}`);
  console.log(`HTML: ${output.files.html}`);
  console.log(`Markdown: ${output.files.markdown}`);
  console.log(`JSON: ${output.files.json}`);
  console.log("Developer runtime keeps execution ownership.");
}
