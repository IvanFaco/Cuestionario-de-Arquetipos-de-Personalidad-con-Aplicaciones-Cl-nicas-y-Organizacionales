import crypto from "node:crypto";

import type { SqliteClient } from "../../shared/database/sqlite/sqlite.client.js";
import type {
  CreatePaymentInput,
  PaymentRecord,
  PaymentStatus,
  PaymentsRepository,
  UpdatePaymentFromProviderInput
} from "./payments.types.js";

interface SqlitePaymentRow {
  id: string;
  user_id: string;
  product_code: string;
  reference: string;
  status: PaymentStatus;
  amount_in_cents: number;
  currency: string;
  provider: "WOMPI";
  provider_transaction_id: string | null;
  provider_payment_method: string | null;
  checkout_payload_json: string | null;
  last_event_json: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

function mapPaymentRow(row: SqlitePaymentRow): PaymentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    productCode: row.product_code,
    reference: row.reference,
    status: row.status,
    amountInCents: row.amount_in_cents,
    currency: row.currency,
    provider: row.provider,
    providerTransactionId: row.provider_transaction_id ?? undefined,
    providerPaymentMethod: row.provider_payment_method ?? undefined,
    checkoutPayloadJson: row.checkout_payload_json ?? undefined,
    lastEventJson: row.last_event_json ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at ?? undefined
  };
}

export class SqlitePaymentsRepository implements PaymentsRepository {
  constructor(private readonly sqlite: SqliteClient) {}

  createPayment(input: CreatePaymentInput): PaymentRecord {
    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      productCode: input.productCode,
      reference: input.reference,
      status: "PENDING",
      amountInCents: input.amountInCents,
      currency: input.currency,
      provider: input.provider,
      checkoutPayloadJson: input.checkoutPayloadJson,
      createdAt: now,
      updatedAt: now
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO payments (
            id,
            user_id,
            product_code,
            reference,
            status,
            amount_in_cents,
            currency,
            provider,
            checkout_payload_json,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        payment.id,
        payment.userId,
        payment.productCode,
        payment.reference,
        payment.status,
        payment.amountInCents,
        payment.currency,
        payment.provider,
        payment.checkoutPayloadJson ?? null,
        payment.createdAt,
        payment.updatedAt
      );

    return payment;
  }

  findPaymentByReference(reference: string): PaymentRecord | null {
    const row = this.sqlite
      .prepare<[string], SqlitePaymentRow | undefined>(
        `
          SELECT *
          FROM payments
          WHERE reference = ?
        `
      )
      .get(reference);

    return row ? mapPaymentRow(row) : null;
  }

  findLatestPaymentForUserProduct(userId: string, productCode: string): PaymentRecord | null {
    const row = this.sqlite
      .prepare<[string, string], SqlitePaymentRow | undefined>(
        `
          SELECT *
          FROM payments
          WHERE user_id = ? AND product_code = ?
          ORDER BY created_at DESC
          LIMIT 1
        `
      )
      .get(userId, productCode);

    return row ? mapPaymentRow(row) : null;
  }

  findApprovedPaymentForUserProduct(userId: string, productCode: string): PaymentRecord | null {
    const row = this.sqlite
      .prepare<[string, string], SqlitePaymentRow | undefined>(
        `
          SELECT *
          FROM payments
          WHERE user_id = ? AND product_code = ? AND status = 'APPROVED'
          ORDER BY approved_at DESC, updated_at DESC
          LIMIT 1
        `
      )
      .get(userId, productCode);

    return row ? mapPaymentRow(row) : null;
  }

  updatePaymentFromProvider(input: UpdatePaymentFromProviderInput): PaymentRecord | null {
    const now = new Date().toISOString();
    const approvedAt = input.status === "APPROVED" ? now : null;

    this.sqlite
      .prepare(
        `
          UPDATE payments
          SET
            status = ?,
            provider_transaction_id = COALESCE(?, provider_transaction_id),
            provider_payment_method = COALESCE(?, provider_payment_method),
            last_event_json = ?,
            updated_at = ?,
            approved_at = COALESCE(?, approved_at)
          WHERE reference = ?
        `
      )
      .run(
        input.status,
        input.providerTransactionId ?? null,
        input.providerPaymentMethod ?? null,
        input.lastEventJson,
        now,
        approvedAt,
        input.reference
      );

    return this.findPaymentByReference(input.reference);
  }
}
