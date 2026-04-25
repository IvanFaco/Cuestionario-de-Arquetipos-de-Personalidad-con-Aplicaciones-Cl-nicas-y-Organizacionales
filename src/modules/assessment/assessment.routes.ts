import { Router } from "express";

import {
  renderAdmin,
  downloadDashboardPdf,
  renderDashboard,
  renderDaily,
  renderDailyCoaching,
  renderDailyMood,
  renderDailyMotto,
  renderDailyRecord,
  renderDatabaseExplorer,
  renderFullTestIntro,
  renderHookQuestion,
  renderLanding,
  renderLogin,
  handleLogin,
  handleLogout,
  renderMigrationStatus,
  renderOnboarding,
  renderPhaseZero,
  renderPreOnboarding,
  renderPremiumQuestion,
  renderPrivacy,
  renderProfile,
  renderRegister,
  handleProfileUpdate,
  handleRegister,
  renderQuickTestIntro,
  renderTeaser,
  selectHookAnswer,
  selectPremiumAnswer,
  startLeadCapture,
  startAssessment,
  startQuickTest,
  startPremium,
  submitHookQuestion,
  submitPremiumQuestion,
  updateAdminAppearance
} from "./assessment.controller.js";

export const assessmentRouter = Router();

assessmentRouter.get("/", renderLanding);
assessmentRouter.get("/privacidad", renderPrivacy);
assessmentRouter.get("/registro", renderRegister);
assessmentRouter.post("/registro", handleRegister);
assessmentRouter.get("/login", renderLogin);
assessmentRouter.post("/login", handleLogin);
assessmentRouter.post("/logout", handleLogout);
assessmentRouter.get("/admin", renderAdmin);
assessmentRouter.get("/db", renderDatabaseExplorer);
assessmentRouter.post("/admin/appearance", updateAdminAppearance);
assessmentRouter.get("/empezar", renderPreOnboarding);
assessmentRouter.post("/empezar", startLeadCapture);
assessmentRouter.get("/onboarding", renderOnboarding);
assessmentRouter.post("/onboarding/start", startAssessment);
assessmentRouter.get("/quick-test", renderQuickTestIntro);
assessmentRouter.post("/quick-test/start", startQuickTest);
assessmentRouter.get("/quick-test/:index", renderHookQuestion);
assessmentRouter.post("/quick-test/:index/select", selectHookAnswer);
assessmentRouter.post("/quick-test/:index/next", submitHookQuestion);
assessmentRouter.get("/quick-results", renderTeaser);
assessmentRouter.post("/quick-results/continue", startPremium);
assessmentRouter.get("/full-test", renderFullTestIntro);
assessmentRouter.post("/full-test/start", startPremium);
assessmentRouter.get("/full-test/:index", renderPremiumQuestion);
assessmentRouter.post("/full-test/:index/select", selectPremiumAnswer);
assessmentRouter.post("/full-test/:index/next", submitPremiumQuestion);
assessmentRouter.get("/full-results", renderDashboard);
assessmentRouter.get("/full-results/pdf", downloadDashboardPdf);
assessmentRouter.get("/daily", renderDaily);
assessmentRouter.get("/daily-mood", renderDailyMood);
assessmentRouter.get("/daily-record", renderDailyRecord);
assessmentRouter.get("/daily-coaching", renderDailyCoaching);
assessmentRouter.get("/daily-motto", renderDailyMotto);
assessmentRouter.get("/profile", renderProfile);
assessmentRouter.post("/profile", handleProfileUpdate);
assessmentRouter.get("/migration", renderMigrationStatus);

assessmentRouter.post("/start", (_req, res) => {
  res.redirect(307, "/onboarding/start");
});
assessmentRouter.get("/hook/:index", (req, res) => {
  res.redirect(302, `/quick-test/${req.params.index}`);
});
assessmentRouter.post("/hook/:index/select", (req, res) => {
  res.redirect(307, `/quick-test/${req.params.index}/select`);
});
assessmentRouter.post("/hook/:index/next", (req, res) => {
  res.redirect(307, `/quick-test/${req.params.index}/next`);
});
assessmentRouter.get("/teaser", (_req, res) => {
  res.redirect(302, "/quick-results");
});
assessmentRouter.post("/teaser", (_req, res) => {
  res.redirect(307, "/quick-results/continue");
});
assessmentRouter.get("/premium/:index", (req, res) => {
  res.redirect(302, `/full-test/${req.params.index}`);
});
assessmentRouter.post("/premium/:index/select", (req, res) => {
  res.redirect(307, `/full-test/${req.params.index}/select`);
});
assessmentRouter.post("/premium/:index/next", (req, res) => {
  res.redirect(307, `/full-test/${req.params.index}/next`);
});
assessmentRouter.get("/dashboard", (_req, res) => {
  res.redirect(302, "/full-results");
});
assessmentRouter.get("/dashboard/pdf", (_req, res) => {
  res.redirect(302, "/full-results/pdf");
});

assessmentRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "mi-real-yo-migration",
    phase: "fase-4"
  });
});

assessmentRouter.get("/migration/phase-0", renderPhaseZero);
