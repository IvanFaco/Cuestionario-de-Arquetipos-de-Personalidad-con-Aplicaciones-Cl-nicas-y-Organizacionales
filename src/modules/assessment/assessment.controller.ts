import type { Request, Response } from "express";

import {
  buildDemoProfile,
  buildHookOutcome,
  buildPremiumOutcome
} from "./assessment.domain.js";
import { hookQuestions, likertOptions, premiumQuestions } from "./assessment.data.js";
import { buildExecutiveReportPdf, getShadowLabel } from "./assessment.report.service.js";
import { buildSeoMeta } from "./assessment.seo.js";
import {
  getLandingViewModel,
  getPhaseZeroViewModel
} from "./assessment.service.js";
import type {
  AgeRangeKey,
  DemoInput,
  EnergyProfileKey,
  HookAnswers,
  HookQuestionId,
  LikertValue,
  PartialHookAnswers,
  PartialPremiumAnswers,
  PremiumAnswers,
  PremiumQuestionId,
  SpiritualOrientationKey
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
    heading,
    stageLabel,
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
    heading: string;
    stageLabel: string;
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
    page: "../pages/quick-test/question",
    seo: buildSeoMeta(
      {
        title,
        description: "Responde una afirmacion breve para avanzar en tu lectura inicial de personalidad.",
        canonicalPath: selectAction.replace(/\/select$/, ""),
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      title,
      eyebrow,
      heading,
      stageLabel,
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
    page: "../pages/splash/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Descubre tu personalidad y arquetipo",
        description:
          "Explora tu arquetipo, tu sombra y tu estructura de personalidad con una experiencia guiada y un reporte final interpretativo.",
        canonicalPath: "/"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      hookCount: hookQuestions.length,
      premiumCount: premiumQuestions.length
    }
  });
}

export function renderOnboarding(req: Request, res: Response) {
  ensureAssessmentSession(req);

  res.render("layouts/main", {
    title: "MiRealYo | Onboarding",
    page: "../pages/onboarding/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Empieza tu lectura de personalidad",
        description:
          "Comparte un poco de contexto personal para que la lectura de personalidad y el reporte final se adapten mejor a tu experiencia.",
        canonicalPath: "/onboarding"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      title: "Conocerte mejor empieza con un poco de contexto",
      subtitle:
        "Usamos unas pocas señales bio-psico-sociales para contextualizar la experiencia de forma sutil y respetuosa.",
      hookCount: hookQuestions.length,
      premiumCount: premiumQuestions.length
    }
  });
}

export function renderQuickTestIntro(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/onboarding");
  }

  res.render("layouts/main", {
    title: "MiRealYo | Quick Test",
    page: "../pages/quick-test/intro",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Quick test de personalidad",
        description:
          "Conoce de que va el quick test: una lectura inicial de tus impulsos, estilo de respuesta y energia predominante.",
        canonicalPath: "/quick-test",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      hookCount: hookQuestions.length
    }
  });
}

export function startQuickTest(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/onboarding");
  }

  const resumeIndex = getQuestionIndexToResume(hookQuestions, session.hookAnswers);
  return res.redirect(`/quick-test/${resumeIndex}`);
}

export function startAssessment(req: Request, res: Response) {
  const gender = String(req.body.genero ?? "");
  const ageRange = String(req.body.rango_edad ?? "") as AgeRangeKey;
  const spiritualOrientation = (String(req.body.orientacion_espiritual ?? "") ||
    undefined) as SpiritualOrientationKey | undefined;
  const energyProfile = String(req.body.energia_base ?? "") as EnergyProfileKey;

  if (
    !["Hombre", "Mujer", "Otro"].includes(gender) ||
    !["18_24", "25_34", "35_49", "50_plus"].includes(ageRange) ||
    !["ecto", "meso", "endo", "mixed"].includes(energyProfile) ||
    (spiritualOrientation !== undefined &&
      ![
        "secular",
        "agnostic",
        "spiritual_non_religious",
        "believer_non_practicing",
        "religious_practicing",
        "naturalist",
        "buddhist",
        "exploring",
        "other",
        "prefer_not_to_say"
      ].includes(spiritualOrientation))
  ) {
    return res.status(400).render("layouts/main", {
      title: "MiRealYo | Onboarding",
      page: "../pages/onboarding/index",
      seo: buildSeoMeta(
        {
          title: "MiRealYo | Empieza tu lectura de personalidad",
          description:
            "Comparte un poco de contexto personal para que la lectura de personalidad y el reporte final se adapten mejor a tu experiencia.",
          canonicalPath: "/onboarding"
        },
        res.app.locals.siteUrl
      ),
      pageData: {
        title: "Conocerte mejor empieza con un poco de contexto",
        subtitle:
          "Usamos unas pocas señales bio-psico-sociales para contextualizar la experiencia de forma sutil y respetuosa.",
        hookCount: hookQuestions.length,
        premiumCount: premiumQuestions.length,
        error: "Completa estos dos campos para continuar."
      }
    });
  }

  const session = ensureAssessmentSession(req);
  session.demo = buildDemoProfile({
    genero: gender as DemoInput["genero"],
    rango_edad: ageRange,
    orientacion_espiritual: spiritualOrientation,
    energia_base: energyProfile
  });
  session.hookAnswers = {};
  session.premiumAnswers = {};
  session.hookOutcome = undefined;
  session.premiumOutcome = undefined;

  return res.redirect("/quick-test");
}

export function renderHookQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/onboarding");
  }

  const resumeIndex = getQuestionIndexToResume(hookQuestions, session.hookAnswers);
  const requestedIndex = parseIndex(req.params.index, hookQuestions.length);
  const index = Math.min(requestedIndex, resumeIndex);
  const question = hookQuestions[index - 1];
  const selectedValue = session.hookAnswers[question.id];

  renderQuestionPage(res, {
    title: "MiRealYo | Quick Test",
    eyebrow: "Tus Instintos Primarios",
    heading: "Quick test",
    stageLabel: "Tus instintos primarios",
    selectAction: `/quick-test/${index}/select`,
    nextAction: `/quick-test/${index}/next`,
    index,
    total: hookQuestions.length,
    prompt: question.prompt,
    selectedValue,
    selectedLabel: likertOptions.find((option) => option.value === selectedValue)?.label,
    backHref: index > 1 ? `/quick-test/${index - 1}` : "/quick-test"
  });
}

export function selectHookAnswer(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/onboarding");
  }

  const index = parseIndex(req.params.index, hookQuestions.length);
  const question = hookQuestions[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (!answer) {
    return res.redirect(`/quick-test/${index}`);
  }

  session.hookAnswers[question.id] = answer;
  return res.redirect(`/quick-test/${index}`);
}

export function submitHookQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo) {
    return res.redirect("/onboarding");
  }

  const index = parseIndex(req.params.index, hookQuestions.length);
  const question = hookQuestions[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (answer) {
    session.hookAnswers[question.id] = answer;
  }

  if (session.hookAnswers[question.id] === undefined) {
    return res.redirect(`/quick-test/${index}`);
  }

  if (index < hookQuestions.length) {
    return res.redirect(`/quick-test/${index + 1}`);
  }

  const completedAnswers = ensureCompleteAnswers<HookQuestionId>(
    hookQuestions,
    session.hookAnswers as Partial<Record<HookQuestionId, LikertValue>>
  );

  if (!completedAnswers) {
    return res.redirect(
      `/quick-test/${getQuestionIndexToResume(hookQuestions, session.hookAnswers)}`
    );
  }

  session.hookOutcome = buildHookOutcome(completedAnswers as HookAnswers);
  return res.redirect("/quick-results");
}

export function renderTeaser(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo || !session.hookOutcome) {
    return res.redirect("/onboarding");
  }

  res.render("layouts/main", {
    title: "MiRealYo | Quick Results",
    page: "../pages/quick-results/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Lectura inicial de personalidad",
        description:
          "Visualiza una primera lectura de tus arquetipos dominantes antes de pasar a una exploracion mas profunda.",
        canonicalPath: "/quick-results",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      dominantArchetype: session.hookOutcome.ranking[0].name,
      ageRangeLabel: session.demo.rango_edad_label,
      topThree: session.hookOutcome.ranking.slice(0, 3).map((item) => item.name)
    }
  });
}

export function startPremium(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/onboarding");
  }

  session.premiumAnswers = {};
  session.premiumOutcome = undefined;

  return res.redirect("/full-test/1");
}

export function renderPremiumQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/onboarding");
  }

  const resumeIndex = getQuestionIndexToResume(premiumQuestions, session.premiumAnswers);
  const requestedIndex = parseIndex(req.params.index, premiumQuestions.length);
  const index = Math.min(requestedIndex, resumeIndex);
  const question = premiumQuestions[index - 1];
  const selectedValue = session.premiumAnswers[question.id];

  res.render("layouts/main", {
    title: "MiRealYo | Full Test",
    page: "../pages/full-test/question",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Calibracion profunda",
        description:
          "Avanza por la calibracion profunda para completar tu lectura estructural y tu reporte final.",
        canonicalPath: `/full-test/${index}`,
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      title: "MiRealYo | Full Test",
      eyebrow: "Calibracion Profunda",
      heading: "Full test",
      stageLabel: "Calibracion profunda",
      selectAction: `/full-test/${index}/select`,
      nextAction: `/full-test/${index}/next`,
      currentIndex: index,
      totalQuestions: premiumQuestions.length,
      prompt: question.prompt,
      selectedValue,
      selectedLabel: likertOptions.find((option) => option.value === selectedValue)?.label,
      selectedIndex:
        selectedValue !== undefined
          ? likertOptions.findIndex((option) => option.value === selectedValue)
          : -1,
      progressPercent: Math.round((index / premiumQuestions.length) * 100),
      options: likertOptions,
      backHref: index > 1 ? `/full-test/${index - 1}` : undefined
    }
  });
}

export function selectPremiumAnswer(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/onboarding");
  }

  const index = parseIndex(req.params.index, premiumQuestions.length);
  const question = premiumQuestions[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (!answer) {
    return res.redirect(`/full-test/${index}`);
  }

  session.premiumAnswers[question.id] = answer;
  return res.redirect(`/full-test/${index}`);
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
    return res.redirect(`/full-test/${index}`);
  }

  if (index < premiumQuestions.length) {
    return res.redirect(`/full-test/${index + 1}`);
  }

  const completedAnswers = ensureCompleteAnswers<PremiumQuestionId>(
    premiumQuestions,
    session.premiumAnswers as Partial<Record<PremiumQuestionId, LikertValue>>
  );

  if (!completedAnswers) {
    return res.redirect(
      `/full-test/${getQuestionIndexToResume(premiumQuestions, session.premiumAnswers)}`
    );
  }

  session.premiumOutcome = buildPremiumOutcome(completedAnswers as PremiumAnswers);
  return res.redirect("/full-results");
}

export function renderDashboard(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo || !session.hookOutcome || !session.premiumOutcome) {
    return res.redirect("/onboarding");
  }

  const ranking = session.hookOutcome.ranking;
  res.render("layouts/main", {
    title: "MiRealYo | Full Results",
    page: "../pages/full-results/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Resultado completo de personalidad",
        description:
          "Accede a tu lectura profunda: arquetipo dominante, estructuras clinicas, Keirsey, Campbell y reporte ejecutivo.",
        canonicalPath: "/full-results",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
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
    return res.redirect("/onboarding");
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
    seo: buildSeoMeta(
      {
        title: viewModel.title,
        description: viewModel.description,
        canonicalPath: "/migration",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: viewModel
  });
}

export function renderPhaseZero(req: Request, res: Response) {
  const viewModel = getPhaseZeroViewModel();

  res.render("layouts/main", {
    title: viewModel.title,
    page: "../pages/phase-zero",
    seo: buildSeoMeta(
      {
        title: viewModel.title,
        description: viewModel.summary,
        canonicalPath: "/migration/phase-0",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: viewModel
  });
}
