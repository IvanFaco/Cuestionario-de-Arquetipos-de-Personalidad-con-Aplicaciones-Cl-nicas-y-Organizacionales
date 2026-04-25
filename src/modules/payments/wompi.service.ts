import crypto from "node:crypto";

import { env } from "../../config/env.js";
import type { PaymentStatus } from "./payments.types.js";

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

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
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
  buildIntegritySignature(reference: string, amountInCents: number, currency: string): string {
    return sha256(`${reference}${amountInCents}${currency}${env.wompi.integritySecret}`);
  }

  isConfigured(): boolean {
    return Boolean(env.wompi.publicKey && env.wompi.integritySecret && env.wompi.eventsSecret);
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

    if (event.event !== "transaction.updated" || !transaction?.reference || !transaction.status) {
      return null;
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      providerTransactionId: transaction.id,
      providerPaymentMethod: transaction.payment_method_type
    };
  }
}
