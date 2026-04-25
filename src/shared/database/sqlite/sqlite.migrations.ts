export interface SqliteMigration {
  id: string;
  sql: string;
}

export const sqliteMigrations: SqliteMigration[] = [
  {
    id: "001_create_users",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
  },
  {
    id: "002_create_assessment_states",
    sql: `
      CREATE TABLE IF NOT EXISTS assessment_states (
        user_id TEXT PRIMARY KEY,
        lead_name TEXT,
        lead_pronombres TEXT,
        demo_json TEXT,
        hook_answers_json TEXT NOT NULL,
        premium_answers_json TEXT NOT NULL,
        hook_outcome_json TEXT,
        premium_outcome_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `
  },
  {
    id: "003_create_questions",
    sql: `
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('hook', 'premium')),
        prompt TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
      CREATE INDEX IF NOT EXISTS idx_questions_sort ON questions(type, sort_order);
    `
  }
];
