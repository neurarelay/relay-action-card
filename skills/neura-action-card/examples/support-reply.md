# Support Reply Action Card Example

Use this when an agent drafts a customer reply before it is sent.

```json
{
  "version": "0.1",
  "agent": {
    "id": "agent_ref_support_reply",
    "owner": "owner_ref_support_ops",
    "capability": "customer_message_draft",
    "capabilityVersion": "capability_version_support_reply_v1"
  },
  "proposedAction": {
    "type": "send_message",
    "summary": "Send a customer reply confirming the case was received and will be reviewed today.",
    "target": "customer_thread_ref_123"
  },
  "affectedObject": "customer_thread_ref_123",
  "context": {
    "evidenceRefs": ["ticket_ref_123", "case_status_ref_received"],
    "ruleRefs": ["policy_ref_customer_reply_review"],
    "riskCategory": "customer_communication",
    "requestedOutcome": "decision_receipt"
  }
}
```

Expected posture: Relay should return a Decision Receipt before the developer-owned system sends the message.
