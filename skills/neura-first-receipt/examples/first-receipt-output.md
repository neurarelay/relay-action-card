# First Receipt Output Example

```json
{
  "ok": true,
  "relay": "https://www.neurarelay.com",
  "decision": "human_review",
  "receipt_id": "decision_receipt_...",
  "trace_ref": "trace_ref_...",
  "transaction_ref": "relay_txn_...",
  "boundary": "decision_gate_only_developer_keeps_execution"
}
```

Use the receipt, trace, and transaction refs for review. The developer-owned system decides what to do after the receipt.
