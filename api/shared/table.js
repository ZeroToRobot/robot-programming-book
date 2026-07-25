// Builds the Users TableClient from USERS_TABLE_CONNECTION_STRING.
//
// Production: a standard HTTPS connection string (stays strict).
// Local emulator (Azurite): a dev/HTTP connection string. Azurite serves over
// plain HTTP, so we opt in to allowInsecureConnection for the dev case only.
// Prefer the "UseDevelopmentStorage=true" shorthand locally - the SDK maps it
// to the correct dev endpoints + canonicalization (the same form the Functions
// host uses), which Azurite accepts.

const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "Users";

function getUsersTableClient() {
  const conn = process.env.USERS_TABLE_CONNECTION_STRING;
  if (!conn) return null;

  const isDev =
    /UseDevelopmentStorage=true/i.test(conn) ||
    /devstoreaccount1/i.test(conn) ||
    /DefaultEndpointsProtocol=http\b/i.test(conn) ||
    /http:\/\//i.test(conn);

  return TableClient.fromConnectionString(
    conn,
    TABLE_NAME,
    isDev ? { allowInsecureConnection: true } : undefined
  );
}

module.exports = { getUsersTableClient, TABLE_NAME };
