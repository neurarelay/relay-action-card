#!/usr/bin/env python3
"""CrewAI-style guardrail metadata example for Neura receipt refs.

Derived from public architecture feedback on crewAIInc/crewAI#4877.
This is external proof alignment only, not a CrewAI integration or endorsement claim.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class GuardrailDecision:
    allow: bool
    reason: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


ATTEMPTED_ACTION = {
    "tool_name": "email.send",
    "tool_input_ref": "tool_input_ref:customer_ref_5829_followup_email",
    "tool_input_summary": "Send a customer follow-up email using approved template refs",
    "timestamp": "2026-05-14T15:35:00Z",
    "policy_refs": ["policy_ref:outbound_customer_email_v1"],
    "evidence_refs": [
        "evidence_ref:approved_template_followup_v3",
        "evidence_ref:customer_consent_status_active",
    ],
    "authority_refs": ["authority_ref:user_delegated_customer_followup_scope"],
}


def stable_action_hash(action: dict[str, Any]) -> str:
    canonical = json.dumps(action, sort_keys=True, separators=(",", ":"))
    return "action_hash:" + hashlib.sha256(canonical.encode("utf8")).hexdigest()[:16]


def build_example() -> dict[str, Any]:
    attempted_action = {
        **ATTEMPTED_ACTION,
        "action_hash": stable_action_hash(ATTEMPTED_ACTION),
    }
    pre_action_receipt = {
        "receipt_ref": "decision_receipt_ref:crewai_guardrail_email_send_001",
        "recorded_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "receipt_scope": "pre_action_decision_record",
        "decision": "human_review",
        "proves_execution": False,
        "execution_attempted": False,
        "execution_owner": "developer_runtime",
        "binds_to": {
            "tool_name": attempted_action["tool_name"],
            "tool_input_ref": attempted_action["tool_input_ref"],
            "action_hash": attempted_action["action_hash"],
            "timestamp": attempted_action["timestamp"],
            "policy_refs": attempted_action["policy_refs"],
            "evidence_refs": attempted_action["evidence_refs"],
            "authority_refs": attempted_action["authority_refs"],
        },
    }

    decision = GuardrailDecision(
        allow=False,
        reason="suspend for human review before sending customer email",
    )
    decision.metadata["guardrail_result"] = "suspend"
    decision.metadata["receipt_ref"] = pre_action_receipt["receipt_ref"]
    decision.metadata["receipt_scope"] = pre_action_receipt["receipt_scope"]
    decision.metadata["action_hash"] = attempted_action["action_hash"]

    return {
        "ok": True,
        "example": "crewai_guardrail_receipt_ref",
        "source_context": (
            "Derived from public architecture feedback on crewAIInc/crewAI#4877. "
            "This is external proof alignment only, not a CrewAI integration or endorsement claim."
        ),
        "conceptual_split": {
            "guardrail_result": "allow / deny / suspend",
            "pre_action_receipt": "decision recorded against specific inputs before execution",
            "post_action_artifact": "action execution evidence, if emitted later by the developer runtime",
        },
        "attempted_action": attempted_action,
        "guardrail_decision": asdict(decision),
        "pre_action_receipt": pre_action_receipt,
        "boundaries": {
            "crewai_approval_or_integration_claim": False,
            "downstream_execution": False,
            "public_token_or_api_key_issuance": False,
            "private_payload_exposure": False,
            "pre_action_receipt_proves_execution": False,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="print the example as JSON")
    args = parser.parse_args()

    payload = build_example()
    if args.json:
        print(json.dumps(payload, indent=2))
        return

    print("CrewAI-style guardrail receipt metadata example")
    print(f'GuardrailDecision.metadata["receipt_ref"] = "{payload["pre_action_receipt"]["receipt_ref"]}"')
    print("No downstream execution is attempted.")


if __name__ == "__main__":
    main()
