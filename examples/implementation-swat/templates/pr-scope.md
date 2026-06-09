# PR Scope Packet

Status: draft packet; exact approval required before public use

## Concrete Ask

- Source:
- Maintainer / project contact:
- Module or file boundary:
- Requested artifact:

## Scope

| Area | In scope | Out of scope |
| --- | --- | --- |
| Code |  | unrelated refactors |
| Tests |  | broad test rewrites |
| Docs |  | marketing copy |
| Runtime | no downstream execution by Neura | production credentials, tokens, or live provider calls |

## Proposed Artifact

```text
1. Add the narrow fixture or field map.
2. Add the smallest verifier/test proving the approval boundary.
3. Add one README note if the maintainer requested docs.
4. Do not add product links unless Roman approves link posture.
```

## Verification

```bash
npm test
git diff --check
```

Add project-native commands after inspecting the target repo.

## Boundary

No PR should be opened until Roman approves the exact target, branch posture, commit scope, public copy, link posture, and follow-up rule. Do not claim partnership, adoption, endorsement, integration, or approval.

## Approval State

Not approved for PR creation or public use.
