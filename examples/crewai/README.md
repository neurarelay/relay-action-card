# CrewAI-Style Guardrail Receipt Ref

This is a narrow CrewAI-style placement example for Neura pre-action Decision Receipt refs.

It models the receipt as provider-owned metadata beside the guardrail verdict:

```text
GuardrailDecision.metadata["receipt_ref"]
```

```python
@dataclass
class GuardrailDecision:
    allow: bool
    reason: str | None = None
    metadata: dict = field(default_factory=dict)

decision.metadata["receipt_ref"] = "decision_receipt_ref:crewai_guardrail_email_send_001"
```

Conceptual split:

```text
guardrail result = allow / deny / suspend
pre-action receipt = decision recorded against specific inputs before execution
post-action artifact = action execution evidence, if emitted later by the developer runtime
```

The example binds the receipt ref to the same attempted action the guardrail evaluated:

- `tool_name`
- `tool_input_ref`
- `action_hash`
- `timestamp`
- `policy_refs`
- `evidence_refs`
- `authority_refs`

Run it:

```bash
python3 examples/crewai/guardrail_receipt_ref.py --json
npm run verify:crewai-guardrail-receipt-ref
```

Boundary: this is derived from public architecture feedback on `crewAIInc/crewAI#4877`.
It is external proof alignment only, not a CrewAI integration, approval, listing, endorsement, or partnership claim. It does not execute downstream actions, issue public tokens or API keys, expose private payloads, or claim that a pre-action receipt proves execution.
