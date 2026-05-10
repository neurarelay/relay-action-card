#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const packageName = "@neurarelay/sdk";
const packageVersion = "0.1.0-alpha.1";
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const a2aToken =
  process.env.RELAY_A2A_ACCESS_TOKEN ??
  process.env.NEURA_RELAY_INTERNAL_ACCESS_KEY ??
  "";
const failures = [];

function fail(label, detail) {
  failures.push({ label, detail });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
      ...(options.env ?? {}),
    },
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function parseJson(label, value) {
  try {
    return JSON.parse(value.slice(value.indexOf("{")));
  } catch (error) {
    fail(label, String(error));
    return null;
  }
}

const actionCard = JSON.parse(
  await readFile(new URL("../examples/core/action-card.json", import.meta.url), "utf8"),
);

const consumerDir = await mkdtemp(join(tmpdir(), "neura-sdk-alpha1-consumer-"));

try {
  await writeFile(
    join(consumerDir, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2),
  );
  await writeFile(join(consumerDir, "action-card.json"), JSON.stringify(actionCard, null, 2));
  await writeFile(
    join(consumerDir, "proof.mjs"),
    `
import { readFile } from "node:fs/promises";
import { createNeuraRelaySdk } from "${packageName}";
import { createRelayA2AClient } from "${packageName}/a2a";
import { createRelayMcpClient } from "${packageName}/mcp";
import { createResolveClient } from "${packageName}/resolve";

const relayBaseUrl = process.env.RELAY_BASE_URL ?? "${relayBaseUrl}";
const a2aToken = process.env.RELAY_A2A_ACCESS_TOKEN ?? "";
const actionCard = JSON.parse(await readFile(new URL("./action-card.json", import.meta.url), "utf8"));
const sdkPackage = JSON.parse(
  await readFile(new URL("./node_modules/${packageName}/package.json", import.meta.url), "utf8"),
);

const relay = createNeuraRelaySdk({ baseUrl: relayBaseUrl });
const resolveClient = createResolveClient({ baseUrl: relayBaseUrl });
const a2aClient = createRelayA2AClient({ baseUrl: relayBaseUrl });
const mcpClient = createRelayMcpClient({ baseUrl: relayBaseUrl });

if (typeof mcpClient.listTools !== "function" || typeof mcpClient.resolveActionCard !== "function") {
  throw new Error("MCP subpath export did not create expected helper methods");
}

const direct = await resolveClient.resolve({ action_card: actionCard });
const directSerialized = JSON.stringify(direct);
const receipt = direct.decision_receipt;

if (sdkPackage.version !== "${packageVersion}") {
  throw new Error("wrong SDK version: " + sdkPackage.version);
}

if (!receipt?.receipt_id || !receipt?.trace_ref || !direct.transaction_ledger?.transaction_ref) {
  throw new Error("direct SDK proof missing receipt, trace, or transaction ref");
}

if (
  directSerialized.includes('"private_payload_returned":true') ||
  directSerialized.includes('"private_payload_exposure":true') ||
  directSerialized.includes('"downstream_execution_performed":true')
) {
  throw new Error("direct SDK proof returned forbidden private payload or execution signal");
}

const agentCard = await a2aClient.getAgentCard();
if (agentCard.name !== "Neura Relay") {
  throw new Error("unexpected Agent Card name");
}

let protectedA2A = { skipped: true, reason: "missing_RELAY_A2A_ACCESS_TOKEN" };
if (a2aToken) {
  const protectedRelay = createNeuraRelaySdk({
    baseUrl: relayBaseUrl,
    headers: { Authorization: \`Bearer \${a2aToken}\` },
  });
  const task = await protectedRelay.a2a.sendActionCard(actionCard, {
    id: "sdk-alpha1-consumer-a2a-proof",
  });
  const artifactData = task.result?.artifacts
    ?.flatMap((artifact) => artifact.parts ?? [])
    ?.find((part) => part.kind === "data")
    ?.data;

  if (task.result?.kind !== "task" || task.result?.status?.state !== "completed") {
    throw new Error("protected A2A proof did not return a completed task");
  }

  if (!artifactData?.decision_receipt?.receipt_id || !artifactData.trace_ref || !artifactData.transaction_ref) {
    throw new Error("protected A2A proof missing receipt, trace, or transaction ref");
  }

  if (artifactData.downstream_execution !== "developer_owned_not_performed_by_relay") {
    throw new Error("protected A2A proof did not preserve developer-owned execution");
  }

  protectedA2A = {
    skipped: false,
    task_state: task.result.status.state,
    decision: artifactData.decision_receipt.decision,
    trace_ref: artifactData.trace_ref,
    transaction_ref: artifactData.transaction_ref,
    private_payload_returned: JSON.stringify(task).includes("PRIVATE_"),
    downstream_execution: artifactData.downstream_execution,
  };
}

console.log(JSON.stringify({
  ok: true,
  package: "${packageName}",
  version: sdkPackage.version,
  relay: relayBaseUrl,
  exports: {
    aggregate_client: typeof relay.resolve.resolve === "function",
    resolve_subpath: typeof resolveClient.resolve === "function",
    a2a_subpath: typeof a2aClient.getAgentCard === "function",
    mcp_subpath: typeof mcpClient.listTools === "function"
  },
  direct: {
    input_model: direct.input_model,
    decision: receipt.decision,
    receipt_id: receipt.receipt_id,
    trace_ref: receipt.trace_ref,
    transaction_ref: direct.transaction_ledger.transaction_ref,
    relay_boundary: receipt.relay_boundary,
    private_payload_returned: false,
    downstream_execution_performed: false
  },
  a2aDiscovery: {
    name: agentCard.name,
    version: agentCard.version,
    skill_ids: agentCard.skills?.map((skill) => skill.id) ?? []
  },
  protectedA2A,
  boundaries: {
    public_api_key_issuance: false,
    public_production_mcp_token_issuance: false,
    public_a2a_token_issuance: false,
    unprotected_a2a_execution: false,
    downstream_execution: false,
    private_payload_exposure: false
  }
}, null, 2));
`,
  );

  const install = run("npm", ["install", `${packageName}@${packageVersion}`, "--prefer-online"], {
    cwd: consumerDir,
  });
  if (!install.ok) {
    fail("npm_install", install.stderr || install.stdout);
  }

  let proof = null;
  if (install.ok) {
    const proofRun = run("node", ["proof.mjs"], {
      cwd: consumerDir,
      env: {
        RELAY_BASE_URL: relayBaseUrl,
        RELAY_A2A_ACCESS_TOKEN: a2aToken,
      },
    });

    if (!proofRun.ok) {
      fail("consumer_proof", proofRun.stderr || proofRun.stdout);
    } else {
      proof = parseJson("consumer_proof_json", proofRun.stdout);
    }
  }

  if (proof) {
    if (proof.version !== packageVersion) fail("sdk_version", proof.version);
    if (proof.exports?.aggregate_client !== true) {
      fail("aggregate_export", proof.exports?.aggregate_client);
    }
    if (proof.exports?.resolve_subpath !== true) {
      fail("resolve_subpath_export", proof.exports?.resolve_subpath);
    }
    if (proof.exports?.a2a_subpath !== true) {
      fail("a2a_subpath_export", proof.exports?.a2a_subpath);
    }
    if (proof.exports?.mcp_subpath !== true) {
      fail("mcp_subpath_export", proof.exports?.mcp_subpath);
    }
    if (proof.direct?.input_model !== "action_card_v0_1") {
      fail("direct_input_model", proof.direct?.input_model);
    }
    if (proof.direct?.relay_boundary !== "decision_gate_only_developer_keeps_execution") {
      fail("direct_boundary", proof.direct?.relay_boundary);
    }
    if (!proof.a2aDiscovery?.skill_ids?.includes("resolve_action_card")) {
      fail("a2a_discovery_skill", proof.a2aDiscovery?.skill_ids);
    }
    if (proof.direct?.private_payload_returned !== false) {
      fail("direct_private_payload", proof.direct?.private_payload_returned);
    }
    if (proof.direct?.downstream_execution_performed !== false) {
      fail("direct_downstream_execution", proof.direct?.downstream_execution_performed);
    }
    if (proof.protectedA2A?.skipped === false) {
      if (proof.protectedA2A.task_state !== "completed") {
        fail("protected_a2a_state", proof.protectedA2A.task_state);
      }
      if (proof.protectedA2A.private_payload_returned !== false) {
        fail("protected_a2a_private_payload", proof.protectedA2A.private_payload_returned);
      }
      if (
        proof.protectedA2A.downstream_execution !==
        "developer_owned_not_performed_by_relay"
      ) {
        fail("protected_a2a_downstream_execution", proof.protectedA2A.downstream_execution);
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          verifier: "sdk-alpha1-consumer",
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
        verifier: "sdk-alpha1-consumer",
        consumerDir,
        proof,
      },
      null,
      2,
    ),
  );
} finally {
  if (process.env.KEEP_NEURA_SDK_CONSUMER_PROOF !== "true") {
    await rm(consumerDir, { recursive: true, force: true });
  }
}
