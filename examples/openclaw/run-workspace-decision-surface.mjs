#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const scenariosPath = join(exampleDir, "workspace-surface/scenarios.json");
const defaultOutDir = join(repoRoot, "artifacts/openclaw-workspace-decision-surface");
const jsonOutput = process.argv.includes("--json");

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
  for (const item of items) {
    counts[item[key]] = (counts[item[key]] ?? 0) + 1;
  }
  return counts;
}

function actionCardForAction(action) {
  return {
    version: "0.1",
    agent: {
      id: "openclaw-workspace-surface-agent",
      owner: "neura_relay",
      capability: "workspace_decision_surface_projection",
      capabilityVersion: "0.1-rc",
    },
    proposedAction: {
      type: action.proposed_action,
      summary: action.action_summary,
      target: action.target_ref,
    },
    affectedObject: action.affected_object_ref,
    context: {
      authorityContext: {
        delegatedBy: "user_ref_workspace_operator",
        actingAgent: "openclaw-workspace-surface-agent",
        authorityScope: `workspace_surface:${action.surface}`,
        allowedActions: [action.proposed_action],
        allowedResources: [action.target_ref],
        expiresAt: "2026-12-31T23:59:59Z",
        revocationStatus:
          action.authority_status === "missing_release_manager_authority" ||
          action.authority_status === "not_authorized_for_external_destination"
            ? "not_authorized"
            : "active",
        policyRefs: [`policy_ref:workspace_surface:${action.id}`],
        authorityScopeRef: `authority_scope_ref:workspace_surface:${action.surface}`,
        standingRef: "registry_passport_standing_ref_demo",
      },
      evidenceRefs: [
        `workspace_evidence_ref:${action.id}`,
        `workspace_context_ref:${action.surface}`,
      ],
      ruleRefs: [`workspace_rule_ref:${action.risk_class}`],
      riskCategory: action.risk_class,
      requestedOutcome: "decision_receipt",
    },
  };
}

function receiptProjection(action, index) {
  return {
    receipt_id: `local_workspace_receipt_ref:${String(index + 1).padStart(2, "0")}:${action.id}`,
    decision: action.decision,
    trace_ref: `local_workspace_trace_ref:${action.id}`,
    route: action.route,
    authority_engine_posture: action.authority_engine_posture,
    missing_refs: action.missing_refs,
    readiness_path: action.readiness_path,
    developer_owned_next_step: action.developer_owned_next_step,
    relay_boundary: "decision_gate_only_developer_keeps_execution",
  };
}

function buildReport(model) {
  const actions = model.actions.map((action, index) => ({
    ...action,
    action_card: actionCardForAction(action),
    receipt_projection: receiptProjection(action, index),
  }));

  return {
    ok: true,
    surface: model.name,
    version: model.version,
    mode: model.mode,
    generated_at: new Date().toISOString(),
    path: model.relay_path,
    count: {
      actions: actions.length,
      decisions: countBy(actions, "decision"),
      risk_classes: countBy(actions, "risk_class"),
      surfaces: countBy(actions, "surface"),
    },
    actions,
    boundaries: model.boundaries,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# OpenClaw OS Decision Receipt Surface",
    "",
    `Mode: ${report.mode}`,
    "",
    "Workspace-shaped proof: proposed persistent workspace actions become Action Cards, receive Authority Decision Engine posture, and return Decision Receipts before developer-owned execution.",
    "",
    `Path: ${report.path}`,
    "",
    "## Decision Summary",
    "",
  ];

  for (const [decision, count] of Object.entries(report.count.decisions)) {
    lines.push(`- ${titleCase(decision)}: ${count}`);
  }

  lines.push("", "## Workspace Actions", "");

  for (const action of report.actions) {
    lines.push(`### ${action.title}`, "");
    lines.push(`- Surface: ${action.surface}`);
    lines.push(`- Proposed action: ${action.proposed_action}`);
    lines.push(`- Risk: ${action.risk_class}`);
    lines.push(`- Decision: ${action.decision}`);
    lines.push(`- Receipt route: ${action.route}`);
    lines.push(`- Authority Engine posture: ${action.authority_engine_posture}`);
    lines.push(`- Readiness path: ${action.readiness_path}`);
    lines.push(`- Developer next step: ${action.developer_owned_next_step}`);
    lines.push("");
  }

  lines.push("## Boundaries", "");
  for (const [key, value] of Object.entries(report.boundaries)) {
    lines.push(`- ${key}: ${value}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderHtml(report) {
  const decisionTiles = Object.entries({
    proceed: report.count.decisions.proceed ?? 0,
    human_review: report.count.decisions.human_review ?? 0,
    revise: report.count.decisions.revise ?? 0,
    stop: report.count.decisions.stop ?? 0,
  })
    .map(
      ([decision, count]) => `
        <div class="metric metric-${escapeHtml(decision)}">
          <span>${escapeHtml(titleCase(decision))}</span>
          <strong>${count}</strong>
        </div>`,
    )
    .join("");

  const surfaceCards = report.actions
    .map(
      (action) => `
        <article class="surface-card surface-${escapeHtml(action.decision)}">
          <div class="surface-topline">
            <span>${escapeHtml(titleCase(action.surface))}</span>
            <strong>${escapeHtml(titleCase(action.decision))}</strong>
          </div>
          <h2>${escapeHtml(action.title)}</h2>
          <p>${escapeHtml(action.workspace_context)}</p>
          <dl>
            <div>
              <dt>Proposed workspace action</dt>
              <dd>${escapeHtml(action.action_summary)}</dd>
            </div>
            <div>
              <dt>Authority Engine posture</dt>
              <dd>${escapeHtml(action.authority_engine_posture)}</dd>
            </div>
            <div>
              <dt>Receipt route</dt>
              <dd>${escapeHtml(titleCase(action.route))}</dd>
            </div>
            <div>
              <dt>Developer-owned next step</dt>
              <dd>${escapeHtml(action.developer_owned_next_step)}</dd>
            </div>
          </dl>
        </article>`,
    )
    .join("");

  const detailRows = report.actions
    .map(
      (action, index) => `
        <article class="detail detail-${escapeHtml(action.decision)}">
          <div class="detail-index">${index + 1}</div>
          <div class="detail-body">
            <div class="detail-topline">
              <span>${escapeHtml(action.surface.replaceAll("_", " "))}</span>
              <strong>${escapeHtml(titleCase(action.decision))}</strong>
            </div>
            <h3>${escapeHtml(action.title)}</h3>
            <p class="mono">${escapeHtml(action.proposed_action)} -> ${escapeHtml(action.target_ref)}</p>
            <div class="receipt-grid">
              <div><span>Risk</span><strong>${escapeHtml(action.risk_class)}</strong></div>
              <div><span>Authority</span><strong>${escapeHtml(action.authority_status)}</strong></div>
              <div><span>Policy</span><strong>${escapeHtml(action.policy_status)}</strong></div>
              <div><span>Evidence</span><strong>${escapeHtml(action.evidence_status)}</strong></div>
            </div>
            <section class="route-panel">
              <div>
                <span>Missing refs</span>
                <strong>${escapeHtml(action.missing_refs.length > 0 ? action.missing_refs.join(", ") : "none")}</strong>
              </div>
              <div>
                <span>Readiness path</span>
                <strong>${escapeHtml(action.readiness_path)}</strong>
              </div>
            </section>
            <code>${escapeHtml(action.receipt_projection.receipt_id)}</code>
          </div>
        </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenClaw OS Decision Receipt Surface</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #15201c;
      --muted: #60706a;
      --line: #d8dfdc;
      --paper: #f6f8f5;
      --panel: #ffffff;
      --soft: #eef2ec;
      --proceed: #0d7c59;
      --review: #8a5a00;
      --revise: #265fa6;
      --stop: #b42318;
    }
    * { box-sizing: border-box; min-width: 0; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--paper);
      line-height: 1.5;
    }
    main { max-width: 1240px; margin: 0 auto; padding: 34px 24px 56px; }
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
    h2 { margin: 8px 0; font-size: 22px; line-height: 1.18; letter-spacing: 0; }
    h3 { margin: 8px 0; font-size: 18px; letter-spacing: 0; }
    p { margin: 0 0 12px; color: var(--muted); max-width: 920px; }
    header p { max-width: none; }
    .path {
      display: inline-block;
      margin-top: 8px;
      padding: 8px 10px;
      border: 1px solid var(--line);
      background: var(--panel);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .proof-line {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 20px;
      max-width: 1120px;
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
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 0 0 24px;
    }
    .metric {
      background: var(--panel);
      border: 1px solid var(--line);
      border-top: 4px solid var(--muted);
      padding: 14px;
    }
    .metric span { display: block; color: var(--muted); text-transform: uppercase; font-size: 12px; }
    .metric strong { display: block; margin-top: 6px; font-size: 30px; line-height: 1; }
    .metric-proceed { border-top-color: var(--proceed); }
    .metric-human_review { border-top-color: var(--review); }
    .metric-revise { border-top-color: var(--revise); }
    .metric-stop { border-top-color: var(--stop); }
    .surface-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 26px;
    }
    .surface-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-top: 4px solid var(--muted);
      padding: 18px;
      min-height: 430px;
    }
    .surface-stop { border-top-color: var(--stop); }
    .surface-human_review { border-top-color: var(--review); }
    .surface-revise { border-top-color: var(--revise); }
    .surface-proceed { border-top-color: var(--proceed); }
    .surface-topline, .detail-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 700;
    }
    .surface-topline strong, .detail-topline strong {
      border-radius: 999px;
      padding: 4px 8px;
      background: var(--soft);
      color: var(--ink);
      white-space: nowrap;
    }
    dl, .receipt-grid, .route-panel {
      display: grid;
      gap: 8px;
      margin: 14px 0 0;
    }
    dl div, .receipt-grid div, .route-panel div {
      border: 1px solid var(--line);
      background: var(--soft);
      padding: 9px;
    }
    dt, .receipt-grid span, .route-panel span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    dd, .receipt-grid strong, .route-panel strong {
      display: block;
      margin: 4px 0 0;
      color: var(--ink);
      font-size: 14px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .detail-list {
      border: 1px solid var(--line);
      background: var(--panel);
    }
    .detail {
      display: grid;
      grid-template-columns: 48px 1fr;
      min-height: 250px;
      border-bottom: 1px solid var(--line);
    }
    .detail:last-child { border-bottom: 0; }
    .detail-index {
      padding-top: 18px;
      text-align: center;
      color: var(--muted);
      background: var(--soft);
      border-right: 1px solid var(--line);
      font-weight: 700;
    }
    .detail-body { padding: 18px; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      color: var(--ink);
      overflow-wrap: anywhere;
    }
    .receipt-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .route-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    code {
      display: block;
      margin-top: 12px;
      padding: 8px;
      background: var(--soft);
      overflow-wrap: anywhere;
      font-size: 12px;
    }
    footer {
      margin-top: 28px;
      color: var(--muted);
      border-top: 1px solid var(--line);
      padding-top: 18px;
    }
    @media (max-width: 920px) {
      body { padding: 0; }
      main { width: 358px; max-width: none; margin: 0 16px; padding: 28px 0 40px; }
      h1 { font-size: 30px; }
      header p { max-width: 34ch; }
      .path {
        display: block;
        width: 100%;
        max-width: 100%;
        white-space: normal;
        word-break: break-all;
      }
      .proof-line span { white-space: normal; }
      .proof-line, .metrics, .surface-grid, .receipt-grid, .route-panel { grid-template-columns: 1fr; }
      .surface-card { min-height: auto; }
    }
    @media (max-width: 374px) {
      main { width: calc(100vw - 32px); }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">Local workspace proof - Safe local projection</span>
      <h1>Workspace Decision Surface</h1>
      <p>Receipt posture before autonomous workspace actions change apps, artifacts, crons, memory, browser, shell, or files.</p>
      <span class="path">Workspace action -&gt; Receipt -&gt; Developer route</span>
      <div class="proof-line" aria-label="Workspace receipt path">
        <span>Workspace action</span>
        <span>Action Card</span>
        <span>Authority Engine posture</span>
        <span>Decision Receipt</span>
        <span>Developer route</span>
      </div>
    </header>
    <section class="metrics">${decisionTiles}</section>
    <section class="surface-grid" aria-label="Workspace action surfaces">${surfaceCards}</section>
    <section class="detail-list" aria-label="Receipt details">${detailRows}</section>
    <footer>
      Safe local projection. No generated app deploy, artifact publish, cron schedule, workflow transition, memory write, browser submit, shell/file execution, token issuance, or downstream execution by Neura occurs.
    </footer>
  </main>
</body>
</html>
`;
}

const outDir = resolve(repoRoot, argValue("out") ?? defaultOutDir);
const model = JSON.parse(await readFile(scenariosPath, "utf8"));
const report = buildReport(model);

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(outDir, "report.md"), renderMarkdown(report));
await writeFile(join(outDir, "report.html"), renderHtml(report));

const output = {
  ok: true,
  surface: report.surface,
  mode: report.mode,
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
  console.log("OpenClaw OS Decision Receipt Surface generated.");
  console.log(`HTML: ${output.files.html}`);
  console.log(`Markdown: ${output.files.markdown}`);
  console.log(`JSON: ${output.files.json}`);
}
