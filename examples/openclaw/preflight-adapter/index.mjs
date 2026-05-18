import { createNeuraPreflightAdapter } from "./adapter.mjs";

export { createNeuraPreflightAdapter } from "./adapter.mjs";

export const metadata = {
  id: "neurarelay-openclaw-preflight-adapter",
  name: "Neura Relay Preflight Adapter",
  version: "0.1.2",
  packageName: "@neurarelay/openclaw-preflight-adapter",
  releaseCandidateOnly: false,
  stableRelease: true,
  officialOpenClawOrClawHubClaim: false,
  officialSubmissionRequiresRomanApproval: true,
  executionOwner: "developer_runtime",
};

export default {
  id: metadata.id,
  name: metadata.name,
  description:
    "Unofficial OpenClaw-style adapter example that routes proposed local actions through Neura Relay before execution.",
  register(api) {
    if (!api || typeof api.registerTool !== "function") {
      throw new Error("OpenClaw-style api.registerTool function is required");
    }

    api.registerTool({
      name: "neura_relay_preflight_action",
      description:
        "Create a refs-only Action Card and request a Neura Decision Receipt before a local agent action executes.",
      parameters: {
        type: "object",
        additionalProperties: true,
        required: ["proposedAction", "authority", "evidenceRefs", "ruleRefs", "riskCategory"],
      },
      async execute(_runContext, params) {
        const adapter = createNeuraPreflightAdapter();
        const dryRun = params?.dryRun === true;
        const result = await adapter.beforeAction(params, { dryRun });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    });
  },
};
