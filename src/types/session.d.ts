import "express-session";

import type {
  DemoProfile,
  HookOutcome,
  PartialHookAnswers,
  PartialPremiumAnswers,
  PremiumOutcome
} from "../modules/assessment/assessment.types.js";

declare module "express-session" {
  interface SessionData {
    assessment?: {
      leadName?: string;
      leadPronombres?: string;
      demo?: DemoProfile;
      hookAnswers: PartialHookAnswers;
      premiumAnswers: PartialPremiumAnswers;
      hookOutcome?: HookOutcome;
      premiumOutcome?: PremiumOutcome;
    };
  }
}
