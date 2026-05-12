# CRM Update Action Card Example

Use this when an agent proposes a CRM/account write.

```json
{
  "version": "0.1",
  "agent": {
    "id": "agent_ref_crm_delegate_demo",
    "owner": "owner_ref_acme_ops",
    "capability": "crm_account_update",
    "capabilityVersion": "capability_version_crm_update_v1"
  },
  "proposedAction": {
    "type": "crm.update_account",
    "summary": "Update the CRM account status after a verified support request.",
    "target": "crm.account:acme"
  },
  "affectedObject": "crm.account:acme",
  "context": {
    "authorityContext": {
      "delegatedBy": "user_ref_acme_sales_ops_owner",
      "actingAgent": "agent_ref_crm_delegate_demo",
      "authorityScope": "crm.account:acme",
      "allowedActions": ["crm.update_account"],
      "allowedResources": ["crm.account:acme"],
      "expiresAt": "2026-12-31T23:59:59Z",
      "revocationStatus": "active",
      "policyRefs": ["policy_ref_delegated_crm_update"],
      "authorityScopeRef": "authority_scope_ref_acme_crm_update",
      "standingRef": "registry_passport_standing_ref_active"
    },
    "evidenceRefs": ["ticket_ref_8431", "crm_case_ref_acme"],
    "ruleRefs": ["policy_ref_delegated_crm_update"],
    "riskCategory": "low_risk_crm_update",
    "requestedOutcome": "decision_receipt"
  }
}
```

Expected posture: public demo refs may return `developer_supplied_unverified`; production readiness depends on Registry-backed authority.
