import { Router } from "express";

import {
  handleWompiWebhook,
  loginForPremiumPayment,
  registerForPremiumPayment,
  renderPaymentResponse,
  renderPremiumPaymentAuth,
  renderPremiumPaymentEntry
} from "./payments.controller.js";

export const paymentsRouter = Router();

paymentsRouter.get("/pagos/estudio-profundo", renderPremiumPaymentEntry);
paymentsRouter.post("/pagos/estudio-profundo", renderPremiumPaymentEntry);
paymentsRouter.get("/pagos/estudio-profundo/registro", renderPremiumPaymentAuth);
paymentsRouter.post("/pagos/estudio-profundo/registro", registerForPremiumPayment);
paymentsRouter.post("/pagos/estudio-profundo/login", loginForPremiumPayment);
paymentsRouter.get("/pagos/respuesta", renderPaymentResponse);
paymentsRouter.post("/webhooks/wompi", handleWompiWebhook);
