#!/usr/bin/env node

import { createNeuraPreflightAdapter } from "../preflight-adapter/adapter.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dryRun = !process.argv.includes("--live");
const jsonOutput = process.argv.includes("--json");
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const adapter = createNeuraPreflightAdapter({ relayBaseUrl });
const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../../..");
const defaultOutDir = join(repoRoot, "artifacts/openclaw-computer-use-agent-loop");

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

const baseAuthority = {
  delegatedBy: "user_ref_local_operator",
  actingAgent: "agent_ref:generic_computer_use_loop",
  expiresAt: "2026-12-31T23:59:59Z",
  revocationStatus: "active",
  standingRef: "registry_passport_standing_ref_demo",
};

const plannedActions = [
  {
    id: "draft-support-reply",
    type: "message.send",
    summary: "Send a customer-visible support reply after recipient, intent, and policy refs are checked.",
    targetRef: "message_ref:support_reply_2026_05_13",
    authorityScope: "support_channel_response",
    authorityScopeRef: "authority_scope_ref_support_channel",
    evidenceRefs: ["intent_ref_support_reply", "recipient_ref_support_contact"],
    ruleRefs: ["policy_ref_customer_reply_review"],
    riskCategory: "customer_communication",
  },
  {
    id: "remove-generated-export",
    type: "file.delete",
    summary: "Delete a generated local export only after path and retention refs are checked.",
    targetRef: "file_ref:workspace/tmp/generated-export.csv",
    authorityScope: "workspace_file_cleanup",
    authorityScopeRef: "authority_scope_ref_workspace_file_cleanup",
    evidenceRefs: ["path_ref_generated_export", "retention_ref_temp_workspace_file"],
    ruleRefs: ["policy_ref_workspace_file_retention"],
    riskCategory: "local_file_mutation",
  },
  {
    id: "publish-agent-plugin",
    type: "package.publish",
    summary: "Publish an agent plugin only after version, provenance, approval, and claim refs are checked.",
    targetRef: "package_ref:@example/computer-use-plugin@1.0.0",
    authorityScope: "controlled_package_release",
    authorityScopeRef: "authority_scope_ref_package_release",
    evidenceRefs: ["ci_ref_green", "npm_pack_ref_clean", "approval_ref_release_owner"],
    ruleRefs: ["policy_ref_release_approval", "policy_ref_claim_boundary_review"],
    riskCategory: "public_distribution",
  },
];

function createPreflightAction(action) {
  return {
    proposedAction: {
      type: action.type,
      summary: action.summary,
      target: action.targetRef,
    },
    affectedObject: action.targetRef,
    authority: {
      ...baseAuthority,
      authorityScope: action.authorityScope,
      allowedActions: [action.type],
      allowedResources: [action.targetRef],
      policyRefs: action.ruleRefs,
      authorityScopeRef: action.authorityScopeRef,
    },
    evidenceRefs: action.evidenceRefs,
    ruleRefs: action.ruleRefs,
    riskCategory: action.riskCategory,
  };
}

function routeOf(result) {
  return result.mode === "dry_run" ? result.route : result.receipt.route;
}

async function beforeExecute(action) {
  const result = await adapter.beforeAction(createPreflightAction(action), { dryRun });
  const route = routeOf(result);
  const ready = route === "ready_for_developer_owned_execution";

  return {
    action_id: action.id,
    action_type: action.type,
    target_ref: action.targetRef,
    route,
    decision: result.mode === "dry_run" ? null : result.receipt.decision,
    receipt_id: result.mode === "dry_run" ? null : result.receipt.receipt_id,
    trace_ref: result.mode === "dry_run" ? null : result.receipt.trace_ref,
    execution_owner: result.execution_owner,
    execution_attempted: false,
    loop_state: ready ? "ready_for_runtime_execution" : "paused_before_execution",
    runtime_next_step: ready
      ? "execute_local_action_in_developer_runtime"
      : "hold_for_review_or_registry_backed_authority",
  };
}

const checkpoints = [];
for (const action of plannedActions) {
  checkpoints.push(await beforeExecute(action));
}

const output = {
  ok: true,
  example: "openclaw-generic-computer-use-agent-loop",
  mode: dryRun ? "dry_run" : "live_receipt",
  relay: dryRun ? null : relayBaseUrl,
  loop: {
    planned_actions: plannedActions.length,
    execution_attempted: false,
    execution_owner: "developer_runtime",
  },
  checkpoints,
  boundaries: {
    official_openclaw_or_clawhub_claim: false,
    downstream_execution_by_neura: false,
    developer_owned_execution: true,
    private_payload_exposure: false,
    public_token_or_key_issuance: false,
  },
};

function renderMarkdown(report) {
  const lines = [
    "# OpenClaw-Style Agent Loop Transcript",
    "",
    `Mode: ${report.mode}`,
    "",
    "A generic computer-use runtime plans local actions, requests a Neura preflight route, and pauses before execution unless the route is ready.",
    "",
    "## Checkpoints",
    "",
  ];

  for (const checkpoint of report.checkpoints) {
    lines.push(`### ${checkpoint.action_id}`);
    lines.push(`- Planned action: ${checkpoint.action_type}`);
    lines.push(`- Target ref: ${checkpoint.target_ref}`);
    lines.push(`- Receipt route: ${checkpoint.route}`);
    lines.push(`- Loop state: ${checkpoint.loop_state}`);
    lines.push(`- Execution attempted: ${checkpoint.execution_attempted}`);
    lines.push(`- Developer next step: ${checkpoint.runtime_next_step}`);
    lines.push("");
  }

  lines.push("## Boundaries", "");
  for (const [key, value] of Object.entries(report.boundaries)) {
    lines.push(`- ${key}: ${value}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderHtml(report) {
  const cards = report.checkpoints
    .map(
      (checkpoint, index) => `
        <article class="checkpoint">
          <div class="index">${index + 1}</div>
          <div>
            <p class="eyebrow">${escapeHtml(checkpoint.action_type)}</p>
            <h2>${escapeHtml(checkpoint.action_id.replaceAll("-", " "))}</h2>
            <p>${escapeHtml(checkpoint.target_ref)}</p>
            <dl>
              <div><dt>Receipt route</dt><dd>${escapeHtml(checkpoint.route)}</dd></div>
              <div><dt>Loop state</dt><dd>${escapeHtml(checkpoint.loop_state)}</dd></div>
              <div><dt>Execution attempted</dt><dd>${escapeHtml(checkpoint.execution_attempted)}</dd></div>
              <div><dt>Developer next step</dt><dd>${escapeHtml(checkpoint.runtime_next_step)}</dd></div>
            </dl>
          </div>
        </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenClaw-Style Agent Loop Transcript</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #101418;
      --muted: #58616d;
      --line: #d8dee6;
      --panel: #f7f9fb;
      --accent: #0f766e;
      --warn: #b45309;
      --stop: #991b1b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #ffffff;
    }
    main {
      width: min(1080px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 40px 0 56px;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 34px;
      line-height: 1.1;
      margin: 0 0 12px;
      letter-spacing: 0;
    }
    .lede {
      max-width: 820px;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.55;
      margin: 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 24px 0;
    }
    .summary div, .checkpoint {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
    }
    .summary div {
      padding: 14px 16px;
    }
    .summary span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 6px;
    }
    .summary strong {
      font-size: 18px;
    }
    .checkpoint {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 16px;
      padding: 18px;
      margin-bottom: 14px;
    }
    .index {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      background: var(--accent);
      color: white;
      display: grid;
      place-items: center;
      font-weight: 700;
    }
    .eyebrow {
      margin: 0 0 4px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 21px;
      line-height: 1.25;
      letter-spacing: 0;
      text-transform: capitalize;
    }
    .checkpoint p {
      margin: 0 0 14px;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 0;
    }
    dt {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 4px;
    }
    dd {
      margin: 0;
      font-weight: 650;
      overflow-wrap: anywhere;
    }
    .boundary {
      margin-top: 24px;
      padding: 16px;
      border-left: 4px solid var(--stop);
      background: #fff7ed;
      color: #4b1d08;
    }
    @media (max-width: 760px) {
      main { width: min(100vw - 24px, 1080px); padding-top: 28px; }
      h1 { font-size: 28px; }
      .summary, dl { grid-template-columns: 1fr; }
      .checkpoint { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>OpenClaw-Style Agent Loop Transcript</h1>
      <p class="lede">A generic computer-use runtime plans local actions, requests a Neura preflight route, and pauses before execution unless the route is ready.</p>
    </header>
    <section class="summary" aria-label="Transcript summary">
      <div><span>Mode</span><strong>${escapeHtml(report.mode)}</strong></div>
      <div><span>Planned actions</span><strong>${report.loop.planned_actions}</strong></div>
      <div><span>Execution attempted</span><strong>${escapeHtml(report.loop.execution_attempted)}</strong></div>
    </section>
    <section aria-label="Checkpoints">
      ${cards}
    </section>
    <section class="boundary">
      <strong>Boundary:</strong> not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership. Neura does not execute downstream actions or expose private payloads.
    </section>
  </main>
</body>
</html>`;
}

async function writeTranscript(report) {
  const outDir = resolve(argValue("out") ?? defaultOutDir);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "transcript.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(outDir, "transcript.md"), renderMarkdown(report));
  await writeFile(join(outDir, "transcript.html"), renderHtml(report));
  return outDir;
}

const transcriptDir = await writeTranscript(output);
output.artifacts = {
  directory: transcriptDir,
  html: join(transcriptDir, "transcript.html"),
  markdown: join(transcriptDir, "transcript.md"),
  json: join(transcriptDir, "transcript.json"),
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("Generic computer-use agent loop with Neura preflight receipts");
  console.log(`Mode: ${output.mode}`);
  for (const checkpoint of checkpoints) {
    console.log("");
    console.log(`${checkpoint.action_id}`);
    console.log(`Action: ${checkpoint.action_type}`);
    console.log(`Route: ${checkpoint.route}`);
    console.log(`Loop state: ${checkpoint.loop_state}`);
    console.log(`Execution attempted: ${checkpoint.execution_attempted}`);
  }
  console.log("");
  console.log("The loop pauses before execution unless the route is ready.");
  console.log(`Transcript: ${output.artifacts.html}`);
}
