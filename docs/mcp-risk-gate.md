# MCP Risk Gate

MCP Risk Gate is a synthetic dry-run proof pattern for pre-action authority around MCP-style tool-call intent.

It shows how a proposed tool call can become an Action Card, receive a Decision Receipt, and return a runtime instruction before the downstream runtime decides whether execution continues elsewhere.

## Core Path

```text
MCP tool-call intent -> Action Card -> Agent Action Gateway -> Decision Receipt -> runtime-owned execution or restraint
```

MCP makes tools reachable. Neura Relay makes consequential tool calls accountable before execution.

## What The Receipt Binds

Each Decision Receipt binds to the exact:

- MCP server;
- tool name;
- target;
- actor;
- params hash;
- policy refs;
- evidence refs;
- decision;
- trace ref.

If the server, tool, target, actor, or params hash changes, the prior receipt cannot authorize the new call.

## Decision And Runtime Map

| Decision | Runtime instruction |
| --- | --- |
| `allow` | `continue` |
| `revise` | `continue_with_revision` |
| `human_review` | `pause_for_human_review` |
| `stop` | `do_not_execute` |

## Run The Proof

```bash
npm run proof:mcp-risk-gate -- --dry-run --json
npm run verify:mcp-risk-gate
```

The proof covers six synthetic MCP-style calls:

| Scenario | Tool | Decision |
| --- | --- | --- |
| Low-risk order read | `get_order_status` | `allow` |
| Refund over threshold | `refund_order` | `human_review` |
| Discount above policy | `create_discount_code` | `revise` |
| Public site update | `publish_site_update` | `human_review` |
| Unsupported customer promise | `send_customer_email` | `stop` |
| Customer record export | `export_customer_records` | `stop` |

## Files

```text
examples/mcp-risk-gate/scenarios/*.json
examples/mcp-risk-gate/receipts/*.json
examples/mcp-risk-gate/run-proof.mjs
scripts/verify-mcp-risk-gate.mjs
```

## Boundary

This is a local dry-run proof with synthetic data only. It does not call a real MCP server, execute a real tool, mutate a real repo, account, payment, customer record, CRM, EHR, database, or website, or claim provider approval, marketplace listing, compliance certification, production integration, partnership, or downstream execution by Neura.
