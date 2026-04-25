import { env } from "../../config/env.js";
import { getDatabaseClient } from "./database.factory.js";
import { SqliteInspector } from "./sqlite/sqlite.inspector.js";

let databaseInspector: SqliteInspector | null = null;

export function getDatabaseInspector() {
  if (env.databaseProvider !== "sqlite") {
    throw new Error(`Unsupported database provider for inspector: ${env.databaseProvider}`);
  }

  databaseInspector ??= new SqliteInspector(getDatabaseClient());
  return databaseInspector;
}
