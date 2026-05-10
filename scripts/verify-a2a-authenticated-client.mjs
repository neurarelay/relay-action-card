#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function read(path) {
  return readFile(join(repoRoot, path), "utf8");
}

function requireIncludes(label, source, phrase) {
  if (!source.includes(phrase)) {
    failures.push(`${label}_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const file of [
  "examples/a2a/README.md",
  "examples/a2a/resolve-action-card-a2a.mjs",
  "examples/sdk/README.md",
  "examples/README.md",
  "README.md",
]) {
  if (!existsSync(join(repoRoot, file))) {
    failures.push(`missing_${file}`);
  }
}

const readme = await read("README.md");
const examplesReadme = await read("examples/README.md");
const a2aReadme = await read("examples/a2a/README.md");
const sdkReadme = await read("examples/sdk/README.md");
const a2aExample = await read("examples/a2a/resolve-action-card-a2a.mjs");
const packageJson = JSON.parse(await read("package.json"));

for (const phrase of [
  "A2A Protected Client Proof",
  "examples/a2a",
  "npm run example:a2a -- --agent-card-only",
  "RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json",
  "public Agent Card",
  "protected `/a2a`",
  "no public A2A token issuance",
]) {
  requireIncludes("top_readme", readme, phrase);
}

for (const phrase of [
  "A2A protected proof",
  "a2a",
  "A2A client -> public Agent Card -> protected /a2a message/send -> Decision Receipt task",
  "npm run example:a2a -- --agent-card-only",
]) {
  requireIncludes("examples_readme", examplesReadme, phrase);
}

for (const phrase of [
  "A2A Protected Client Proof",
  "https://www.neurarelay.com/.well-known/agent-card.json",
  "RELAY_A2A_ACCESS_TOKEN",
  "Decision Receipt id",
  "public A2A token issuance",
  "A2A directory listing",
  "downstream execution by Neura",
]) {
  requireIncludes("a2a_readme", a2aReadme, phrase);
}

for (const phrase of [
  "relay.a2a.getAgentCard()",
  "relay.a2a.sendActionCard(actionCard)",
  "protected A2A `message/send`",
]) {
  requireIncludes("sdk_readme", sdkReadme, phrase);
}

for (const phrase of [
  'await import("@neurarelay/sdk")',
  "RELAY_A2A_ACCESS_TOKEN",
  "relay.a2a.getAgentCard()",
  "relay.a2a.sendActionCard",
  "Authorization",
  "message/send",
  "private_payload_returned",
  "developer_owned_not_performed_by_relay",
  "public_a2a_token_issuance: false",
]) {
  requireIncludes("a2a_example", a2aExample, phrase);
}

if (packageJson.scripts?.["example:a2a"] !== "node examples/a2a/resolve-action-card-a2a.mjs") {
  failures.push("package_json_missing_example_a2a");
}

if (packageJson.scripts?.["verify:a2a-authenticated-client"] !== "node scripts/verify-a2a-authenticated-client.mjs") {
  failures.push("package_json_missing_verify_a2a_authenticated_client");
}

const discovery = spawnSync("npm", ["run", "example:a2a", "--", "--agent-card-only"], {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    RELAY_A2A_ACCESS_TOKEN: "",
    NEURA_RELAY_INTERNAL_ACCESS_KEY: "",
  },
});

if (discovery.status !== 0) {
  failures.push(`agent_card_only_failed_${discovery.status}_${discovery.stderr}`);
} else {
  const output = JSON.parse(discovery.stdout.slice(discovery.stdout.indexOf("{")));

  if (output.ok !== true) failures.push("agent_card_only_not_ok");
  if (output.agent_card?.name !== "Neura Relay") failures.push("agent_card_wrong_name");
  if (output.agent_card?.interface_url !== "https://www.neurarelay.com/a2a") {
    failures.push("agent_card_wrong_interface_url");
  }
  if (!output.agent_card?.skill_ids?.includes("resolve_action_card")) {
    failures.push("agent_card_missing_resolve_action_card");
  }
  if (output.boundary?.protected_execution !== true) {
    failures.push("agent_card_missing_protected_execution_boundary");
  }
  if (output.boundary?.public_a2a_token_issuance !== false) {
    failures.push("agent_card_must_not_claim_public_a2a_token_issuance");
  }
}

const protectedProofToken =
  process.env.RELAY_A2A_ACCESS_TOKEN ?? process.env.NEURA_RELAY_INTERNAL_ACCESS_KEY ?? "";

let protectedProof = { skipped: true, reason: "missing_RELAY_A2A_ACCESS_TOKEN" };

if (protectedProofToken) {
  const protectedRun = spawnSync("npm", ["run", "example:a2a", "--", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      RELAY_A2A_ACCESS_TOKEN: protectedProofToken,
    },
  });

  if (protectedRun.status !== 0) {
    failures.push(`protected_a2a_failed_${protectedRun.status}_${protectedRun.stderr}`);
  } else {
    const output = JSON.parse(protectedRun.stdout.slice(protectedRun.stdout.indexOf("{")));

    protectedProof = {
      skipped: false,
      decision: output.decision_receipt?.decision,
      trace_ref: output.decision_receipt?.trace_ref,
      transaction_ref: output.decision_receipt?.transaction_ref,
      task_state: output.a2a?.task_state,
    };

    if (output.ok !== true) failures.push("protected_a2a_not_ok");
    if (output.a2a?.task_kind !== "task") failures.push("protected_a2a_wrong_task_kind");
    if (output.a2a?.task_state !== "completed") failures.push("protected_a2a_not_completed");
    if (!output.decision_receipt?.receipt_id) failures.push("protected_a2a_missing_receipt");
    if (!output.decision_receipt?.trace_ref?.startsWith("trace_ref_")) {
      failures.push("protected_a2a_missing_trace_ref");
    }
    if (!output.decision_receipt?.transaction_ref?.startsWith("relay_txn_")) {
      failures.push("protected_a2a_missing_transaction_ref");
    }
    if (output.boundary?.private_payload_returned !== false) {
      failures.push("protected_a2a_private_payload_returned");
    }
    if (output.boundary?.downstream_execution !== "developer_owned_not_performed_by_relay") {
      failures.push("protected_a2a_wrong_downstream_boundary");
    }
  }
}

if (failures.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        verifier: "a2a-authenticated-client",
        protectedProof,
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
      verifier: "a2a-authenticated-client",
      publicDiscovery: true,
      protectedProof,
      boundaries: [
        "public Agent Card discovery only",
        "protected A2A message/send",
        "no public A2A token issuance",
        "no downstream execution",
        "no private payload exposure",
      ],
    },
    null,
    2,
  ),
);
