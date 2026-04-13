import type { AssessmentPersistenceRepository } from "./assessment.persistence.types.js";
import type { AssessmentSessionState } from "./assessment.types.js";

export class AssessmentPersistenceService {
  constructor(private readonly repository: AssessmentPersistenceRepository) {}

  load(userId: string): AssessmentSessionState | null {
    return this.repository.findStateByUserId(userId);
  }

  save(userId: string, state: AssessmentSessionState): void {
    this.repository.saveState(userId, state);
  }
}
