# Agentic Consent / Delegated Authority Proof

This proof shows the next action-layer question:

```text
Can this agent, under this delegated authority context, perform this action on this resource now?
```

It extends the authorization-bypass scenario proof. The developer's system still owns the private authorization source, policy documents, customer data, and downstream execution. Neura Relay receives refs-only delegated authority context inside the Action Card and returns a Decision Receipt before execution.

## Run The Scenarios

Permitted delegated CRM update:

```bash
npm run example:relay -- --example=delegated-crm-account-update --json
```

Wrong resource:

```bash
npm run example:relay -- --example=delegated-wrong-resource --json
```

Wrong action:

```bash
npm run example:relay -- --example=delegated-wrong-action --json
```

Expired authority:

```bash
npm run example:relay -- --example=delegated-expired-authority --json
```

Verify the full proof:

```bash
npm run verify:delegated-authority-scenarios
```

## Expected Outcomes

| Scenario | Expected receipt route | What it proves |
| --- | --- | --- |
| Permitted delegated action | `proceed` | The acting agent, action, resource, active status, expiry, and policy refs line up |
| Wrong resource | `human_review` or `stop` | Delegated access to one resource does not authorize another resource |
| Wrong action | `stop` | CRM update authority does not authorize payment or other consequential action classes |
| Expired authority | `human_review` | Missing, expired, revoked, ambiguous, or changed authority requires just-in-time approval |

Every scenario must return a Decision Receipt, trace ref, transaction ref, and `authority_context` with `refs_only: true`.

## Action Card Shape

The public fixture carries only refs and posture:

```json
{
  "context": {
    "authorityContext": {
      "delegatedBy": "user_ref_acme_sales_ops_owner",
      "actingAgent": "11de8d9a-7e1e-42f9-86ae-5f9c26878624",
      "authorityScope": "crm.account:acme",
      "allowedActions": ["crm.update_account"],
      "allowedResources": ["crm.account:acme"],
      "expiresAt": "2026-12-31T23:59:59Z",
      "revocationStatus": "active",
      "policyRefs": ["policy_ref_delegated_crm_update"],
      "authorityScopeRef": "authority_scope_ref_acme_crm_update",
      "standingRef": "registry_passport_standing_ref_active"
    }
  }
}
```

## Boundary

This is not a consent-management platform, identity provider, policy engine, MCP gateway, or downstream executor. It creates no public API keys, no public production MCP tokens, no public A2A tokens, no unprotected A2A execution, no Registry auto-approval, no private payload return, no provider approval claim, and no downstream execution by Neura.
