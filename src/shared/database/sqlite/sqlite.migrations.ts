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
  },
  {
    id: "004_create_payments",
    sql: `
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_code TEXT NOT NULL,
        reference TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED')),
        amount_in_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_transaction_id TEXT,
        provider_payment_method TEXT,
        checkout_payload_json TEXT,
        last_event_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        approved_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payments_user_product_status
        ON payments(user_id, product_code, status);
      CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction
        ON payments(provider_transaction_id);
    `
  }
];
