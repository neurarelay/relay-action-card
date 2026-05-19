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
const proofCommand = dryRun
  ? "npm run first-proof -- --dry-run --json"
  : "npm run first-proof -- --json";
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

function trackReceiptRef(track) {
  const receipt =
    track.output?.result?.receipt ??
    track.output?.decision_receipt ??
    track.output ??
    null;
  const transactionRef =
    receipt?.transaction_ref ??
    track.output?.transaction_ref ??
    track.output?.result?.receipt?.transaction_ref ??
    null;

  return {
    track: track.id,
    receipt_id: receipt?.receipt_id ?? null,
    trace_ref: receipt?.trace_ref ?? null,
    transaction_ref: transactionRef,
    route:
      receipt?.route ??
      receipt?.decision ??
      track.output?.result?.route ??
      track.output?.decision ??
      null,
  };
}

const receiptRefs = tracks
  .filter((track) => !track.skipped)
  .map(trackReceiptRef)
  .filter((ref) => ref.receipt_id || ref.trace_ref || ref.route);

const completionArtifact = {
  artifact_type: "neura_first_proof_completion",
  artifact_version: "0.1",
  status: dryRun ? "dry_run_preview_completed" : "live_first_proof_receipt_created",
  proof: "package-reality-first-proof",
  command: proofCommand,
  mode: dryRun ? "dry_run_no_production_receipts" : "live_public_relay_receipts",
  creates_production_receipt: !dryRun,
  attribution: {
    source: defaultAttribution.neura_source,
    campaign: defaultAttribution.neura_campaign,
    surface: defaultAttribution.neura_surface,
    session_ref: defaultAttribution.neura_session_ref,
    refs_only: true,
  },
  metric_target: "package_reality_first_proof",
  readback_hint:
    "Known-source live receipts should appear under source=npm_github, campaign=package_reality_first_proof, surface=scripts/run-first-proof.",
  preview_receipt:
    dryRun
      ? staticFirstProofPreview.decision_receipt_preview
      : null,
  receipt_refs: dryRun ? [] : receiptRefs,
  next_live_command: dryRun ? "npm run first-proof -- --json" : null,
  next_step: dryRun
    ? "You completed the local first-proof preview. Run the live command only when you want to create production receipt and trace refs."
    : "Share the receipt_id, trace_ref, transaction_ref, source, campaign, surface, and session_ref as the first-proof completion artifact.",
  shareable_summary: dryRun
    ? "Completed Neura local first-proof preview; no token, no private payload, no downstream execution."
    : "Created Neura live first-proof receipt refs with known source/campaign/surface attribution; developer-owned execution preserved.",
  boundaries: {
    private_payload_stored: false,
    downstream_execution_by_neura: false,
    public_token_issued: false,
    provider_listing_or_partnership_claim: false,
    registry_auto_approval: false,
  },
};

const output = {
  ok,
  proof: "package-reality-first-proof",
  mode: dryRun ? "dry_run_no_production_receipts" : "live_public_relay_receipts",
  command: proofCommand,
  completion_artifact: completionArtifact,
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
  console.log(`Completion: ${completionArtifact.status}`);
  console.log(
    `Attribution: source=${completionArtifact.attribution.source} campaign=${completionArtifact.attribution.campaign} surface=${completionArtifact.attribution.surface}`,
  );
  console.log(`Session: ${completionArtifact.attribution.session_ref}`);
  for (const track of output.proof_execution_metric.tracks) {
    console.log(
      `${track.id}: ${track.skipped ? "skipped" : track.route} ${
        track.receipt_id ? `(${track.receipt_id})` : ""
      }`,
    );
  }
  if (dryRun) {
    console.log(`Preview receipt: ${completionArtifact.preview_receipt.receipt_ref}`);
    console.log(`Next live command: ${completionArtifact.next_live_command}`);
  } else {
    for (const ref of completionArtifact.receipt_refs) {
      console.log(
        `Live receipt: ${ref.track} receipt=${ref.receipt_id ?? "n/a"} trace=${ref.trace_ref ?? "n/a"} transaction=${ref.transaction_ref ?? "n/a"}`,
      );
    }
  }
  console.log(`Shareable summary: ${completionArtifact.shareable_summary}`);
  console.log("Developer-owned execution preserved. Neura returned receipt refs only.");
}

if (!ok) process.exit(1);
