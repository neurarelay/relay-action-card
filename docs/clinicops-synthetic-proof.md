# ClinicOps Synthetic Proof

ClinicOps Synthetic Proof is a local dry-run proof of Neura Relay as the Pre-Action Authority for regulated-style, policy-heavy synthetic operations.

It shows a synthetic workflow agent proposing scheduling, patient-message, prior-auth, insurance follow-up, and policy-exception actions, then receiving a Decision Receipt before anything external happens.

## Core Path

```text
Synthetic ClinicOps intent -> Action Card -> Pre-Action Authority -> Decision Receipt -> developer-owned review or restraint
```

## Run The Proof

```bash
npm run proof:clinicops-synthetic -- --dry-run --json
npm run verify:clinicops-synthetic
```

The proof covers five synthetic regulated-style actions:

| Scenario | Decision | Why |
| --- | --- | --- |
| Scheduling change requiring policy check | `human_review` | Policy-sensitive schedule changes need review before update or notice. |
| Patient message draft requiring human review | `human_review` | Patient-facing administrative messages need qualified review before external use. |
| Prior-auth draft requiring evidence refs | `human_review` | Prior-auth notes need policy, evidence, and reviewer authority before external use. |
| Insurance follow-up requiring allowed channel | `revise` | The external channel is not confirmed, so the action must be revised. |
| Policy exception without approval | `stop` | The exception lacks owner approval and complete supporting evidence. |

## Outputs

Each scenario produces:

- a synthetic Action Card;
- a Decision Receipt;
- policy and evidence basis;
- required reviewer or owner authority;
- allowed next step;
- blocked downstream actions;
- attribution fields for proof measurement;
- boundary flags showing no real regulated workflow action occurred.

## Files

```text
examples/clinicops-synthetic-proof/fixtures/*.json
examples/clinicops-synthetic-proof/scenarios/*.json
examples/clinicops-synthetic-proof/receipts/*.receipt.json
examples/clinicops-synthetic-proof/manifest.json
examples/clinicops-synthetic-proof/run-proof.mjs
scripts/verify-clinicops-synthetic-proof.mjs
```

## Boundary

ClinicOps Synthetic Proof uses synthetic data only. It does not use PHI, real patient data, real provider systems, real insurer systems, real EHRs, real scheduling systems, real patient messages, or real prior-authorization submissions.

It does not claim HIPAA compliance, medical advice, clinical accuracy, provider approval, insurer approval, compliance certification, production healthcare integration, partnership, listing, endorsement, or downstream execution by Neura.
