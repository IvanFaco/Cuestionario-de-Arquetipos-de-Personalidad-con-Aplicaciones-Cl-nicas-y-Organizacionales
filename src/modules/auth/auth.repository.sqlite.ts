import crypto from "node:crypto";

import type { SqliteClient } from "../../shared/database/sqlite/sqlite.client.js";
import type { AuthRepository, CreateUserInput, UserRecord } from "./auth.types.js";

interface SqliteUserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

function mapUserRow(row: SqliteUserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SqliteAuthRepository implements AuthRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  findUserById(id: string): UserRecord | null {
    const row = this.sqlite
      .prepare<[string], SqliteUserRow | undefined>(
        `
          SELECT id, email, password_hash, created_at, updated_at
          FROM users
          WHERE id = ?
        `
      )
      .get(id);

    return row ? mapUserRow(row) : null;
  }

  findUserByEmail(email: string): UserRecord | null {
    const row = this.sqlite
      .prepare<[string], SqliteUserRow | undefined>(
        `
          SELECT id, email, password_hash, created_at, updated_at
          FROM users
          WHERE email = ?
        `
      )
      .get(email);

    return row ? mapUserRow(row) : null;
  }

  createUser(input: CreateUserInput): UserRecord {
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO users (id, email, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(user.id, user.email, user.passwordHash, user.createdAt, user.updatedAt);

    return user;
  }

  updatePassword(userId: string, passwordHash: string): void {
    this.sqlite
      .prepare(
        `
          UPDATE users
          SET password_hash = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(passwordHash, new Date().toISOString(), userId);
  }
}
