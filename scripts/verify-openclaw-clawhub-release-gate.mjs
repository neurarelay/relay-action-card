#!/usr/bin/env node

import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginRoot = join(repoRoot, "examples/openclaw/preflight-adapter");
const packageName = "@neurarelay/openclaw-preflight-adapter";
const packageVersion = "0.1.2";
const pluginId = "neurarelay-openclaw-preflight-adapter";
const issueUrl = "https://github.com/openclaw/clawhub/issues/2190";
const failures = [];
const steps = [];

const forbiddenClaims = [
  "approved by OpenClaw",
  "partnered with OpenClaw",
  "listed on ClawHub",
  "official ClawHub listing",
  "official OpenClaw listing",
  "official OpenAI approval",
  "official Anthropic approval",
  "OpenAI partnership",
  "Anthropic partnership",
  "Claude partnership",
  "enables public API key issuance",
  "enables public production MCP token issuance",
  "enables public A2A token issuance",
  "enables unprotected A2A execution",
  "executes downstream actions by Neura",
  "full Authority Decision Engine is complete",
  "PRIVATE_KEY",
  "SECRET",
  "PASSWORD",
  "token_value",
  "private_payload_value",
  "rawMessageBody",
  "rawFileContents",
  "rawBrowserFormValues",
  "rawShellCommand",
];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

function tail(text, max = 1200) {
  const trimmed = (text ?? "").trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(-max);
}

function parseJson(label, stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch (directError) {
    const objectStart = text.indexOf("{");
    const arrayStart = text.indexOf("[");
    const startCandidates = [objectStart, arrayStart].filter((index) => index >= 0);
    const start = Math.min(...startCandidates);
    if (Number.isFinite(start)) {
      try {
        return JSON.parse(text.slice(start));
      } catch (nestedError) {
        failures.push(`${label}_json_parse_failed_${nestedError.message}`);
        return null;
      }
    }
    failures.push(`${label}_json_parse_failed_${directError.message}`);
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
    stdout_tail: options.captureOutput === false ? undefined : tail(result.stdout),
    stderr_tail: options.captureOutput === false ? undefined : tail(result.stderr),
    summary: options.summarize ? options.summarize(payload, result) : undefined,
  });
  if (!ok) {
    failures.push(`${id}_failed_${tail(result.stderr || result.stdout, 400)}`);
  }
  return { ok, result, payload };
}

function npmRun(script, extraArgs = [], options = {}) {
  const args = ["run", "--silent", script];
  if (extraArgs.length > 0) args.push("--", ...extraArgs);
  return step(`npm_${script.replaceAll(":", "_")}`, "npm", args, options);
}

function requireNode() {
  const required = [22, 14, 0];
  const current = process.versions.node.split(".").map((part) => Number(part));
  const ok =
    current[0] > required[0] ||
    (current[0] === required[0] &&
      (current[1] > required[1] ||
        (current[1] === required[1] && current[2] >= required[2])));
  if (!ok) {
    failures.push(
      `node_version_${process.versions.node}_below_22_14_0_run_nvm_use_before_release_gate`,
    );
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(join(repoRoot, file), "utf8"));
}

function gitValue(args) {
  const result = run("git", args);
  return result.status === 0 ? result.stdout.trim() : null;
}

function collectFiles(root, allowedExtensions, output = []) {
  for (const entry of readdirSync(root)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, allowedExtensions, output);
    } else if (allowedExtensions.has(entry) || allowedExtensions.has(entry.slice(entry.lastIndexOf(".")))) {
      output.push(fullPath);
    }
  }
  return output;
}

function scanForForbiddenClaims() {
  const files = [
    join(repoRoot, "README.md"),
    join(repoRoot, "CHANGELOG.md"),
    ...collectFiles(join(repoRoot, "docs"), new Set([".md"])),
    ...collectFiles(join(repoRoot, "examples/openclaw"), new Set([".md", ".json", ".mjs"])),
    ...collectFiles(join(repoRoot, "skills/openclaw"), new Set([".md", ".json", ".mjs"])),
  ];

  const findings = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const phrase of forbiddenClaims) {
      if (text.includes(phrase)) {
        findings.push({ file: relative(repoRoot, file), phrase });
      }
    }
  }
  if (findings.length > 0) failures.push("forbidden_claim_scan_failed");
  return findings;
}

function verifyPackageSurface() {
  const rootPackage = readJson("package.json");
  const adapterPackage = readJson("examples/openclaw/preflight-adapter/package.json");
  const manifest = readJson("examples/openclaw/preflight-adapter/openclaw.plugin.json");

  const checks = {
    root_script_present:
      rootPackage.scripts?.["verify:openclaw-clawhub-release"] ===
      "node scripts/verify-openclaw-clawhub-release-gate.mjs",
    package_name: adapterPackage.name === packageName,
    package_version: adapterPackage.version === packageVersion,
    package_publishable: adapterPackage.private === false,
    package_public_stable: adapterPackage.publishConfig?.access === "public" &&
      adapterPackage.publishConfig?.tag === "latest",
    package_runtime: adapterPackage.type === "module" &&
      adapterPackage.engines?.node === ">=22.14.0",
    package_sdk: adapterPackage.dependencies?.["@neurarelay/sdk"] === "0.1.1",
    package_openclaw_extension: adapterPackage.openclaw?.extensions?.includes("./index.mjs"),
    package_clawhub_tool_metadata: adapterPackage.openclaw?.tools?.some(
      (tool) => tool?.name === "neura_relay_preflight_action",
    ),
    package_install_spec:
      adapterPackage.openclaw?.install?.npmSpec === `${packageName}@${packageVersion}`,
    claim_boundary: adapterPackage.neura?.officialOpenClawOrClawHubClaim === false,
    roman_approval_gate: adapterPackage.neura?.officialSubmissionRequiresRomanApproval === true,
    no_downstream_execution: adapterPackage.neura?.downstreamExecutionByNeura === false,
    manifest_id: manifest.id === pluginId,
    manifest_version: manifest.version === packageVersion,
    manifest_tool: manifest.contracts?.tools?.includes("neura_relay_preflight_action"),
    manifest_clawhub_tool_metadata: manifest.tools?.some(
      (tool) => tool?.name === "neura_relay_preflight_action",
    ),
    manifest_kind: manifest.kind === "preflight-governance",
    manifest_runtime_free:
      !Object.hasOwn(manifest, "entry") &&
      !Object.hasOwn(manifest, "compat") &&
      !Object.hasOwn(manifest, "build") &&
      !Object.hasOwn(manifest, "neura"),
  };

  for (const [key, ok] of Object.entries(checks)) {
    if (!ok) failures.push(`package_surface_${key}`);
  }
  return { adapterPackage, manifest, checks };
}

function runExactClawHubDryRun() {
  const workRoot = mkdtempSync(join(tmpdir(), "neura-clawhub-release-gate-"));
  const runtimeRoot = join(workRoot, "clawhub-runtime");
  const install = step(
    "clawhub_local_cli_install",
    "npm",
    ["install", "--prefix", runtimeRoot, "--ignore-scripts", "clawhub@0.15.0"],
    {
      captureOutput: true,
    },
  );
  if (!install.ok) return { ok: false, payload: null };

  const clawhubCli = join(runtimeRoot, "node_modules/clawhub/bin/clawdhub.js");
  const clawhubArgs = ["--workdir", join(workRoot, "clawhub-work"), "--no-input"];
  const pack = step(
    "clawhub_local_package_pack",
    process.execPath,
    [clawhubCli, ...clawhubArgs, "package", "pack", pluginRoot, "--json"],
    {
      expectJson: true,
      summarize(payload) {
        return payload
          ? {
              name: payload.name,
              version: payload.version,
              files: payload.files,
              totalBytes: payload.totalBytes,
            }
          : null;
      },
    },
  );
  if (!pack.ok) return { ok: false, payload: null };

  const args = [
    ...clawhubArgs,
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
  ];
  return step("clawhub_exact_publish_dry_run", process.execPath, [clawhubCli, ...args], {
    expectJson: true,
    summarize(payload) {
      return payload
        ? {
            name: payload.name,
            version: payload.version,
            family: payload.family,
            displayName: payload.displayName,
            files: payload.files,
            totalBytes: payload.totalBytes,
            source: payload.source,
            commit: payload.commit,
          }
        : null;
    },
  });
}

requireNode();
const packageSurface = verifyPackageSurface();
const forbiddenFindings = scanForForbiddenClaims();

const preflightReadiness = npmRun("verify:openclaw-preflight-adapter", [], {
  expectJson: true,
  summarize: (payload) => ({
    files: payload?.files?.length,
    scripts: payload?.scripts?.length,
  }),
});
const pluginRc = npmRun("verify:openclaw-plugin-rc", [], {
  expectJson: true,
  summarize: (payload) => ({
    package: payload?.package?.name,
    version: payload?.package?.version,
    cleanConsumerInstall: payload?.package?.clean_consumer_install,
    clawhubDryRun: payload?.cli_verification?.clawhub_package_publish_dry_run,
  }),
});
const runtimeApproval = npmRun("verify:openclaw-runtime-approval", [], {
  expectJson: true,
  summarize: (payload) => ({
    openclawVersion: payload?.checks?.openclaw_version,
    clawhubVersion: payload?.checks?.clawhub_version,
    clawhubPublish: payload?.checks?.clawhub_publish,
  }),
});
const unitTests = npmRun("test:openclaw-preflight-adapter", [], {
  captureOutput: true,
});
const liveReceiptTest = npmRun("test:openclaw-preflight-adapter:e2e", [], {
  captureOutput: true,
});
const npmPack = npmRun("openclaw:plugin:pack:dry-run", [], {
  expectJson: true,
  summarize: (payload) => ({
    files: payload?.[0]?.files?.map((file) => file.path) ?? [],
    totalFiles: payload?.[0]?.files?.length,
    unpackedSize: payload?.[0]?.unpackedSize,
  }),
});
const dryRunReceipt = npmRun("openclaw:preflight:dry-run", ["--json"], {
  expectJson: true,
  summarize: (payload) => ({
    mode: payload?.mode,
    route: payload?.result?.route,
    relayCallSkipped: payload?.result?.relay_call_skipped,
    executionOwner: payload?.result?.execution_owner,
  }),
});
const liveReceipt = npmRun("openclaw:preflight:receipt", ["--json"], {
  expectJson: true,
  summarize: (payload) => ({
    mode: payload?.mode,
    decision: payload?.result?.receipt?.decision,
    route: payload?.result?.receipt?.route,
    receiptId: payload?.result?.receipt?.receipt_id,
    traceRef: payload?.result?.receipt?.trace_ref,
    executionOwner: payload?.result?.execution_owner,
  }),
});
const clawhubDryRun = runExactClawHubDryRun();

const git = {
  branch: gitValue(["branch", "--show-current"]),
  commit: gitValue(["rev-parse", "HEAD"]),
  short_commit: gitValue(["rev-parse", "--short=12", "HEAD"]),
  status_short: gitValue(["status", "--short"]),
};

const report = {
  ok: failures.length === 0,
  verifier: "openclaw-clawhub-release-gate",
  date: new Date().toISOString(),
  node: process.versions.node,
  git,
  external_gate: {
    clawhub_issue: issueUrl,
    state:
      "publisher login available; canonical @neurarelay package remains unpublished until Roman approves the exact 0.1.2 publish action",
    blocker_resolved:
      "0.1.2 uses a distinct plugin id so it does not collide with the existing @rpelevin fallback package",
  },
  package: {
    name: packageSurface.adapterPackage.name,
    version: packageSurface.adapterPackage.version,
    source_repo: "neurarelay/relay-action-card",
    source_path: relative(repoRoot, pluginRoot),
    family: "code-plugin",
    display_name: "Neura Relay Preflight Adapter",
    plugin_id: pluginId,
    runtime_tool: "neura_relay_preflight_action",
    npm_install: packageName,
    openclaw_install: `clawhub:${packageName}@${packageVersion}`,
  },
  proof_summary: {
    package_surface: packageSurface.checks,
    forbidden_claim_findings: forbiddenFindings,
    npm_pack_files: npmPack.payload?.[0]?.files?.map((file) => file.path) ?? [],
    clean_local_package_consumer_install: pluginRc.payload?.package?.clean_consumer_install === "passed",
    dry_run_receipt: dryRunReceipt.payload?.result
      ? {
          mode: dryRunReceipt.payload.result.mode,
          route: dryRunReceipt.payload.result.route,
          relay_call_skipped: dryRunReceipt.payload.result.relay_call_skipped,
          execution_owner: dryRunReceipt.payload.result.execution_owner,
        }
      : null,
    live_receipt: liveReceipt.payload?.result?.receipt
      ? {
          decision: liveReceipt.payload.result.receipt.decision,
          route: liveReceipt.payload.result.receipt.route,
          receipt_id: liveReceipt.payload.result.receipt.receipt_id,
          trace_ref: liveReceipt.payload.result.receipt.trace_ref,
          transaction_ref: liveReceipt.payload.result.receipt.transaction_ref,
          relay_boundary: liveReceipt.payload.result.receipt.relay_boundary,
          execution_owner: liveReceipt.payload.result.execution_owner,
        }
      : null,
    clawhub_publish_dry_run: clawhubDryRun.payload
      ? {
          name: clawhubDryRun.payload.name,
          displayName: clawhubDryRun.payload.displayName,
          family: clawhubDryRun.payload.family,
          version: clawhubDryRun.payload.version,
          source: clawhubDryRun.payload.source,
          commit: clawhubDryRun.payload.commit,
          files: clawhubDryRun.payload.files,
          totalBytes: clawhubDryRun.payload.totalBytes,
        }
      : null,
  },
  exact_dry_run_command: [
    "clawhub",
    "package",
    "publish",
    "examples/openclaw/preflight-adapter",
    "--family",
    "code-plugin",
    "--owner",
    "neurarelay",
    "--name",
    packageName,
    "--display-name",
    "\"Neura Relay Preflight Adapter\"",
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
  ].join(" "),
  boundaries: {
    roman_approval_required_before_publication: true,
    official_openclaw_or_clawhub_claim: false,
    downstream_execution_by_neura: false,
    private_payload_exposure: false,
    public_token_or_key_issuance: false,
    registry_auto_approval: false,
  },
  steps,
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) process.exit(1);
