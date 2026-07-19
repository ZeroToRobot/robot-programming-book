// SWA rolesSource function.
//
// Static Web Apps calls this endpoint on every login with the user's identity
// in the request body. We upsert the user into Azure Table Storage (new users
// default to the "student" role) and return the user's role(s) to SWA.
//
// Today all authenticated users can view the book (gating is "authenticated"),
// so roles are stored for future role-based access but not yet used to
// differentiate what a user can see.

const { TableClient } = require("@azure/data-tables");

const CONNECTION_STRING = process.env.USERS_TABLE_CONNECTION_STRING;
const TABLE_NAME = "Users";
const PARTITION_KEY = "google";
const DEFAULT_ROLE = "student";
const VALID_ROLES = ["student", "mentor", "admin"];

function findClaim(claims, type) {
  if (!Array.isArray(claims)) return undefined;
  const match = claims.find(
    (c) => c && typeof c.typ === "string" && c.typ.toLowerCase() === type.toLowerCase()
  );
  return match ? match.val : undefined;
}

function isNotFound(err) {
  return err && (err.statusCode === 404 || (err.details && err.details.errorCode === "ResourceNotFound"));
}

module.exports = async function (context, req) {
  const body = req.body || {};
  const userId = body.userId;
  const claims = body.claims || [];

  // No identity provided: grant no custom roles. SWA still assigns the built-in
  // "authenticated" role, which is all today's gating requires.
  if (!userId) {
    context.res = { status: 200, body: { roles: [] } };
    return;
  }

  const email = body.userDetails || findClaim(claims, "email") || "";
  const name = findClaim(claims, "name") || email;

  // If the datastore is not configured, fail open to "student" so login is not
  // blocked. (Role differentiation is not enforced yet, so this is safe today.)
  if (!CONNECTION_STRING) {
    context.log.error("USERS_TABLE_CONNECTION_STRING is not set; returning default role.");
    context.res = { status: 200, body: { roles: [DEFAULT_ROLE] } };
    return;
  }

  const client = TableClient.fromConnectionString(CONNECTION_STRING, TABLE_NAME);
  const now = new Date().toISOString();

  async function ensureTableExists() {
    try {
      await client.createTable();
    } catch (err) {
      // Table already exists (409) or a benign race - ignore.
    }
  }

  try {
    let existing = null;
    try {
      existing = await client.getEntity(PARTITION_KEY, userId);
    } catch (err) {
      if (!isNotFound(err)) throw err; // real error, not "user/table missing"
    }

    let role = DEFAULT_ROLE;

    if (!existing) {
      // First login for this user -> create as a student.
      await ensureTableExists();
      try {
        await client.createEntity({
          partitionKey: PARTITION_KEY,
          rowKey: userId,
          email,
          name,
          role: DEFAULT_ROLE,
          createdAt: now,
          lastLoginAt: now,
        });
      } catch (err) {
        if (err && err.statusCode === 409) {
          // Concurrent first login created it; read back the role.
          const raced = await client.getEntity(PARTITION_KEY, userId);
          role = VALID_ROLES.includes(raced.role) ? raced.role : DEFAULT_ROLE;
        } else {
          throw err;
        }
      }
    } else {
      // Returning user -> keep their stored role, refresh metadata.
      role = VALID_ROLES.includes(existing.role) ? existing.role : DEFAULT_ROLE;
      await client.updateEntity(
        { partitionKey: PARTITION_KEY, rowKey: userId, email, name, lastLoginAt: now },
        "Merge"
      );
    }

    context.res = { status: 200, body: { roles: [role] } };
  } catch (err) {
    context.log.error("GetRoles failed:", err && err.message ? err.message : err);
    // Fail open so a transient datastore issue does not lock users out.
    context.res = { status: 200, body: { roles: [DEFAULT_ROLE] } };
  }
};
