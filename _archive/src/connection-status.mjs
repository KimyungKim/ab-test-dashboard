import "./env-loader.mjs";
import { getDatabricksAuthType } from "./databricks-client.mjs";

const oauthEnvVars = ["DATABRICKS_HOST", "DATABRICKS_CLIENT_ID", "DATABRICKS_CLIENT_SECRET", "DATABRICKS_SQL_WAREHOUSE_ID"];

export function getConnectionStatus() {
  const authType = getDatabricksAuthType();
  const appMode = (process.env.APP_MODE || "mock").trim().toLowerCase();
  const values = {
    DATABRICKS_HOST: Boolean(process.env.DATABRICKS_HOST),
    DATABRICKS_HTTP_PATH: Boolean(process.env.DATABRICKS_HTTP_PATH),
    DATABRICKS_TOKEN: Boolean(process.env.DATABRICKS_TOKEN),
    DATABRICKS_CLIENT_ID: Boolean(process.env.DATABRICKS_CLIENT_ID),
    DATABRICKS_CLIENT_SECRET: Boolean(process.env.DATABRICKS_CLIENT_SECRET),
    DATABRICKS_SQL_WAREHOUSE_ID: Boolean(process.env.DATABRICKS_SQL_WAREHOUSE_ID)
  };
  const missing = [];

  if (!values.DATABRICKS_HOST) {
    missing.push("DATABRICKS_HOST");
  }

  if (authType === "oauth") {
    if (!values.DATABRICKS_CLIENT_ID) {
      missing.push("DATABRICKS_CLIENT_ID");
    }
    if (!values.DATABRICKS_CLIENT_SECRET) {
      missing.push("DATABRICKS_CLIENT_SECRET");
    }
    if (!values.DATABRICKS_SQL_WAREHOUSE_ID) {
      missing.push("DATABRICKS_SQL_WAREHOUSE_ID");
    }
  } else {
    if (!values.DATABRICKS_TOKEN) {
      missing.push("DATABRICKS_TOKEN");
    }
    if (!values.DATABRICKS_HTTP_PATH && !values.DATABRICKS_SQL_WAREHOUSE_ID && !String(process.env.DATABRICKS_HOST || "").includes("httpPath=")) {
      missing.push("DATABRICKS_HTTP_PATH or DATABRICKS_SQL_WAREHOUSE_ID");
    }
  }

  return {
    appMode,
    authType,
    readyForDatabricks: appMode === "databricks" && missing.length === 0,
    requiredEnvVars: authType === "oauth" ? oauthEnvVars : ["DATABRICKS_HOST", "DATABRICKS_TOKEN", "DATABRICKS_HTTP_PATH or DATABRICKS_SQL_WAREHOUSE_ID"],
    providedEnvVars: values,
    missingEnvVars: missing,
    loginGuide: [
      "PAT 방식이면 server hostname, HTTP path, personal access token을 서버 환경변수로 넣습니다.",
      "JDBC 전체 문자열을 DATABRICKS_HOST에 붙여 넣어도 앱이 host와 httpPath를 분리해서 읽습니다.",
      "APP_MODE를 databricks로 바꿉니다.",
      "웹페이지에는 별도 Databricks 로그인 화면이 없습니다. 앱 서버가 PAT 또는 OAuth로 대신 인증합니다.",
      "사용자는 이 웹앱 URL만 접속하면 되고, 실제 Databricks 인증은 서버 뒤에서만 처리됩니다."
    ]
  };
}
