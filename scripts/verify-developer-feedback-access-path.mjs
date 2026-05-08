import fs from "node:fs";

const files = {
  readme: "README.md",
  examples: "examples/README.md",
  mcp: "examples/mcp/README.md",
  doc: "docs/developer-feedback-and-controlled-access.md",
  betaAccess: "docs/controlled-mcp-beta-access.md",
  firstIssue: ".github/ISSUE_TEMPLATE/first-receipt-feedback.yml",
  mcpIssue: ".github/ISSUE_TEMPLATE/controlled-mcp-access.yml",
  issueConfig: ".github/ISSUE_TEMPLATE/config.yml",
};

const registrySignup =
  "https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function includesAll(text, parts) {
  return parts.every((part) => text.includes(part));
}

const failures = [];
const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => {
    assert(fs.existsSync(path), `${path} must exist`, failures);
    return [key, fs.existsSync(path) ? read(path) : ""];
  }),
);

assert(
  includesAll(contents.readme, [
    "After The First Receipt",
    "First receipt feedback",
    "Controlled MCP access",
    "Create the production Agent Passport",
    registrySignup,
  ]),
  "README must route first receipt to feedback, controlled access, and Registry Agent Passport",
  failures,
);

assert(
  includesAll(contents.examples, [
    "Open a first-receipt feedback issue",
    "Request controlled MCP access",
    "Registry is required for production identity",
  ]),
  "examples README must explain feedback and controlled access after production identity",
  failures,
);

assert(
  includesAll(contents.mcp, [
    "Request Controlled MCP Access",
    "controlled beta token",
    "not public self-serve token issuance",
    "Registry Agent Passport",
  ]),
  "MCP README must preserve controlled access and Registry identity boundaries",
  failures,
);

assert(
  includesAll(contents.doc, [
    "Run the public proof first",
    "Relay does not create or approve the Agent Passport",
    "Share refs only",
    "not public self-serve token issuance",
    "Relay returns a Decision Receipt and does not execute downstream actions",
    "docs/controlled-mcp-beta-access.md",
    "private token handoff",
    "rotate or revoke controlled beta access",
  ]),
  "controlled access doc must explain the adoption loop and boundaries",
  failures,
);

assert(
  includesAll(contents.betaAccess, [
    "Controlled MCP Beta Access",
    "It is not public token issuance",
    "It is not a self-serve API-key system",
    "Public proof -> Registry Agent Passport -> controlled MCP request -> private token handoff -> live proof -> rotation or revocation",
    "NEURA_RELAY_MCP_ACCESS_TOKEN",
    "https://www.neurarelay.com/mcp",
    "validate_action_card",
    "resolve_action_card",
    "get_decision_receipt",
    "get_trace_replay",
    "lookup_agent_passport",
    "no raw private payload",
    "Rotate or revoke controlled MCP access",
    "public MCP token issuance",
    "A2A discoverability",
  ]),
  "controlled beta access doc must define qualification, token handoff, proof, revocation, and non-claims",
  failures,
);

assert(
  includesAll(contents.firstIssue, [
    "Decision Receipt ref",
    "Trace ref",
    "Production Agent Passport status",
    "I did not include private payloads",
  ]),
  "first receipt issue template must collect safe refs and Agent Passport status",
  failures,
);

assert(
  includesAll(contents.mcpIssue, [
    "Controlled MCP access",
    "Registry Agent Passport status",
    "validate_action_card",
    "resolve_action_card",
    "get_decision_receipt",
    "get_trace_replay",
    "lookup_agent_passport",
    "Public Action Card proof",
    "Beta proof plan",
    "Private token handoff contact",
    "not public token issuance",
    "tokens must not appear in GitHub issues",
    "rotate or revoke controlled beta access",
    "does not execute downstream actions",
  ]),
  "controlled MCP issue template must collect tools and preserve boundaries",
  failures,
);

assert(
  includesAll(contents.issueConfig, [
    "blank_issues_enabled: false",
    registrySignup,
    "Open Relay Developer Workspace",
  ]),
  "issue config must disable blank issues and link Registry/Workspace",
  failures,
);

const forbiddenClaims = [
  "public token issuance is available",
  "self-serve token issuance is available",
  "auto-approval is available",
  "Relay executes downstream actions",
  "private payloads are stored",
];

const combined = Object.values(contents).join("\n");
for (const claim of forbiddenClaims) {
  assert(!combined.includes(claim), `forbidden claim present: ${claim}`, failures);
}

if (failures.length) {
  console.error("developer_feedback_access_verifier=failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      developer_feedback_access_verifier: "passed",
      checked_files: Object.values(files),
      boundaries: [
        "refs_only",
        "registry_agent_passport_required_for_production_identity",
        "controlled_mcp_access_only",
        "no_downstream_execution",
      ],
    },
    null,
    2,
  ),
);
