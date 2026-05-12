# OpenClaw Action Receipt Pack v0.1

Status: local example pack  
Date: 2026-05-12

This pack shows how an OpenClaw-style autonomous computer-use agent can create a Neura Action Card before messages, file changes, browser submits, shell commands, or workflow changes execute.

```text
proposed local agent action -> Action Card -> Relay Decision Receipt -> user or runtime-owned execution
```

This is not an official OpenClaw, ClawHub, OpenAI, Codex, Anthropic, Claude, MCP, or A2A integration, listing, approval, or partnership. It is a public-safe examples pack for developers who want a Decision Receipt before an agent changes state.

## Pack Contents

| Surface | Purpose |
| --- | --- |
| `skills/openclaw/neura-action-card` | Draft a refs-only Action Card for an OpenClaw-style tool or channel action |
| `skills/openclaw/neura-before-send` | Review outbound message actions before channel delivery |
| `skills/openclaw/neura-file-change-review` | Review file edit and delete actions before local file changes |
| `skills/openclaw/neura-browser-action-review` | Review browser form submits and web state changes before dispatch |
| `skills/openclaw/neura-shell-command-review` | Review shell commands before local runtime execution |
| `examples/openclaw/action-cards` | Public-safe Action Card fixtures for common autonomous computer-use actions |

## Action Families

The first pack covers six action families:

| Family | Example file | Receipt need |
| --- | --- | --- |
| Outbound message | `send-message.json` | confirm recipient, intent, policy refs, and user approval posture |
| File edit | `edit-file.json` | confirm file ref, change request ref, and reversibility |
| File delete | `delete-file.json` | require backup/ref evidence and stronger review posture |
| Browser submit | `browser-submit.json` | confirm target form, user intent, and data refs before submit |
| Shell command | `shell-command.json` | review blast radius, environment, and command profile refs |
| Workflow state change | `workflow-state-change.json` | confirm authority, evidence, and state transition policy |

## How To Use

1. An agent prepares a proposed local action.
2. The matching skill drafts an Action Card using refs, not raw message bodies, file contents, form values, command strings, secrets, or customer data.
3. The developer or runtime sends the Action Card to Relay through the existing public receipt path.
4. Relay returns a Decision Receipt with decision, trace ref, transaction ref, Registry context where available, and Authority Decision Engine explanation when present.
5. The user, developer, or agent runtime decides whether to execute. Neura does not execute downstream actions.

Run the verifier:

```bash
npm run verify:openclaw-action-receipt-pack
```

## Boundaries

This pack:

- keeps every example refs-only
- does not embed secrets, token values, private payloads, raw message content, raw file content, raw browser form values, or raw shell commands
- does not issue public API keys, public production MCP tokens, or public A2A tokens
- does not enable unprotected A2A execution
- does not execute downstream actions by Neura
- does not create Registry auto-approval
- does not claim full Authority Decision Engine completion
- does not claim official OpenClaw, ClawHub, OpenAI, Codex, Anthropic, Claude, MCP, or A2A approval
