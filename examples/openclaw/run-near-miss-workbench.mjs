#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const scenariosPath = join(exampleDir, "near-miss-workbench/scenarios.json");
const defaultOutDir = join(repoRoot, "artifacts/openclaw-near-miss-workbench");
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

function routeLabel(decision) {
  return decision.replaceAll("_", " ");
}

function titleCase(value) {
  return String(value)
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function keyNearMissStep(journey) {
  return (
    journey.steps.find((step) => step.decision === "stop") ??
    journey.steps.find((step) => step.decision === "human_review") ??
    journey.steps.find((step) => step.decision === "revise") ??
    journey.steps[0]
  );
}

function decisionCounts(journeys) {
  const counts = { proceed: 0, human_review: 0, revise: 0, stop: 0 };
  for (const journey of journeys) {
    for (const step of journey.steps) {
      if (Object.hasOwn(counts, step.decision)) counts[step.decision] += 1;
    }
  }
  return counts;
}

function actionCardForStep(journey, step) {
  return {
    version: "0.1",
    agent: {
      id: "openclaw-near-miss-workbench-agent",
      owner: "neura_relay",
      capability: "local_near_miss_projection",
      capabilityVersion: "0.1-rc",
    },
    proposedAction: {
      type: step.proposed_action,
      summary: step.title,
      target: step.target_ref,
    },
    affectedObject: step.affected_object_ref,
    context: {
      authorityContext: {
        delegatedBy: "user_ref_local_operator",
        actingAgent: "openclaw-near-miss-workbench-agent",
        authorityScope: `${journey.id}:${step.family}`,
        allowedActions: [step.proposed_action],
        allowedResources: [step.target_ref],
        expiresAt:
          step.authority_status === "expired"
            ? "2026-05-11T00:00:00Z"
            : "2026-12-31T23:59:59Z",
        revocationStatus: step.authority_status === "expired" ? "expired" : "active",
        policyRefs: [`policy_ref:${journey.id}:${step.id}`],
        authorityScopeRef: `authority_scope_ref:${journey.id}:${step.family}`,
        standingRef: "registry_passport_standing_ref_demo",
      },
      evidenceRefs: [
        `evidence_ref:${journey.id}:${step.id}`,
        `scenario_ref:${journey.id}`,
      ],
      ruleRefs: [`rule_ref:${journey.id}:${step.risk_class}`],
      riskCategory: step.risk_class,
      requestedOutcome: "decision_receipt",
    },
  };
}

function receiptProjection(journey, step, index) {
  return {
    receipt_id: `local_receipt_ref:${journey.id}:${String(index + 1).padStart(2, "0")}`,
    decision: step.decision,
    trace_ref: `local_trace_ref:${journey.id}:${step.id}`,
    risk_class: step.risk_class,
    authority_status: step.authority_status,
    policy_status: step.policy_status,
    evidence_status: step.evidence_status,
    route: step.route,
    reason: step.why,
    recommended_next_step: step.safe_next_step,
    relay_boundary: "decision_gate_only_developer_keeps_execution",
  };
}

function buildReport(model) {
  const journeys = model.journeys.map((journey) => ({
    ...journey,
    steps: journey.steps.map((step, index) => ({
      ...step,
      action_card: actionCardForStep(journey, step),
      receipt_projection: receiptProjection(journey, step, index),
    })),
  }));

  return {
    ok: true,
    workbench: model.name,
    version: model.version,
    mode: model.mode,
    generated_at: new Date().toISOString(),
    path: model.relay_path,
    count: {
      journeys: journeys.length,
      steps: journeys.reduce((total, journey) => total + journey.steps.length, 0),
      decisions: decisionCounts(journeys),
    },
    journeys,
    boundaries: model.boundaries,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# OpenClaw Near-Miss Workbench",
    "",
    `Mode: ${report.mode}`,
    "",
    "Receipt before execution: three severe autonomous-agent near misses visualized before any downstream action executes.",
    "",
    `Path: ${report.path}`,
    "",
    "## Decision Summary",
    "",
    `- Proceed: ${report.count.decisions.proceed}`,
    `- Human review: ${report.count.decisions.human_review}`,
    `- Revise: ${report.count.decisions.revise}`,
    `- Stop: ${report.count.decisions.stop}`,
    "",
  ];

  for (const journey of report.journeys) {
    const keyStep = keyNearMissStep(journey);
    lines.push(`## ${journey.title}`, "");
    lines.push(`Problem: ${journey.developer_problem}`);
    lines.push(`Impact: ${journey.impact}`, "");
    lines.push(`- What the agent was about to do: ${journey.agent_intent}`);
    lines.push(`- What Neura caught: ${keyStep.title}`);
    lines.push(`- Receipt route: ${keyStep.route}`);
    lines.push(`- Developer next step: ${keyStep.safe_next_step}`);
    lines.push("");
    for (const step of journey.steps) {
      lines.push(`### ${step.title}`);
      lines.push(`- Proposed action: ${step.proposed_action}`);
      lines.push(`- Risk: ${step.risk_class}`);
      lines.push(`- Decision: ${step.decision}`);
      lines.push(`- Route: ${step.route}`);
      lines.push(`- Why: ${step.why}`);
      lines.push(`- Safe next step: ${step.safe_next_step}`);
      lines.push("");
    }
  }

  lines.push("## Boundaries", "");
  for (const [key, value] of Object.entries(report.boundaries)) {
    lines.push(`- ${key}: ${value}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderHtml(report) {
  const journeyCards = report.journeys
    .map((journey) => {
      const keyStep = keyNearMissStep(journey);
      return `
        <article class="scenario-card scenario-${escapeHtml(keyStep.decision)}">
          <span class="severity">${escapeHtml(journey.severity)}</span>
          <h2>${escapeHtml(journey.title)}</h2>
          <p>${escapeHtml(journey.developer_problem)}</p>
          <dl class="scenario-flow">
            <div>
              <dt>Agent intent</dt>
              <dd>${escapeHtml(journey.agent_intent)}</dd>
            </div>
            <div>
              <dt>What Neura catches</dt>
              <dd>${escapeHtml(keyStep.title)}</dd>
            </div>
            <div>
              <dt>Receipt route</dt>
              <dd>${escapeHtml(titleCase(keyStep.route))}</dd>
            </div>
          </dl>
        </article>`;
    })
    .join("");

  const decisionTiles = Object.entries(report.count.decisions)
    .map(
      ([decision, count]) => `
        <div class="metric metric-${escapeHtml(decision)}">
          <span>${escapeHtml(routeLabel(decision))}</span>
          <strong>${count}</strong>
        </div>`,
    )
    .join("");

  const journeySections = report.journeys
    .map((journey) => {
      const keyStep = keyNearMissStep(journey);
      const steps = journey.steps
        .map(
          (step, index) => `
            <article class="step step-${escapeHtml(step.decision)}">
              <div class="step-index">${index + 1}</div>
              <div class="step-body">
                <div class="step-topline">
                  <span class="family">${escapeHtml(step.family.replaceAll("_", " "))}</span>
                  <span class="decision">${escapeHtml(routeLabel(step.decision))}</span>
                </div>
                <h3>${escapeHtml(step.title)}</h3>
                <p class="action">${escapeHtml(step.proposed_action)} -> ${escapeHtml(step.target_ref)}</p>
                <dl>
                  <div><dt>Risk</dt><dd>${escapeHtml(step.risk_class)}</dd></div>
                  <div><dt>Authority</dt><dd>${escapeHtml(step.authority_status)}</dd></div>
                  <div><dt>Policy</dt><dd>${escapeHtml(step.policy_status)}</dd></div>
                  <div><dt>Evidence</dt><dd>${escapeHtml(step.evidence_status)}</dd></div>
                </dl>
                <p><strong>Why:</strong> ${escapeHtml(step.why)}</p>
                <p><strong>Safe next step:</strong> ${escapeHtml(step.safe_next_step)}</p>
                <code>${escapeHtml(step.receipt_projection.receipt_id)}</code>
              </div>
            </article>`,
        )
        .join("");

      return `
        <section class="journey">
          <div class="journey-header">
            <div class="journey-heading">
              <span class="severity">${escapeHtml(journey.severity)}</span>
              <h2>${escapeHtml(journey.title)}</h2>
            </div>
            <p>${escapeHtml(journey.developer_problem)}</p>
            <strong>${escapeHtml(journey.impact)}</strong>
            <div class="journey-proof">
              <div>
                <span>What the agent was about to do</span>
                <strong>${escapeHtml(journey.agent_intent)}</strong>
              </div>
              <div>
                <span>What Neura caught</span>
                <strong>${escapeHtml(keyStep.title)}</strong>
              </div>
              <div>
                <span>Receipt route</span>
                <strong>${escapeHtml(titleCase(keyStep.route))}</strong>
              </div>
              <div>
                <span>Developer next step</span>
                <strong>${escapeHtml(keyStep.safe_next_step)}</strong>
              </div>
            </div>
          </div>
          <div class="steps">${steps}</div>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenClaw Near-Miss Workbench</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #15201c;
      --muted: #5c6963;
      --line: #d8dfdc;
      --paper: #f6f8f5;
      --panel: #ffffff;
      --soft: #eef2ec;
      --proceed: #0d7c59;
      --review: #8a5a00;
      --revise: #265fa6;
      --stop: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--paper);
      line-height: 1.5;
    }
    main { max-width: 1220px; margin: 0 auto; padding: 34px 24px 56px; }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      padding: 5px 8px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--muted);
      text-transform: uppercase;
      font-size: 12px;
      font-weight: 700;
    }
    h1 {
      max-width: 900px;
      margin: 0 0 12px;
      font-size: 46px;
      line-height: 1.04;
      letter-spacing: 0;
    }
    h2 { margin: 6px 0 8px; font-size: 25px; line-height: 1.2; letter-spacing: 0; }
    h3 { margin: 8px 0 8px; font-size: 18px; letter-spacing: 0; }
    p { margin: 0 0 12px; color: var(--muted); max-width: 880px; }
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
    }
    .proof-line {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 20px;
      max-width: 980px;
    }
    .proof-line span {
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 10px;
      color: var(--ink);
      font-weight: 700;
      min-height: 46px;
    }
    .scenario-cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 24px 0;
    }
    .scenario-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-top: 4px solid var(--muted);
      padding: 18px;
      min-height: 315px;
    }
    .scenario-card h2 { font-size: 21px; }
    .scenario-card p { font-size: 14px; }
    .scenario-stop { border-top-color: var(--stop); }
    .scenario-human_review { border-top-color: var(--review); }
    .scenario-revise { border-top-color: var(--revise); }
    .scenario-proceed { border-top-color: var(--proceed); }
    .scenario-flow {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin: 14px 0 0;
    }
    .scenario-flow div {
      border: 1px solid var(--line);
      background: var(--soft);
      padding: 9px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 22px 0 30px;
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
    .journey {
      margin-top: 26px;
      border: 1px solid var(--line);
      background: var(--panel);
    }
    .journey-header { padding: 22px; border-bottom: 1px solid var(--line); }
    .journey-header strong { display: block; color: var(--ink); max-width: 840px; }
    .journey-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .journey-proof {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }
    .journey-proof div {
      border: 1px solid var(--line);
      background: var(--soft);
      padding: 10px;
      min-height: 112px;
    }
    .journey-proof span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .journey-proof strong { font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; }
    .severity {
      display: inline-block;
      border: 1px solid var(--line);
      padding: 4px 8px;
      text-transform: uppercase;
      font-size: 12px;
      color: var(--muted);
    }
    .steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; }
    .step {
      display: grid;
      grid-template-columns: 44px 1fr;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      min-height: 290px;
    }
    .step:nth-child(2n) { border-right: 0; }
    .step-index {
      padding-top: 18px;
      text-align: center;
      color: var(--muted);
      background: var(--soft);
      border-right: 1px solid var(--line);
      font-weight: 700;
    }
    .step-body { padding: 18px; }
    .step-topline { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .family { color: var(--muted); text-transform: uppercase; font-size: 11px; }
    .decision {
      padding: 4px 8px;
      border-radius: 999px;
      color: #fff;
      background: var(--muted);
      text-transform: uppercase;
      font-size: 11px;
      white-space: nowrap;
    }
    .step-proceed .decision { background: var(--proceed); }
    .step-human_review .decision { background: var(--review); }
    .step-revise .decision { background: var(--revise); }
    .step-stop .decision { background: var(--stop); }
    .action {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      color: var(--ink);
      overflow-wrap: anywhere;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 14px 0;
    }
    dl div { border: 1px solid var(--line); padding: 8px; }
    dt { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    dd { margin: 3px 0 0; overflow-wrap: anywhere; }
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
    @media (max-width: 820px) {
      main { padding: 28px 16px 40px; }
      h1 { font-size: 34px; }
      .proof-line, .scenario-cards, .metrics, .journey-proof, .steps { grid-template-columns: 1fr; }
      .step, .step:nth-child(2n) { border-right: 0; }
      .scenario-card { min-height: auto; }
      .journey-proof div { min-height: auto; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="eyebrow">Local visual proof - Safe local projection</span>
      <h1>OpenClaw Near-Miss Workbench</h1>
      <p>Receipt before execution for three autonomous-agent failures developers understand immediately: data leakage, production damage, and stale delegated authority.</p>
      <span class="path">${escapeHtml(report.path)}</span>
      <div class="proof-line" aria-label="Receipt path">
        <span>Proposed action</span>
        <span>Action Card</span>
        <span>Decision Receipt</span>
        <span>Developer-owned execution</span>
      </div>
    </header>
    <section class="scenario-cards" aria-label="Flagship near-miss scenarios">${journeyCards}</section>
    <section class="metrics">${decisionTiles}</section>
    ${journeySections}
    <footer>
      Safe local projection. No real email, browser submit, file delete, shell execution, deployment, token issuance, or downstream execution by Neura occurs.
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
  workbench: report.workbench,
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
  console.log("OpenClaw Near-Miss Workbench generated.");
  console.log(`HTML: ${output.files.html}`);
  console.log(`Markdown: ${output.files.markdown}`);
  console.log(`JSON: ${output.files.json}`);
}
