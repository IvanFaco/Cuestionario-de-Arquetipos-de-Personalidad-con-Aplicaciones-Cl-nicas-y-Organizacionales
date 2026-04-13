import type { AssessmentSessionState } from "./assessment.types.js";

export interface AssessmentPersistenceRepository {
  findStateByUserId(userId: string): AssessmentSessionState | null;
  saveState(userId: string, state: AssessmentSessionState): void;
}
