import { getDatabaseClient } from "../../shared/database/database.factory.js";
import { AssessmentReportCacheService } from "./assessment.report-cache.service.js";
import { SqliteAssessmentReportCacheRepository } from "./assessment.report-cache.sqlite.js";

let assessmentReportCacheService: AssessmentReportCacheService | null = null;

export function getAssessmentReportCacheService(): AssessmentReportCacheService {
  assessmentReportCacheService ??= new AssessmentReportCacheService(
    new SqliteAssessmentReportCacheRepository(getDatabaseClient())
  );

  return assessmentReportCacheService;
}
