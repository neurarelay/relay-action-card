#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  attributionArgs,
  buildRelayAttribution,
  publicAttributionSummary,
} from "../examples/lib/activation-attribution.mjs";

const repoRoot = new URL("..", import.meta.url);
const argv = process.argv.slice(2);
const jsonOutput = argv.includes("--json");
const dryRun = argv.includes("--dry-run");
const proofAttributionContract = "source/campaign";
const sessionRef =
  argValue("session-ref") ??
  process.env.NEURA_SESSION_REF ??
  `first_proof_session:${randomUUID()}`;

const defaultAttribution = buildRelayAttribution({
  argv,
  env: {
    ...process.env,
    NEURA_SOURCE: process.env.NEURA_SOURCE ?? "npm_github",
    NEURA_CAMPAIGN: process.env.NEURA_CAMPAIGN ?? "package_reality_first_proof",
    NEURA_SURFACE: process.env.NEURA_SURFACE ?? "scripts/run-first-proof",
    NEURA_SESSION_REF: sessionRef,
  },
});

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function parseJson(stdout) {
  const trimmed = stdout.trim();
  const start = trimmed.search(/[{[]/);
  if (start < 0) throw new Error("command did not return JSON");
  return JSON.parse(trimmed.slice(start));
}

function inheritedArgs(surface) {
  const args = attributionArgs(argv);
  if (!args.some((arg) => arg.startsWith("--surface="))) {
    args.push(`--surface=${surface}`);
  }
  if (!args.some((arg) => arg.startsWith("--session-ref="))) {
    args.push(`--session-ref=${sessionRef}`);
  }
  if (!args.some((arg) => arg.startsWith("--source=")) && !process.env.NEURA_SOURCE) {
    args.push("--source=npm_github");
  }
  if (!args.some((arg) => arg.startsWith("--campaign=")) && !process.env.NEURA_CAMPAIGN) {
    args.push("--campaign=package_reality_first_proof");
  }
  return args;
}

function runTrack({ id, label, args, skipped = false, reason = null }) {
  if (skipped) {
    return { id, label, ok: true, skipped: true, reason };
  }

  if (!jsonOutput) console.log(`-> ${label}`);
  const startedAt = Date.now();
  const run = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NEURA_SESSION_REF: sessionRef,
    },
  });

  const track = {
    id,
    label,
    ok: run.status === 0,
    skipped: false,
    command: `node ${args.join(" ")}`,
    duration_ms: Date.now() - startedAt,
  };

  if (run.status === 0) {
    try {
      track.output = parseJson(run.stdout);
    } catch (error) {
      track.ok = false;
      track.parse_error = error.message;
      track.stdout = run.stdout.slice(-2000);
    }
  } else {
    track.status = run.status;
    track.stdout = run.stdout.slice(-2000);
    track.stderr = run.stderr.slice(-2000);
  }

  return track;
}

const tracks = [
  runTrack({
    id: "sdk_receipt",
    label: dryRun
      ? "SDK receipt proof skipped in dry-run mode"
      : "Run SDK receipt proof through public Relay",
    skipped: dryRun,
    reason:
      "dry-run mode avoids creating production receipts; run npm run first-proof for live SDK execution signal",
    args: [
      "examples/sdk/resolve-action-card-sdk.mjs",
      "--json",
      ...inheritedArgs("examples/sdk/resolve-action-card-sdk"),
    ],
  }),
  runTrack({
    id: "openclaw_preflight",
    label: dryRun
      ? "Dry-run OpenClaw preflight adapter"
      : "Run OpenClaw preflight proof through public Relay",
    args: [
      "examples/openclaw/run-preflight-adapter.mjs",
      ...(dryRun ? ["--dry-run"] : []),
      "--json",
      ...inheritedArgs("examples/openclaw/run-preflight-adapter"),
    ],
  }),
];

const ok = tracks.every((track) => track.ok);
const liveTracks = tracks.filter((track) => !track.skipped && !dryRun);
const staticFirstProofPreview = {
  preview: "static_no_signup_first_proof_preview",
  creates_production_receipt: false,
  sample_proposed_agent_action:
    "Send a customer follow-up after checking the support thread refs.",
  derived_action_card_summary: {
    action_type: "message.send",
    target_ref: "channel_message_ref:support_followup_2026_05_12",
    evidence_refs: ["intent_ref_support_followup", "recipient_ref_support_followup"],
    policy_refs: ["policy_ref_customer_reply_review"],
  },
  decision_receipt_preview: {
    receipt_ref: "receipt_ref_preview_first_proof_support_reply_001",
    trace_ref: "trace_ref_preview_first_proof_support_reply_001",
    route: "human_review",
    posture: "receipt required before execution",
    developer_owned_next_step:
      "Run npm run first-proof -- --json to create live receipt and trace refs before your runtime decides whether to proceed.",
  },
  boundaries: {
    no_signup_required_for_preview: true,
    private_payload_collected: false,
    private_payload_stored: false,
    downstream_execution_by_neura: false,
    provider_listing_or_partnership_claim: false,
  },
};

const output = {
  ok,
  proof: "package-reality-first-proof",
  mode: dryRun ? "dry_run_no_production_receipts" : "live_public_relay_receipts",
  command: dryRun ? "npm run first-proof -- --dry-run --json" : "npm run first-proof -- --json",
  static_no_signup_preview: staticFirstProofPreview,
  activation_attribution: publicAttributionSummary(defaultAttribution),
  session_ref_present: true,
  proof_execution_metric: {
    definition:
      "A proof execution means a developer runs this command and receives a Decision Receipt or dry-run route from one of the package tracks.",
    downloaded: "npm/GitHub fetch signal only",
    executed: dryRun ? 0 : liveTracks.length,
    tracks: tracks.map((track) => ({
      id: track.id,
      ok: track.ok,
      skipped: track.skipped,
      receipt_id:
        track.output?.receipt_id ??
        track.output?.result?.receipt?.receipt_id ??
        null,
      trace_ref:
        track.output?.trace_ref ??
        track.output?.result?.receipt?.trace_ref ??
        null,
      route:
        track.output?.decision ??
        track.output?.result?.receipt?.route ??
        track.output?.result?.route ??
        null,
    })),
  },
  tracks,
  boundaries: {
    public_api_key_issuance: false,
    public_production_mcp_token_issuance: false,
    public_a2a_token_issuance: false,
    downstream_execution_by_neura: false,
    private_payload_exposure: false,
    registry_auto_approval: false,
    provider_approval_claim: false,
    developer_owned_execution: true,
    refs_only: true,
  },
  next_step:
    `Use receipt_id and trace_ref as the real adoption signal; preserve ${proofAttributionContract} attribution and do not infer execution from npm downloads or GitHub clones.`,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log("");
  console.log(ok ? "Package reality first proof passed." : "Package reality first proof failed.");
  console.log(`Mode: ${output.mode}`);
  for (const track of output.proof_execution_metric.tracks) {
    console.log(
      `${track.id}: ${track.skipped ? "skipped" : track.route} ${
        track.receipt_id ? `(${track.receipt_id})` : ""
      }`,
    );
  }
  console.log("Developer-owned execution preserved. Neura returned receipt refs only.");
}

if (!ok) process.exit(1);
