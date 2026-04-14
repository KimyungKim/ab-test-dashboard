import "./env-loader.mjs";

const requiredEnvVars = [
  "DATABRICKS_HOST",
  "DATABRICKS_CLIENT_ID",
  "DATABRICKS_CLIENT_SECRET",
  "DATABRICKS_SQL_WAREHOUSE_ID"
];

const tokenCache = {
  accessToken: null,
  expiresAt: 0
};

function normalizeValue(value) {
  return String(value || "").trim();
}

function extractJdbcParts(rawValue) {
  const value = normalizeValue(rawValue);
  if (!value.startsWith("jdbc:databricks://")) {
    return {
      host: value,
      httpPath: ""
    };
  }

  const withoutPrefix = value.replace(/^jdbc:databricks:\/\//u, "");
  const [hostPortPart, ...paramParts] = withoutPrefix.split(";");
  const host = hostPortPart.split("/")[0].replace(/:443$/u, "");
  const httpPathEntry = paramParts.find(part => part.startsWith("httpPath="));

  return {
    host,
    httpPath: httpPathEntry ? httpPathEntry.replace(/^httpPath=/u, "") : ""
  };
}

function normalizeHost() {
  const rawHost = extractJdbcParts(process.env.DATABRICKS_HOST).host;
  return rawHost.replace(/^https?:\/\//u, "").replace(/\/+$/u, "");
}

function getHttpPath() {
  return normalizeValue(process.env.DATABRICKS_HTTP_PATH) || extractJdbcParts(process.env.DATABRICKS_HOST).httpPath;
}

function parseWarehouseIdFromHttpPath(httpPath) {
  const match = normalizeValue(httpPath).match(/\/sql\/1\.0\/warehouses\/([^/?]+)/u);
  return match ? match[1] : "";
}

function getWarehouseId() {
  return normalizeValue(process.env.DATABRICKS_SQL_WAREHOUSE_ID) || parseWarehouseIdFromHttpPath(getHttpPath());
}

function isOAuthConfigured() {
  return Boolean(normalizeHost()) &&
    Boolean(process.env.DATABRICKS_CLIENT_ID) &&
    Boolean(process.env.DATABRICKS_CLIENT_SECRET) &&
    Boolean(getWarehouseId());
}

function isPatConfigured() {
  return Boolean(normalizeHost()) && Boolean(process.env.DATABRICKS_TOKEN) && Boolean(getWarehouseId());
}

export function getDatabricksAuthType() {
  if (isPatConfigured()) {
    return "pat";
  }

  if (isOAuthConfigured()) {
    return "oauth";
  }

  return "none";
}

export function getDatabricksConnectionMode() {
  if ((process.env.APP_MODE || "mock").trim().toLowerCase() !== "databricks") {
    return "mock";
  }

  return getDatabricksAuthType() === "none" ? "mock" : "databricks";
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.raw ||
      `Databricks request failed with status ${response.status}.`;
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }

  return payload;
}

async function getAccessToken() {
  if (getDatabricksAuthType() === "pat") {
    return normalizeValue(process.env.DATABRICKS_TOKEN);
  }

  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const host = normalizeHost();
  const clientId = process.env.DATABRICKS_CLIENT_ID;
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET;

  const tokenPayload = await fetchJson(`https://${host}/oidc/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "all-apis"
    })
  });

  tokenCache.accessToken = tokenPayload.access_token;
  tokenCache.expiresAt = now + Number(tokenPayload.expires_in || 3600) * 1000;
  return tokenCache.accessToken;
}

function coerceValue(value, column) {
  if (value === null || value === undefined) {
    return value;
  }

  const typeName = String(column?.type_name || "").toUpperCase();
  if (["BIGINT", "INT", "INTEGER", "LONG", "SHORT", "TINYINT", "DECIMAL", "DOUBLE", "FLOAT"].includes(typeName)) {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }

  if (typeName === "BOOLEAN") {
    return value === true || value === "true";
  }

  return value;
}

function mapRows(manifest, chunks) {
  const columns = manifest?.schema?.columns || [];
  const rows = [];

  for (const chunk of chunks) {
    for (const rawRow of chunk?.data_array || []) {
      const record = {};
      columns.forEach((column, index) => {
        record[column.name] = coerceValue(rawRow[index], column);
      });
      rows.push(record);
    }
  }

  return rows;
}

async function pollStatement(host, statementId, authHeaders, { maxAttempts = 120, intervalMs = 2000 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const payload = await fetchJson(`https://${host}/api/2.0/sql/statements/${statementId}`, {
      method: "GET",
      headers: authHeaders
    });

    const state = payload?.status?.state;
    if (state === "SUCCEEDED" || state === "FAILED" || state === "CANCELED" || state === "CLOSED") {
      return payload;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  const error = new Error("Databricks statement timed out while polling results.");
  error.statusCode = 504;
  throw error;
}

async function collectChunks(host, initialPayload, authHeaders) {
  const chunks = [initialPayload.result];
  let nextChunk = initialPayload.result?.next_chunk_internal_link;

  while (nextChunk) {
    const chunkPayload = await fetchJson(`https://${host}${nextChunk}`, {
      method: "GET",
      headers: authHeaders
    });
    chunks.push(chunkPayload.result);
    nextChunk = chunkPayload.result?.next_chunk_internal_link;
  }

  return chunks;
}

async function executeStatementOnce(payload) {
  const host = normalizeHost();
  const token = await getAccessToken();
  const warehouseId = getWarehouseId();
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const statementPayload = await fetchJson(`https://${host}/api/2.0/sql/statements/`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      warehouse_id: warehouseId,
      catalog: payload.catalog,
      schema: payload.schema,
      statement: payload.statement,
      parameters: payload.parameters,
      format: "JSON_ARRAY",
      disposition: "INLINE",
      wait_timeout: "30s",
      on_wait_timeout: "CONTINUE",
      row_limit: payload.rowLimit || 366
    })
  });

  const terminalPayload =
    statementPayload?.status?.state === "SUCCEEDED"
      ? statementPayload
      : await pollStatement(host, statementPayload.statement_id, authHeaders);

  const state = terminalPayload?.status?.state;
  if (state !== "SUCCEEDED") {
    const detail = terminalPayload?.status?.error?.message || terminalPayload?.status?.error?.error_code || "";
    const msg = detail
      ? `Databricks statement ended with status ${state || "UNKNOWN"}: ${detail}`
      : `Databricks statement ended with status ${state || "UNKNOWN"}.`;
    const s = String(payload.statement);
    console.error("[FAILED SQL chars 1400-1900]\n" + s.slice(1400, 1900));
    const error = new Error(msg);
    error.statusCode = 502;
    throw error;
  }

  const chunks = await collectChunks(host, terminalPayload, authHeaders);
  const rows = mapRows(terminalPayload.manifest, chunks);

  return {
    rows,
    audit: {
      source: "databricks",
      statementId: terminalPayload.statement_id,
      rowCount: rows.length,
      truncated: Boolean(terminalPayload.manifest?.truncated)
    }
  };
}

export async function runDatabricksStatement(payload) {
  try {
    return await executeStatementOnce(payload);
  } catch (error) {
    const message = String(error?.message || "");
    const retryable = error?.statusCode === 504 || message.includes("status CANCELED");
    if (!retryable) {
      throw error;
    }
    return executeStatementOnce(payload);
  }
}
