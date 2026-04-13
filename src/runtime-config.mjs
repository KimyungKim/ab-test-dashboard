import "./env-loader.mjs";
import { loadRuntimeOverrides } from "./runtime-overrides-store.mjs";

function parseCsv(value, fallback) {
  return String(value || fallback || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function pick(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export async function getRuntimeConfig(overrideEnvelope = null) {
  const overrides = overrideEnvelope || (await loadRuntimeOverrides());
  const runtime = overrides.runtime || {};

  return {
    servingCatalog: pick(runtime.servingCatalog, process.env.SERVING_CATALOG, "analytics_serving"),
    servingSchema: pick(runtime.servingSchema, process.env.SERVING_SCHEMA, "gameops"),
    views: {
      daily: pick(runtime.views?.daily, process.env.VIEW_AE_DAILY, "ae_daily_secure"),
      segment: pick(runtime.views?.segment, process.env.VIEW_AE_SEGMENT, "ae_segment_secure"),
      retention: pick(runtime.views?.retention, process.env.VIEW_AE_RETENTION, "ae_retention_secure")
    },
    queryOverrides: overrides.queries || {},
    groups: {
      aeReaders: parseCsv(runtime.groups?.aeReaders?.join?.(",") || runtime.groups?.aeReaders, process.env.GROUP_AE_READERS || "ae-readers"),
      aeRetention: parseCsv(runtime.groups?.aeRetention?.join?.(",") || runtime.groups?.aeRetention, process.env.GROUP_AE_RETENTION || "ae-retention"),
      analyticsAdmin: parseCsv(
        runtime.groups?.analyticsAdmin?.join?.(",") || runtime.groups?.analyticsAdmin,
        process.env.GROUP_ANALYTICS_ADMIN || "analytics-admin"
      )
    }
  };
}

export async function fullyQualifiedView(viewKey, overrideEnvelope = null) {
  const runtimeConfig = await getRuntimeConfig(overrideEnvelope);
  return `${runtimeConfig.servingCatalog}.${runtimeConfig.servingSchema}.${runtimeConfig.views[viewKey]}`;
}
