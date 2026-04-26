export type AssessmentJourneyContext = {
  hasLeadName: boolean;
  hasBasicResult: boolean;
  hasPremiumResult: boolean;
  hasApprovedPremiumAccess: boolean;
  preferDownload?: boolean;
};

export function resolveAssessmentJourneyPath(context: AssessmentJourneyContext): string {
  if (context.hasPremiumResult) {
    return context.preferDownload ? "/full-results/pdf" : "/full-results";
  }

  if (!context.hasBasicResult) {
    return context.hasLeadName ? "/quick-test" : "/empezar";
  }

  return context.hasApprovedPremiumAccess ? "/full-test" : "/pagos/estudio-profundo";
}
