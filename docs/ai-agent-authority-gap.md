# The AI Agent Authority Gap

AI agents are moving from answers into consequential action faster than authority systems are forming.

The market has strong work around model calls, tool use, browser automation, coding agents, memory, workflows, and multi-agent orchestration. The missing primitive is narrower:

```text
Can the workflow prove authority for this exact action before execution?
```

That is the AI Agent Authority Gap.

## Why This Matters Now

Agent systems are crossing from recommendation into action:

- sending external messages;
- submitting authenticated browser forms;
- exporting customer or business data;
- publishing packages;
- deploying code;
- changing permissions;
- closing tickets and workflows;
- writing persistent memory.

These are not just tool calls. They can create commitments, disclose information, change live systems, alter access, affect customers, or preserve false state.

For these actions, post-hoc logs are useful but insufficient. A log can show what happened. It does not prove that the action was authorized before it happened.

## The Required Primitive

A consequential agent action should be able to produce a pre-action authority receipt with:

- actor/runtime ref;
- tool/action/target refs;
- exact-call binding through `params_hash` or equivalent;
- authority refs;
- policy refs;
- evidence refs;
- decision route;
- receipt and trace refs;
- developer-owned execution boundary;
- no downstream execution by the receipt service.

The receipt should answer:

```text
Who or what proposed this action?
What exact action was proposed?
What authority applies?
What evidence and policy apply?
Was the route proceed, revise, stop, or human review?
What trace proves the decision later?
Who owns execution after the receipt?
```

## Neura Relay Pattern

Neura Relay demonstrates one public proof pattern for this primitive:

```text
Action Card -> Relay -> Decision Receipt -> developer-owned execution or restraint
```

The agent or runtime proposes an Action Card. Relay resolves the authority decision and returns a Decision Receipt. The developer-owned runtime decides whether to execute, revise, stop, or route to human review.

This matters because authority should be legible before consequential state changes happen, not reconstructed afterward.

## Agent Authority Benchmark v0.1

The Agent Authority Benchmark tests one narrow question:

```text
Can an agent workflow prove authority before a consequential action executes?
```

It is not a general agent-quality benchmark. It does not score reasoning quality, model accuracy, task completion, speed, or user experience.

It tests whether the workflow can produce a pre-action receipt with enough refs to make the proposed action legible, bounded, and auditable.

v0.1 covers eight action classes:

| Scenario | Risk |
| --- | --- |
| `external_email_send` | Messages can create commitments, disclosures, or customer impact. |
| `credentialed_browser_submit` | Browser agents can take real account actions inside authenticated sessions. |
| `customer_data_export` | Data movement needs purpose, authority, and destination control. |
| `package_publish` | Package publication can affect downstream developers and supply chains. |
| `production_deploy` | Deployments can change live customer-facing systems. |
| `permission_change` | Permission updates can expand access and create security exposure. |
| `workflow_close` | Closing work can create false completion or hide unresolved issues. |
| `persistent_memory_write` | Memory writes can persist unauthorized, private, or incorrect state. |

Public dry-run command:

```bash
npm run benchmark:agent-authority -- --dry-run --json
```

Public verification command:

```bash
npm run verify:agent-authority-benchmark
```

## Ecosystem-Specific Entry Routes

The benchmark includes scenario-specific entry routes for the first public ecosystem wave:

| Ecosystem surface | Scenario route | Command surface |
| --- | --- | --- |
| browser-use | credentialed browser submit | `browser_use_credentialed_submit` |
| Cline | package publish, production deploy, permission change, memory write | `cline_consequential_actions` |
| AutoGen | multi-agent handoff, workflow close, memory write, data export | `autogen_multi_agent_handoff` |
| Microsoft Agent Framework | delegated agent action, workflow close, permission change, data export | `microsoft_agent_framework_delegated_action` |

The benchmark output preserves the same `source/campaign/surface` into `first_proof_next_command`, so a local benchmark run can continue into a measurable first-proof receipt path without losing the ecosystem route.

## What Counts As Signal

Strong signal:

- maintainers challenge, refine, or ask to adapt the benchmark;
- developers run the benchmark and share output;
- stars, forks, clones, or referrers move from ecosystem discussions;
- first-proof commands preserve campaign attribution;
- inbound questions mention authority, receipts, or consequential actions;
- strategic or platform people engage with the category framing.

Weak signal:

- impressions without clicks;
- upvotes without comments or runs;
- traffic without command-copy or first-proof movement;
- generic AI enthusiasm that does not engage the authority-before-action mechanism.

No-signal response:

- sharpen benchmark language;
- publish a compact report;
- add a visual receipt example;
- improve first-proof conversion;
- stop weak ecosystem lanes quickly.

## Claim Boundaries

This report does not claim:

- Neura is a universal standard;
- any target framework failed or passed the benchmark unless tested with evidence;
- browser-use, Cline, AutoGen, Microsoft Agent Framework, CrewAI, OpenHands, OpenAI, Anthropic, GitHub, Microsoft, OpenClaw, ClawHub, A2A, MCP Registry, or any platform endorses, approves, integrates, lists, adopts, or partners with Neura;
- downstream action execution is performed by Neura;
- public production tokens are available.

It does claim:

- this is a public benchmark/proof proposal;
- Neura Relay demonstrates one pre-action receipt pattern;
- execution remains developer-owned;
- the benchmark tests authority-readiness, not total product quality;
- the current public proof is dry-run and refs-only unless a live first-proof command is explicitly run.

## Start Here

Run the benchmark:

```bash
npm run benchmark:agent-authority -- --dry-run --json
```

Then verify the contract:

```bash
npm run verify:agent-authority-benchmark
```

If the benchmark output looks relevant, continue into the measurable first-proof command from `first_proof_next_command`.
