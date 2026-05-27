import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { inflateSync } from "node:zlib";

import { buildDemoProfile, buildHookOutcome, buildPremiumOutcome } from "./assessment.domain.js";
import { buildAiReportUserMessage, requestAiReport } from "./assessment.ai-report.service.js";
import {
  REPORT_ACTION_STEP_COUNT,
  enforceActionStepCount,
  hasProhibitedNarrativePattern
} from "./assessment.report-contract.js";
import { buildExecutiveReportPdf, getShadowLabel } from "./assessment.report.service.js";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib") as any;

function extractPdfText(pdf: Buffer): string {
  const content = pdf.toString("latin1");
  const streams = [...content.matchAll(/<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  const chunks: string[] = [];

  for (const match of streams) {
    if (!match[1].includes("/FlateDecode")) {
      continue;
    }

    let inflated = "";

    try {
      inflated = inflateSync(Buffer.from(match[2], "latin1")).toString("latin1");
    } catch {
      continue;
    }

    for (const textMatch of inflated.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      const bytes = [];

      for (let index = 0; index < textMatch[1].length; index += 2) {
        bytes.push(Number.parseInt(textMatch[1].slice(index, index + 2), 16));
      }

      chunks.push(Buffer.from(bytes).toString("latin1"));
    }
  }

  return chunks.join("\n");
}

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
  assert.match(userMessage, /solo debe devolver prosa interpretativa/);
  assert.match(userMessage, /MiRealYo renderiza las graficas con los datos locales del test/);
  assert.match(userMessage, /exactamente 3 pasos/);
  assert.doesNotMatch(userMessage, /4 acciones/);
  assert.match(userMessage, /\[NOMBRE_PERSONA\]: Camila/);
  assert.match(userMessage, /\[ARQUETIPOS_DOMINANTES\]:/);
  assert.match(userMessage, /\[ARQUETIPOS_REPRIMIDOS\]:/);
  assert.match(userMessage, /\[NIVEL_DE_SOMBRA\]:/);
  assert.match(userMessage, /\[ESTILO_KEIRSEY\]:/);
  assert.match(userMessage, /\[ETAPA_VIAJE_HEROE\]:/);
});

test("report contract enforces exactly three action steps and prohibited patterns", () => {
  const steps = enforceActionStepCount(
    [
      "Define una accion pequena, observable y medible para hoy.",
      "Pide retroalimentacion concreta antes de decidir el siguiente movimiento.",
      "Separa impulso, dato y necesidad antes de actuar bajo presion.",
      "Este paso extra no debe llegar al informe."
    ],
    []
  );

  assert.equal(steps.length, REPORT_ACTION_STEP_COUNT);
  assert.equal(steps[2], "Separa impulso, dato y necesidad antes de actuar bajo presion.");
  assert.equal(hasProhibitedNarrativePattern("Fuente narrativa: agente IA"), true);
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

test("requestAiReport reads agentMessage from n8n array and fenced json", async () => {
  const report = await requestAiReport(buildReportInput(), {
    webhookUrl: "https://example.test/report",
    fetchImpl: async () => new Response(JSON.stringify([
      {
        agentMessage: "```json\n{\n  \"agentMessage\": \"Informe anidado generado por agente.\"\n}\n```"
      }
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  });

  assert.equal(report.source, "webhook");
  assert.equal(report.text, "Informe anidado generado por agente.");
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
  assert.match(report.text, /INFORME AMPLIADO DE PERSONALIDAD/);
  assert.match(report.text, /Apertura y Espejo/);
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
  assert.match(report.text, /INFORME AMPLIADO DE PERSONALIDAD/);
  assert.match(report.text, /Plan de Accion Tactico/);
  assert.ok(Date.now() - startedAt >= 50);
});

test("buildExecutiveReportPdf returns a valid pdf buffer", async () => {
  const pdf = await buildExecutiveReportPdf(buildReportInput(), {
    reportText: "Informe generado para validar el PDF con graficas.",
    reportSource: "webhook"
  });
  const parsed = await PDFDocument.load(pdf);
  const text = extractPdfText(pdf);

  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(parsed.getPageCount() >= 6);
  assert.match(text, /Ranking completo de arquetipos/);
  assert.match(text, /Puntaje/);
});

test("buildExecutiveReportPdf accepts agent alternative section headings", async () => {
  const agentText = [
    "1. Apertura y Espejo (Radar de Ejes)",
    "MAPA AGENTE ALFA. Este bloque nace del agente y debe sobrevivir al parser aunque el encabezado no sea literal. Describe una triada dominante con liderazgo, criterio y accion sostenida. Tambien explica que los arquetipos reprimidos no son defectos, sino recursos internos menos disponibles. La lectura traduce puntajes a lenguaje humano y aterriza lo que mueve, potencia y tensiona al usuario bajo presion.",
    "Pregunta metacognitiva: Que control reciente impidio recibir apoyo?",
    "2. Profundidad y Autosabotaje (Tu Sombra Oculta)",
    "SOMBRA AGENTE ALFA. Este bloque interpreta una sombra media con persona alta y carga interna observable. Explica que el autosabotaje aparece cuando la eficiencia se vuelve mascara, cuando la vulnerabilidad queda fuera de escena y cuando el juicio reemplaza una necesidad legitima. Tambien conecta los arquetipos reprimidos con rigidez, aislamiento y dificultad para pedir ayuda.",
    "Pregunta metacognitiva: Que necesidad legitima estaba debajo del malestar?",
    "3. El Sistema Operativo bajo Presion (Matriz Keirsey)",
    "KEIRSEY AGENTE ALFA. Bajo presion el perfil racional estratega busca arquitectura del problema, eficiencia y criterio logico. Esta fortaleza sirve para ordenar crisis, pero puede reducir emociones a procesos que deben optimizarse. La recomendacion es pausar, definir el problema correcto y reconocer que descanso, frustracion y fatiga tambien entregan informacion util.",
    "Pregunta metacognitiva: Cual es el problema correcto?",
    "4. El Horizonte Evolutivo (El Viaje del Heroe)",
    "HEROE AGENTE ALFA. La llamada a la aventura indica que el statu quo ya no contiene toda la verdad del usuario. No exige saltar al vacio, sino escuchar una inquietud creativa antes de convertirla en plan. La tarea evolutiva es articular el llamado, sonar sin resolver de inmediato y permitir una forma mas liviana de poder personal.",
    "Pregunta metacognitiva: A que nueva forma de poder invita esta etapa?",
    "5. Cierre y Plan de Accion (Siguientes Pasos)",
    "1. DELEGA AGENTE una decision pequena de bajo riesgo con criterio minimo y sin controlar el proceso completo.",
    "2. VULNERABILIDAD AGENTE agenda quince minutos para escribir que necesitas antes de rendir mas.",
    "3. JUICIO AGENTE detecta una critica mental y preguntate que cansancio propio esta reflejando.",
    "Pregunta guia: Cual paso genera alivio y resistencia al mismo tiempo?"
  ].join("\n\n");
  const pdf = await buildExecutiveReportPdf(buildReportInput(), {
    reportText: agentText,
    reportSource: "webhook"
  });
  const text = extractPdfText(pdf);

  assert.match(text, /MAPA AGENTE ALFA/);
  assert.match(text, /SOMBRA AGENTE ALFA/);
  assert.match(text, /KEIRSEY AGENTE ALFA/);
  assert.match(text, /HEROE AGENTE ALFA/);
  assert.match(text, /DELEGA AGENTE/);
  assert.doesNotMatch(text, /Elige una sola decision pendiente/);
});
