# Current Public Proof Map

Status: public developer proof map; no customer, provider, ecosystem, approval, listing, integration, endorsement, or partnership claim
Last updated: 2026-06-09

Use this map when you need to route a developer, evaluator, validator, or agent-runtime conversation into the smallest Neura Relay proof that can create useful evidence.

The operating spine stays constant:

```text
Proposed action -> Action Card -> Neura Relay -> Decision Receipt -> developer-owned execution or restraint
```

Neura Relay returns the pre-action authority record. The developer-owned runtime, application, team, or agent keeps execution ownership after reading the receipt.

## Fastest Proof

Use this when the evaluator only needs to see that the repo works and produces a first-proof completion artifact:

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm ci
npm run first-proof -- --dry-run --json
```

The dry run does not create a production receipt. It returns a `completion_artifact` with a safe preview, claim boundaries, and the exact next live command.

Use this when the evaluator is ready to create live receipt refs:

```bash
npm run first-proof -- --source=github --campaign=package_reality_first_proof --surface=current_public_proof_map --json
```

## Proof Lanes

| Need | Proof lane | Command | What to look for |
| --- | --- | --- | --- |
| Show the core Relay mechanism | Core Action Card path | `npm run example:relay -- --example=support-reply --json` | Decision Receipt, trace ref, developer-owned execution boundary |
| Show authority before consequential action | Pre-Action Authority set | `npm run proof:pre-action-authority -- --dry-run --json` | Agent Action Firewall, Decision Receipt Standard, MCP Risk Gate, CommerceOps Fire Drill, Authority Path Proof |
| Show payment or commerce-style approval control | CommerceOps Fire Drill | `npm run proof:commerceops-fire-drill -- --dry-run --json` | refund, discount, address-change, cancellation, and customer-promise routing before execution |
| Show buyer-language commerce control | Agentic Commerce Decision Receipt | `npm run proof:agentic-commerce-decision-receipt -- --dry-run --json` | exact economic action, target, amount class, currency, customer ref, policy/evidence refs, and approval state bound before execution |
| Convert a concrete maintainer ask into implementation help | Implementation SWAT Packet Library | `npm run verify:implementation-swat-pack` | schema/test/example/PR-scope templates with no public action until exact approval |
| Show tool-call governance for MCP-capable runtimes | Protected MCP path | `NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json` | five Neura tools, validation, resolution, receipt lookup, trace replay, Agent Passport lookup |
| Show local autonomous-agent preflight | OpenClaw-style local proof | `npm run openclaw:five-minute-demo` | message send, file delete, and package publish reviewed before local execution |
| Show source-to-sink authority depth | Flow-Aware Authority Gate | `npm run proof:flow-aware-authority -- --dry-run --json` | source refs, transformation refs, sink refs, purpose, scope, policy, and side-effect refs |
| Show public discovery before controlled execution | A2A discovery path | `npm run proof:a2a -- --agent-card-only --json` | public Agent Card discovery with protected execution boundary |
| Show ecosystem route options | Ecosystem availability pack | `npm run verify:ecosystem-availability-pack` | MCP, OpenAI, Claude, A2A, OpenClaw, SDK/GitHub, and swarm-runtime proof paths without provider claims |

## Current Public Discovery

- Relay: `https://www.neurarelay.com`
- First proof: `https://www.neurarelay.com/developers/first-proof`
- Pre-Action Authority: `https://www.neurarelay.com/agent-action-gateway`
- AI-readable summary: `https://www.neurarelay.com/llms.txt`
- public Agent Card: `https://www.neurarelay.com/.well-known/agent-card.json`
- protected MCP endpoint: `https://www.neurarelay.com/mcp`
- Official MCP Registry search: `https://registry.modelcontextprotocol.io/?q=com.neurarelay%2Frelay-mcp`
- Registry Agent Passport layer: `https://www.neuraregistry.com`

## Conversion Use

Use this repo to move from attention to evidence:

```text
Visitor sees proof repo -> runs first proof -> gets completion artifact -> creates live receipt refs -> asks for feedback, Registry identity, sandbox MCP, or controlled production/private access
```

Useful signals are:

- `completion_artifact` from `npm run first-proof`;
- Decision Receipt refs;
- trace refs;
- transaction refs;
- source/campaign/surface attribution;
- first-receipt feedback issue;
- controlled MCP access request with safe refs;
- Registry Agent Passport readiness for production identity.

Do not count downloads, clones, page views, or generic stars as adoption by themselves. They are discovery signal only.

## Boundaries

This map does not claim:

- customer adoption;
- pilot confirmation;
- provider approval;
- ecosystem endorsement;
- official OpenAI, Anthropic, OpenClaw, ClawHub, A2A, Google, Microsoft, IBM, or other third-party integration or partnership;
- downstream execution by Neura;
- public production MCP token issuance;
- public A2A token issuance;
- Registry auto-approval;
- private payload storage by Neura.

Registry is optional for the open first-proof path and required only when production identity, capability, version, owner, or standing context needs to be validated. Protected MCP is optional and controlled. The public direct Action Card path remains the fastest proof.
