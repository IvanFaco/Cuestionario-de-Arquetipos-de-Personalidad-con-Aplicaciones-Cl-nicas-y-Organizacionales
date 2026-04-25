export const PREMIUM_ASSESSMENT_PRODUCT = "deep_assessment";

export type PaymentStatus = "PENDING" | "APPROVED" | "DECLINED" | "ERROR" | "VOIDED";

export interface PaymentRecord {
  id: string;
  userId: string;
  productCode: string;
  reference: string;
  status: PaymentStatus;
  amountInCents: number;
  currency: string;
  provider: "WOMPI";
  providerTransactionId?: string;
  providerPaymentMethod?: string;
  checkoutPayloadJson?: string;
  lastEventJson?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface CreatePaymentInput {
  userId: string;
  productCode: string;
  reference: string;
  amountInCents: number;
  currency: string;
  provider: "WOMPI";
  checkoutPayloadJson?: string;
}

export interface UpdatePaymentFromProviderInput {
  reference: string;
  status: PaymentStatus;
  providerTransactionId?: string;
  providerPaymentMethod?: string;
  lastEventJson: string;
}

export interface PaymentsRepository {
  createPayment(input: CreatePaymentInput): PaymentRecord;
  findPaymentByReference(reference: string): PaymentRecord | null;
  findLatestPaymentForUserProduct(userId: string, productCode: string): PaymentRecord | null;
  findApprovedPaymentForUserProduct(userId: string, productCode: string): PaymentRecord | null;
  updatePaymentFromProvider(input: UpdatePaymentFromProviderInput): PaymentRecord | null;
}
