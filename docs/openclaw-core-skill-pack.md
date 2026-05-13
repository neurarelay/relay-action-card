# OpenClaw Core Skill Pack

Status: local community skill pack; ClawHub publication requires separate Roman approval  
Date: 2026-05-13

The OpenClaw Core Skill Pack gives agents one entry point for using Neura Relay before consequential local actions execute.

```text
proposed action -> refs-only Action Card -> Relay Decision Receipt -> runtime-owned execution
```

This is not an official OpenClaw or ClawHub integration, approval, endorsement, or partnership. It is a public-safe community skill pack for developers who want a Decision Receipt before local autonomous actions execute.

## Current Package Truth

| Surface | Current truth |
| --- | --- |
| Canonical npm package | `@neurarelay/openclaw-preflight-adapter@0.1.0` |
| Current ClawHub community fallback | `@rpelevin/neura-relay-preflight-adapter@0.1.0` |
| Canonical publisher request | `openclaw/clawhub#2190` |
| Source repo | `neurarelay/relay-action-card` |
| Claim boundary | no official OpenClaw / ClawHub approval, endorsement, partnership, or canonical namespace claim |

Use the canonical npm package for JavaScript imports. Treat the ClawHub fallback as a community publication while the `@neurarelay` publisher namespace is pending.

## Contents

| Surface | Purpose |
| --- | --- |
| `skills/openclaw/neura-relay-core/SKILL.md` | Single core workflow for OpenClaw-style agents before local execution |
| `skills/openclaw/neura-relay-core/references/scenario-corpus.md` | Package/publisher, message, browser, and data-export scenario patterns |
| `examples/openclaw/preflight-adapter` | Runtime `beforeAction(preflightAction)` adapter |
| `docs/openclaw-copy-paste-agent-integration.md` | Copy-paste guard for local tool calls |
| `docs/openclaw-clawhub-submission-readiness.md` | Publication and namespace truth packet |

## What Agents Should Do

1. Classify the proposed action family.
2. Draft a refs-only Action Card or adapter `preflightAction`.
3. Reject raw payloads, secrets, command strings, customer data, and private file contents.
4. Route through Relay or the preflight adapter.
5. Interpret `proceed`, `human_review`, `revise`, `stop`, or `blocked`.
6. Preserve the receipt id, trace ref, transaction ref, and developer-owned next step.

Package and publisher actions require extra care: source repo, source commit, package identity, owner/publisher ref, artifact digest or pack ref, release intent, and claim-boundary refs should be present before execution.

## Verify

```bash
npm run verify:openclaw-core-skill-pack
```

This verifier checks the core skill, scenario corpus, package identity boundaries, and no-claim language. It does not publish to ClawHub or change any public distribution surface.
