import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { env } from "../../config/env.js";
import { WompiService } from "./wompi.service.js";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

test("WompiService validates event checksums from dynamic properties", () => {
  const previousEventsSecret = env.wompi.eventsSecret;
  env.wompi.eventsSecret = "test_events_secret";

  const event = {
    event: "transaction.updated",
    data: {
      transaction: {
        id: "trx_123",
        status: "APPROVED" as const,
        amount_in_cents: 4900000,
        reference: "MRY-123"
      }
    },
    signature: {
      properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      checksum: ""
    },
    timestamp: 1710000000
  };

  event.signature.checksum = sha256(
    "trx_123APPROVED49000001710000000test_events_secret"
  );

  assert.equal(new WompiService().validateEvent(event), true);

  env.wompi.eventsSecret = previousEventsSecret;
});

test("WompiService rejects invalid event checksums", () => {
  const previousEventsSecret = env.wompi.eventsSecret;
  env.wompi.eventsSecret = "test_events_secret";

  const event = {
    event: "transaction.updated",
    data: {
      transaction: {
        id: "trx_123",
        status: "APPROVED" as const,
        amount_in_cents: 4900000
      }
    },
    signature: {
      properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      checksum: "invalid"
    },
    timestamp: 1710000000
  };

  assert.equal(new WompiService().validateEvent(event), false);

  env.wompi.eventsSecret = previousEventsSecret;
});

test("WompiService fetches transaction snapshots from redirect transaction id", async () => {
  const previousPublicKey = env.wompi.publicKey;
  const previousEnvironment = env.wompi.environment;
  const previousFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  const requestedAuthorizationHeaders: string[] = [];

  env.wompi.publicKey = "pub_test_123";
  env.wompi.environment = "sandbox";
  globalThis.fetch = (async (url, init) => {
    requestedUrls.push(String(url));
    requestedAuthorizationHeaders.push(String((init?.headers as Record<string, string>).Authorization));

    return {
      ok: true,
      json: async () => ({
        data: {
          id: "01-1531231271-19365",
          reference: "MRY-123",
          status: "APPROVED",
          amount_in_cents: 4900000,
          currency: "COP",
          payment_method_type: "CARD"
        }
      })
    } as Response;
  }) as typeof fetch;

  try {
    const transaction = await new WompiService().fetchTransaction("01-1531231271-19365");

    assert.deepEqual(transaction, {
      id: "01-1531231271-19365",
      reference: "MRY-123",
      status: "APPROVED",
      amountInCents: 4900000,
      currency: "COP",
      paymentMethodType: "CARD"
    });
    assert.equal(
      requestedUrls[0],
      "https://sandbox.wompi.co/v1/transactions/01-1531231271-19365"
    );
    assert.equal(requestedAuthorizationHeaders[0], "Bearer pub_test_123");
  } finally {
    globalThis.fetch = previousFetch;
    env.wompi.publicKey = previousPublicKey;
    env.wompi.environment = previousEnvironment;
  }
});
