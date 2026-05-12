# Authority Review Output Example

```text
Decision route: human_review

Authority Graph:
- status: expired
- source: developer_supplied_unverified
- missing links: none
- broken links: authority_expired

Risk:
- class: high
- reasons: financial exception, customer account impact
- minimum authority: registry_backed_or_explicit_human_authority
- minimum evidence: strong_evidence_ref, policy_or_rule_ref

Next step:
Ask for a fresh authority ref or human approval ref, then send the Action Card to Relay for a Decision Receipt. Do not execute downstream until the receipt is reviewed.
```
