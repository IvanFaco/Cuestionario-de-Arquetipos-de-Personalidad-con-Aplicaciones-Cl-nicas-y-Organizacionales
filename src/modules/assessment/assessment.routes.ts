import { Router } from "express";

import {
  downloadDashboardPdf,
  renderDashboard,
  renderHookQuestion,
  renderLanding,
  renderMigrationStatus,
  renderPhaseZero,
  renderPremiumQuestion,
  renderTeaser,
  startAssessment,
  startPremium,
  submitHookQuestion,
  submitPremiumQuestion
} from "./assessment.controller.js";

export const assessmentRouter = Router();

assessmentRouter.get("/", renderLanding);
assessmentRouter.post("/start", startAssessment);
assessmentRouter.get("/hook/:index", renderHookQuestion);
assessmentRouter.post("/hook/:index", submitHookQuestion);
assessmentRouter.get("/teaser", renderTeaser);
assessmentRouter.post("/teaser", startPremium);
assessmentRouter.get("/premium/:index", renderPremiumQuestion);
assessmentRouter.post("/premium/:index", submitPremiumQuestion);
assessmentRouter.get("/dashboard", renderDashboard);
assessmentRouter.get("/dashboard/pdf", downloadDashboardPdf);
assessmentRouter.get("/migration", renderMigrationStatus);

assessmentRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "mi-real-yo-migration",
    phase: "fase-4"
  });
});

assessmentRouter.get("/migration/phase-0", renderPhaseZero);
