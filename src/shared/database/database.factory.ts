import { env } from "../../config/env.js";
import { SqliteClient } from "./sqlite/sqlite.client.js";

let sqliteClient: SqliteClient | null = null;

export function getDatabaseClient() {
  if (env.databaseProvider !== "sqlite") {
    throw new Error(`Unsupported database provider: ${env.databaseProvider}`);
  }

  sqliteClient ??= new SqliteClient();
  return sqliteClient;
}
