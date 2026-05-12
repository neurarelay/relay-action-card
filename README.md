# Relay Action Card

Send an Action Card to Neura Relay. Get a governed Decision Receipt before execution.

This is the public developer starting point for Neura Relay: a runnable example for agent developers building AI agents, autonomous-agent workflows, or MCP-capable runtimes that need a governed checkpoint before execution. Your agent proposes an action, Relay evaluates identity, authority, evidence, policy, and risk, and your system receives a governed receipt before deciding what to execute.

Runtime: use Node `24` via `.nvmrc`; OpenClaw runtime verification requires Node `>=22.14.0`.

Distribution proof:

- Neura Relay MCP is active in the Official MCP Registry as [`com.neurarelay/relay-mcp`](https://registry.modelcontextprotocol.io/?q=com.neurarelay%2Frelay-mcp).
- The listing points to protected `/mcp`; sandbox tokens come from Workspace and production/private access remains controlled.

## Start Here

There are three paths in this repo:

| Path | Folder | Access | Purpose |
| --- | --- | --- | --- |
| Core Relay example | `examples/core` | Public | Send an Action Card to `POST /api/resolve` and receive a Decision Receipt |
| Optional MCP examples | `examples/mcp` | Sandbox or controlled production access | Call the same Relay spine through protected MCP-compatible tools |
| SDK path | `examples/sdk` | Public npm package | Use `@neurarelay/sdk` without changing the Relay decision boundary |
| OpenClaw-style receipt kit | `examples/openclaw` and `skills/openclaw` | Public-safe examples | Draft and test receipt-ready Action Cards before local agent messages, file changes, browser submits, shell commands, workflow changes, memory writes, and data exports |

The core path is the default Neura path:

```text
Action Card -> Relay -> Decision Receipt
```

The MCP path is optional compatibility:

```text
MCP-capable runtime -> protected /mcp -> same Relay decision spine
```

Use this repo when you are looking for copyable examples for agent governance, tool-call review, Action Cards, Decision Receipts, protected MCP tool calls, SDK adoption, and Registry Agent Passport context. It remains the public example repo, and `@neurarelay/sdk@0.1.0` is now available as a public npm package.

## Get Your First Receipt In 5 Minutes

Use this repo to prove the agent governance adoption loop before wiring Neura into your own AI agent or autonomous-agent workflow:

1. Clone this repo
2. Run one public Action Card example
3. Confirm Relay returns a Decision Receipt and trace ref
4. Open Relay Developer Workspace
5. Inspect the same receipt and trace pattern
6. Activate sandbox MCP access if you want to test MCP immediately
7. Copy the JavaScript, curl, or MCP handoff
8. Create a Registry Agent Passport before production Relay review

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm run example:relay -- --example=support-reply --json
```

Expected safe output shape:

```json
{
  "input_model": "action_card_v0_1",
  "receipt_id": "decision_receipt_...",
  "decision": "human_review",
  "trace_ref": "trace_ref_...",
  "transaction_ref": "relay_txn_...",
  "relay_boundary": "decision_gate_only_developer_keeps_execution"
}
```

Then open Workspace:

```text
https://www.neurarelay.com/developers/workspace
```

Workspace keeps the action visible, returns a safe receipt, gives JavaScript/curl for `POST /api/resolve`, and can issue a one-time sandbox MCP token. Your app owns execution.

Demo cards include a demo Agent Passport. For production, create a Registry Agent Passport before Relay validates identity, capability, version, and standing: [Neura Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew).

## After The First Receipt

Once you have a Decision Receipt, choose one next action:

| Next action | Use when | Link |
| --- | --- | --- |
| First receipt feedback | You ran the public example and want to share refs-only feedback or a blocker | [Open feedback issue](https://github.com/neurarelay/relay-action-card/issues/new?template=first-receipt-feedback.yml) |
| Create the production Agent Passport | You are moving from demo refs to your own production agent identity | [Open Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew) |
| Sandbox MCP access | You want to test protected MCP immediately with a signed-in Workspace account | [Open Workspace](https://www.neurarelay.com/developers/workspace) |
| Production/private MCP access | You have an MCP-capable runtime and a concrete governed-action use case beyond sandbox | [Request controlled access](https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml) |

Read the full path in [`docs/developer-feedback-and-controlled-access.md`](docs/developer-feedback-and-controlled-access.md).

For the MCP tool-call governance pattern, read [`docs/mcp-tool-call-governance-walkthrough.md`](docs/mcp-tool-call-governance-walkthrough.md).

Read the controlled beta access operating path in [`docs/controlled-mcp-beta-access.md`](docs/controlled-mcp-beta-access.md).

For the developer-owned agent flow, read [`docs/developer-owned-agent-walkthrough.md`](docs/developer-owned-agent-walkthrough.md).

For the authorization-bypass scenario proof, read [`docs/authorization-bypass-scenarios.md`](docs/authorization-bypass-scenarios.md).

For the Agentic consent / delegated authority proof, read [`docs/agentic-consent-delegated-authority.md`](docs/agentic-consent-delegated-authority.md).

For the SDK path, read [`examples/sdk/README.md`](examples/sdk/README.md).

For the controlled A2A client pack, read [`docs/a2a-controlled-client-pack.md`](docs/a2a-controlled-client-pack.md).

For agent-assisted development workflows, read [`docs/skills-adoption-pack.md`](docs/skills-adoption-pack.md). The first local example skills are `skills/neura-action-card`, `skills/neura-authority-review`, and `skills/neura-first-receipt`.

For OpenClaw-style autonomous computer-use workflows, read [`docs/openclaw-action-receipt-pack.md`](docs/openclaw-action-receipt-pack.md). The Action Receipt Kit includes `skills/openclaw/neura-action-card`, specialized review skills, public-safe fixtures in `examples/openclaw/action-cards`, a one-command dry run, a live receipt runner, a verifier, unit tests, and a live E2E receipt test. This is an example kit, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

For the pre-publication developer journey, read [`docs/openclaw-near-miss-workbench.md`](docs/openclaw-near-miss-workbench.md). The Near-Miss Workbench generates a local visual report for three severe autonomous-agent incidents: customer data exfiltration, production deployment, and expired delegated authority. The report shows what the agent was about to do, what Neura caught, the receipt route, and the developer-owned next step.

![OpenClaw Near-Miss Workbench visual proof](docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png)

OpenClaw 60-second local proof:

```bash
npm install
npm run openclaw:workbench
npm run openclaw:dry-run -- --json
npm run openclaw:receipts -- --only=send-message --json
```

Then open `artifacts/openclaw-near-miss-workbench/report.html` locally to inspect the visual workbench.

Run the full local checks:

```bash
npm run verify:openclaw-workbench
npm run openclaw:dry-run
npm run verify:openclaw-action-receipt-kit
npm run test:openclaw-kit
npm run test:openclaw-kit:e2e
```

Release-candidate snapshot:

| Proof | Command |
| --- | --- |
| Local near-miss visual journey | `npm run openclaw:workbench` |
| Local contract and refs-only fixtures | `npm run openclaw:dry-run` |
| Live Relay Decision Receipts | `npm run openclaw:receipts` |
| Workbench verifier | `npm run verify:openclaw-workbench` |
| Claim-boundary verifier | `npm run verify:openclaw-action-receipt-kit` |
| Unit test framework | `npm run test:openclaw-kit` |
| Live E2E receipt test | `npm run test:openclaw-kit:e2e` |

CI now runs the local kit contract on pull requests and pushes that touch the OpenClaw surface. Live production receipt proof is available as a manual GitHub Actions run so normal CI stays deterministic. See [`CHANGELOG.md`](CHANGELOG.md).

For plugin-ready local runtime wiring, read [`docs/openclaw-preflight-adapter.md`](docs/openclaw-preflight-adapter.md). The preflight adapter exposes `beforeAction(preflightAction)` and an OpenClaw-style `register(api)` entry example:

```bash
npm run openclaw:preflight:dry-run
npm run openclaw:preflight:receipt -- --json
npm run openclaw:plugin:pack:dry-run
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-plugin-rc
npm run verify:openclaw-runtime-approval
npm run test:openclaw-preflight-adapter
```

The package-ready release candidate is documented in [`docs/openclaw-plugin-release-candidate.md`](docs/openclaw-plugin-release-candidate.md), with the runtime verification and publish approval packet in [`docs/openclaw-runtime-verification-and-publish-approval.md`](docs/openclaw-runtime-verification-and-publish-approval.md). It is shaped for `@neurarelay/openclaw-preflight-adapter@0.1.0-rc.1`, but no OpenClaw / ClawHub submission, publication, listing, approval, or partnership claim exists.

## Production Agent Identity

Demo examples run immediately because they include a demo Agent Passport. A production agent needs its own Registry Agent Passport before Relay can treat the acting identity as valid.

Create the Agent Passport in Registry first:

```text
https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew
```

Then place the Registry-backed agent id, owner, capability, and capability version in the Action Card before sending it to Relay.

## Run The Core Example In 60 Seconds

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm run example:relay
```

List the public Action Card examples:

```bash
npm run example:relay -- --list-examples
```

Run a specific example:

```bash
npm run example:relay -- --example=support-reply
npm run example:relay -- --example=account-api-write
npm run example:relay -- --example=refund-exception
npm run example:relay -- --example=data-export
npm run example:relay -- --example=payment-release
npm run example:relay -- --example=workflow-state-change
npm run example:relay -- --example=authorized-crm-account-update
npm run example:relay -- --example=blocked-cross-resource-crm-update
npm run example:relay -- --example=blocked-payment-without-authority
npm run example:relay -- --example=delegated-crm-account-update
npm run example:relay -- --example=delegated-wrong-resource
npm run example:relay -- --example=delegated-wrong-action
npm run example:relay -- --example=delegated-expired-authority
npm run example:relay -- --example=openclaw-send-message
npm run example:relay -- --example=openclaw-edit-file
npm run example:relay -- --example=openclaw-delete-file
npm run example:relay -- --example=openclaw-browser-submit
npm run example:relay -- --example=openclaw-shell-command
npm run example:relay -- --example=openclaw-workflow-state-change
npm run example:relay -- --example=openclaw-memory-write
npm run example:relay -- --example=openclaw-data-export
```

The example calls production Relay by default:

```txt
Neura Relay returned a Decision Receipt

Relay: https://www.neurarelay.com
Input: action_card_v0_1
Decision: proceed
Reason: ...
Decision factors: identity pass - authority pass - evidence pass - policy pass - risk pass
Receipt: decision_receipt_...
Transaction: relay_txn_...
Next step: Developer may continue to execution.
Trace: trace_ref_...
Boundary: decision_gate_only_developer_keeps_execution
```

For machine-readable output:

```bash
npm run example:relay -- --json
```

To point the example at a local Relay server:

```bash
RELAY_BASE_URL=http://localhost:3000 npm run example:relay
```

## SDK Path

The SDK path uses `@neurarelay/sdk@0.1.0`. It keeps the same Action Card and Decision Receipt mechanism as the direct example, with optional helper clients for protected A2A and MCP.

Install dependencies and run the SDK example:

```bash
npm install
npm run example:sdk
npm run example:sdk:authority-routing
```

The authority-routing example uses `@neurarelay/sdk@0.1.0` against the delegated-authority fixtures and converts each Decision Receipt into a developer route. Public demo refs intentionally route a permitted delegated action to `hold_for_registry_backed_authority` until the developer can supply Registry-backed delegated authority. A production app should only treat a receipt as `ready_for_developer_owned_execution` when authority is Registry-backed and ready. This is stable SDK adoption, with no public API-key issuance, no public token issuance, no downstream execution, and no Registry auto-approval.

Use the SDK to read public A2A discovery. Run protected `message/send` only with controlled access:

```bash
npm run example:sdk:a2a
RELAY_A2A_ACCESS_TOKEN=... npm run example:sdk:a2a
```

Verify the npm package from a clean outside consumer project:

```bash
npm run verify:sdk-stable-consumer
npm run verify:sdk-authority-routing
```

That verifier installs `@neurarelay/sdk@0.1.0` from npm in a temporary project, checks the aggregate client plus subpath exports, resolves the Action Card through production Relay, checks delegated-authority `authority_context.source` at runtime, checks public A2A Agent Card discovery, and uses `RELAY_A2A_ACCESS_TOKEN` for protected A2A only when controlled access is present. The SDK is stable for the receipt path, not a public token program.

## A2A Protected Client Proof

Relay publishes public Agent Card metadata at `/.well-known/agent-card.json` and keeps protected `/a2a` execution controlled. This repo includes the A2A Controlled Client Pack v0.2 in `examples/a2a` and `docs/a2a-controlled-client-pack.md`, with A2A Controlled Runtime v1 checks for runtime contract, idempotency key ref, and Registry trust summary.

Inspect the public Agent Card:

```bash
npm run example:a2a -- --agent-card-only
```

Run protected `message/send` only after controlled A2A access is issued:

```bash
RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json
```

The protected proof returns a Decision Receipt task with trace and transaction refs. It also checks A2A Controlled Runtime v1, Registry Agent Passport required for production identity validation, idempotency key ref without raw key return, and closed boundary flags. It preserves no public A2A token issuance, no public API keys, no unprotected A2A execution, no downstream execution by Neura, no private payload exposure, no token-value return, and no A2A directory listing or ecosystem claim.

## Copy The Core Examples

The default core example sends `examples/core/action-card.json` to Relay. The broader public example library lives in `examples/core/action-cards`:

| Example | File | What Relay reviews |
| --- | --- | --- |
| Support reply | `examples/core/action-cards/support-reply.json` | A customer reply before it is sent |
| Account API write | `examples/core/action-cards/account-api-write.json` | A CRM/account update before an API write |
| Refund exception | `examples/core/action-cards/refund-exception.json` | A refund exception before approval |
| Data export | `examples/core/action-cards/data-export.json` | A workspace export before content leaves the system |
| Payment release | `examples/core/action-cards/payment-release.json` | A partner payment before funds move |
| Workflow state change | `examples/core/action-cards/workflow-state-change.json` | A workflow transition before state changes |
| Authorized CRM account update | `examples/core/action-cards/authorized-crm-account-update.json` | A permitted target/action pair before an account API write |
| Blocked cross-resource CRM update | `examples/core/action-cards/blocked-cross-resource-crm-update.json` | An authority-mismatch target that must not auto-proceed |
| Blocked payment without authority | `examples/core/action-cards/blocked-payment-without-authority.json` | A payment action outside declared authority that must not auto-proceed |
| Delegated CRM account update | `examples/core/action-cards/delegated-crm-account-update.json` | A scoped, active delegated authority context before a CRM write |
| Delegated wrong resource | `examples/core/action-cards/delegated-wrong-resource.json` | A delegated authority context that does not cover the target resource |
| Delegated wrong action | `examples/core/action-cards/delegated-wrong-action.json` | A delegated authority context that does not cover the proposed action |
| Delegated expired authority | `examples/core/action-cards/delegated-expired-authority.json` | An expired delegated authority context that requires just-in-time review |

Each file is an Action Card v0.1. Copy one into your agent or paste it into the protected [Relay Developer Workspace](https://www.neurarelay.com/developers/workspace). Relay returns the Decision Receipt, Registry status, trace ref, and integration handoff.

The authorization-bypass scenario proof is intentionally refs-only. It demonstrates the public safety property without sharing private policy text, customer content, API keys, tokens, or proprietary authorization payloads.

The delegated authority proof is refs-only: access is not consent, consent is not authority, and authority must be scoped, time-bound, revocable, and Decision Receipt-backed before execution.

Relay Decision Receipts now expose `authority_context.source` for delegated authority:

- `registry_reference_packet` means Relay matched the delegated authority refs against a protected Registry Relay Reference Packet.
- `developer_supplied_unverified` means Relay preserved the developer-supplied refs without claiming Registry-backed authority.

These public fixtures intentionally use demo delegated-authority refs, so live public examples should report `developer_supplied_unverified` while still returning refs-only Decision Receipts.

The default support-reply Action Card looks like this:

```json
{
  "version": "0.1",
  "agent": {
    "id": "11de8d9a-7e1e-42f9-86ae-5f9c26878624",
    "owner": "neura_relay",
    "capability": "decision_resolution",
    "capabilityVersion": "4511419e-9d22-49f5-aa7e-55f6f8b949de"
  },
  "proposedAction": {
    "type": "send_customer_reply",
    "summary": "Send a prepared support reply after policy and evidence review",
    "target": "support_thread_8421"
  },
  "affectedObject": "support_thread_8421",
  "context": {
    "evidenceRefs": ["support_thread:8421", "policy:refund_window"],
    "ruleRefs": ["policy:customer_communication_review"],
    "riskCategory": "customer_communication",
    "requestedOutcome": "decision_receipt"
  }
}
```

The script wraps that Action Card for the Relay resolve endpoint:

```js
const response = await fetch("https://www.neurarelay.com/api/resolve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action_card: actionCard })
});

const { decision_receipt: receipt } = await response.json();
```

## What Just Happened

1. The example loads `examples/core/action-card.json`.
2. It sends the Action Card to `POST /api/resolve`.
3. Relay returns a Decision Receipt v0.1 with decision factors.
4. Registry identity and capability context appear in the receipt when the agent has a valid Agent Passport.
5. Your system stores the receipt next to the proposed action.
6. Your system keeps execution ownership.

Relay is a governed decision gate. Your agent, payloads, and execution stay in your system.

For a product UI walkthrough, open the protected Relay Developer Workspace:

```text
https://www.neurarelay.com/developers/workspace
```

Workspace uses the same example pattern, keeps the action visible while you edit JSON, links the receipt to trace replay, and provides JavaScript/curl handoff snippets.

## Why Agent Developers Add Neura

MCP gives AI agents a standard way to reach tools. Neura gives agent developers a governed checkpoint before those tool calls create business impact.

Use Neura when an AI agent, autonomous agent, or agent-to-agent workflow is about to touch customer messages, CRM records, refunds, deployments, account state, or other consequential systems and you need:

- pre-action validation
- Agent Passport identity and authority-standing context
- a governed Decision Receipt
- trace refs for replay and receipt IDs for audit
- no private payload exposure
- no downstream execution by Neura

## Optional MCP Examples

MCP makes tool access easier. Neura makes consequential MCP tool use governable before it happens.

Use Neura Relay through MCP when an agent can reach real tools, records, messages, money workflows, deployments, or customer data and you need a pre-action record before the action becomes real.

Current MCP boundary:

- the open public path is still `POST /api/resolve`
- signed-in Relay Workspace can issue a one-time sandbox MCP token for first proof
- production/private MCP access is controlled beta through `NEURA_RELAY_MCP_ACCESS_TOKEN`
- Neura does not offer public production MCP token issuance
- Neura does not execute downstream actions
- sandbox tokens are limited and expire; approved production/private token handoff happens privately and can be rotated or revoked by Neura
- MCP credentials are tool-scoped by Relay; a credential can list and call only its authorized Neura MCP tools

A2A boundary: Relay has public Agent Card discovery and protected `message/send` for controlled Relay developer or internal access. This repo does not provide an agent network, A2A directory listing, public A2A token issuance, or downstream execution. The core proof remains `Action Card -> Relay -> Decision Receipt`.

Run the direct MCP client after copying a sandbox token from Workspace or after Neura has issued production/private MCP access:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --list-tools
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=validate_action_card --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=resolve_action_card --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=lookup_agent_passport --action-card=examples/mcp/action-cards/registry-ready-evidence-capture.json --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

The MCP example pack includes:

- 4 safe Action Card scenarios: customer reply, CRM update, refund review, and deployment change
- 1 Registry-ready Action Card for Agent Passport and authority-standing lookup
- 1 blocked high-risk Action Card that should not proceed automatically
- 1 direct MCP JSON-RPC client for all five protected Neura tools
- 1 OpenAI Responses remote MCP template
- 1 Anthropic Claude Messages MCP connector example with sanitized dry run and private live provider proof
- 1 Claude Code remote HTTP MCP configuration template with private live client proof
- 1 Google ADK remote MCP template
- 1 Microsoft Agent Framework / Foundry MCP template
- 1 provider-runtime path guide for developer rollout decisions
- 1 compatibility matrix that separates verified, prepared, planned, and not-claimed surfaces

Start here:

- `examples/README.md`
- `examples/mcp/README.md`
- `examples/mcp/provider-runtime-paths.md`
- `examples/mcp/compatibility-matrix.md`

To inspect the Claude Messages MCP request shape without credentials:

```bash
npm run example:anthropic-mcp-request
```

This proves the Claude API configuration shape only. It is not an official Anthropic listing or partnership claim.

Private live proof on May 9 confirmed the same example can call protected Neura Relay MCP through Claude Messages with a controlled Relay sandbox token. Claude called `resolve_action_card`, Relay returned a Decision Receipt plus trace ref, and Neura preserved no private payload return and no downstream execution. This is live Claude Messages API proof, not Anthropic listing, approval, partnership, public production token issuance, or public API-key issuance.

Private live Claude Code proof on May 9 confirmed the local Claude Code HTTP MCP path can call protected Neura Relay MCP with a controlled Relay sandbox token. Claude Code called `resolve_action_card`, Relay returned a Decision Receipt plus trace and transaction refs, and Neura preserved no private payload return and no downstream execution. This is a private client proof, not Anthropic listing, approval, partnership, public production token issuance, or public API-key issuance.

## Repository Map

```text
examples/
  core/
    README.md
    action-card.json
    action-card-high-risk.json
    resolve-action-card.mjs
    decision-receipt.example.json
    action-cards/
      support-reply.json
      refund-exception.json
      data-export.json
      payment-release.json
  mcp/
    README.md
    compatibility-matrix.md
    provider-runtime-paths.md
    direct-mcp-client.mjs
    openai-responses-remote-mcp.mjs
    anthropic-messages-mcp.mjs
    google-adk-remote-mcp.py
    microsoft-agent-framework-mcp.py
    claude-code-neura.mcp.example.json
    agent-passport-authority-standing.example.json
    action-cards/
      customer-reply.json
      crm-update.json
      refund-review.json
      deploy-change.json
      registry-ready-evidence-capture.json
      blocked-funds-transfer.json
  openclaw/
    README.md
    action-receipt-kit.manifest.json
    run-action-receipt-kit.mjs
    run-near-miss-workbench.mjs
    run-preflight-adapter.mjs
    action-cards/
      send-message.json
      edit-file.json
      delete-file.json
      browser-submit.json
      shell-command.json
      workflow-state-change.json
      memory-write.json
      data-export.json
    near-miss-workbench/
      scenarios.json
    preflight-adapter/
      README.md
      openclaw.plugin.json
      package.json
      index.mjs
      adapter.mjs
      fixtures/
        send-message.preflight.json
skills/
  openclaw/
    neura-action-card/
    neura-before-send/
    neura-file-change-review/
    neura-browser-action-review/
    neura-shell-command-review/
    neura-memory-write-review/
    neura-data-export-review/
scripts/
  verify-relay-action-card-example.mjs
  verify-mcp-developer-adoption-pack.mjs
  verify-developer-feedback-access-path.mjs
  verify-openclaw-action-receipt-pack.mjs
  verify-openclaw-action-receipt-kit.mjs
  verify-openclaw-near-miss-workbench.mjs
  verify-openclaw-preflight-adapter.mjs
  verify-openclaw-plugin-rc.mjs
  verify-openclaw-runtime-approval.mjs
docs/
  assets/
    openclaw-near-miss-workbench/
      near-miss-workbench-desktop.png
      near-miss-workbench-mobile.png
  controlled-mcp-beta-access.md
  developer-feedback-and-controlled-access.md
  developer-owned-agent-walkthrough.md
  mcp-tool-call-governance-walkthrough.md
  openclaw-action-receipt-pack.md
  openclaw-near-miss-workbench.md
  openclaw-preflight-adapter.md
  openclaw-plugin-release-candidate.md
  openclaw-runtime-verification-and-publish-approval.md
tests/
  openclaw-action-receipt-kit.test.mjs
  openclaw-action-receipt-kit.e2e.mjs
  openclaw-near-miss-workbench.test.mjs
  openclaw-preflight-adapter.test.mjs
  openclaw-preflight-adapter.e2e.mjs
.github/
  workflows/
    openclaw-action-receipt-kit.yml
  ISSUE_TEMPLATE/
    first-receipt-feedback.yml
    controlled-mcp-access.yml
```

## Verify

```bash
npm run verify:relay-example
npm run verify:mcp-adoption-pack
npm run verify:developer-feedback-access-path
```

`verify:mcp-adoption-pack` performs static checks by default. When `NEURA_RELAY_MCP_ACCESS_TOKEN` is present, it also verifies live MCP auth rejection, exact tool listing, validation, resolution, receipt lookup, trace replay, Agent Passport lookup, and blocked-action routing through `/mcp`.

## Ecosystem Fit

- Relay evaluates proposed agent actions before execution.
- Registry supplies Agent Passport identity and capability-version context.
- Protocol defines the Action Card, decision factor, receipt, and trace language.
- Your system owns the agent, data, workflow, and final execution.

## Launch Boundary

This is a runnable public example for the live Relay Action Card path.

MCP examples can be used with a Workspace sandbox token for first proof. Production/private MCP remains controlled access with private handoff and rotation/revocation, not public production token issuance.
