import { Router } from "express";

import { getLandingViewModel, getPhaseZeroViewModel } from "./assessment.service.js";

export const assessmentRouter = Router();

assessmentRouter.get("/", (_req, res) => {
  const viewModel = getLandingViewModel();

  res.render("layouts/main", {
    title: viewModel.title,
    page: "../pages/landing",
    pageData: viewModel
  });
});

assessmentRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "mi-real-yo-migration",
    phase: "fase-1"
  });
});

assessmentRouter.get("/migration/phase-0", (_req, res) => {
  const viewModel = getPhaseZeroViewModel();

  res.render("layouts/main", {
    title: viewModel.title,
    page: "../pages/phase-zero",
    pageData: viewModel
  });
});
