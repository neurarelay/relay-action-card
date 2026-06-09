# Tool-call Authority Injection Wrapper v0.1

This local proof shows how Neura can be injected into a tool call before the runtime executes it.

```text
wrapTool -> beforeAction -> Agent I/O Event -> Action Card -> resolveAuthority -> Decision Receipt -> runtime-owned execution gate -> afterAction
```

The point is narrow: a runtime or tool adapter can wrap one consequential tool, turn the proposed call into an Agent I/O Event, derive an Action Card, resolve authority through a Decision Receipt, and only then let the developer-owned runtime decide whether execution can proceed.

## Run

```bash
npm run proof:authority-injection-wrapper -- --dry-run --json
npm run verify:authority-injection-wrapper
```

List or run one scenario:

```bash
npm run proof:authority-injection-wrapper -- --list
npm run proof:authority-injection-wrapper -- --dry-run --only=customer-note-human-review --json
```

## Contract Methods

The proof names the smallest wrapper contract:

- `wrapTool`: wraps one consequential tool.
- `beforeAction`: emits the pre-action Agent I/O Event before execution.
- `resolveAuthority`: derives the Action Card and Decision Receipt.
- `afterAction`: appends refs-only outcome posture after the runtime gate.

## One Wrapped Tool

The proof intentionally uses one wrapped tool:

```text
tool_ref:crm.customer_record.update
```

Four deterministic scenarios cover the decision routes:

| Scenario | Decision | Meaning |
| --- | --- | --- |
| `customer-note-allow` | `allow` | The exact bounded call may proceed in a developer-owned runtime. |
| `customer-note-revise` | `revise` | The call needs stronger evidence refs before execution. |
| `customer-note-human-review` | `human_review` | Account-impacting change needs accountable owner review. |
| `customer-note-stop` | `stop` | Unauthorized privilege-sensitive change is stopped before execution. |

## Agent I/O Layer

Every scenario emits a refs-only Agent I/O sequence:

```text
tool.call.proposed
decision.issued
execution.completed
```

In this dry run, `execution.completed` means the runtime gate completed. The downstream tool is not executed. The event carries only refs, hashes, metadata, and receipt posture.

## Enforcement Checks

The verifier locks the important failure behavior:

- unchanged invocation -> receipt allows the exact tool call once;
- changed args -> old receipt no longer applies;
- expired receipt -> old receipt no longer applies;
- one-shot reuse -> second attempt is denied;
- revise route -> receipt does not authorize execution.

## Boundaries

This is a local dry-run proof:

- no downstream execution by Neura
- no private payload persistence
- no raw customer content, credentials, tokens, files, or form values
- no provider approval, listing, endorsement, integration, or partnership claim
- no compliance certification claim
- no public token issuance, website change, GitHub comment, package publish, deploy, or public distribution action
- no OS-kernel-driver, IAM-provider, SIEM, runtime-replacement, or live-customer-kill-switch claim

Neura returns the pre-action decision evidence. The developer-owned runtime owns execution or restraint after reading the receipt.
