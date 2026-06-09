# Implementation SWAT Packet Library

Status: public developer artifact templates; no public action authorization

Implementation SWAT turns a concrete maintainer or buyer ask into a small, verifiable help packet:

```text
ask -> field map -> fixture -> verifier -> example -> exact approval packet -> public action only after approval
```

Use it when someone asks for implementation help around approval records, receipt shape, field mapping, examples, tests, verifier obligations, delegated authority, OTel mapping, or PR scope.

Do not use it for broad outreach, duplicate follow-ups, customer claims, provider claims, or speculative PRs.

## Fast Path

```bash
npm run verify:implementation-swat-pack
```

The verifier checks the manifest, templates, README routing, proof-map routing, and claim boundaries.

## Packet Types

| Packet | Template | Use when |
| --- | --- | --- |
| Field map | `examples/implementation-swat/templates/schema-field-map.md` | A maintainer asks how existing fields map to Action Card, Decision Receipt, MCP Approval Receipt, Agent I/O Event, Delegated Authority Receipt, or OTel attributes. |
| Acceptance tests | `examples/implementation-swat/templates/acceptance-test-fixtures.md` | A project needs concrete pass/fail behavior around changed args, stale approval, revoked authority, missing owner, or retry/supersession edge cases. |
| Receipt example | `examples/implementation-swat/templates/receipt-example.md` | A project asks for one no-private-payload JSON example. |
| PR scope | `examples/implementation-swat/templates/pr-scope.md` | A maintainer gives a module/file boundary and wants a narrow PR. |
| Maintainer reply approval | `examples/implementation-swat/templates/maintainer-reply-approval.md` | Roman needs exact public-copy approval before posting. |
| No-action readback | `examples/implementation-swat/templates/no-action-readback.md` | The strongest move is to hold because there is no concrete ask. |

## Lane Map

| Lane | Best SWAT packet | Verification spine |
| --- | --- | --- |
| MCP Approval Receipt | field map, acceptance tests, receipt example | `npm run verify:mcp-approval-receipt` |
| Agent I/O Event Envelope | field map, receipt example | `npm run verify:agent-io-event-envelope` |
| Agent Action Firewall | acceptance tests, receipt example | `npm run verify:agent-action-firewall` |
| Agentic Commerce Decision Receipt | receipt example, acceptance tests | `npm run verify:agentic-commerce-decision-receipt` |
| Delegated Authority | field map, acceptance tests | `npm run verify:delegated-authority-scenarios` |
| OTel / Agent Flight Recorder | field map, no-action readback until a concrete field ask appears | use Protocol OTel mapping in product repo |
| Shadow Agent Inventory / stop receipt | receipt example, acceptance tests, no-action readback until concrete audit ask appears | `npm run verify:shadow-agent-inventory-stop-receipt` |

## Minimum Useful Packet

Every SWAT packet should contain:

1. Concrete ask copied or summarized without inflating claims.
2. Field map or fixture table.
3. One safe example or test case.
4. Verification command.
5. Boundary statement.
6. Exact approval state.

If any of those are missing, hold.

## Boundaries

This library does not authorize:

- GitHub comments;
- PRs;
- issue edits;
- emails;
- DMs;
- LinkedIn actions;
- provider, standards-body, or maintainer claims;
- customer adoption claims;
- production token issuance;
- payment, commerce, tool, file, browser, workflow, or downstream execution;
- private payload storage.

Neura supplies receipt language, examples, tests, and verifier shape. The external project owns its runtime, data, policy, execution, and merge decisions.
