#!/usr/bin/env node

import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginRoot = join(repoRoot, "examples/openclaw/preflight-adapter");
const canonicalNpmPackage = "@neurarelay/openclaw-preflight-adapter";
const founderClawHubPackage = "@rpelevin/neura-relay-preflight-adapter";
const packageVersion = "0.1.1";
const failures = [];
const steps = [];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

function tail(text, max = 1000) {
  const trimmed = (text ?? "").trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(-max);
}

function parseJson(label, text) {
  try {
    return JSON.parse(text.trim());
  } catch (error) {
    failures.push(`${label}_json_parse_failed_${error.message}`);
    return null;
  }
}

function step(id, command, args, options = {}) {
  const result = run(command, args, options);
  const payload = options.expectJson && result.status === 0 ? parseJson(id, result.stdout) : null;
  const ok = result.status === 0 && (!options.expectJson || payload !== null);
  steps.push({
    id,
    ok,
    status: result.status,
    command: [command, ...args].join(" "),
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr),
  });
  if (!ok) failures.push(`${id}_failed_${tail(result.stderr || result.stdout, 500)}`);
  return { ok, result, payload };
}

function readJson(path) {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
}

function git(args) {
  const result = run("git", args);
  return result.status === 0 ? result.stdout.trim() : "";
}

function requireNode() {
  const required = [22, 14, 0];
  const current = process.versions.node.split(".").map(Number);
  const ok =
    current[0] > required[0] ||
    (current[0] === required[0] &&
      (current[1] > required[1] ||
        (current[1] === required[1] && current[2] >= required[2])));
  if (!ok) failures.push(`node_${process.versions.node}_below_22_14_0`);
}

requireNode();

const adapterPackage = readJson("examples/openclaw/preflight-adapter/package.json");
if (adapterPackage.name !== canonicalNpmPackage) failures.push("canonical_npm_package_name_drifted");
if (adapterPackage.version !== packageVersion) failures.push("canonical_package_version_drifted");
if (adapterPackage.neura?.officialOpenClawOrClawHubClaim !== false) {
  failures.push("claim_boundary_missing");
}

const commit = git(["rev-parse", "HEAD"]);
const shortCommit = git(["rev-parse", "--short=12", "HEAD"]);
const packDir = mkdtempSync(join(tmpdir(), "neura-founder-clawhub-pack-"));
const founderPackageRoot = mkdtempSync(join(tmpdir(), "neura-founder-clawhub-package-"));
cpSync(pluginRoot, founderPackageRoot, { recursive: true });
const founderPackageJsonPath = join(founderPackageRoot, "package.json");
const founderPackageJson = JSON.parse(readFileSync(founderPackageJsonPath, "utf8"));
founderPackageJson.name = founderClawHubPackage;
founderPackageJson.openclaw.install.npmSpec = `${founderClawHubPackage}@${packageVersion}`;
founderPackageJson.neura = {
  ...founderPackageJson.neura,
  canonicalNpmPackage: `${canonicalNpmPackage}@${packageVersion}`,
  canonicalPublisherNamespaceRequest: "openclaw/clawhub#2190",
};
writeFileSync(founderPackageJsonPath, `${JSON.stringify(founderPackageJson, null, 2)}\n`);

const pack = step(
  "npm_pack_founder_clawhub_adapter",
  "npm",
  ["pack", founderPackageRoot, "--pack-destination", packDir, "--json"],
  { expectJson: true },
);
const tarballName = pack.payload?.[0]?.filename;
const tarballPath = tarballName ? join(packDir, tarballName) : null;
if (pack.payload?.[0]?.name !== founderClawHubPackage) {
  failures.push(`founder_pack_name_expected_${founderClawHubPackage}_got_${pack.payload?.[0]?.name}`);
}

const runtimeRoot = mkdtempSync(join(tmpdir(), "neura-founder-clawhub-runtime-"));
const workRoot = mkdtempSync(join(tmpdir(), "neura-founder-clawhub-work-"));
const install = step(
  "clawhub_local_cli_install",
  "npm",
  ["install", "--prefix", runtimeRoot, "--ignore-scripts", "clawhub@0.15.0"],
);

let dryRun = { ok: false, payload: null };
if (tarballPath && install.ok) {
  const clawhubCli = join(runtimeRoot, "node_modules/clawhub/bin/clawdhub.js");
  dryRun = step(
    "founder_clawhub_publish_dry_run",
    process.execPath,
    [
      clawhubCli,
      "--workdir",
      workRoot,
      "--no-input",
      "package",
      "publish",
      tarballPath,
      "--family",
      "code-plugin",
      "--owner",
      "rpelevin",
      "--name",
      founderClawHubPackage,
      "--display-name",
      "Neura Relay Preflight Adapter",
      "--version",
      packageVersion,
      "--tags",
      "stable",
      "--source-repo",
      "neurarelay/relay-action-card",
      "--source-commit",
      commit,
      "--source-ref",
      "main",
      "--source-path",
      "examples/openclaw/preflight-adapter",
      "--dry-run",
      "--json",
    ],
    { expectJson: true },
  );
}

const expectedDryRun = {
  source: "github:neurarelay/relay-action-card@main:examples/openclaw/preflight-adapter",
  name: founderClawHubPackage,
  displayName: "Neura Relay Preflight Adapter",
  family: "code-plugin",
  version: packageVersion,
  commit,
};

if (dryRun.payload) {
  for (const [key, value] of Object.entries(expectedDryRun)) {
    if (dryRun.payload[key] !== value) failures.push(`dry_run_${key}_expected_${value}_got_${dryRun.payload[key]}`);
  }
  if (dryRun.payload.files !== 6) failures.push(`dry_run_files_expected_6_got_${dryRun.payload.files}`);
  if (!Number.isFinite(dryRun.payload.totalBytes) || dryRun.payload.totalBytes <= 0) {
    failures.push("dry_run_total_bytes_invalid");
  }
}

const report = {
  ok: failures.length === 0,
  verifier: "openclaw-founder-clawhub-publisher",
  date: new Date().toISOString(),
  node: process.versions.node,
  git: {
    branch: git(["branch", "--show-current"]),
    commit,
    short_commit: shortCommit,
    status_short: git(["status", "--short"]),
  },
  canonical_npm_package: `${canonicalNpmPackage}@${packageVersion}`,
  founder_clawhub_package: founderClawHubPackage,
  dry_run: dryRun.payload,
  exact_dry_run_command: [
    "clawhub",
    "package",
    "publish",
    "<packed-adapter.tgz>",
    "--family",
    "code-plugin",
    "--owner",
    "rpelevin",
    "--name",
    founderClawHubPackage,
    "--display-name",
    "\"Neura Relay Preflight Adapter\"",
    "--version",
    packageVersion,
    "--tags",
    "stable",
    "--source-repo",
    "neurarelay/relay-action-card",
    "--source-commit",
    commit,
    "--source-ref",
    "main",
    "--source-path",
    "examples/openclaw/preflight-adapter",
    "--dry-run",
    "--json",
  ].join(" "),
  boundaries: {
    dry_run_only: true,
    live_publish_requires_roman_exact_approval: true,
    canonical_neurarelay_namespace_request_remains_open: true,
    founder_tarball_package_json_name_matches_clawhub_package: true,
    official_openclaw_or_clawhub_claim: false,
    downstream_execution_by_neura: false,
    public_token_or_key_issuance: false,
  },
  steps,
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) process.exit(1);
