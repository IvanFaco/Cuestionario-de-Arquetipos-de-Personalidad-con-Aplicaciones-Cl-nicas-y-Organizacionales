import "express-session";

import type {
  AssessmentSessionState
} from "../modules/assessment/assessment.types.js";

declare module "express-session" {
  interface SessionData {
    adminBasicAuth?: boolean;
    auth?: {
      userId: string;
      email: string;
    };
    assessment?: AssessmentSessionState;
  }
}
