#!/usr/bin/env node

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginRoot = join(repoRoot, "examples/openclaw/preflight-adapter");
const failures = [];
const packageName = "@neurarelay/openclaw-preflight-adapter";
const packageVersion = "0.1.2";
const pluginId = "neurarelay-openclaw-preflight-adapter";

const requiredNode = [22, 14, 0];
const currentNode = process.versions.node.split(".").map((part) => Number(part));
const nodeOk =
  currentNode[0] > requiredNode[0] ||
  (currentNode[0] === requiredNode[0] &&
    (currentNode[1] > requiredNode[1] ||
      (currentNode[1] === requiredNode[1] && currentNode[2] >= requiredNode[2])));

if (!nodeOk) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        verifier: "openclaw-runtime-approval",
        reason: "node_22_14_or_newer_required",
        current_node: process.versions.node,
        hint: "Run `nvm use` in this repo or use Node 22.14+ because OpenClaw 2026.5.7 requires it.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(readFileSync(join(repoRoot, file), "utf8"));
}

function read(file) {
  return readFileSync(join(repoRoot, file), "utf8");
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

function parseJsonOutput(label, output) {
  try {
    return JSON.parse(output);
  } catch (error) {
    failures.push(`${label}_not_json_${error.message}`);
    return null;
  }
}

function failIf(status, label, result) {
  if (status !== 0) failures.push(`${label}_failed_${result.stderr || result.stdout}`);
}

function isolatedEnv(root) {
  return {
    HOME: join(root, "home"),
    XDG_CONFIG_HOME: join(root, "xdg-config"),
    XDG_DATA_HOME: join(root, "xdg-data"),
    XDG_CACHE_HOME: join(root, "xdg-cache"),
  };
}

const rootPackage = readJson("package.json");
const nvmrc = read(".nvmrc").trim();
if (rootPackage.engines?.node !== ">=22.14.0") failures.push("root_package_node_engine");
if (nvmrc !== "24") failures.push("nvmrc_must_pin_node_24");

const pluginPackage = readJson("examples/openclaw/preflight-adapter/package.json");
if (pluginPackage.name !== packageName) {
  failures.push("plugin_package_wrong_name");
}
if (pluginPackage.version !== packageVersion) failures.push("plugin_package_wrong_version");
if (pluginPackage.engines?.node !== ">=22.14.0") failures.push("plugin_package_node_engine");

const approvalDoc = read("docs/openclaw-runtime-verification-and-publish-approval.md");
for (const phrase of [
  `${packageName}@${packageVersion}`,
  "Use Node `24`",
  "registered tool: `neura_relay_preflight_action`",
  "ClawHub publish dry-run succeeded",
  "no canonical `@neurarelay` ClawHub publication has been performed",
  "Do not run this without Roman approval",
]) {
  if (!approvalDoc.includes(phrase)) failures.push(`approval_doc_missing_${phrase}`);
}

const tempRoot = mkdtempSync(join(tmpdir(), "neura-openclaw-runtime-"));
const openclawInstall = run("npm", [
  "install",
  "--prefix",
  join(tempRoot, "openclaw-runtime"),
  "--ignore-scripts",
  "openclaw@2026.5.7",
]);
failIf(openclawInstall.status, "openclaw_npm_install", openclawInstall);

const clawhubInstall = run("npm", [
  "install",
  "--prefix",
  join(tempRoot, "clawhub-runtime"),
  "--ignore-scripts",
  "clawhub@0.15.0",
]);
failIf(clawhubInstall.status, "clawhub_npm_install", clawhubInstall);

const openclawCli = join(tempRoot, "openclaw-runtime/node_modules/openclaw/openclaw.mjs");
const clawhubCli = join(tempRoot, "clawhub-runtime/node_modules/clawhub/bin/clawdhub.js");
const env = isolatedEnv(tempRoot);

if (failures.length === 0) {
  const version = run(process.execPath, [openclawCli, "--version"], { env });
  failIf(version.status, "openclaw_version", version);
  if (!version.stdout.includes("2026.5.7")) failures.push("openclaw_version_not_2026_5_7");

  const install = run(
    process.execPath,
    [
      openclawCli,
      "--profile",
      "neura-rc",
      "--log-level",
      "warn",
      "plugins",
      "install",
      "-l",
      pluginRoot,
    ],
    { env },
  );
  failIf(install.status, "openclaw_plugin_install", install);

  const inspect = run(
    process.execPath,
    [
      openclawCli,
      "--profile",
      "neura-rc",
      "--log-level",
      "warn",
      "plugins",
      "inspect",
      pluginId,
      "--json",
    ],
    { env },
  );
  failIf(inspect.status, "openclaw_inspect", inspect);
  const inspectJson = inspect.status === 0 ? parseJsonOutput("openclaw_inspect", inspect.stdout) : null;
  if (inspectJson?.plugin?.status !== "loaded") failures.push("openclaw_inspect_not_loaded");
  if (inspectJson?.plugin?.enabled !== true) failures.push("openclaw_inspect_not_enabled");

  const runtime = run(
    process.execPath,
    [
      openclawCli,
      "--profile",
      "neura-rc",
      "--log-level",
      "warn",
      "plugins",
      "inspect",
      pluginId,
      "--runtime",
      "--json",
    ],
    { env },
  );
  failIf(runtime.status, "openclaw_runtime_inspect", runtime);
  const runtimeJson =
    runtime.status === 0 ? parseJsonOutput("openclaw_runtime_inspect", runtime.stdout) : null;
  const toolNames = runtimeJson?.plugin?.toolNames ?? [];
  if (!toolNames.includes("neura_relay_preflight_action")) {
    failures.push("openclaw_runtime_missing_preflight_tool");
  }
  if (runtimeJson?.plugin?.imported !== true) failures.push("openclaw_runtime_not_imported");
  if ((runtimeJson?.diagnostics ?? []).length !== 0) failures.push("openclaw_runtime_diagnostics");

  const pack = run(process.execPath, [clawhubCli, "--workdir", join(tempRoot, "clawhub-work"), "--no-input", "package", "pack", pluginRoot, "--json"], {
    env,
  });
  failIf(pack.status, "clawhub_pack", pack);
  const packJson = pack.status === 0 ? parseJsonOutput("clawhub_pack", pack.stdout) : null;
  if (packJson?.name !== pluginPackage.name) failures.push("clawhub_pack_wrong_name");
  if (packJson?.version !== pluginPackage.version) failures.push("clawhub_pack_wrong_version");
  if (packJson?.files !== 6) failures.push("clawhub_pack_wrong_file_count");

  const dryRun = run(
    process.execPath,
    [
      clawhubCli,
      "--workdir",
      join(tempRoot, "clawhub-work"),
      "--no-input",
      "package",
      "publish",
      pluginRoot,
      "--family",
      "code-plugin",
      "--owner",
      "neurarelay",
      "--name",
      packageName,
      "--display-name",
      "Neura Relay Preflight Adapter",
      "--version",
      packageVersion,
      "--tags",
      "stable",
      "--source-repo",
      "neurarelay/relay-action-card",
      "--source-path",
      "examples/openclaw/preflight-adapter",
      "--dry-run",
      "--json",
    ],
    { env },
  );
  failIf(dryRun.status, "clawhub_publish_dry_run", dryRun);
  const dryRunJson =
    dryRun.status === 0 ? parseJsonOutput("clawhub_publish_dry_run", dryRun.stdout) : null;
  if (dryRunJson?.name !== pluginPackage.name) failures.push("clawhub_dry_run_wrong_name");
  if (dryRunJson?.family !== "code-plugin") failures.push("clawhub_dry_run_wrong_family");
  if (dryRunJson?.version !== pluginPackage.version) failures.push("clawhub_dry_run_wrong_version");
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-runtime-approval",
      node: process.versions.node,
      package: {
        name: pluginPackage.name,
        version: pluginPackage.version,
      },
      checks: {
        openclaw_version: "2026.5.7",
        openclaw_local_install: "isolated_profile",
        openclaw_runtime_tool: "neura_relay_preflight_action",
        clawhub_version: "0.15.0",
        clawhub_pack: "dry_run_local_tarball",
        clawhub_publish: "dry_run_only",
      },
      boundaries: {
        roman_approval_required_before_publication: true,
        official_openclaw_or_clawhub_claim: false,
        downstream_execution_by_neura: false,
        private_payload_exposure: false,
        public_token_or_key_issuance: false,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
