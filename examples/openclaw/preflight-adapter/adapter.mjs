const defaultAgent = {
  id: "11de8d9a-7e1e-42f9-86ae-5f9c26878624",
  owner: "neura_relay",
  capability: "decision_resolution",
  capabilityVersion: "4511419e-9d22-49f5-aa7e-55f6f8b949de",
};

const disallowedKeys = new Set([
  "body",
  "content",
  "messageBody",
  "fileContents",
  "formValues",
  "command",
  "rawCommand",
  "token",
  "secret",
  "password",
  "privatePayload",
  "rawPayload",
]);

function assertNoPrivatePayload(value, path = "preflight_action") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPrivatePayload(item, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (disallowedKeys.has(key)) {
      throw new Error(`Preflight action must stay refs-only; disallowed key at ${path}.${key}`);
    }
    assertNoPrivatePayload(nested, `${path}.${key}`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function requireRefs(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty refs array`);
  }
  for (const ref of value) requireString(ref, label);
  return value;
}

function withRelayAttribution(body, attribution) {
  if (!attribution || Object.keys(attribution).length === 0) return body;
  return {
    ...body,
    metadata: {
      ...(body.metadata ?? {}),
      ...attribution,
    },
  };
}

export function createActionCardFromPreflightAction(preflightAction) {
  assertNoPrivatePayload(preflightAction);

  const proposedAction = preflightAction.proposedAction ?? {};
  const authority = preflightAction.authority ?? {};
  const target = requireString(proposedAction.target, "proposedAction.target");
  const actionType = requireString(proposedAction.type, "proposedAction.type");

  return {
    version: "0.1",
    agent: preflightAction.agent ?? defaultAgent,
    proposedAction: {
      type: actionType,
      summary: requireString(proposedAction.summary, "proposedAction.summary"),
      target,
    },
    affectedObject: preflightAction.affectedObject ?? target,
    context: {
      authorityContext: {
        delegatedBy: requireString(authority.delegatedBy, "authority.delegatedBy"),
        actingAgent: authority.actingAgent ?? preflightAction.agent?.id ?? defaultAgent.id,
        authorityScope: requireString(authority.authorityScope, "authority.authorityScope"),
        allowedActions: requireRefs(authority.allowedActions, "authority.allowedActions"),
        allowedResources: requireRefs(authority.allowedResources, "authority.allowedResources"),
        expiresAt: requireString(authority.expiresAt, "authority.expiresAt"),
        revocationStatus: authority.revocationStatus ?? "active",
        policyRefs: requireRefs(authority.policyRefs, "authority.policyRefs"),
        authorityScopeRef: requireString(
          authority.authorityScopeRef,
          "authority.authorityScopeRef",
        ),
        standingRef: authority.standingRef ?? "registry_passport_standing_ref_demo",
      },
      evidenceRefs: requireRefs(preflightAction.evidenceRefs, "evidenceRefs"),
      ruleRefs: requireRefs(preflightAction.ruleRefs, "ruleRefs"),
      riskCategory: requireString(preflightAction.riskCategory, "riskCategory"),
      requestedOutcome: "decision_receipt",
    },
  };
}

export function isRegistryBackedAuthorityReady(authorityContext) {
  return (
    authorityContext?.source === "registry_reference_packet" &&
    authorityContext?.registry_validation_status === "ready"
  );
}

export function routeFromDecision(decision, authorityContext = null) {
  if (decision === "proceed") {
    return isRegistryBackedAuthorityReady(authorityContext)
      ? "ready_for_developer_owned_execution"
      : "hold_for_registry_backed_authority";
  }

  const routes = {
    human_review: "route_to_human_review_before_execution",
    revise: "revise_action_card_before_execution",
    stop: "stop_before_execution",
    blocked: "stop_before_execution",
  };
  return routes[decision] ?? "hold_for_review_before_execution";
}

export function publicReceipt(receipt, response) {
  return {
    input_model: response.input_model,
    receipt_id: receipt?.receipt_id,
    decision: receipt?.decision,
    route: routeFromDecision(receipt?.decision, receipt?.authority_context),
    reason: receipt?.reason,
    trace_ref: receipt?.trace_ref,
    transaction_ref: response.transaction_ledger?.transaction_ref,
    relay_boundary: receipt?.relay_boundary,
    authority_source: receipt?.authority_context?.source ?? null,
    registry_validation_status:
      receipt?.authority_context?.registry_validation_status ?? null,
    authority_decision_engine:
      receipt?.authority_decision_engine
        ? {
            authority_status: receipt.authority_decision_engine.authority_graph?.status,
            risk_class: receipt.authority_decision_engine.risk?.class,
            policy_status:
              receipt.authority_decision_engine.policy_evidence?.policy?.status,
            evidence_status:
              receipt.authority_decision_engine.policy_evidence?.evidence?.status,
            confidence_band:
              receipt.authority_decision_engine.confidence_scoring?.confidence_band,
            precedent_status:
              receipt.authority_decision_engine.receipt_precedent?.status,
          }
        : null,
  };
}

export function createNeuraPreflightAdapter(options = {}) {
  const relayBaseUrl = options.relayBaseUrl ?? process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
  const activationAttribution = options.activationAttribution ?? null;

  return {
    async beforeAction(preflightAction, runOptions = {}) {
      const actionCard = createActionCardFromPreflightAction(preflightAction);
      const requestAttribution =
        runOptions.activationAttribution ?? activationAttribution;

      if (runOptions.dryRun) {
        return {
          ok: true,
          mode: "dry_run",
          route: "relay_receipt_required_before_execution",
          relay_call_skipped: true,
          execution_owner: "developer_runtime",
          action_card: actionCard,
        };
      }

      const { createNeuraRelaySdk } = await import("@neurarelay/sdk");
      const relay = createNeuraRelaySdk({ baseUrl: relayBaseUrl });
      const response = await relay.resolve.resolve(
        withRelayAttribution({ action_card: actionCard }, requestAttribution),
      );
      const receipt = response.decision_receipt;

      if (!receipt?.receipt_id || !receipt?.trace_ref) {
        throw new Error("Relay response missing Decision Receipt or trace ref");
      }
      if (receipt.relay_boundary !== "decision_gate_only_developer_keeps_execution") {
        throw new Error("Relay boundary changed for preflight adapter receipt");
      }

      return {
        ok: true,
        mode: "live_receipt",
        relay: relayBaseUrl,
        execution_owner: "developer_runtime",
        action_card: actionCard,
        receipt: publicReceipt(receipt, response),
        activation_telemetry: response.activation_telemetry ?? null,
      };
    },
  };
}
