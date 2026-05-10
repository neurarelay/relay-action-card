#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const failures = [];

function fail(label, detail) {
  failures.push({ label, detail });
}

async function readText(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function requireIncludes(label, source, expected) {
  if (!source.includes(expected)) {
    fail(label, `expected ${expected}`);
  }
}

function requireNotIncludes(label, source, forbidden) {
  if (source.includes(forbidden)) {
    fail(label, `forbidden ${forbidden}`);
  }
}

function parseJson(label, value) {
  try {
    return JSON.parse(value.slice(value.indexOf("{")));
  } catch (error) {
    fail(label, String(error));
    return null;
  }
}

const packageJson = JSON.parse(await readText("package.json"));
const readme = await readText("README.md");
const sdkReadme = await readText("examples/sdk/README.md");
const script = await readText("examples/sdk/authority-routing-alpha4.mjs");
const consumerVerifier = await readText("scripts/verify-sdk-alpha4-consumer.mjs");

if (
  packageJson.scripts?.["example:sdk:authority-routing"] !==
  "node examples/sdk/authority-routing-alpha4.mjs"
) {
  fail("package_example_script", "missing example:sdk:authority-routing");
}

if (
  packageJson.scripts?.["verify:sdk-authority-routing"] !==
  "node scripts/verify-sdk-authority-routing.mjs"
) {
  fail("package_verify_script", "missing verify:sdk-authority-routing");
}

for (const [label, source] of [
  ["readme", readme],
  ["sdk_readme", sdkReadme],
]) {
  requireIncludes(label, source, "npm run example:sdk:authority-routing");
  requireIncludes(label, source, "hold_for_registry_backed_authority");
  requireIncludes(label, source, "developer_owned_execution");
  requireIncludes(label, source, "0.1.0-alpha.4");
  requireIncludes(label, source, "no public API");
}

requireIncludes("script source", script, "registry_reference_packet");
requireIncludes("script source", script, "developer_supplied_unverified");
requireIncludes("script route", script, "hold_for_registry_backed_authority");
requireIncludes("script boundary", script, "downstream_execution: false");
requireIncludes("consumer verifier", consumerVerifier, "publicAuthorityRouting");
requireIncludes("consumer verifier", consumerVerifier, "hold_for_registry_backed_authority");

for (const forbidden of [
  "public_api_key_issuance: true",
  "public_a2a_token_issuance: true",
  "downstream_execution: true",
  "registry_auto_approval: true",
]) {
  requireNotIncludes("forbidden script claim", script, forbidden);
}

const run = spawnSync(
  "node",
  ["examples/sdk/authority-routing-alpha4.mjs", "--json"],
  {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
  },
);

if (run.status !== 0) {
  fail("authority_routing_run", run.stderr || run.stdout);
}

const proof = run.status === 0 ? parseJson("authority_routing_json", run.stdout) : null;

if (proof) {
  if (proof.version !== "0.1.0-alpha.4") fail("sdk_version", proof.version);
  if (!Array.isArray(proof.results) || proof.results.length !== 4) {
    fail("result_count", proof.results?.length);
  }

  for (const result of proof.results ?? []) {
    if (result.developer_route !== result.expected_public_route) {
      fail(`${result.id}_route`, result);
    }
    if (!result.receipt_id || !result.trace_ref || !result.transaction_ref) {
      fail(`${result.id}_refs`, result);
    }
    if (result.authority_context?.refs_only !== true) {
      fail(`${result.id}_refs_only`, result.authority_context);
    }
    if (result.boundary?.developer_keeps_execution !== true) {
      fail(`${result.id}_developer_execution`, result.boundary);
    }
  }

  const permitted = proof.results.find(
    (result) => result.id === "delegated-crm-account-update",
  );
  if (
    permitted?.authority_context?.source !== "developer_supplied_unverified" ||
    permitted?.developer_route !== "hold_for_registry_backed_authority"
  ) {
    fail("permitted_demo_route", permitted);
  }

  for (const [key, value] of Object.entries(proof.boundaries ?? {})) {
    if (value !== false) fail(`boundary_${key}`, value);
  }
}

if (failures.length > 0) {
  console.error(
    JSON.stringify({ ok: false, verifier: "sdk-authority-routing", failures }, null, 2),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      verifier: "sdk-authority-routing",
      proof,
    },
    null,
    2,
  ),
);
