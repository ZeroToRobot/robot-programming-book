// Saves the onboarding profile for the signed-in user and marks it complete.
// The caller is identified from the trusted x-ms-client-principal header, so a
// request can only ever write the caller's own row. Google-derived fields
// (name/picture/role/createdAt) are preserved via a Merge upsert.

const { TableClient } = require("@azure/data-tables");
const { getClientPrincipal } = require("../shared/principal");

const CONNECTION_STRING = process.env.USERS_TABLE_CONNECTION_STRING;
const TABLE_NAME = "Users";
const PARTITION_KEY = "google";

const PROGRAM_TYPES = ["FRC", "FTC", "FLL", "VEX", "Other"];
const TEAM_ROLES = [
  "Student - Programmer",
  "Student - Other",
  "Mentor",
  "Coach",
  "Lead/Captain",
  "Other",
];

function str(v, max) {
  if (v === undefined || v === null) return "";
  return String(v).trim().slice(0, max || 200);
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

  const body = req.body || {};

  const firstName = str(body.firstName, 100);
  const lastName = str(body.lastName, 100);
  const country = str(body.country, 100);
  const onTeam = body.onTeam === true || body.onTeam === "true" || body.onTeam === "yes";

  const errors = [];
  if (!firstName) errors.push("First name is required.");
  if (!country) errors.push("Country is required.");

  let teamName = "";
  let teamNumber = "";
  let teamRole = "";
  let programType = "";

  if (onTeam) {
    teamName = str(body.teamName, 150);
    teamNumber = str(body.teamNumber, 20);
    teamRole = str(body.teamRole, 60);
    programType = str(body.programType, 20);

    if (!teamName) errors.push("Team or club name is required.");
    if (!PROGRAM_TYPES.includes(programType)) errors.push("A valid program type is required.");
    if (!TEAM_ROLES.includes(teamRole)) errors.push("A valid role on the team is required.");
    if (teamNumber && !/^\d{1,7}$/.test(teamNumber)) errors.push("Team number must be numeric.");
  }

  if (errors.length) {
    context.res = { status: 400, body: { error: "Validation failed", details: errors } };
    return;
  }

  const client = TableClient.fromConnectionString(CONNECTION_STRING, TABLE_NAME);
  const now = new Date().toISOString();

  const entity = {
    partitionKey: PARTITION_KEY,
    rowKey: principal.userId,
    email: principal.userDetails || "",
    firstName,
    lastName,
    country,
    onTeam,
    teamName,
    teamNumber,
    teamRole,
    programType,
    profileComplete: true,
    profileCompletedAt: now,
  };

  try {
    try {
      await client.createTable();
    } catch (e) {
      /* already exists */
    }
    // Merge upsert: create if missing, otherwise merge onto the existing row
    // without clobbering fields we don't send (name/picture/role/createdAt).
    await client.upsertEntity(entity, "Merge");
    context.res = { status: 200, body: { ok: true, profileComplete: true } };
  } catch (err) {
    context.log.error("SaveProfile failed:", err && err.message ? err.message : err);
    context.res = { status: 500, body: { error: "Save failed" } };
  }
};
