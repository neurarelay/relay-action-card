# MCP + ADK Authority Layer Proof v0.1

This local proof shows the pre-action authority pattern between agent orchestration and tool execution:

```text
ADK-style orchestration proposes an action
-> Neura Action Card
-> Relay Decision Receipt
-> receipt_ref / trace_ref
-> MCP/tool/runtime-owned execution route
```

MCP-style connectivity can expose tools. ADK-style orchestration can decide that a tool should be called. Neura adds the missing decision point before a consequential action becomes real.

This proof uses an ADK-style runner pattern and simulated MCP tool events. It does not import Google ADK, does not call an MCP server, and does not execute downstream actions.

## Run

```bash
npm run proof:mcp-adk-authority -- --dry-run --json
```

List or run one scenario:

```bash
npm run proof:mcp-adk-authority -- --list
npm run proof:mcp-adk-authority -- --dry-run --only=deployment-stop --json
```

Verify the proof packet:

```bash
npm run verify:mcp-adk-authority-proof
```

## Scenarios

`repo-search-proceed`
Proposed tool: `repo.search`
Decision: `proceed`
Runtime route: authorized for runtime-owned execution

`issue-comment-revise`
Proposed tool: `github.issue_comment.create`
Decision: `revise`
Runtime route: revision required before runtime tool call

`deployment-stop`
Proposed tool: `deployment.promote`
Decision: `stop`
Runtime route: blocked before runtime tool call

`package-publish-human-review`
Proposed tool: `npm.publish`
Decision: `human_review`
Runtime route: held for operator before runtime tool call

## Output Shape

Each result returns the same proof contract:

```json
{
  "adk_style_runner_event": {
    "event_type": "tool_call_proposed",
    "proposed_tool": "repo.search",
    "attribution": {
      "refs_only": true
    }
  },
  "action_card": {
    "proposed_action": "mcp_adk.repo_search",
    "refs_only": true
  },
  "decision_receipt": {
    "receipt_ref": "receipt_ref_demo_...",
    "trace_ref": "trace_ref_demo_...",
    "decision": "proceed",
    "authority_layer": "neura"
  },
  "mcp_tool_event_after_receipt": {
    "execution_route": "runtime_owned_after_neura_receipt",
    "attached_decision": "proceed",
    "tool_call_executed_in_dry_run": false,
    "neura_executed_tool_call": false,
    "attribution": {
      "refs_only": true
    }
  }
}
```

## Boundaries

This is a local proof packet:

- no downstream execution by Neura
- no private payload persistence
- no token or secret values
- no raw customer data
- no live ADK runtime dependency
- no live MCP server call
- no provider approval, listing, endorsement, validation, or partnership claim
- no IBM, Google, Anthropic, OpenAI, OpenClaw, ClawHub, A2A, CrewAI, or other provider claim
- no website, package registry, public GitHub, directory, submission, or distribution action

The product point is narrow: orchestration is not authority. A runner can propose an action, but a consequential tool call should carry a pre-action Decision Receipt before the developer-owned runtime executes.
