#!/usr/bin/env node
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = new URL("..", import.meta.url);
const packagePath = new URL("package.json", repoRoot);
const lockPath = new URL("package-lock.json", repoRoot);

const rootPackage = JSON.parse(await readFile(packagePath, "utf8"));
const rootLock = JSON.parse(await readFile(lockPath, "utf8"));
const failures = [];

if (rootPackage.engines?.node !== ">=22.14.0") {
  failures.push("root_package_node_engine_missing_or_wrong");
}

if (rootLock.packages?.[""]?.engines?.node !== rootPackage.engines?.node) {
  failures.push("package_lock_root_engine_drift");
}

const tempDir = await mkdtemp(join(tmpdir(), "neura-openclaw-clean-install-"));

try {
  await writeFile(join(tempDir, "package.json"), JSON.stringify(rootPackage, null, 2) + "\n");
  await writeFile(join(tempDir, "package-lock.json"), JSON.stringify(rootLock, null, 2) + "\n");

  const beforeLock = await readFile(join(tempDir, "package-lock.json"), "utf8");
  const install = spawnSync("npm", ["install", "--ignore-scripts"], {
    cwd: tempDir,
    encoding: "utf8",
  });
  const afterLock = await readFile(join(tempDir, "package-lock.json"), "utf8");

  if (install.status !== 0) {
    failures.push("clean_npm_install_failed");
  }

  if (beforeLock !== afterLock) {
    failures.push("clean_npm_install_modified_package_lock");
  }

  const output = {
    ok: failures.length === 0,
    verifier: "openclaw-clean-consumer-install",
    node: process.version,
    npm_install: {
      status: install.status,
      package_lock_unchanged: beforeLock === afterLock,
      stdout_tail: install.stdout.trim().split("\n").slice(-8).join("\n"),
      stderr_tail: install.stderr.trim().split("\n").slice(-8).join("\n"),
    },
    checks: {
      root_node_engine: rootPackage.engines?.node ?? null,
      lock_root_node_engine: rootLock.packages?.[""]?.engines?.node ?? null,
    },
    boundaries: {
      official_openclaw_or_clawhub_claim: false,
      downstream_execution_by_neura: false,
      private_payload_exposure: false,
      public_token_or_key_issuance: false,
    },
    failures,
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 1);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
