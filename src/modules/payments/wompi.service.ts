import crypto from "node:crypto";

import { env } from "../../config/env.js";
import type { PaymentStatus } from "./payments.types.js";

const paymentStatuses = new Set<PaymentStatus>([
  "PENDING",
  "APPROVED",
  "DECLINED",
  "ERROR",
  "VOIDED"
]);

interface WompiEventSignature {
  properties?: string[];
  checksum?: string;
}

interface WompiTransactionEvent {
  event?: string;
  data?: {
    transaction?: {
      id?: string;
      reference?: string;
      status?: PaymentStatus;
      amount_in_cents?: number;
      currency?: string;
      payment_method_type?: string;
      customer_email?: string;
    };
  };
  signature?: WompiEventSignature;
  timestamp?: number;
}

interface WompiTransactionLookupResponse {
  data?: {
    id?: string;
    reference?: string;
    status?: PaymentStatus;
    amount_in_cents?: number;
    currency?: string;
    payment_method_type?: string;
    customer_email?: string;
  };
}

export interface WompiTransactionSnapshot {
  id: string;
  reference: string;
  status: PaymentStatus;
  amountInCents?: number;
  currency?: string;
  paymentMethodType?: string;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && paymentStatuses.has(value as PaymentStatus);
}

function getNestedValue(source: unknown, path: string): string {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);

  return value === undefined || value === null ? "" : String(value);
}

export class WompiService {
  private getApiBaseUrl(): string {
    return env.wompi.environment.toLowerCase().includes("prod")
      ? "https://production.wompi.co/v1"
      : "https://sandbox.wompi.co/v1";
  }

  buildIntegritySignature(reference: string, amountInCents: number, currency: string): string {
    return sha256(`${reference}${amountInCents}${currency}${env.wompi.integritySecret}`);
  }

  isConfigured(): boolean {
    return Boolean(env.wompi.publicKey && env.wompi.integritySecret && env.wompi.eventsSecret);
  }

  isCheckoutConfigured(): boolean {
    if (!env.wompi.publicKey || !env.wompi.integritySecret) {
      return false;
    }

    const expectedPrefix = env.wompi.environment.toLowerCase().includes("prod")
      ? "pub_prod_"
      : "pub_test_";

    return env.wompi.publicKey.startsWith(expectedPrefix);
  }

  validateEvent(event: WompiTransactionEvent): boolean {
    const properties = event.signature?.properties;
    const checksum = event.signature?.checksum;
    const timestamp = event.timestamp;

    if (!properties?.length || !checksum || timestamp === undefined || !env.wompi.eventsSecret) {
      return false;
    }

    const values = properties.map((property) => getNestedValue(event.data, property)).join("");
    const calculatedChecksum = sha256(`${values}${timestamp}${env.wompi.eventsSecret}`);

    return calculatedChecksum.toLowerCase() === checksum.toLowerCase();
  }

  extractTransactionEvent(event: WompiTransactionEvent) {
    const transaction = event.data?.transaction;

    if (
      event.event !== "transaction.updated" ||
      !transaction?.reference ||
      !isPaymentStatus(transaction.status)
    ) {
      return null;
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      providerTransactionId: transaction.id,
      providerPaymentMethod: transaction.payment_method_type,
      amountInCents: transaction.amount_in_cents,
      currency: transaction.currency
    };
  }

  async fetchTransaction(transactionId: string): Promise<WompiTransactionSnapshot | null> {
    const normalizedTransactionId = transactionId.trim();

    if (!normalizedTransactionId || !env.wompi.publicKey) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.getApiBaseUrl()}/transactions/${encodeURIComponent(normalizedTransactionId)}`,
        {
          headers: {
            Authorization: `Bearer ${env.wompi.publicKey}`
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as WompiTransactionLookupResponse;
      const transaction = body.data;

      if (!transaction?.id || !transaction.reference || !isPaymentStatus(transaction.status)) {
        return null;
      }

      return {
        id: transaction.id,
        reference: transaction.reference,
        status: transaction.status,
        amountInCents: transaction.amount_in_cents,
        currency: transaction.currency,
        paymentMethodType: transaction.payment_method_type
      };
    } catch {
      return null;
    }
  }

  async fetchTransactionById(transactionId: string) {
    const transaction = await this.fetchTransaction(transactionId);

    if (!transaction) {
      return null;
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      providerTransactionId: transaction.id,
      providerPaymentMethod: transaction.paymentMethodType,
      amountInCents: transaction.amountInCents,
      currency: transaction.currency,
      rawEvent: { data: transaction }
    };
  }
}
