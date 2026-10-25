// SWA rolesSource function.
//
// Static Web Apps calls this endpoint on every login with the user's identity
// in the request body. We upsert the user into Azure Table Storage (new users
// default to the "student" role, with profileComplete=false) and return the
// user's role(s) to SWA. We also capture/refresh the Google-derived profile
// fields (first name, last name, picture) from the token claims.
//
// Pre-launch allow list: the book requires the "reader" role, which we add only
// for emails (or "@domain" entries) listed in the ALLOWED_EMAILS app setting,
// plus mentors and admins. Set ALLOWLIST_ENABLED=false at launch to give every
// signed-in user "reader". Both are SWA app settings, so changing them needs no
// redeploy; a user's roles refresh on their next sign-in.

const { getUsersTableClient } = require("../shared/table");

const CONNECTION_STRING = process.env.USERS_TABLE_CONNECTION_STRING;
const PARTITION_KEY = "google";
const DEFAULT_ROLE = "student";
const VALID_ROLES = ["student", "mentor", "admin"];
const READER_ROLE = "reader";
const ALWAYS_READER_ROLES = ["mentor", "admin"];

const ALLOWLIST_ENABLED = (process.env.ALLOWLIST_ENABLED || "").trim().toLowerCase() !== "false";
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "")
  .split(/[\s,;]+/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isAllowed(email) {
  if (!ALLOWLIST_ENABLED) return true;
  const e = (email || "").trim().toLowerCase();
  if (!e) return false;
  const at = e.lastIndexOf("@");
  return ALLOWED_EMAILS.includes(e) || (at > 0 && ALLOWED_EMAILS.includes(e.slice(at)));
}

// The user's stored role, plus "reader" if they may view the book.
function rolesFor(role, email) {
  const roles = [role];
  if (isAllowed(email) || ALWAYS_READER_ROLES.includes(role)) roles.push(READER_ROLE);
  return roles;
}

function findClaim(claims, types) {
  if (!Array.isArray(claims)) return undefined;
  const wanted = (Array.isArray(types) ? types : [types]).map((t) => t.toLowerCase());
  const match = claims.find(
    (c) => c && typeof c.typ === "string" && wanted.includes(c.typ.toLowerCase())
  );
  return match ? match.val : undefined;
}

function splitName(full) {
  if (!full) return { first: "", last: "" };
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

function isNotFound(err) {
  return err && (err.statusCode === 404 || (err.details && err.details.errorCode === "ResourceNotFound"));
}

module.exports = async function (context, req) {
  const body = req.body || {};
  const userId = body.userId;
  const claims = body.claims || [];

  // No identity: grant no custom roles. SWA still assigns built-in "authenticated".
  if (!userId) {
    context.res = { status: 200, body: { roles: [] } };
    return;
  }

  const email = body.userDetails || findClaim(claims, ["email", "emails"]) || "";
  const fullName = findClaim(claims, ["name"]) || email;
  const derived = splitName(fullName);
  const firstName = findClaim(claims, ["given_name", "givenname"]) || derived.first;
  const lastName = findClaim(claims, ["family_name", "familyname", "surname"]) || derived.last;
  const pictureUrl = findClaim(claims, ["picture"]) || "";

  // Datastore not configured: fail open to "student" so login is not blocked.
  // The allow list does not need the datastore, so it still applies here.
  if (!CONNECTION_STRING) {
    context.log.error("USERS_TABLE_CONNECTION_STRING is not set; returning default role.");
    context.res = { status: 200, body: { roles: rolesFor(DEFAULT_ROLE, email) } };
    return;
  }

  const client = getUsersTableClient();
  const now = new Date().toISOString();

  async function ensureTableExists() {
    try {
      await client.createTable();
    } catch (err) {
      /* already exists */
    }
  }

  try {
    let existing = null;
    try {
      existing = await client.getEntity(PARTITION_KEY, userId);
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }

    let role = DEFAULT_ROLE;

    if (!existing) {
      // First login -> create as a student with an incomplete profile.
      await ensureTableExists();
      const entity = {
        partitionKey: PARTITION_KEY,
        rowKey: userId,
        email,
        name: fullName,
        firstName,
        lastName,
        pictureUrl,
        role: DEFAULT_ROLE,
        profileComplete: false,
        createdAt: now,
        lastLoginAt: now,
      };
      try {
        await client.createEntity(entity);
      } catch (err) {
        if (err && err.statusCode === 409) {
          const raced = await client.getEntity(PARTITION_KEY, userId);
          role = VALID_ROLES.includes(raced.role) ? raced.role : DEFAULT_ROLE;
        } else {
          throw err;
        }
      }
    } else {
      // Returning user -> keep role + profile fields; refresh Google metadata.
      role = VALID_ROLES.includes(existing.role) ? existing.role : DEFAULT_ROLE;
      const update = {
        partitionKey: PARTITION_KEY,
        rowKey: userId,
        email,
        name: fullName,
        lastLoginAt: now,
      };
      if (firstName) update.firstName = firstName;
      if (lastName) update.lastName = lastName;
      if (pictureUrl) update.pictureUrl = pictureUrl;
      await client.updateEntity(update, "Merge");
    }

    context.res = { status: 200, body: { roles: rolesFor(role, email) } };
  } catch (err) {
    context.log.error("GetRoles failed:", err && err.message ? err.message : err);
    // Fail open so a transient datastore issue does not lock users out.
    context.res = { status: 200, body: { roles: rolesFor(DEFAULT_ROLE, email) } };
  }
};
