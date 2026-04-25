import type { Request, Response } from "express";

import { AuthError } from "../auth/auth.service.js";
import { getAuthService } from "../auth/auth.container.js";
import { getAssessmentPersistenceService } from "../assessment/assessment.persistence.container.js";
import { buildSeoMeta } from "../assessment/assessment.seo.js";
import { getPaymentsService, getWompiService } from "./payments.container.js";

const authService = getAuthService();
const assessmentPersistenceService = getAssessmentPersistenceService();
const paymentsService = getPaymentsService();
const wompiService = getWompiService();

function hasBasicResult(req: Request): boolean {
  return Boolean(req.session.assessment?.hookOutcome);
}

function persistCurrentAssessment(req: Request): void {
  const userId = req.session.auth?.userId;
  const assessment = req.session.assessment;

  if (!userId || !assessment) {
    return;
  }

  assessmentPersistenceService.save(userId, assessment);
}

function renderPremiumAuthGate(
  req: Request,
  res: Response,
  pageData: { email?: string; loginEmail?: string; error?: string; loginError?: string } = {}
) {
  return res.render("layouts/main", {
    title: "MiRealYo | Guardar lectura",
    page: "../pages/payments/premium-auth",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Guardar lectura",
        description: "Crea tu cuenta para guardar tu lectura y continuar al estudio profundo.",
        canonicalPath: "/pagos/estudio-profundo/registro",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData
  });
}

function renderPremiumCheckout(req: Request, res: Response) {
  if (!req.session.auth) {
    return res.redirect("/pagos/estudio-profundo/registro");
  }

  if (!hasBasicResult(req)) {
    return res.redirect("/quick-test");
  }

  persistCurrentAssessment(req);

  if (paymentsService.hasApprovedPremiumAccess(req.session.auth.userId)) {
    return res.redirect("/full-test");
  }

  const payment = paymentsService.createOrReusePendingPremiumPayment(req.session.auth.userId);
  const checkout = paymentsService.buildCheckout(payment);

  return res.render("layouts/main", {
    title: "MiRealYo | Estudio profundo",
    page: "../pages/payments/premium-checkout",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Estudio profundo",
        description: "Activa el estudio profundo de MiRealYo con un pago seguro.",
        canonicalPath: "/pagos/estudio-profundo",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      payment,
      checkout,
      isConfigured: paymentsService.isWompiConfigured()
    }
  });
}

export function renderPremiumPaymentEntry(req: Request, res: Response) {
  if (!hasBasicResult(req)) {
    return res.redirect("/quick-test");
  }

  if (!req.session.auth) {
    return renderPremiumAuthGate(req, res);
  }

  return renderPremiumCheckout(req, res);
}

export function renderPremiumPaymentAuth(req: Request, res: Response) {
  if (!hasBasicResult(req)) {
    return res.redirect("/quick-test");
  }

  if (req.session.auth) {
    return res.redirect("/pagos/estudio-profundo");
  }

  return renderPremiumAuthGate(req, res);
}

export async function registerForPremiumPayment(req: Request, res: Response) {
  if (!hasBasicResult(req)) {
    return res.redirect("/quick-test");
  }

  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!email.includes("@")) {
    return renderPremiumAuthGate(req, res.status(400), {
      email,
      error: "Ingresa un correo electrónico válido."
    });
  }

  if (password.length < 6) {
    return renderPremiumAuthGate(req, res.status(400), {
      email,
      error: "La contraseña debe tener al menos 6 caracteres."
    });
  }

  try {
    const user = await authService.register(email, password);
    req.session.auth = {
      userId: user.id,
      email: user.email
    };
    persistCurrentAssessment(req);
    return res.redirect("/pagos/estudio-profundo");
  } catch (error) {
    const message =
      error instanceof AuthError ? error.message : "No fue posible crear la cuenta.";

    return renderPremiumAuthGate(req, res.status(400), {
      email,
      error: message
    });
  }
}

export async function loginForPremiumPayment(req: Request, res: Response) {
  if (!hasBasicResult(req)) {
    return res.redirect("/quick-test");
  }

  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  try {
    const user = await authService.authenticate(email, password);
    req.session.auth = {
      userId: user.id,
      email: user.email
    };
    persistCurrentAssessment(req);
    return res.redirect("/pagos/estudio-profundo");
  } catch (error) {
    const message =
      error instanceof AuthError ? error.message : "No fue posible iniciar sesión.";

    return renderPremiumAuthGate(req, res.status(400), {
      loginEmail: email,
      loginError: message
    });
  }
}

export function renderPaymentResponse(req: Request, res: Response) {
  const reference = String(req.query.reference ?? "");
  const paymentByReference = reference ? paymentsService.findPaymentByReference(reference) : null;
  const payment =
    paymentByReference && paymentByReference.userId === req.session.auth?.userId
      ? paymentByReference
      : null;

  return res.render("layouts/main", {
    title: "MiRealYo | Estado del pago",
    page: "../pages/payments/payment-response",
    seo: buildSeoMeta(
      {
        title: "MiRealYo | Estado del pago",
        description: "Consulta el estado de activación de tu estudio profundo.",
        canonicalPath: "/pagos/respuesta",
        robots: "noindex,nofollow"
      },
      res.app.locals.siteUrl
    ),
    pageData: {
      reference,
      payment
    }
  });
}

export function handleWompiWebhook(req: Request, res: Response) {
  const event = req.body;

  if (!wompiService.validateEvent(event)) {
    return res.status(401).json({ status: "ignored" });
  }

  const transactionEvent = wompiService.extractTransactionEvent(event);

  if (!transactionEvent) {
    return res.status(200).json({ status: "ignored" });
  }

  paymentsService.updateFromWompiEvent({
    ...transactionEvent,
    rawEvent: event
  });

  return res.status(200).json({ status: "ok" });
}
