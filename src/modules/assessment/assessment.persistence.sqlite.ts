import type { SqliteClient } from "../../shared/database/sqlite/sqlite.client.js";
import type { AssessmentPersistenceRepository } from "./assessment.persistence.types.js";
import type { AssessmentSessionState } from "./assessment.types.js";

interface AssessmentStateRow {
  lead_name: string | null;
  lead_pronombres: string | null;
  demo_json: string | null;
  hook_answers_json: string;
  premium_answers_json: string;
  hook_outcome_json: string | null;
  premium_outcome_json: string | null;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

export class SqliteAssessmentPersistenceRepository implements AssessmentPersistenceRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  findStateByUserId(userId: string): AssessmentSessionState | null {
    const row = this.sqlite
      .prepare<[string], AssessmentStateRow | undefined>(
        `
          SELECT
            lead_name,
            lead_pronombres,
            demo_json,
            hook_answers_json,
            premium_answers_json,
            hook_outcome_json,
            premium_outcome_json
          FROM assessment_states
          WHERE user_id = ?
        `
      )
      .get(userId);

    if (!row) {
      return null;
    }

    return {
      leadName: row.lead_name ?? undefined,
      leadPronombres: row.lead_pronombres ?? undefined,
      demo: parseJson(row.demo_json, undefined),
      hookAnswers: parseJson(row.hook_answers_json, {}),
      premiumAnswers: parseJson(row.premium_answers_json, {}),
      hookOutcome: parseJson(row.hook_outcome_json, undefined),
      premiumOutcome: parseJson(row.premium_outcome_json, undefined)
    };
  }

  saveState(userId: string, state: AssessmentSessionState): void {
    const now = new Date().toISOString();

    this.sqlite
      .prepare(
        `
          INSERT INTO assessment_states (
            user_id,
            lead_name,
            lead_pronombres,
            demo_json,
            hook_answers_json,
            premium_answers_json,
            hook_outcome_json,
            premium_outcome_json,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            lead_name = excluded.lead_name,
            lead_pronombres = excluded.lead_pronombres,
            demo_json = excluded.demo_json,
            hook_answers_json = excluded.hook_answers_json,
            premium_answers_json = excluded.premium_answers_json,
            hook_outcome_json = excluded.hook_outcome_json,
            premium_outcome_json = excluded.premium_outcome_json,
            updated_at = excluded.updated_at
        `
      )
      .run(
        userId,
        state.leadName ?? null,
        state.leadPronombres ?? null,
        state.demo ? JSON.stringify(state.demo) : null,
        JSON.stringify(state.hookAnswers),
        JSON.stringify(state.premiumAnswers),
        state.hookOutcome ? JSON.stringify(state.hookOutcome) : null,
        state.premiumOutcome ? JSON.stringify(state.premiumOutcome) : null,
        now,
        now
      );
  }
}
