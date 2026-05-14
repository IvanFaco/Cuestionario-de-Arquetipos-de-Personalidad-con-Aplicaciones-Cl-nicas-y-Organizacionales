import session, { type SessionData } from "express-session";

import type { SqliteClient } from "../database/sqlite/sqlite.client.js";

interface SessionRow {
  data_json: string;
  expires_at: string | null;
}

export class SqliteSessionStore extends session.Store {
  constructor(private readonly sqlite: SqliteClient) {
    super();
    this.deleteExpiredSessions();
  }

  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    try {
      const row = this.sqlite
        .prepare<[string], SessionRow | undefined>(
          "SELECT data_json, expires_at FROM sessions WHERE sid = ?"
        )
        .get(sid);

      if (!row) {
        callback(null, null);
        return;
      }

      if (isExpired(row.expires_at)) {
        this.destroy(sid, () => callback(null, null));
        return;
      }

      callback(null, JSON.parse(row.data_json) as SessionData);
    } catch (error) {
      callback(error);
    }
  }

  set(sid: string, sessionData: SessionData, callback?: (err?: unknown) => void): void {
    try {
      const now = new Date().toISOString();
      const expiresAt = resolveExpiresAt(sessionData);

      this.sqlite
        .prepare<[string, string, string | null, string, string], void>(
          `
            INSERT INTO sessions (sid, data_json, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(sid) DO UPDATE SET
              data_json = excluded.data_json,
              expires_at = excluded.expires_at,
              updated_at = excluded.updated_at
          `
        )
        .run(sid, JSON.stringify(sessionData), expiresAt, now, now);

      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      this.sqlite.prepare<[string], void>("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid: string, sessionData: SessionData, callback?: () => void): void {
    try {
      this.sqlite
        .prepare<[string | null, string, string], void>(
          "UPDATE sessions SET expires_at = ?, updated_at = ? WHERE sid = ?"
        )
        .run(resolveExpiresAt(sessionData), new Date().toISOString(), sid);
      callback?.();
    } catch (error) {
      this.emit("error", error);
      callback?.();
    }
  }

  private deleteExpiredSessions() {
    this.sqlite
      .prepare<[string], void>(
        "DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at <= ?"
      )
      .run(new Date().toISOString());
  }
}

function resolveExpiresAt(sessionData: SessionData): string | null {
  const expires = sessionData.cookie?.expires;

  if (expires) {
    const expiresAt = expires instanceof Date ? expires : new Date(expires);

    if (!Number.isNaN(expiresAt.getTime())) {
      return expiresAt.toISOString();
    }
  }

  if (typeof sessionData.cookie?.maxAge === "number") {
    return new Date(Date.now() + sessionData.cookie.maxAge).toISOString();
  }

  return null;
}

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}
