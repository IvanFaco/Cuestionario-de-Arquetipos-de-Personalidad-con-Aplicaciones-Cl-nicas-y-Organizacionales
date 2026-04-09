import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { buildDemoProfile, buildHookOutcome, buildPremiumOutcome } from "./assessment.domain.js";
import { buildExecutiveReportPdf, getShadowLabel } from "./assessment.report.service.js";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib") as any;

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

test("buildExecutiveReportPdf returns a valid pdf buffer", async () => {
  const pdf = await buildExecutiveReportPdf({
    demo: buildDemoProfile({ genero: "Otro", edad_exacta: 35 }),
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
  });
  const parsed = await PDFDocument.load(pdf);

  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.equal(parsed.getPageCount(), 2);
});
