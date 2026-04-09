import type { Request, Response } from "express";

import {
  buildDemoProfile,
  buildHookOutcome,
  buildPremiumOutcome
} from "./assessment.domain.js";
import { hookQuestions, likertOptions, premiumQuestions } from "./assessment.data.js";
import { buildExecutiveReportPdf, getShadowLabel } from "./assessment.report.service.js";
import {
  getLandingViewModel,
  getPhaseZeroViewModel
} from "./assessment.service.js";
import type {
  DemoInput,
  HookAnswers,
  HookQuestionId,
  LikertValue,
  PartialHookAnswers,
  PartialPremiumAnswers,
  PremiumAnswers,
  PremiumQuestionId
} from "./assessment.types.js";

function ensureAssessmentSession(req: Request) {
  req.session.assessment ??= {
    hookAnswers: {},
    premiumAnswers: {}
  };

  return req.session.assessment;
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseIndex(rawIndex: string | string[] | undefined, total: number): number {
  const parsed = Number.parseInt(getSingleValue(rawIndex) ?? "1", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  if (parsed > total) {
    return total;
  }

  return parsed;
}

function parseLikertValue(input: unknown): LikertValue | null {
  const singleValue =
    typeof input === "string" || Array.isArray(input) ? getSingleValue(input) : undefined;
  const parsed = Number.parseInt(singleValue ?? "", 10);

  if (parsed >= 1 && parsed <= 5) {
    return parsed as LikertValue;
  }

  return null;
}

function getQuestionIndexToResume<TQuestionId extends string>(
  questions: { id: TQuestionId }[],
  answers: Partial<Record<TQuestionId, LikertValue>>
): number {
  const firstPendingIndex = questions.findIndex((question) => answers[question.id] === undefined);

  return firstPendingIndex === -1 ? questions.length : firstPendingIndex + 1;
}

function ensureCompleteAnswers<TQuestionId extends string>(
  questions: { id: TQuestionId }[],
  answers: Partial<Record<TQuestionId, LikertValue>>
): Record<TQuestionId, LikertValue> | null {
  const completedEntries: [TQuestionId, LikertValue][] = [];

  for (const question of questions) {
    const value = answers[question.id];

    if (value === undefined) {
      return null;
    }

    completedEntries.push([question.id, value]);
  }

  return Object.fromEntries(completedEntries) as Record<TQuestionId, LikertValue>;
}

function renderQuestionPage(
  res: Response,
  {
    title,
    eyebrow,
    selectAction,
    nextAction,
    index,
    total,
    prompt,
    selectedValue,
    selectedLabel,
    backHref
  }: {
    title: string;
    eyebrow: string;
    selectAction: string;
    nextAction: string;
    index: number;
    total: number;
    prompt: string;
    selectedValue?: LikertValue;
    selectedLabel?: string;
    backHref?: string;
  }
) {
  res.render("layouts/main", {
    title,
    page: "../pages/question",
    pageData: {
      title,
      eyebrow,
      selectAction,
      nextAction,
      currentIndex: index,
      totalQuestions: total,
      prompt,
      selectedValue,
      selectedLabel,
      selectedIndex:
        selectedValue !== undefined
          ? likertOptions.findIndex((option) => option.value === selectedValue)
          : -1,
      progressPercent: Math.round((index / total) * 100),
      options: likertOptions,
      backHref
    }
  });
}

export function renderLanding(req: Request, res: Response) {
  ensureAssessmentSession(req);

  res.render("layouts/main", {
    title: "MiRealYo | Inicio",
    page: "../pages/landing",
    pageData: {
      title: "El Mapa de tu Psique",
      subtitle:
        "Descubre tu estructura psicológica, tu sombra y tu temperamento en un flujo guiado, móvil y server-render.",
      hookCount: hookQuestions.length,
      premiumCount: premiumQuestions.length
    }
  });
}

export function startAssessment(req: Request, res: Response) {
  const gender = String(req.body.genero ?? "");
  const age = Number.parseInt(String(req.body.edad_exacta ?? ""), 10);

  if (!["Hombre", "Mujer", "Otro"].includes(gender) || Number.isNaN(age) || age < 18 || age > 99) {
    return res.status(400).render("layouts/main", {
      title: "MiRealYo | Inicio",
      page: "../pages/landing",
      pageData: {
        title: "El Mapa de tu Psique",
        subtitle:
          "Descubre tu estructura psicológica, tu sombra y tu temperamento en un flujo guiado, móvil y server-render.",
        hookCount: hookQuestions.length,
        premiumCount: premiumQuestions.length,
        error: "Debes completar genero y edad exacta con valores validos."
      }
    });
  }

  const session = ensureAssessmentSession(req);
  session.demo = buildDemoProfile({ genero: gender as DemoInput["genero"], edad_exacta: age });
  session.hookAnswers = {};
  session.premiumAnswers = {};
  session.hookOutcome = undefined;
  session.premiumOutcome = undefined;

  return res.redirect("/hook/1");
}

export function renderHookQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/");
  }

  const resumeIndex = getQuestionIndexToResume(hookQuestions, session.hookAnswers);
  const requestedIndex = parseIndex(req.params.index, hookQuestions.length);
  const index = Math.min(requestedIndex, resumeIndex);
  const question = hookQuestions[index - 1];
  const selectedValue = session.hookAnswers[question.id];

  renderQuestionPage(res, {
    title: "MiRealYo | Hook Quiz",
    eyebrow: "Tus Instintos Primarios",
    selectAction: `/hook/${index}/select`,
    nextAction: `/hook/${index}/next`,
    index,
    total: hookQuestions.length,
    prompt: question.prompt,
    selectedValue,
    selectedLabel: likertOptions.find((option) => option.value === selectedValue)?.label,
    backHref: index > 1 ? `/hook/${index - 1}` : undefined
  });
}

export function selectHookAnswer(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/");
  }

  const index = parseIndex(req.params.index, hookQuestions.length);
  const question = hookQuestions[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (!answer) {
    return res.redirect(`/hook/${index}`);
  }

  session.hookAnswers[question.id] = answer;
  return res.redirect(`/hook/${index}`);
}

export function submitHookQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/");
  }

  const index = parseIndex(req.params.index, hookQuestions.length);
  const question = hookQuestions[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (answer) {
    session.hookAnswers[question.id] = answer;
  }

  if (session.hookAnswers[question.id] === undefined) {
    return res.redirect(`/hook/${index}`);
  }

  if (index < hookQuestions.length) {
    return res.redirect(`/hook/${index + 1}`);
  }

  const completedAnswers = ensureCompleteAnswers<HookQuestionId>(
    hookQuestions,
    session.hookAnswers as Partial<Record<HookQuestionId, LikertValue>>
  );

  if (!completedAnswers) {
    return res.redirect(`/hook/${getQuestionIndexToResume(hookQuestions, session.hookAnswers)}`);
  }

  session.hookOutcome = buildHookOutcome(completedAnswers as HookAnswers);
  return res.redirect("/teaser");
}

export function renderTeaser(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo || !session.hookOutcome) {
    return res.redirect("/");
  }

  res.render("layouts/main", {
    title: "MiRealYo | Teaser",
    page: "../pages/teaser",
    pageData: {
      dominantArchetype: session.hookOutcome.ranking[0].name,
      age: session.demo.edad_exacta,
      topThree: session.hookOutcome.ranking.slice(0, 3).map((item) => item.name)
    }
  });
}

export function startPremium(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/");
  }

  session.premiumAnswers = {};
  session.premiumOutcome = undefined;

  return res.redirect("/premium/1");
}

export function renderPremiumQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/");
  }

  const resumeIndex = getQuestionIndexToResume(premiumQuestions, session.premiumAnswers);
  const requestedIndex = parseIndex(req.params.index, premiumQuestions.length);
  const index = Math.min(requestedIndex, resumeIndex);
  const question = premiumQuestions[index - 1];
  const selectedValue = session.premiumAnswers[question.id];

  renderQuestionPage(res, {
    title: "MiRealYo | Premium Quiz",
    eyebrow: "Calibracion Profunda",
    selectAction: `/premium/${index}/select`,
    nextAction: `/premium/${index}/next`,
    index,
    total: premiumQuestions.length,
    prompt: question.prompt,
    selectedValue,
    selectedLabel: likertOptions.find((option) => option.value === selectedValue)?.label,
    backHref: index > 1 ? `/premium/${index - 1}` : undefined
  });
}

export function selectPremiumAnswer(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/");
  }

  const index = parseIndex(req.params.index, premiumQuestions.length);
  const question = premiumQuestions[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (!answer) {
    return res.redirect(`/premium/${index}`);
  }

  session.premiumAnswers[question.id] = answer;
  return res.redirect(`/premium/${index}`);
}

export function submitPremiumQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/");
  }

  const index = parseIndex(req.params.index, premiumQuestions.length);
  const question = premiumQuestions[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (answer) {
    session.premiumAnswers[question.id] = answer;
  }

  if (session.premiumAnswers[question.id] === undefined) {
    return res.redirect(`/premium/${index}`);
  }

  if (index < premiumQuestions.length) {
    return res.redirect(`/premium/${index + 1}`);
  }

  const completedAnswers = ensureCompleteAnswers<PremiumQuestionId>(
    premiumQuestions,
    session.premiumAnswers as Partial<Record<PremiumQuestionId, LikertValue>>
  );

  if (!completedAnswers) {
    return res.redirect(
      `/premium/${getQuestionIndexToResume(premiumQuestions, session.premiumAnswers)}`
    );
  }

  session.premiumOutcome = buildPremiumOutcome(completedAnswers as PremiumAnswers);
  return res.redirect("/dashboard");
}

export function renderDashboard(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo || !session.hookOutcome || !session.premiumOutcome) {
    return res.redirect("/");
  }

  const ranking = session.hookOutcome.ranking;
  res.render("layouts/main", {
    title: "MiRealYo | Dashboard",
    page: "../pages/dashboard",
    pageData: {
      dominantArchetype: ranking[0].name,
      topThree: ranking.slice(0, 3).map((item) => item.name),
      scores: ranking,
      persona: session.hookOutcome.estructuras.Persona,
      sombraBase: session.hookOutcome.estructuras.Sombra_Base,
      sombraTotal: session.premiumOutcome.Sombra_Total,
      shadowLabel: getShadowLabel(session.premiumOutcome.Sombra_Total),
      keirsey: session.premiumOutcome.Keirsey,
      campbell: session.premiumOutcome.Campbell
    }
  });
}

export async function downloadDashboardPdf(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo || !session.hookOutcome || !session.premiumOutcome) {
    return res.redirect("/");
  }

  const pdfBuffer = await buildExecutiveReportPdf({
    demo: session.demo,
    hook: session.hookOutcome,
    premium: session.premiumOutcome
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="Reporte_Clinico_Ejecutivo.pdf"');
  return res.send(pdfBuffer);
}

export function renderMigrationStatus(req: Request, res: Response) {
  const viewModel = getLandingViewModel();

  res.render("layouts/main", {
    title: viewModel.title,
    page: "../pages/migration-status",
    pageData: viewModel
  });
}

export function renderPhaseZero(req: Request, res: Response) {
  const viewModel = getPhaseZeroViewModel();

  res.render("layouts/main", {
    title: viewModel.title,
    page: "../pages/phase-zero",
    pageData: viewModel
  });
}
