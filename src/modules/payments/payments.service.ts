import crypto from "node:crypto";

import { env } from "../../config/env.js";
import {
  PREMIUM_ASSESSMENT_PRODUCT,
  type PaymentRecord,
  type PaymentsRepository,
  type PaymentStatus
} from "./payments.types.js";
import { WompiService } from "./wompi.service.js";

export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly wompiService: WompiService
  ) {}

  hasApprovedPremiumAccess(userId: string): boolean {
    return Boolean(
      this.paymentsRepository.findApprovedPaymentForUserProduct(
        userId,
        PREMIUM_ASSESSMENT_PRODUCT
      )
    );
  }

  findLatestPremiumPayment(userId: string): PaymentRecord | null {
    return this.paymentsRepository.findLatestPaymentForUserProduct(
      userId,
      PREMIUM_ASSESSMENT_PRODUCT
    );
  }

  findPaymentByReference(reference: string): PaymentRecord | null {
    return this.paymentsRepository.findPaymentByReference(reference);
  }

  createOrReusePendingPremiumPayment(userId: string): PaymentRecord {
    const latestPayment = this.findLatestPremiumPayment(userId);

    if (latestPayment?.status === "PENDING") {
      return latestPayment;
    }

    const reference = `MRY-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const signature = this.wompiService.buildIntegritySignature(
      reference,
      env.wompi.premiumAmountInCents,
      env.wompi.currency
    );

    return this.paymentsRepository.createPayment({
      userId,
      productCode: PREMIUM_ASSESSMENT_PRODUCT,
      reference,
      amountInCents: env.wompi.premiumAmountInCents,
      currency: env.wompi.currency,
      provider: "WOMPI",
      checkoutPayloadJson: JSON.stringify({ signature })
    });
  }

  buildCheckout(payment: PaymentRecord) {
    const signature = this.wompiService.buildIntegritySignature(
      payment.reference,
      payment.amountInCents,
      payment.currency
    );

    return {
      publicKey: env.wompi.publicKey,
      currency: payment.currency,
      amountInCents: payment.amountInCents,
      reference: payment.reference,
      signature,
      redirectUrl: `${env.siteUrl}/pagos/respuesta?reference=${encodeURIComponent(payment.reference)}`,
      environment: env.wompi.environment
    };
  }

  updateFromWompiEvent(input: {
    reference: string;
    status: PaymentStatus;
    providerTransactionId?: string;
    providerPaymentMethod?: string;
    rawEvent: unknown;
  }): PaymentRecord | null {
    return this.paymentsRepository.updatePaymentFromProvider({
      reference: input.reference,
      status: input.status,
      providerTransactionId: input.providerTransactionId,
      providerPaymentMethod: input.providerPaymentMethod,
      lastEventJson: JSON.stringify(input.rawEvent)
    });
  }

  isWompiConfigured(): boolean {
    return this.wompiService.isConfigured();
  }
}
