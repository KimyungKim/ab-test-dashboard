const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_RESTRICTION_MODEL = process.env.OPENAI_RESTRICTION_MODEL || "gpt-5-mini";

function normalizeComparator(value) {
  if ([">=", ">", "<=", "<", "="].includes(value)) {
    return value;
  }
  return "=";
}

function uniqueBy(list, toKey) {
  const seen = new Set();
  const output = [];
  for (const item of list) {
    const key = toKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function normalizeStructuredRestriction(payload) {
  const snapshotFilters = Array.isArray(payload?.snapshot_filters) ? payload.snapshot_filters : [];
  const behaviorFilters = Array.isArray(payload?.behavior_filters) ? payload.behavior_filters : [];
  const ignored = Array.isArray(payload?.ignored_text) ? payload.ignored_text.filter(Boolean) : [];

  const conditions = uniqueBy(
    snapshotFilters
      .filter(item => item && ["level", "lifetime_spend", "tier", "country", "client_os"].includes(item.field))
      .map(item => ({
        field: item.field,
        comparator: normalizeComparator(item.op),
        value: typeof item.value === "string" && item.field !== "country" && item.field !== "client_os"
          ? Number(item.value)
          : item.value
      }))
      .filter(item => item.value !== undefined && item.value !== null && !(Number.isNaN(item.value))),
    item => `${item.field}:${item.comparator}:${String(item.value)}`
  );

  const normalizedBehaviors = uniqueBy(
    behaviorFilters
      .filter(item => item && [
        "recent_login_users",
        "recent_signup_users",
        "recent_purchase_users",
        "recent_spin_users",
        "recent_all_in_users",
        "lifetime_purchase_count"
      ].includes(item.type))
      .map(item => ({
        type: item.type,
        days: Number(item.days || 0) || undefined,
        minActiveDays: Number(item.min_active_days || item.minActiveDays || 0) || undefined,
        minCount: Number(item.min_count || item.minCount || 0) || undefined,
        minAmount: Number(item.min_amount || item.minAmount || 0) || undefined
      })),
    item => JSON.stringify(item)
  );

  return {
    conditions,
    behaviorConditions: normalizedBehaviors,
    ignored
  };
}

export function canUseRestrictionLlm() {
  return Boolean(OPENAI_API_KEY);
}

export async function interpretRestrictionWithLlm(text) {
  if (!OPENAI_API_KEY || !String(text || "").trim()) {
    return null;
  }

  const schema = {
    name: "restriction_interpreter",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        snapshot_filters: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field: {
                type: "string",
                enum: ["level", "lifetime_spend", "tier", "country", "client_os"]
              },
              op: {
                type: "string",
                enum: [">=", ">", "<=", "<", "="]
              },
              value: {
                anyOf: [
                  { type: "number" },
                  { type: "string" }
                ]
              }
            },
            required: ["field", "op", "value"]
          }
        },
        behavior_filters: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: {
                type: "string",
                enum: [
                  "recent_signup_users",
                  "recent_login_users",
                  "recent_purchase_users",
                  "recent_spin_users",
                  "recent_all_in_users",
                  "lifetime_purchase_count"
                ]
              },
              days: { type: "number" },
              min_active_days: { type: "number" },
              min_count: { type: "number" },
              min_amount: { type: "number" }
            },
            required: ["type"]
          }
        },
        ignored_text: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["snapshot_filters", "behavior_filters", "ignored_text"]
    }
  };

  const prompt = [
    "You convert Korean/English game analytics restrictions into structured filters.",
    "Return only filters that fit the allowed schema.",
        "Map ltv, lifetime spend, cumulative spend to lifetime_spend.",
        "Map os/aos/android/ios to client_os.",
        "Map Korean country names like 한국/미국/일본 to KR/US/JP.",
        "Map signup/register/new users to recent_signup_users when a recent-day window is mentioned.",
        "Behavior filters should capture cohort-style user restrictions such as recent login, purchase, spin, or all-in users.",
    "If the user asks for things outside the schema, leave them in ignored_text.",
    `Input: ${text}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_RESTRICTION_MODEL,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: schema.name,
          schema: schema.schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Restriction LLM failed with status ${response.status}`);
  }

  const payload = await response.json();
  const outputText = payload.output_text || "";
  if (!outputText) {
    return null;
  }

  return normalizeStructuredRestriction(JSON.parse(outputText));
}
