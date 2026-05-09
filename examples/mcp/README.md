# Neura Relay MCP Examples

Add Neura as the governed decision gate before your MCP-connected agent acts.

This folder is the optional MCP path. For the open public non-MCP example, start with `../core`.

```text
Action Card in.
Decision Receipt out.
Your agent keeps execution.
Your customer gets proof.
```

## What This Solves

MCP makes tool access easier. Neura makes consequential tool use governable before it happens.

Use these examples when your agent can reach real tools, records, messages, money workflows, deployments, or customer data and you need a pre-action record before the action becomes real.

For the full pattern, read `../../docs/mcp-tool-call-governance-walkthrough.md`.

## Current Access Boundary

The open public developer path is still `POST /api/resolve`.

The MCP endpoint is protected. There are two access lanes:

```bash
export NEURA_RELAY_MCP_ACCESS_TOKEN="workspace-sandbox-or-issued-private-token"
```

- signed-in Relay Workspace can issue a one-time sandbox MCP token for first proof
- production/private MCP access uses controlled beta token handoff and review
- Neura does not offer public production MCP token issuance

## Try Sandbox MCP First

Open Relay Workspace, activate sandbox MCP access, and copy the one-time token into `NEURA_RELAY_MCP_ACCESS_TOKEN`:

```text
https://www.neurarelay.com/developers/workspace
```

Sandbox access is limited, expires, stores only token hash/fingerprint/preview metadata, and does not create production Registry standing.

## Request Production/Private MCP Access

Run the public core example first, then request MCP access when you have a concrete MCP-capable runtime and a governed-action use case.

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml
```

Production/private beta access uses private token handoff and rotation/revocation, not public production token issuance. Read `../../docs/controlled-mcp-beta-access.md` before requesting access.

Production MCP use still needs Registry Agent Passport identity refs in the Action Card before Relay can validate identity, capability, version, and standing.

## Run The Direct MCP Client

List the five protected Neura tools:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --list-tools
```

Run the full proof sequence against the same Relay spine:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

Validate an Action Card:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=validate_action_card --json
```

Resolve an Action Card and receive Decision Receipt, trace, and transaction refs:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=resolve_action_card --json
```

Look up an Agent Passport with authority-standing context:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=lookup_agent_passport --action-card=examples/mcp/action-cards/registry-ready-evidence-capture.json --json
```

Fetch a receipt or trace after resolving:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=get_decision_receipt --receipt-id=decision_receipt_... --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=get_trace_replay --trace-ref=trace_ref_... --json
```

Try a different safe scenario:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --action-card=examples/mcp/action-cards/refund-review.json --json
```

Try the blocked high-risk scenario:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=resolve_action_card --action-card=examples/mcp/action-cards/blocked-funds-transfer.json --json
```

## Five MCP Tools

| Tool | What it proves |
| --- | --- |
| `validate_action_card` | Protocol shape validation before Relay review |
| `resolve_action_card` | Decision Receipt, transaction ref, trace ref, and no downstream execution |
| `get_decision_receipt` | Safe receipt lookup by receipt id or transaction ref |
| `get_trace_replay` | Redacted trace replay by trace ref |
| `lookup_agent_passport` | Registry identity, readiness, authority scope, and standing context |

## Scenarios

- `customer-reply.json`: govern a customer message before sending
- `crm-update.json`: govern a CRM record update before changing business state
- `refund-review.json`: govern a refund recommendation before money movement
- `deploy-change.json`: govern a production deployment request before release action
- `registry-ready-evidence-capture.json`: use a Registry-ready agent for Agent Passport and authority-standing lookup
- `blocked-funds-transfer.json`: show a high-risk action that should not proceed automatically

`agent-passport-authority-standing.example.json` shows the safe `lookup_agent_passport` response shape. It includes authority standing, scope, audit counts, and boundary flags without private Registry payloads.

The demo Action Cards include demo Agent Passport references. Production agents need Registry Agent Passports before Relay can validate identity, capability, version, and standing through MCP. Create production Agent Passports at [Neura Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew).

## OpenAI Responses Template

`openai-responses-remote-mcp.mjs` shows the remote MCP shape for the OpenAI Responses API:

- `server_url`: `https://www.neurarelay.com/mcp`
- `authorization`: `NEURA_RELAY_MCP_ACCESS_TOKEN`
- `allowed_tools`: all five Neura MCP tools
- `require_approval`: `always`

Run it only after setting both tokens:

```bash
OPENAI_API_KEY=... NEURA_RELAY_MCP_ACCESS_TOKEN=... node examples/mcp/openai-responses-remote-mcp.mjs
```

The default run verifies listing and approval posture. To approve the MCP tool call in the example run:

```bash
OPENAI_AUTO_APPROVE_MCP=true OPENAI_API_KEY=... NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:openai-mcp
```

Live OpenAI client verification is pending until an `OPENAI_API_KEY` is available in the verification environment. The production Neura MCP server and the direct MCP JSON-RPC client are verified separately.

## Anthropic Messages Template

`anthropic-messages-mcp.mjs` shows the Claude Messages MCP connector shape:

- `mcp_servers`: one protected Neura Relay server at `https://www.neurarelay.com/mcp`
- `authorization_token`: `NEURA_RELAY_MCP_ACCESS_TOKEN`
- `tools`: one `mcp_toolset` with only the five Neura tools enabled
- `anthropic-beta`: `mcp-client-2025-11-20`

Run it only after setting both tokens:

```bash
ANTHROPIC_API_KEY=... NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:anthropic-mcp
```

Inspect the exact Claude Messages request shape without secrets:

```bash
npm run example:anthropic-mcp-request
```

This is a Claude API MCP connector example, not an official Anthropic listing or partnership claim.

May 9 private live proof passed with a project `ANTHROPIC_API_KEY` and controlled Relay sandbox MCP token. Claude called `resolve_action_card` through protected Neura MCP and received a Decision Receipt plus trace ref while preserving no private payload return and no downstream execution. This does not create an Anthropic listing, approval, partnership, public production MCP token issuance, or public API-key issuance.

## Google ADK Template

`google-adk-remote-mcp.py` shows the Google ADK `McpToolset` shape for a remote Streamable HTTP MCP server with an Authorization header and a five-tool Neura allowlist.

Inspect the source-aligned config:

```bash
npm run example:google-adk-mcp
```

Live Google ADK verification is pending until a Google ADK runtime, model credentials, and controlled Neura MCP access are available in the verification environment. The production Neura MCP server and the direct MCP JSON-RPC client are verified separately.

## Microsoft Agent Framework / Foundry Template

`microsoft-agent-framework-mcp.py` shows the Microsoft Agent Framework `MCPStreamableHTTPTool` shape with authenticated `headers`, `allowed_tools`, and `approval_mode`, plus a Foundry remote MCP tool definition with `server_url`, `server_label`, `allowed_tools`, and `require_approval`.

Inspect the source-aligned config:

```bash
npm run example:microsoft-mcp
```

Live Microsoft Agent Framework / Foundry verification is pending until the Microsoft agent runtime, project connection or runtime header path, model credentials, and controlled Neura MCP access are available in the verification environment. The production Neura MCP server and the direct MCP JSON-RPC client are verified separately.

## Claude Code Template

`claude-code-neura.mcp.example.json` shows an HTTP MCP configuration for Claude Code:

```json
{
  "mcpServers": {
    "neura-relay": {
      "type": "http",
      "url": "${NEURA_RELAY_MCP_URL:-https://www.neurarelay.com/mcp}",
      "headers": {
        "Authorization": "Bearer ${NEURA_RELAY_MCP_ACCESS_TOKEN}"
      }
    }
  }
}
```

May 9 private live proof passed with local Claude Code and a controlled Relay sandbox MCP token. Claude Code called `resolve_action_card` through protected Neura MCP and received a Decision Receipt plus trace and transaction refs while preserving no private payload return and no downstream execution. This does not create an Anthropic listing, approval, partnership, public production MCP token issuance, or public API-key issuance.

## Verification

```bash
npm run verify:mcp-adoption-pack
```

The verifier checks the pack structure, claim boundaries, client templates, safe scenario Action Cards, and direct MCP client shape. When `NEURA_RELAY_MCP_ACCESS_TOKEN` is present, it also performs live auth rejection, exact tool-list, validation, resolution, receipt lookup, trace replay, Agent Passport lookup, and blocked-action checks through `/mcp`.

## Compatibility Matrix

See `compatibility-matrix.md`.

## Provider Runtime Paths

See `provider-runtime-paths.md` for the current rollout split across direct Neura MCP, OpenAI Responses, Claude Messages, Claude Code, Google ADK, and Microsoft Agent Framework / Foundry paths.

## Boundary

Neura Relay does not execute downstream actions. It returns the governed decision record your system can store before your system decides what to execute.
