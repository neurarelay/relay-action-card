const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "neura_source",
  "neura_campaign",
  "neura_surface",
  "neura_session_ref",
];

const envMap = {
  UTM_SOURCE: "utm_source",
  UTM_MEDIUM: "utm_medium",
  UTM_CAMPAIGN: "utm_campaign",
  UTM_CONTENT: "utm_content",
  NEURA_SOURCE: "neura_source",
  NEURA_CAMPAIGN: "neura_campaign",
  NEURA_SURFACE: "neura_surface",
  NEURA_SESSION_REF: "neura_session_ref",
};

const argMap = {
  source: "neura_source",
  campaign: "neura_campaign",
  surface: "neura_surface",
  "session-ref": "neura_session_ref",
  "utm-source": "utm_source",
  "utm-medium": "utm_medium",
  "utm-campaign": "utm_campaign",
  "utm-content": "utm_content",
};

function argValue(argv, name) {
  const prefix = `--${name}=`;
  const arg = argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function clean(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed
    .replaceAll(/[^\w .:/@-]/g, "_")
    .replaceAll(/\s+/g, "_")
    .slice(0, 96);
}

export function buildRelayAttribution({
  argv = process.argv.slice(2),
  env = process.env,
  defaultSource = null,
  defaultCampaign = null,
  defaultSurface = null,
} = {}) {
  const attribution = {};

  if (defaultSource) attribution.neura_source = clean(defaultSource);
  if (defaultCampaign) attribution.neura_campaign = clean(defaultCampaign);
  if (defaultSurface) attribution.neura_surface = clean(defaultSurface);

  for (const [envKey, key] of Object.entries(envMap)) {
    const value = clean(env[envKey]);
    if (value) attribution[key] = value;
  }

  for (const [argName, key] of Object.entries(argMap)) {
    const value = clean(argValue(argv, argName));
    if (value) attribution[key] = value;
  }

  return Object.fromEntries(
    attributionKeys
      .map((key) => [key, attribution[key]])
      .filter(([, value]) => Boolean(value)),
  );
}

export function attributionArgs(argv = process.argv.slice(2)) {
  const args = [];
  for (const name of Object.keys(argMap)) {
    const value = argValue(argv, name);
    if (value) args.push(`--${name}=${value}`);
  }
  return args;
}

export function withRelayAttribution(body, attribution) {
  if (!attribution || Object.keys(attribution).length === 0) return body;
  return {
    ...body,
    metadata: {
      ...(body.metadata ?? {}),
      ...attribution,
    },
  };
}

export function publicAttributionSummary(attribution) {
  if (!attribution || Object.keys(attribution).length === 0) {
    return { enabled: false };
  }
  return {
    enabled: true,
    ...Object.fromEntries(
      attributionKeys
        .filter((key) => key !== "neura_session_ref")
        .map((key) => [key, attribution[key] ?? null])
        .filter(([, value]) => value !== null),
    ),
    session_ref_present: Boolean(attribution.neura_session_ref),
    refs_only: true,
  };
}
