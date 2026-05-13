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

  findApprovedPremiumPayment(userId: string): PaymentRecord | null {
    return this.paymentsRepository.findApprovedPaymentForUserProduct(
      userId,
      PREMIUM_ASSESSMENT_PRODUCT
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

  ensureApprovedPremiumAccessForDevelopment(userId: string): PaymentRecord {
    const approved = this.findApprovedPremiumPayment(userId);

    if (approved?.status === "APPROVED") {
      return approved;
    }

    const payment = this.createOrReusePendingPremiumPayment(userId);
    const approvedPayment = this.updateFromWompiEvent({
      reference: payment.reference,
      status: "APPROVED",
      providerTransactionId: `dev-bypass-${Date.now()}`,
      providerPaymentMethod: "DEV_BYPASS",
      rawEvent: { source: "development_bypass" }
    });

    return approvedPayment ?? payment;
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
    amountInCents?: number;
    currency?: string;
    rawEvent: unknown;
  }): PaymentRecord | null {
    const payment = this.findPaymentByReference(input.reference);

    if (!payment) {
      return null;
    }

    if (input.amountInCents !== undefined && input.amountInCents !== payment.amountInCents) {
      return null;
    }

    if (input.currency && input.currency !== payment.currency) {
      return null;
    }

    return this.paymentsRepository.updatePaymentFromProvider({
      reference: input.reference,
      status: input.status,
      providerTransactionId: input.providerTransactionId,
      providerPaymentMethod: input.providerPaymentMethod,
      lastEventJson: JSON.stringify(input.rawEvent)
    });
  }

  approveLocalTestPayment(reference: string, userId: string): PaymentRecord | null {
    const payment = this.findPaymentByReference(reference);

    if (!payment || payment.userId !== userId || payment.status !== "PENDING") {
      return null;
    }

    return this.updateFromWompiEvent({
      reference,
      status: "APPROVED",
      providerTransactionId: `local-test-${Date.now()}`,
      providerPaymentMethod: "LOCAL_TEST",
      rawEvent: {
        source: "local-payment-simulation",
        reference,
        status: "APPROVED"
      }
    });
  }

  async syncFromWompiTransaction(transactionId: string): Promise<PaymentRecord | null> {
    const transaction = await this.wompiService.fetchTransaction(transactionId);

    if (!transaction) {
      return null;
    }

    const payment = this.findPaymentByReference(transaction.reference);

    if (!payment) {
      return null;
    }

    if (
      transaction.amountInCents !== undefined &&
      transaction.amountInCents !== payment.amountInCents
    ) {
      return payment;
    }

    if (transaction.currency && transaction.currency !== payment.currency) {
      return payment;
    }

    return this.paymentsRepository.updatePaymentFromProvider({
      reference: transaction.reference,
      status: transaction.status,
      providerTransactionId: transaction.id,
      providerPaymentMethod: transaction.paymentMethodType,
      lastEventJson: JSON.stringify({ source: "redirect_lookup", transaction })
    });
  }

  async syncPaymentStatusFromTransactionId(transactionId: string): Promise<PaymentRecord | null> {
    return this.syncFromWompiTransaction(transactionId);
  }

  isWompiConfigured(): boolean {
    return this.wompiService.isConfigured();
  }

  isWompiCheckoutConfigured(): boolean {
    return this.wompiService.isCheckoutConfigured();
  }
}
