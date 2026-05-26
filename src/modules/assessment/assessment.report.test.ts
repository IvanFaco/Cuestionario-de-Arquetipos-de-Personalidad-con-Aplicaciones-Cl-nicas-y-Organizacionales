import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { buildDemoProfile, buildHookOutcome, buildPremiumOutcome } from "./assessment.domain.js";
import { buildAiReportUserMessage, requestAiReport } from "./assessment.ai-report.service.js";
import { buildExecutiveReportPdf, getShadowLabel } from "./assessment.report.service.js";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib") as any;

function buildReportInput() {
  return {
    demo: buildDemoProfile({
      nombre: "Camila",
      objetivo: "relationships"
    }),
    hook: buildHookOutcome({
      v1: 3,
      v2: 3,
      v3: 3,
      v4: 3,
      v5: 3,
      v6: 3,
      v7: 3,
      v8: 3,
      v9: 3,
      v10: 3
    }),
    premium: buildPremiumOutcome({
      p1: 3,
      p2: 3,
      p3: 3,
      p4: 3,
      p5: 3,
      p6: 3,
      p7: 3,
      p8: 3,
      p9: 3,
      p10: 3,
      p11: 3,
      p12: 3,
      p13: 3,
      p14: 3,
      p15: 3
    })
  };
}

test("getShadowLabel matches dashboard messaging", () => {
  assert.equal(
    getShadowLabel(4),
    "Alto nivel de represion. Conviene integrar vulnerabilidad antes del burnout."
  );
  assert.equal(
    getShadowLabel(3),
    "Relacion sana con los impulsos. La autenticidad aparece como un recurso disponible."
  );
});

test("buildAiReportUserMessage includes the complete test result payload", () => {
  const userMessage = buildAiReportUserMessage(buildReportInput());

  assert.match(userMessage, /Resultado del test en JSON/);
  assert.match(userMessage, /"name": "Camila"/);
  assert.match(userMessage, /"archetypeRanking"/);
  assert.match(userMessage, /"shadowTotal": 3/);
});

test("requestAiReport sends userMessage and reads agentMessage", async () => {
  const report = await requestAiReport(buildReportInput(), {
    webhookUrl: "https://example.test/report",
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { userMessage?: unknown };
      assert.equal(typeof body.userMessage, "string");
      assert.match(String(body.userMessage), /Camila/);

      return new Response(JSON.stringify({ agentMessage: "Informe generado por agente." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  assert.equal(report.source, "webhook");
  assert.equal(report.text, "Informe generado por agente.");
});

test("requestAiReport waits for agentMessage before returning", async () => {
  const startedAt = Date.now();
  const report = await requestAiReport(buildReportInput(), {
    webhookUrl: "https://example.test/report",
    fetchImpl: async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));

      return new Response(JSON.stringify({ agentMessage: "Informe demorado generado por agente." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  assert.equal(report.source, "webhook");
  assert.equal(report.text, "Informe demorado generado por agente.");
  assert.ok(Date.now() - startedAt >= 50);
});

test("requestAiReport falls back when webhook response is invalid", async () => {
  const report = await requestAiReport(buildReportInput(), {
    webhookUrl: "https://example.test/report",
    fetchImpl: async () => new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  });

  assert.equal(report.source, "fallback");
  assert.match(report.error ?? "", /agentMessage valido/);
  assert.match(report.text, /Informe interpretativo para Camila/);
});

test("requestAiReport waits until timeout before fallback", async () => {
  const startedAt = Date.now();
  const report = await requestAiReport(buildReportInput(), {
    webhookUrl: "https://example.test/report",
    timeoutMs: 60,
    fetchImpl: async (_url, init) => {
      await new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("request aborted")));
      });

      return new Response(JSON.stringify({ agentMessage: "Nunca llega." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  assert.equal(report.source, "fallback");
  assert.match(report.text, /Informe interpretativo para Camila/);
  assert.ok(Date.now() - startedAt >= 50);
});

test("buildExecutiveReportPdf returns a valid pdf buffer", async () => {
  const pdf = await buildExecutiveReportPdf(buildReportInput(), {
    reportText: "Informe generado para validar el PDF con graficas.",
    reportSource: "webhook"
  });
  const parsed = await PDFDocument.load(pdf);

  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(parsed.getPageCount() >= 2);
});
