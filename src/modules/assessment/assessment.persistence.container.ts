import { getDatabaseClient } from "../../shared/database/database.factory.js";
import { AssessmentPersistenceService } from "./assessment.persistence.service.js";
import { SqliteAssessmentPersistenceRepository } from "./assessment.persistence.sqlite.js";

let assessmentPersistenceService: AssessmentPersistenceService | null = null;

export function getAssessmentPersistenceService(): AssessmentPersistenceService {
  assessmentPersistenceService ??= new AssessmentPersistenceService(
    new SqliteAssessmentPersistenceRepository(getDatabaseClient())
  );

  return assessmentPersistenceService;
}
