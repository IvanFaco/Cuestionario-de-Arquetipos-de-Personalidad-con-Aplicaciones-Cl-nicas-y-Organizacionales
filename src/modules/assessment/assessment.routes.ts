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
  selectHookAnswer,
  selectPremiumAnswer,
  startAssessment,
  startPremium,
  submitHookQuestion,
  submitPremiumQuestion
} from "./assessment.controller.js";

export const assessmentRouter = Router();

assessmentRouter.get("/", renderLanding);
assessmentRouter.post("/start", startAssessment);
assessmentRouter.get("/hook/:index", renderHookQuestion);
assessmentRouter.post("/hook/:index/select", selectHookAnswer);
assessmentRouter.post("/hook/:index/next", submitHookQuestion);
assessmentRouter.get("/teaser", renderTeaser);
assessmentRouter.post("/teaser", startPremium);
assessmentRouter.get("/premium/:index", renderPremiumQuestion);
assessmentRouter.post("/premium/:index/select", selectPremiumAnswer);
assessmentRouter.post("/premium/:index/next", submitPremiumQuestion);
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
