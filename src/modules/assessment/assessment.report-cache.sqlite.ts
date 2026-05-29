import type { SqliteClient } from "../../shared/database/sqlite/sqlite.client.js";
import type {
  AssessmentReportCacheRepository,
  CachedReportEntry,
  CachedReportKey,
  ReportSource
} from "./assessment.report-cache.service.js";

interface AssessmentReportCacheRow {
  user_id: string;
  input_hash: string;
  app_version: string;
  report_source: ReportSource;
  report_text: string;
  pdf_blob: Buffer;
  created_at: string;
  updated_at: string;
}

export class SqliteAssessmentReportCacheRepository implements AssessmentReportCacheRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  findByKey(key: CachedReportKey): CachedReportEntry | null {
    const row = this.sqlite
      .prepare<[string, string, string], AssessmentReportCacheRow | undefined>(
        `
          SELECT
            user_id,
            input_hash,
            app_version,
            report_source,
            report_text,
            pdf_blob,
            created_at,
            updated_at
          FROM assessment_report_cache
          WHERE user_id = ?
            AND input_hash = ?
            AND app_version = ?
        `
      )
      .get(key.userId, key.inputHash, key.appVersion);

    if (!row) {
      return null;
    }

    return {
      userId: row.user_id,
      inputHash: row.input_hash,
      appVersion: row.app_version,
      reportSource: row.report_source,
      reportText: row.report_text,
      pdfBuffer: Buffer.from(row.pdf_blob),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  save(entry: CachedReportEntry): void {
    this.sqlite
      .prepare<[string, string, string, ReportSource, string, Buffer, string, string], void>(
        `
          INSERT INTO assessment_report_cache (
            user_id,
            input_hash,
            app_version,
            report_source,
            report_text,
            pdf_blob,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, input_hash, app_version) DO NOTHING
        `
      )
      .run(
        entry.userId,
        entry.inputHash,
        entry.appVersion,
        entry.reportSource,
        entry.reportText,
        entry.pdfBuffer,
        entry.createdAt,
        entry.updatedAt
      );
  }
}
