import { getDatabricksConnectionMode, runDatabricksStatement } from "./databricks-client.mjs";
import { getConnectionStatus } from "./connection-status.mjs";
import { getQueryDefinitions, toClientCatalog } from "./query-definitions.mjs";
import { getRuntimeConfig } from "./runtime-config.mjs";
import { assertViewerGroups, assertViewerIdentity, getAuthConfig } from "./security.mjs";

const requestWindowDays = 92;
const blockedQueryIds = new Set(["ae_daily_trend", "ae_segment_mix", "ae_retention_health"]);

export async function getAppSession(viewer) {
  assertViewerIdentity(viewer);
  const runtimeConfig = await getRuntimeConfig();

  return {
    appName: "Secure AE Browser",
    mode: getDatabricksConnectionMode(),
    lastLoadedAt: new Date().toISOString(),
    viewer: {
      email: viewer.email,
      groups: viewer.groups,
      authMode: viewer.authMode
    },
    auth: getAuthConfig(),
    runtime: {
      servingCatalog: runtimeConfig.servingCatalog,
      servingSchema: runtimeConfig.servingSchema,
      views: runtimeConfig.views
    },
    connection: getConnectionStatus(),
    guardrails: [
      "브라우저는 Databricks 자격증명을 받지 않습니다.",
      "허용된 query_id만 백엔드에서 실행됩니다.",
      "SQL Warehouse만 사용하고 클러스터 직접 접근은 막습니다.",
      "응답은 row limit과 wait timeout으로 제한됩니다.",
      "실서비스에서는 secure view 또는 serving schema만 연결해야 합니다."
    ],
    queryCatalog: await toClientCatalog()
  };
}

function assertDate(value, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    const error = new Error(`${fieldName} must be in YYYY-MM-DD format.`);
    error.statusCode = 400;
    throw error;
  }
}

function assertDateWindow(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const maxWindowMs = requestWindowDays * 24 * 60 * 60 * 1000;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    const error = new Error("The date range is invalid.");
    error.statusCode = 400;
    throw error;
  }

  if (end.getTime() - start.getTime() > maxWindowMs) {
    const error = new Error(`The date range must be ${requestWindowDays} days or less.`);
    error.statusCode = 400;
    throw error;
  }
}

async function sanitizePayload(payload, viewer) {
  const queryId = String(payload?.queryId || "").trim();
  const queryDefinitions = await getQueryDefinitions();
  const query = queryDefinitions[queryId];

  if (!query || blockedQueryIds.has(queryId)) {
    const error = new Error("Unknown or blocked query_id.");
    error.statusCode = 400;
    throw error;
  }

  const params = {
    ...query.defaults,
    ...(payload?.params || {})
  };

  if ("startDate" in params || "endDate" in params) {
    assertDate(params.startDate, "startDate");
    assertDate(params.endDate, "endDate");
    assertDateWindow(params.startDate, params.endDate);
  }
  assertViewerIdentity(viewer);
  assertViewerGroups(viewer, query.client.requiredGroups, query.name);

  return { query, queryId, params };
}

export async function executeQuery(payload, viewer) {
  const { query, queryId, params } = await sanitizePayload(payload, viewer);
  const built = query.build(params);

  let execution;
  if (getDatabricksConnectionMode() === "databricks") {
    execution = await runDatabricksStatement({
      ...built,
      queryId
    });
  } else {
    execution = query.mock(params);
  }

  const report = query.present({
    mode: getDatabricksConnectionMode(),
    params,
    rows: execution.rows,
    audit: execution.audit
  });

  return {
    requestId: crypto.randomUUID(),
    executedAt: new Date().toISOString(),
    mode: getDatabricksConnectionMode(),
    query: {
      id: queryId,
      name: query.name,
      description: query.description
    },
    params,
    viewer: {
      email: viewer.email,
      groups: viewer.groups,
      authMode: viewer.authMode
    },
    ...report
  };
}
