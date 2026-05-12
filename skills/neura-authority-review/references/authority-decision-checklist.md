# Authority Decision Checklist

## Identity

- acting agent ref present
- owner ref present
- capability ref present
- capability-version ref present
- production agents use Registry Agent Passport refs where available

## Authority

- delegated-by ref present
- acting-agent ref matches the proposed agent
- allowed action includes the proposed action type
- allowed resource includes the target or affected object
- authority scope ref is present
- standing ref is present
- expiry is active
- revocation posture is active
- changed-since-issue is false
- source is clear: `registry_reference_packet`, `developer_supplied_unverified`, or `missing`

## Evidence And Policy

- evidence refs exist for the action
- policy or rule refs exist for consequential action
- high-risk actions have stronger evidence
- no raw customer data, policy text, secrets, or private payloads are embedded

## Risk

- low: bounded, reversible, no money, no permissions, no production state, no private data
- medium: customer communication, workflow state, or business-record change
- high: money, refunds, data export, legal/contract posture, cross-resource scope
- critical: permission/admin change, production infrastructure, broad blast radius

## Routing

- `proceed`: authority path ready, risk low, evidence/policy refs sufficient
- `revise`: missing low/medium support that can be supplied before review
- `human_review`: high risk, customer-facing communication, expired/changed authority, or unverified authority on consequential action
- `stop`: action outside authority, revoked authority, critical action without stronger approval, or forbidden boundary
