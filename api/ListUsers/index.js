// Returns every registered user for the /admin dashboard.
//
// Admins only. The route rule in staticwebapp.config.json already requires the
// "admin" role; we check it again here from the trusted x-ms-client-principal
// header so the data never leaks if the route rule is ever loosened.

const { getClientPrincipal } = require("../shared/principal");
const { getUsersTableClient } = require("../shared/table");
const { ALLOWLIST_ENABLED, canRead } = require("../shared/access");

const CONNECTION_STRING = process.env.USERS_TABLE_CONNECTION_STRING;
const PARTITION_KEY = "google";
const ADMIN_ROLE = "admin";

function isNotFound(err) {
  return err && (err.statusCode === 404 || (err.details && err.details.errorCode === "ResourceNotFound"));
}

module.exports = async function (context, req) {
  const principal = getClientPrincipal(req);
  if (!principal) {
    context.res = { status: 401, body: { error: "Not authenticated" } };
    return;
  }
  if (!(principal.userRoles || []).includes(ADMIN_ROLE)) {
    context.res = { status: 403, body: { error: "Admins only" } };
    return;
  }
  if (!CONNECTION_STRING) {
    context.res = { status: 500, body: { error: "Datastore not configured" } };
    return;
  }

  const client = getUsersTableClient();
  const users = [];

  try {
    const entities = client.listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` },
    });
    for await (const e of entities) {
      const role = e.role || "student";
      users.push({
        email: e.email || "",
        firstName: e.firstName || "",
        lastName: e.lastName || "",
        pictureUrl: e.pictureUrl || "",
        role,
        hasAccess: canRead(role, e.email),
        profileComplete: e.profileComplete === true,
        country: e.country || "",
        onTeam: e.onTeam === true,
        teamName: e.teamName || "",
        teamNumber: e.teamNumber || "",
        programType: e.programType || "",
        teamRole: e.teamRole || "",
        createdAt: e.createdAt || "",
        lastLoginAt: e.lastLoginAt || "",
        profileCompletedAt: e.profileCompletedAt || "",
      });
    }
  } catch (err) {
    if (!isNotFound(err)) {
      context.log.error("ListUsers failed:", err && err.message ? err.message : err);
      context.res = { status: 500, body: { error: "Lookup failed" } };
      return;
    }
    // Table missing -> no users yet.
  }

  context.res = {
    status: 200,
    headers: { "Cache-Control": "no-store" },
    body: { allowlistEnabled: ALLOWLIST_ENABLED, users },
  };
};
