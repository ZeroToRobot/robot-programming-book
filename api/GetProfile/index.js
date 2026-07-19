// Returns the signed-in user's profile (including profileComplete), used by the
// book's client-side gate and to prefill the /welcome form. The caller is
// identified from the trusted x-ms-client-principal header only.

const { TableClient } = require("@azure/data-tables");
const { getClientPrincipal } = require("../shared/principal");

const CONNECTION_STRING = process.env.USERS_TABLE_CONNECTION_STRING;
const TABLE_NAME = "Users";
const PARTITION_KEY = "google";

function isNotFound(err) {
  return err && (err.statusCode === 404 || (err.details && err.details.errorCode === "ResourceNotFound"));
}

module.exports = async function (context, req) {
  const principal = getClientPrincipal(req);
  if (!principal) {
    context.res = { status: 401, body: { error: "Not authenticated" } };
    return;
  }
  if (!CONNECTION_STRING) {
    context.res = { status: 500, body: { error: "Datastore not configured" } };
    return;
  }

  const client = TableClient.fromConnectionString(CONNECTION_STRING, TABLE_NAME);

  try {
    const e = await client.getEntity(PARTITION_KEY, principal.userId);
    context.res = {
      status: 200,
      body: {
        email: e.email || principal.userDetails || "",
        firstName: e.firstName || "",
        lastName: e.lastName || "",
        pictureUrl: e.pictureUrl || "",
        country: e.country || "",
        onTeam: e.onTeam === true,
        teamName: e.teamName || "",
        teamNumber: e.teamNumber || "",
        teamRole: e.teamRole || "",
        programType: e.programType || "",
        role: e.role || "student",
        profileComplete: e.profileComplete === true,
      },
    };
  } catch (err) {
    if (isNotFound(err)) {
      // No record yet (or table missing) -> profile is incomplete.
      context.res = {
        status: 200,
        body: { profileComplete: false, email: principal.userDetails || "" },
      };
      return;
    }
    context.log.error("GetProfile failed:", err && err.message ? err.message : err);
    context.res = { status: 500, body: { error: "Lookup failed" } };
  }
};
