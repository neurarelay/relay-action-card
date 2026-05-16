# Agentic Execution Governance Demo v0.1

When agents move from chat into execution, every consequential action needs a governed pre-action decision.

This local demo packages the Neura spine for agentic execution:

```text
agent proposes action
-> Neura checks identity / authority / policy / evidence
-> allow / block / challenge / human_review
-> Decision Receipt + trace
-> developer-owned execution
```

It uses Action Card fixtures and local simulated Decision Receipt output. It does not call an agent runtime, does not create a provider integration, does not execute downstream actions, and does not require tokens.

## Run

```bash
npm run agentic-execution:demo
npm run agentic-execution:demo -- --json
```

List or run one scenario:

```bash
npm run agentic-execution:demo -- --list
npm run agentic-execution:demo -- --only=blocked-shell-command --json
```

Verify the proof:

```bash
npm run verify:agentic-execution-governance-demo
```

## Scenarios

| Scenario | Action family | Route | Decision |
| --- | --- | --- | --- |
| `permitted-file-edit` | `agentic_cli.file_edit` | `allow` | `proceed` |
| `blocked-shell-command` | `agentic_cli.shell_command` | `block` | `stop` |
| `challenged-browser-submit` | `agentic_cli.browser_submit` | `challenge` | `revise` |
| `human-review-data-export` | `agentic_cli.data_export` | `human_review` | `human_review` |

## What The Demo Proves

Each scenario follows the same loop:

1. The agent proposes a state-changing action as an Action Card.
2. Neura checks identity, delegated authority, policy refs, evidence refs, and risk posture.
3. Neura returns a Decision Receipt with a route and trace-shaped audit path.
4. The developer-owned runtime decides what to do next.

The permitted scenario proceeds only because identity, authority scope, policy refs, evidence refs, and target refs align.

The blocked scenario stops because the proposed shell command exceeds the agent's authority scope and targets an unauthorized production resource.

The challenged scenario returns `revise` because the action is plausible but evidence and policy refs are incomplete for an external browser submit.

The human-review scenario routes to `human_review` because the data export is business-impacting and the authority state changed.

## Boundaries

This demo is deliberately local and refs-only:

- no downstream execution by Neura
- no private payloads
- no tokens or secrets
- no raw customer data
- no raw policy documents
- no provider-specific integration
- no provider approval, listing, endorsement, or partnership claim
- Authority Layer v1.0 milestone status remains outside this demo

The demo is not a new agent runtime. It is the pre-action governance layer: Action Card in, Decision Receipt out, developer-owned execution after the receipt.
