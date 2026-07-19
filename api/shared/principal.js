// Helpers for reading the authenticated user inside SWA managed Functions.
//
// Static Web Apps injects the signed-in user into every /api request as a
// base64-encoded JSON header, `x-ms-client-principal`. This is the ONLY
// trustworthy source of the caller's identity - never trust an id/email from
// the request body, or a user could act as someone else.

function getClientPrincipal(req) {
  const headers = (req && req.headers) || {};
  const header = headers["x-ms-client-principal"] || headers["X-MS-CLIENT-PRINCIPAL"];
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    if (!principal || !principal.userId) return null;
    return principal;
  } catch (e) {
    return null;
  }
}

module.exports = { getClientPrincipal };
