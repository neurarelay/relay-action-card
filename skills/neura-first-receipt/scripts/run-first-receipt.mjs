#!/usr/bin/env node

const relayBaseUrl = process.env.NEURA_RELAY_BASE_URL ?? "https://www.neurarelay.com";

const actionCard = {
  version: "0.1",
  agent: {
    id: "agent_ref_first_receipt_demo",
    owner: "owner_ref_demo",
    capability: "customer_message_draft",
    capabilityVersion: "capability_version_first_receipt_v1",
  },
  proposedAction: {
    type: "send_message",
    summary: "Send a customer reply confirming the case was received and will be reviewed today.",
    target: "customer_thread_ref_demo",
  },
  affectedObject: "customer_thread_ref_demo",
  context: {
    evidenceRefs: ["case_ref_demo", "status_ref_received"],
    ruleRefs: ["policy_ref_customer_reply_review"],
    riskCategory: "customer_communication",
    requestedOutcome: "decision_receipt",
  },
};

const response = await fetch(new URL("/api/resolve", relayBaseUrl), {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ action_card: actionCard }),
});
const payload = await response.json();

if (!response.ok || payload.ok !== true) {
  console.error(JSON.stringify({ ok: false, status: response.status, payload }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      relay: relayBaseUrl,
      decision: payload.decision_receipt?.decision,
      receipt_id: payload.decision_receipt?.receipt_id,
      trace_ref: payload.decision_receipt?.trace_ref,
      transaction_ref: payload.transaction_ledger?.transaction_ref,
      boundary: payload.decision_receipt?.relay_boundary,
    },
    null,
    2,
  ),
);
