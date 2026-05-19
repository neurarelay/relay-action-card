# OpenClaw Core Skill Pack

Status: community skill pack published on ClawHub; further public action requires Roman approval
Date: 2026-05-19

The OpenClaw Core Skill Pack gives agents one entry point for using Neura Relay before consequential local actions execute.

```text
proposed action -> refs-only Action Card -> Relay Decision Receipt -> runtime-owned execution
```

This is not an official OpenClaw or ClawHub integration, approval, endorsement, or partnership. It is a public-safe community skill pack for developers who want a Decision Receipt before local autonomous actions execute.

## Current Package Truth

| Surface | Current truth |
| --- | --- |
| Canonical npm package | `@neurarelay/openclaw-preflight-adapter@0.1.1` |
| Canonical ClawHub community package | `@neurarelay/openclaw-preflight-adapter@0.1.4` |
| ClawHub agent workflow skill | `neura-openclaw-core@0.1.0` |
| Historical ClawHub community fallback | `@rpelevin/neura-relay-preflight-adapter@0.1.1` |
| ClawHub history thread | `openclaw/clawhub#2190` |
| Source repo | `neurarelay/relay-action-card` |
| Claim boundary | no official OpenClaw / ClawHub approval, listing, endorsement, partnership, or integration claim |

Use the canonical npm package for JavaScript imports. Use the canonical ClawHub community package for OpenClaw installs when ClawHub audits and local policy allow it. Use the ClawHub skill to teach an OpenClaw-style agent the refs-only Action Card / Decision Receipt workflow. The `@rpelevin` package remains a historical founder-publisher fallback only; it does not replace the canonical package and does not create an official OpenClaw / ClawHub claim.

## Contents

| Surface | Purpose |
| --- | --- |
| `skills/openclaw/neura-relay-core/SKILL.md` | Single core workflow for OpenClaw-style agents before local execution |
| `skills/openclaw/neura-relay-core/references/scenario-corpus.md` | Package/publisher, message, browser, and data-export scenario patterns |
| `examples/openclaw/preflight-adapter` | Runtime `beforeAction(preflightAction)` adapter |
| `docs/openclaw-copy-paste-agent-integration.md` | Copy-paste guard for local tool calls |
| `docs/openclaw-clawhub-submission-readiness.md` | Publication and namespace truth packet |

## ClawHub Skill

Roman approved the first skill publication on May 18, 2026:

| Field | Value |
| --- | --- |
| Skill name | `neura-openclaw-core` |
| Display name | `Neura Relay Core For OpenClaw-Style Agents` |
| Source path | `skills/openclaw/neura-relay-core` |
| Package relationship | complements the plugin; does not replace `@neurarelay/openclaw-preflight-adapter` |
| Purpose | teaches agents when to request a refs-only Action Card / Decision Receipt before messages, files, browser submits, shell commands, package/publisher changes, workflow state, memory writes, or data exports |
| Current status | published as `neura-openclaw-core@0.1.0` under owner `neurarelay` |
| Public URL | `https://clawhub.ai/neurarelay/neura-openclaw-core` |
| Tags | `latest=0.1.0`, `stable=0.1.0` |
| Last known scan state | moderation `CLEAN`; security `PENDING`; Publisher note saved and rescan started |

This is the second ClawHub surface: the plugin gives builders the runtime hook, and the skill gives agents the operating workflow. Do not publish another skill version, add dashboard copy, announce the skill, or claim official OpenClaw / ClawHub status without Roman approval of the exact action and public text.

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
