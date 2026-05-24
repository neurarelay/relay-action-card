# Ecosystem Availability

Status: public developer proof map; no provider approval or listing claim  
Last updated: 2026-05-18

## Use Neura Today

Neura is the pre-action authority layer:

```text
proposed agent action -> Action Card -> Neura Relay -> Decision Receipt -> developer-owned execution
```

The ecosystem paths below make the same spine usable from different runtimes. Each path has a credential-free dry run and a controlled live route when access exists.

No provider approval, listing, endorsement, integration, or partnership is claimed by this document. Production MCP, A2A, and private Relay access remain controlled.

## Commands

Run the dry-run matrix first:

```bash
npm run proof:mcp -- --dry-run --json
npm run proof:openai -- --dry-run --json
npm run proof:claude -- --dry-run --json
npm run proof:a2a -- --agent-card-only --json
npm run proof:openclaw -- --dry-run --json
npm run proof:swarm-authority -- --dry-run --json
npm run proof:swarm-authority-placement -- --dry-run --json
```

Then lock the pack:

```bash
npm run verify:ecosystem-availability-pack
```

Every proof path carries safe `source/campaign/surface` attribution and keeps private payloads, tokens, file contents, browser form values, and downstream execution outside Neura.

## MCP Registry / Generic MCP Clients

Use when the host already speaks remote MCP.

```bash
npm run proof:mcp -- --dry-run --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

Usable today:

- remote MCP server URL: `https://www.neurarelay.com/mcp`
- transport: Streamable HTTP
- access: bearer token from Workspace sandbox or controlled private access
- tools: `validate_action_card`, `resolve_action_card`, `get_decision_receipt`, `get_trace_replay`, `lookup_agent_passport`

Boundary:

- public discovery and docs are allowed
- production/private MCP tokens are controlled
- no public production MCP token issuance

## OpenAI

Use when a developer wants Neura inside OpenAI Responses API or ChatGPT Developer Mode remote MCP.

```bash
npm run proof:openai -- --dry-run --json
OPENAI_API_KEY=... NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:openai-mcp
```

Usable today:

- OpenAI Responses API can call remote MCP servers with `server_url`
- ChatGPT Developer Mode can create an app from a remote MCP server when available to the workspace
- Neura requires controlled MCP access

Boundary:

- OpenAI review status is not approval
- no OpenAI listing, endorsement, integration, or partnership claim
- no downstream action is performed by Neura

## Anthropic / Claude

Use when a developer wants Neura through Claude Messages API MCP connector.

```bash
npm run proof:claude -- --dry-run --json
npm run example:anthropic-mcp-request
ANTHROPIC_API_KEY=... NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:anthropic-mcp
```

Usable today:

- Claude Messages API can describe a remote MCP server with `mcp_servers`
- the Neura request uses `authorization_token`
- enabled tools are scoped through the Claude MCP toolset

Boundary:

- Anthropic review status is not approval
- no Anthropic or Claude listing, endorsement, integration, or partnership claim
- no private payload is returned by Neura

## A2A

Use when a developer wants public agent discovery before controlled execution.

```bash
npm run proof:a2a -- --agent-card-only --json
RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json
```

Usable today:

- public Agent Card: `https://www.neurarelay.com/.well-known/agent-card.json`
- protected endpoint: `https://www.neurarelay.com/a2a`
- skill: `resolve_action_card`

Boundary:

- public Agent Card discovery only
- protected `/a2a` execution only
- no public A2A token issuance
- no A2A directory, catalog, approval, or partnership claim

## OpenClaw / ClawHub

Use when a local autonomous-agent runtime needs a pre-action receipt before execution.

```bash
npm run proof:openclaw -- --dry-run --json
npm run openclaw:proof
npm run openclaw:proof -- --live --source=openclaw_clawhub --campaign=ecosystem_availability_openclaw
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.4
```

Usable today:

- `@neurarelay/openclaw-preflight-adapter` is the canonical npm package path
- `clawhub:@neurarelay/openclaw-preflight-adapter` is the canonical ClawHub community package path at version `0.1.4`
- ClawHub runtime hook package: `@neurarelay/openclaw-preflight-adapter@0.1.4`
- ClawHub agent workflow skill: [`neura-openclaw-core@0.1.0`](https://clawhub.ai/neurarelay/neura-openclaw-core)
- ClawHub currently shows current version `v0.1.4`, `latest` and `stable` tags, visible README, and security audits pending
- local proof surfaces cover messages, files, browser submits, shell commands, workflow transitions, memory writes, data exports, and package publishing

Boundary:

- OpenClaw-style proof only
- no official OpenClaw or ClawHub listing, approval, endorsement, integration, or partnership claim
- developer/runtime owns execution

## SDK / GitHub

Use when a developer wants the direct Action Card path first.

No-signup first-proof preview:

```json
{
  "preview": "static_no_signup_first_proof_preview",
  "creates_production_receipt": false,
  "sample_proposed_agent_action": "Send a customer follow-up after checking the support thread refs.",
  "derived_action_card_summary": {
    "action_type": "message.send",
    "target_ref": "channel_message_ref:support_followup_2026_05_12",
    "evidence_refs": ["intent_ref_support_followup", "recipient_ref_support_followup"],
    "policy_refs": ["policy_ref_customer_reply_review"]
  },
  "decision_receipt_preview": {
    "receipt_ref": "receipt_ref_preview_first_proof_support_reply_001",
    "trace_ref": "trace_ref_preview_first_proof_support_reply_001",
    "route": "human_review",
    "posture": "receipt required before execution",
    "developer_owned_next_step": "Run npm run first-proof -- --json to create live receipt and trace refs before your runtime decides whether to proceed."
  },
  "boundaries": {
    "no_signup_required_for_preview": true,
    "private_payload_collected": false,
    "private_payload_stored": false,
    "downstream_execution_by_neura": false,
    "provider_listing_or_partnership_claim": false
  }
}
```

The preview is static and does not create a production receipt. The command below wraps that preview in a canonical first-proof completion artifact, so a cold evaluator can finish locally before using live Relay:

```bash
npm run first-proof -- --dry-run --json
```

The dry-run output includes:

```json
{
  "completion_artifact": {
    "artifact_type": "neura_first_proof_completion",
    "status": "dry_run_preview_completed",
    "metric_target": "package_reality_first_proof",
    "next_live_command": "npm run first-proof -- --json",
    "boundaries": {
      "private_payload_stored": false,
      "downstream_execution_by_neura": false,
      "public_token_issued": false
    }
  }
}
```

The live command below returns receipt and trace refs inside `completion_artifact.receipt_refs` and creates the measurable first-proof signal.

```bash
npm run first-proof -- --json
```

If the evaluator arrived through the Neura Agent Infrastructure first-publication path on LinkedIn, preserve that public route in the live proof:

```bash
npm run first-proof -- --source=linkedin --campaign=linkedin_first_publication --surface=developers_first_proof --json
```

Canonical live attribution:

```text
source=npm_github
campaign=package_reality_first_proof
surface=scripts/run-first-proof
artifact_type=neura_first_proof_completion
```

LinkedIn first-publication attribution:

```text
source=linkedin
campaign=linkedin_first_publication
surface=developers_first_proof
artifact_type=neura_first_proof_completion
```

Usable today:

- public direct Relay example
- stable `@neurarelay/sdk` receipt helper path
- first-proof command for package reality conversion
- shareable first-proof completion artifact

Boundary:

- downloads and clones are discovery signals, not adoption proof
- completion artifact, receipt refs, trace refs, transaction refs, and session refs are the proof

## Swarm Runtimes

Use when a multi-agent runtime proposes work before dispatching workers or tools.

```bash
npm run proof:swarm-authority -- --dry-run --json
npm run proof:swarm-authority-placement -- --dry-run --json
```

Placement pattern:

- before consensus proposal
- as proposal/result metadata
- before broadcast / dispatch
- before worker dispatch
- before MCP/tool invocation
- before worker tool execution
- before memory write / federation message

The dedicated placement proof is local and deterministic. It derives Action Cards from refs-only swarm runtime envelopes and returns `receipt_ref` / `trace_ref` records while the swarm runtime owns proceed, revise, stop, or human-review routing.

Boundary:

- local architecture proof only
- no Ruflo, Claude Flow, or other swarm-runtime integration, endorsement, validation, listing, or partnership claim
- no downstream action by Neura
