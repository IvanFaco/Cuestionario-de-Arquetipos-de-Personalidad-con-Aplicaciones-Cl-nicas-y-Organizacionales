import type { Request, Response } from "express";

import { AuthError } from "../auth/auth.service.js";
import { getAuthService } from "../auth/auth.container.js";
import { getAssessmentPersistenceService } from "./assessment.persistence.container.js";
import { getDatabaseInspector } from "../../shared/database/database.inspector.factory.js";
import {
  getAppearanceOptions,
  getAppearanceSettings,
  getCurrentFontDescriptor,
  updateAppearanceSettings
} from "./assessment.appearance.js";
import {
  buildDemoProfile,
  buildHookOutcome,
  buildPremiumOutcome
} from "./assessment.domain.js";
import { getHookQuestions, getPremiumQuestions, likertOptions } from "./assessment.questions.js";
import { buildExecutiveReportPdf, getShadowLabel } from "./assessment.report.service.js";
import { buildSeoMeta } from "./assessment.seo.js";
import {
  getLandingViewModel,
  getPhaseZeroViewModel
} from "./assessment.service.js";
import type {
  DemoInput,
  HookAnswers,
  HookQuestionId,
  LikertValue,
  ObjectiveKey,
  PartialHookAnswers,
  PartialPremiumAnswers,
  PremiumAnswers,
  PremiumQuestionId
} from "./assessment.types.js";

function createEmptyAssessmentSession() {
  return {
    hookAnswers: {},
    premiumAnswers: {}
  };
}

function ensureAssessmentSession(req: Request) {
  if (req.session.assessment) {
    return req.session.assessment;
  }

  const userId = req.session.auth?.userId;

  if (userId) {
    const persistedState = assessmentPersistenceService.load(userId);

    if (persistedState) {
      req.session.assessment = persistedState;
      return req.session.assessment;
    }
  }

  req.session.assessment = createEmptyAssessmentSession();

  return req.session.assessment;
}

function persistAssessmentSession(req: Request) {
  const userId = req.session.auth?.userId;
  const assessment = req.session.assessment;

  if (!userId || !assessment) {
    return;
  }

  assessmentPersistenceService.save(userId, assessment);
}

function getAuthenticatedHomePath(req: Request): string {
  return "/daily";
}

function ensureAuthenticatedSession(req: Request) {
  if (!req.session.auth) {
    return null;
  }

  const authSession = req.session.auth;
  const assessmentSession = ensureAssessmentSession(req);

  return {
    authSession,
    assessmentSession
  };
}

function renderDailyModulePage(
  req: Request,
  res: Response,
  {
    slug,
    title,
    eyebrow,
    heading,
    copy
  }: {
    slug: string;
    title: string;
    eyebrow: string;
    heading: string;
    copy: string;
  }
) {
  const activeSession = ensureAuthenticatedSession(req);

  if (!activeSession) {
    return res.redirect("/login");
  }

  const { authSession, assessmentSession } = activeSession;

  return res.render("layouts/main", {
    title,
    page: "../pages/daily-module/index",
    seo: buildSeoMeta(
      {
        title,
        description: copy,
        canonicalPath: `/${slug}`,
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      currentPath: `/${slug}`,
      moduleSlug: slug,
      eyebrow,
      heading,
      copy,
      email: authSession.email,
      name: assessmentSession.demo?.nombre ?? assessmentSession.leadName,
      hasFullReport: Boolean(assessmentSession.premiumOutcome)
    }
  });
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

const objectiveOptions: { value: ObjectiveKey; label: string }[] = [
  { value: "clarity_patterns", label: "Entender con mas claridad mis patrones de personalidad" },
  { value: "emotional_blocks", label: "Identificar bloqueos emocionales o internos" },
  { value: "relationships", label: "Comprender mejor como me vinculo con otras personas" },
  { value: "purpose_direction", label: "Ganar claridad sobre mi proposito o direccion vital" },
  { value: "stress_decisions", label: "Entender como reacciono bajo estres y al tomar decisiones" },
  { value: "self_esteem_identity", label: "Fortalecer mi autoestima y mi sentido de identidad" },
  { value: "shadow_integration", label: "Reconocer aspectos de mi sombra e integrarlos mejor" },
  { value: "life_transition", label: "Orientarme mejor en un momento de cambio o transicion" }
];
const profilePronounOptions = [
  { value: "", label: "Opcional" },
  { value: "él", label: "Él / Him" },
  { value: "ella", label: "Ella / She" },
  { value: "elle", label: "Elle / They" },
  { value: "otro", label: "Otro" }
] as const;

const authService = getAuthService();
const assessmentPersistenceService = getAssessmentPersistenceService();
const databaseInspector = getDatabaseInspector();
const registerIntentOptions = ["account", "download"] as const;

type RegisterIntent = (typeof registerIntentOptions)[number];

function getRegisterIntent(value: unknown): RegisterIntent | null {
  return typeof value === "string" && registerIntentOptions.includes(value as RegisterIntent)
    ? (value as RegisterIntent)
    : null;
}

function renderRegisterPage(
  res: Response,
  pageData: {
    email?: string;
    error?: string;
    intent?: RegisterIntent;
  } = {}
) {
  res.render("layouts/main", {
    title: "MiRealYo | Crear cuenta",
    page: "../pages/register/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Crea tu cuenta",
        description: "Crea tu cuenta para guardar tu lectura y acceder a tu informe completo.",
        canonicalPath: "/registro"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      intent: pageData.intent ?? "download",
      ...pageData
    }
  });
}

function renderProfilePage(
  req: Request,
  res: Response,
  pageData: {
    name?: string;
    pronombres?: string;
    error?: string;
    saved?: boolean;
  } = {}
) {
  const activeSession = ensureAuthenticatedSession(req);

  if (!activeSession) {
    return res.redirect("/login");
  }

  const { authSession, assessmentSession } = activeSession;
  const user = authService.findUserById(authSession.userId);

  return res.render("layouts/main", {
    title: "MiRealYo | Profile",
    page: "../pages/profile/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Profile",
        description: "Gestiona la información base de tu perfil dentro de tu sesión activa.",
        canonicalPath: "/profile",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      currentPath: "/profile",
      email: authSession.email,
      name: pageData.name ?? assessmentSession.demo?.nombre ?? assessmentSession.leadName ?? "",
      pronombres: pageData.pronombres ?? assessmentSession.leadPronombres ?? "",
      pronounOptions: profilePronounOptions,
      hasFullReport: Boolean(assessmentSession.premiumOutcome),
      hasQuickResult: Boolean(assessmentSession.hookOutcome),
      joinedAt: user?.createdAt,
      error: pageData.error,
      saved: pageData.saved ?? false
    }
  });
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
    backHref,
    leadPronombres,
    leadName
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
    leadPronombres?: string;
    leadName?: string;
  }
) {
  const identificationText = leadPronombres === "ella" ? "identificada" 
    : leadPronombres === "él" ? "identificado" 
    : leadPronombres === "elle" ? "identificad@" 
    : "identificad@";
  
  const genderHeading = leadName 
    ? `${leadName}, ¿qué tan ${identificationText} te sientes con la siguiente afirmación?`
    : `¿Qué tan ${identificationText} te sientes con la siguiente afirmación?`;

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
      heading: genderHeading,
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
      hookCount: getHookQuestions().length,
      premiumCount: getPremiumQuestions().length,
      currentPath: "/"
    }
  });
}

export function renderPrivacy(req: Request, res: Response) {
  res.render("layouts/main", {
    title: "MiRealYo | Políticas de Privacidad",
    page: "../pages/privacy/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Políticas de Privacidad",
        description: "Política de privacidad de MiRealYo - Cómo protegemos tus datos.",
        canonicalPath: "/privacidad"
      },
      res.app.locals.siteUrl
    ),
    pageData: {}
  });
}

export function renderRegister(req: Request, res: Response) {
  if (req.session.auth) {
    return res.redirect(getAuthenticatedHomePath(req));
  }

  const intent = getRegisterIntent(req.query.intent) ?? "account";
  renderRegisterPage(res, { intent });
}

export function renderDaily(req: Request, res: Response) {
  const activeSession = ensureAuthenticatedSession(req);

  if (!activeSession) {
    return res.redirect("/login");
  }

  const { authSession, assessmentSession: session } = activeSession;

  res.render("layouts/main", {
    title: "MiRealYo | Daily",
    page: "../pages/daily/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Daily",
        description: "Tu espacio diario para retomar tu proceso y volver a tu lectura cuando lo necesites.",
        canonicalPath: "/daily",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      currentPath: "/daily",
      email: authSession.email,
      hasFullReport: Boolean(session.premiumOutcome),
      name: session.demo?.nombre ?? session.leadName
    }
  });
}

export function renderDailyMood(req: Request, res: Response) {
  return renderDailyModulePage(req, res, {
    slug: "daily-mood",
    title: "MiRealYo | Daily Mood",
    eyebrow: "Sesion activa",
    heading: "Daily Mood",
    copy: "Registra tu estado emocional y detecta cómo llegas hoy a tu proceso."
  });
}

export function renderDailyRecord(req: Request, res: Response) {
  return renderDailyModulePage(req, res, {
    slug: "daily-record",
    title: "MiRealYo | Daily Record",
    eyebrow: "Sesion activa",
    heading: "Daily Record",
    copy: "Consulta y organiza tus registros diarios para no perder continuidad."
  });
}

export function renderDailyCoaching(req: Request, res: Response) {
  return renderDailyModulePage(req, res, {
    slug: "daily-coaching",
    title: "MiRealYo | Daily Coaching",
    eyebrow: "Sesion activa",
    heading: "Daily Coaching",
    copy: "Recibe una guía breve y accionable alineada con el momento que atraviesas."
  });
}

export function renderDailyMotto(req: Request, res: Response) {
  return renderDailyModulePage(req, res, {
    slug: "daily-motto",
    title: "MiRealYo | Daily Motto",
    eyebrow: "Sesion activa",
    heading: "Daily Motto",
    copy: "Encuentra la frase fuerza del día para enfocar tu intención y energía."
  });
}

export function renderProfile(req: Request, res: Response) {
  return renderProfilePage(req, res, {
    saved: req.query.saved === "1"
  });
}

export async function handleProfileUpdate(req: Request, res: Response) {
  const activeSession = ensureAuthenticatedSession(req);

  if (!activeSession) {
    return res.redirect("/login");
  }

  const { authSession, assessmentSession } = activeSession;
  const name = String(req.body.name ?? "").trim();
  const pronombres = String(req.body.pronombres ?? "").trim();
  const password = String(req.body.password ?? "");
  const passwordConfirmation = String(req.body.passwordConfirmation ?? "");

  if (!name) {
    return renderProfilePage(req, res.status(400), {
      name,
      pronombres,
      error: "Escribe un nombre para actualizar tu perfil."
    });
  }

  if (!profilePronounOptions.some((option) => option.value === pronombres)) {
    return renderProfilePage(req, res.status(400), {
      name,
      pronombres,
      error: "Selecciona una opción válida para pronombres."
    });
  }

  if (password || passwordConfirmation) {
    if (password !== passwordConfirmation) {
      return renderProfilePage(req, res.status(400), {
        name,
        pronombres,
        error: "La confirmación de la contraseña no coincide."
      });
    }

    try {
      await authService.updatePassword(authSession.userId, password);
    } catch (error) {
      const message =
        error instanceof AuthError ? error.message : "No fue posible actualizar la contraseña.";

      return renderProfilePage(req, res.status(400), {
        name,
        pronombres,
        error: message
      });
    }
  }

  assessmentSession.leadName = name;
  assessmentSession.leadPronombres = pronombres || undefined;

  if (assessmentSession.demo) {
    assessmentSession.demo = {
      ...assessmentSession.demo,
      nombre: name
    };
  }

  persistAssessmentSession(req);

  return res.redirect("/profile?saved=1");
}

export function renderLogin(req: Request, res: Response) {
  if (req.session.auth) {
    return res.redirect(getAuthenticatedHomePath(req));
  }

  res.render("layouts/main", {
    title: "MiRealYo | Iniciar sesión",
    page: "../pages/login/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Iniciar sesión",
        description: "Ingresa a tu cuenta para acceder a tu lectura.",
        canonicalPath: "/login"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      title: "Bienvenido de vuelta",
      subtitle: "Ingresa a tu cuenta para retomar tu proceso y acceder a tu lectura."
    }
  });
}

export async function handleLogin(req: Request, res: Response) {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!email.includes("@") || !password) {
    return res.status(400).render("layouts/main", {
      title: "MiRealYo | Iniciar sesión",
      page: "../pages/login/index",
      seo: buildSeoMeta(
        {
          title: "MiRealYo | Iniciar sesión",
          description: "Ingresa a tu cuenta para acceder a tu lectura.",
          canonicalPath: "/login"
        },
        res.app.locals.siteUrl
      ),
      pageData: {
        title: "Bienvenido de vuelta",
        subtitle: "Ingresa a tu cuenta para retomar tu proceso y acceder a tu lectura.",
        email,
        error: "Credenciales inválidas."
      }
    });
  }

  try {
    const user = await authService.authenticate(email, password);

    req.session.auth = {
      userId: user.id,
      email: user.email
    };
    req.session.assessment =
      assessmentPersistenceService.load(user.id) ??
      req.session.assessment ??
      createEmptyAssessmentSession();

    return res.redirect("/daily");
  } catch (error) {
    const message =
      error instanceof AuthError ? error.message : "No fue posible iniciar sesión.";

    return res.status(400).render("layouts/main", {
      title: "MiRealYo | Iniciar sesión",
      page: "../pages/login/index",
      seo: buildSeoMeta(
        {
          title: "MiRealYo | Iniciar sesión",
          description: "Ingresa a tu cuenta para acceder a tu lectura.",
          canonicalPath: "/login"
        },
        res.app.locals.siteUrl
      ),
      pageData: {
        title: "Bienvenido de vuelta",
        subtitle: "Ingresa a tu cuenta para retomar tu proceso y acceder a tu lectura.",
        email,
        error: message
      }
    });
  }
}

export function handleLogout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
}

export async function handleRegister(req: Request, res: Response) {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const intent = getRegisterIntent(req.body.registrationIntent);

  if (!intent) {
    return renderRegisterPage(res.status(400), {
      email,
      error: "Selecciona si quieres crear tu cuenta con descarga o sin descarga."
    });
  }

  if (!email.includes("@")) {
    return renderRegisterPage(res.status(400), {
      email,
      intent,
      error: "Ingresa un correo electrónico válido."
    });
  }

  if (password.length < 6) {
    return renderRegisterPage(res.status(400), {
      email,
      intent,
      error: "La contraseña debe tener al menos 6 caracteres."
    });
  }

  try {
    const user = await authService.register(email, password);

    req.session.auth = {
      userId: user.id,
      email: user.email
    };
    req.session.assessment ??= createEmptyAssessmentSession();
    persistAssessmentSession(req);
  } catch (error) {
    const message =
      error instanceof AuthError ? error.message : "No fue posible crear la cuenta.";

    return renderRegisterPage(res.status(400), {
      email,
      intent,
      error: message
    });
  }

  return res.redirect(intent === "download" ? "/full-results/pdf" : "/daily");
}

export function renderAdmin(req: Request, res: Response) {
  const options = getAppearanceOptions();

  res.render("layouts/main", {
    title: "MiRealYo | Admin",
    page: "../pages/admin/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Admin",
        description: "Vista administrativa interna para acceso directo por URL.",
        canonicalPath: "/admin",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      appearance: getAppearanceSettings(),
      themeOptions: options.themes,
      fontOptions: options.fonts,
      saved: req.query.saved === "1"
    },
    appearance: getAppearanceSettings(),
    appearanceFont: getCurrentFontDescriptor()
  });
}

export function renderDatabaseExplorer(req: Request, res: Response) {
  const limitQuery = Number.parseInt(String(req.query.limit ?? "50"), 10);
  const limit = Number.isNaN(limitQuery) ? 50 : Math.max(1, Math.min(limitQuery, 200));
  const tables = databaseInspector.listTables();
  const selectedTable =
    typeof req.query.table === "string" && req.query.table.trim()
      ? req.query.table.trim()
      : tables[0]?.name;
  const selectedTableData = selectedTable
    ? databaseInspector.getTableData(selectedTable, limit)
    : null;

  res.render("layouts/main", {
    title: "MiRealYo | DB",
    page: "../pages/db/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | DB",
        description: "Vista interna para inspeccionar tablas y registros de la base de datos.",
        canonicalPath: "/db",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      tables,
      selectedTable,
      selectedTableData,
      limit
    }
  });
}

export function updateAdminAppearance(req: Request, res: Response) {
  updateAppearanceSettings({
    bootswatchTheme: String(req.body.bootswatchTheme ?? ""),
    fontOption: String(req.body.fontOption ?? ""),
    customFontCssHref: String(req.body.customFontCssHref ?? ""),
    customFontFamily: String(req.body.customFontFamily ?? "")
  });

  res.app.locals.appearance = getAppearanceSettings();
  res.app.locals.appearanceFont = getCurrentFontDescriptor();

  return res.redirect("/admin?saved=1");
}

export function renderPreOnboarding(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  res.render("layouts/main", {
    title: "MiRealYo | Empezar",
    page: "../pages/pre-onboarding/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Empezar tu lectura",
        description:
          "Comparte solo tu nombre para comenzar el quick test de personalidad con una experiencia mas personal.",
        canonicalPath: "/empezar"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      name: session.leadName,
      privacyAccepted: false
    }
  });
}

export function startLeadCapture(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);
  const nombre = String(req.body.nombre ?? "").trim();
  const pronombres = String(req.body.pronombres ?? "").trim();
  const privacyAccepted = String(req.body.privacyAccepted ?? "") === "yes";

  if (nombre.length < 2) {
    return res.status(400).render("layouts/main", {
      title: "MiRealYo | Empezar",
      page: "../pages/pre-onboarding/index",
      seo: buildSeoMeta(
        {
          title: "MiRealYo | Empezar tu lectura",
          description:
            "Comparte solo tu nombre para comenzar el quick test de personalidad con una experiencia mas personal.",
          canonicalPath: "/empezar"
        },
        res.app.locals.siteUrl
      ),
      pageData: {
        name: nombre,
        pronombres: pronombres,
        privacyAccepted,
        error: "Escribe tu nombre para continuar."
      }
    });
  }

  if (!privacyAccepted) {
    return res.status(400).render("layouts/main", {
      title: "MiRealYo | Empezar",
      page: "../pages/pre-onboarding/index",
      seo: buildSeoMeta(
        {
          title: "MiRealYo | Empezar tu lectura",
          description:
            "Comparte solo tu nombre para comenzar el quick test de personalidad con una experiencia mas personal.",
          canonicalPath: "/empezar"
        },
        res.app.locals.siteUrl
      ),
      pageData: {
        name: nombre,
        pronombres,
        privacyAccepted,
        error: "Debes aceptar la Politica de Privacidad para continuar."
      }
    });
  }

  session.leadName = nombre;
  session.leadPronombres = pronombres || undefined;
  session.hookAnswers = {};
  session.premiumAnswers = {};
  session.hookOutcome = undefined;
  session.premiumOutcome = undefined;
  session.demo = undefined;
  persistAssessmentSession(req);

  return res.redirect("/quick-test");
}

export function renderOnboarding(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.leadName) {
    return res.redirect("/empezar");
  }

  if (!session.hookOutcome) {
    return res.redirect("/quick-test");
  }

  res.render("layouts/main", {
    title: "MiRealYo | Onboarding",
    page: "../pages/onboarding/index",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Personaliza tu lectura",
        description:
          "Comparte tu nombre y el objetivo que te trae aqui para personalizar la devolucion de tu lectura y tu reporte final.",
        canonicalPath: "/onboarding"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      title: "Tu lectura esta lista para volverse mas personal",
      subtitle:
        "Antes de mostrartela, queremos entender que buscas comprender mejor de ti.",
      name: session.leadName,
      objectiveOptions
    }
  });
}

export function renderQuickTestIntro(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.leadName) {
    return res.redirect("/empezar");
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
      hookCount: getHookQuestions().length
    }
  });
}

export function renderFullTestIntro(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/quick-test");
  }

  res.render("layouts/main", {
    title: "MiRealYo | Estudio ampliado",
    page: "../pages/full-test/intro",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Estudio ampliado de personalidad",
        description:
          "Profundiza en tu estructura interna con el estudio ampliado: tu Persona, tu Sombra y tu patrón arquetipal completo.",
        canonicalPath: "/full-test",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      premiumCount: getPremiumQuestions().length
    }
  });
}

export function startQuickTest(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.leadName) {
    return res.redirect("/empezar");
  }

  const resumeIndex = getQuestionIndexToResume(getHookQuestions(), session.hookAnswers);
  return res.redirect(`/quick-test/${resumeIndex}`);
}

export function startAssessment(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);
  const objetivo = String(req.body.objetivo ?? "") as ObjectiveKey;

  if (!session.leadName) {
    return res.redirect("/empezar");
  }

  if (!session.hookOutcome) {
    return res.redirect("/quick-test");
  }

  if (!objectiveOptions.some((option) => option.value === objetivo)) {
    return res.status(400).render("layouts/main", {
      title: "MiRealYo | Onboarding",
      page: "../pages/onboarding/index",
      seo: buildSeoMeta(
        {
          title: "MiRealYo | Personaliza tu lectura",
          description:
            "Comparte tu nombre y el objetivo que te trae aqui para personalizar la devolucion de tu lectura y tu reporte final.",
          canonicalPath: "/onboarding"
        },
        res.app.locals.siteUrl
      ),
      pageData: {
        title: "Tu lectura esta lista para volverse mas personal",
        subtitle:
          "Antes de mostrartela, queremos entender que buscas comprender mejor de ti.",
        name: session.leadName,
        objectiveOptions,
        selectedObjective: objetivo,
        error: "Selecciona la opcion que mejor represente lo que buscas comprender."
      }
    });
  }

  session.demo = buildDemoProfile({
    nombre: session.leadName as DemoInput["nombre"],
    objetivo: objetivo as DemoInput["objetivo"]
  });
  persistAssessmentSession(req);

  return res.redirect("/quick-results");
}

export function renderHookQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.leadName) {
    return res.redirect("/empezar");
  }

  const resumeIndex = getQuestionIndexToResume(getHookQuestions(), session.hookAnswers as Partial<Record<string, LikertValue>>);
  const requestedIndex = parseIndex(req.params.index, getHookQuestions().length);
  const index = Math.min(requestedIndex, resumeIndex);
  const hookList = getHookQuestions();
  const question = hookList[index - 1];
  const selectedValue = session.hookAnswers[question.id as keyof typeof session.hookAnswers];

  renderQuestionPage(res, {
    title: "MiRealYo | Quick Test",
    eyebrow: "Tus Instintos Primarios",
    heading: "Quick test",
    stageLabel: "Tus instintos primarios",
    selectAction: `/quick-test/${index}/select`,
    nextAction: `/quick-test/${index}/next`,
    index,
    total: getHookQuestions().length,
    prompt: question.prompt,
    selectedValue,
    selectedLabel: likertOptions.find((option) => option.value === selectedValue)?.label,
    backHref: index > 1 ? `/quick-test/${index - 1}` : "/quick-test",
    leadPronombres: session.leadPronombres,
    leadName: session.leadName
  });
}

export function selectHookAnswer(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.leadName) {
    return res.redirect("/empezar");
  }

  const index = parseIndex(req.params.index, getHookQuestions().length);
  const hookList = getHookQuestions();
  const question = hookList[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (!answer) {
    return res.redirect(`/quick-test/${index}`);
  }

  (session.hookAnswers as Record<string, LikertValue>)[question.id] = answer;
  persistAssessmentSession(req);
  return res.redirect(`/quick-test/${index}`);
}

export function submitHookQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.leadName) {
    return res.redirect("/empezar");
  }

  const index = parseIndex(req.params.index, getHookQuestions().length);
  const hookList = getHookQuestions();
  const question = hookList[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (answer) {
    (session.hookAnswers as Record<string, LikertValue>)[question.id] = answer;
    persistAssessmentSession(req);
  }

  if ((session.hookAnswers as Record<string, LikertValue>)[question.id] === undefined) {
    return res.redirect(`/quick-test/${index}`);
  }

  if (index < getHookQuestions().length) {
    return res.redirect(`/quick-test/${index + 1}`);
  }

  const completedAnswers = ensureCompleteAnswers(
    getHookQuestions() as { id: HookQuestionId }[],
    session.hookAnswers as Partial<Record<HookQuestionId, LikertValue>>
  );

  if (!completedAnswers) {
    return res.redirect(
      `/quick-test/${getQuestionIndexToResume(getHookQuestions(), session.hookAnswers)}`
    );
  }

  session.hookOutcome = buildHookOutcome(completedAnswers as HookAnswers);
  persistAssessmentSession(req);
  return res.redirect("/onboarding");
}

export function renderTeaser(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.demo || !session.hookOutcome) {
    return res.redirect(session.hookOutcome ? "/onboarding" : "/quick-test");
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
      name: session.demo.nombre,
      dominantArchetype: session.hookOutcome.ranking[0].name,
      objective: session.demo.objetivo_label,
      topThree: session.hookOutcome.ranking.slice(0, 3).map((item) => item.name),
      topScores: session.hookOutcome.ranking.slice(0, 3),
      persona: session.hookOutcome.estructuras.Persona,
      sombraBase: session.hookOutcome.estructuras.Sombra_Base
    }
  });
}

export function startPremium(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/quick-test");
  }

  session.premiumAnswers = {};
  session.premiumOutcome = undefined;
  persistAssessmentSession(req);

  const resumeIndex = getQuestionIndexToResume(getPremiumQuestions(), session.premiumAnswers);
  return res.redirect(`/full-test/${resumeIndex}`);
}

export function renderPremiumQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/quick-test");
  }

  const resumeIndex = getQuestionIndexToResume(getPremiumQuestions(), session.premiumAnswers);
  const requestedIndex = parseIndex(req.params.index, getPremiumQuestions().length);
  const index = Math.min(requestedIndex, resumeIndex);
  const premiumList = getPremiumQuestions();
  const question = premiumList[index - 1];
  const selectedValue = session.premiumAnswers[question.id as keyof typeof session.premiumAnswers];

  const identificationText = session.leadPronombres === "ella" ? "identificada" 
    : session.leadPronombres === "él" ? "identificado" 
    : session.leadPronombres === "elle" ? "identificad@" 
    : "identificad@";
  
  const genderHeading = session.leadName 
    ? `${session.leadName}, ¿qué tan ${identificationText} te sientes con la siguiente afirmación?`
    : `¿Qué tan ${identificationText} te sientes con la siguiente afirmación?`;

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
      heading: genderHeading,
      stageLabel: "Calibracion profunda",
      selectAction: `/full-test/${index}/select`,
      nextAction: `/full-test/${index}/next`,
      currentIndex: index,
      totalQuestions: getPremiumQuestions().length,
      prompt: question.prompt,
      selectedValue,
      selectedLabel: likertOptions.find((option) => option.value === selectedValue)?.label,
      selectedIndex:
        selectedValue !== undefined
          ? likertOptions.findIndex((option) => option.value === selectedValue)
          : -1,
      progressPercent: Math.round((index / getPremiumQuestions().length) * 100),
      options: likertOptions,
      backHref: index > 1 ? `/full-test/${index - 1}` : undefined
    }
  });
}

export function selectPremiumAnswer(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/quick-test");
  }

  const index = parseIndex(req.params.index, getPremiumQuestions().length);
  const premiumList = getPremiumQuestions();
  const question = premiumList[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (!answer) {
    return res.redirect(`/full-test/${index}`);
  }

  (session.premiumAnswers as Record<string, LikertValue>)[question.id] = answer;
  persistAssessmentSession(req);
  return res.redirect(`/full-test/${index}`);
}

export function submitPremiumQuestion(req: Request, res: Response) {
  const session = ensureAssessmentSession(req);

  if (!session.hookOutcome) {
    return res.redirect("/quick-test");
  }

  const index = parseIndex(req.params.index, getPremiumQuestions().length);
  const premiumList = getPremiumQuestions();
  const question = premiumList[index - 1];
  const answer = parseLikertValue(req.body.answer);

  if (answer) {
    (session.premiumAnswers as Record<string, LikertValue>)[question.id] = answer;
    persistAssessmentSession(req);
  }

  if ((session.premiumAnswers as Record<string, LikertValue>)[question.id] === undefined) {
    return res.redirect(`/full-test/${index}`);
  }

  if (index < getPremiumQuestions().length) {
    return res.redirect(`/full-test/${index + 1}`);
  }

  const completedAnswers = ensureCompleteAnswers(
    getPremiumQuestions() as { id: PremiumQuestionId }[],
    session.premiumAnswers as Partial<Record<PremiumQuestionId, LikertValue>>
  );

  if (!completedAnswers) {
    return res.redirect(
      `/full-test/${getQuestionIndexToResume(getPremiumQuestions(), session.premiumAnswers)}`
    );
  }

  session.premiumOutcome = buildPremiumOutcome(completedAnswers as PremiumAnswers);
  persistAssessmentSession(req);
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
