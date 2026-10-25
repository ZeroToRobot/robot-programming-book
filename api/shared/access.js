// Pre-launch access rules, shared by GetRoles (which grants the roles) and
// ListUsers (which shows who has access on the admin dashboard).
//
// The book requires the "reader" role, which we add only for emails (or
// "@domain" entries) listed in the ALLOWED_EMAILS app setting, plus mentors and
// admins. Set ALLOWLIST_ENABLED=false at launch to give every signed-in user
// "reader". Both are SWA app settings, so changing them needs no redeploy; a
// user's roles refresh on their next sign-in.

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

function canRead(role, email) {
  return isAllowed(email) || ALWAYS_READER_ROLES.includes(role);
}

// The user's stored role, plus "reader" if they may view the book.
function rolesFor(role, email) {
  return canRead(role, email) ? [role, READER_ROLE] : [role];
}

module.exports = { ALLOWLIST_ENABLED, canRead, rolesFor };
