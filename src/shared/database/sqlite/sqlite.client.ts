import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { getDatabasePath } from "../database.config.js";
import type { DatabaseBootstrapper } from "../database.types.js";
import { sqliteMigrations } from "./sqlite.migrations.js";

export class SqliteClient implements DatabaseBootstrapper {
  private readonly db: Database.Database;

  constructor() {
    const databasePath = getDatabasePath();

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const insertMigration = this.db.prepare(
      "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)"
    );
    const findMigration = this.db.prepare<[string], { id: string } | undefined>(
      "SELECT id FROM schema_migrations WHERE id = ?"
    );

    const applyMigration = this.db.transaction((migrationId: string, sql: string) => {
      this.db.exec(sql);
      insertMigration.run(migrationId, new Date().toISOString());
    });

    for (const migration of sqliteMigrations) {
      if (findMigration.get(migration.id)) {
        continue;
      }

      applyMigration(migration.id, migration.sql);
    }
  }

  prepare<TBind extends unknown[] = unknown[], TResult = unknown>(sql: string) {
    return this.db.prepare<TBind, TResult>(sql);
  }
}
