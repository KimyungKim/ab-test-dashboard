import "./env-loader.mjs";

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function parseHeaderList(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

export function getAuthConfig() {
  return {
    requireIdentity: truthy(process.env.REQUIRE_USER_IDENTITY),
    trustedEmailHeader: process.env.TRUSTED_USER_EMAIL_HEADER || "x-user-email",
    trustedGroupsHeader: process.env.TRUSTED_USER_GROUPS_HEADER || "x-user-groups",
    defaultEmail: process.env.DEFAULT_USER_EMAIL || "local.analyst@company.internal",
    defaultGroups: parseHeaderList(process.env.DEFAULT_USER_GROUPS || "analytics-secure,ae-readers,analytics-admin")
  };
}

export function getViewerFromHeaders(headers) {
  const authConfig = getAuthConfig();
  const emailHeader = headers[authConfig.trustedEmailHeader] || headers[authConfig.trustedEmailHeader.toLowerCase()];
  const groupsHeader = headers[authConfig.trustedGroupsHeader] || headers[authConfig.trustedGroupsHeader.toLowerCase()];
  const viewer = {
    email: String(emailHeader || "").trim(),
    groups: unique(parseHeaderList(groupsHeader)),
    authMode: authConfig.requireIdentity ? "trusted-header" : "local-dev"
  };

  if (!viewer.email && !authConfig.requireIdentity) {
    viewer.email = authConfig.defaultEmail;
    viewer.groups = unique(viewer.groups.length ? viewer.groups : authConfig.defaultGroups);
  }

  return viewer;
}

export function assertViewerIdentity(viewer) {
  const authConfig = getAuthConfig();
  if (!authConfig.requireIdentity) {
    return;
  }

  if (!viewer.email) {
    const error = new Error("User identity is required. Configure your reverse proxy to pass the trusted identity headers.");
    error.statusCode = 401;
    throw error;
  }
}

export function assertViewerGroups(viewer, requiredGroups, queryName) {
  if (!requiredGroups?.length) {
    return;
  }

  const hasAccess = viewer.groups.some(group => requiredGroups.includes(group));
  if (!hasAccess) {
    const error = new Error(`You do not have access to ${queryName}. Required group: ${requiredGroups.join(" or ")}.`);
    error.statusCode = 403;
    throw error;
  }
}
