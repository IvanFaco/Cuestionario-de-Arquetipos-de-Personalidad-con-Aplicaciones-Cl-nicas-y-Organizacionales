import { createRequire } from "node:module";

import { buildFallbackReportText } from "./assessment.ai-report.service.js";
import {
  buildResultInterpretation,
  formatArchetypeName,
  mapScoresForDisplay
} from "./assessment.interpretation.js";
import {
  createActionPlanChartPng,
  createArchetypeBarChartPng,
  createJourneyStageChartPng,
  createKeirseyMatrixChartPng,
  createStructureRadarChartPng
} from "./assessment.report-charts.js";
import type { ArchetypeScore, DemoProfile, HookOutcome, PremiumOutcome } from "./assessment.types.js";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib") as any;

type ReportInput = {
  demo: DemoProfile;
  hook: HookOutcome;
  premium: PremiumOutcome;
};

type PdfContext = {
  doc: any;
  page: any;
  regularFont: any;
  boldFont: any;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  currentY: number;
  bodyColor: unknown;
  titleColor: unknown;
  mutedColor: unknown;
  accentColor: unknown;
};

type ReportSection = {
  number: string;
  title: string;
  subtitle: string;
  body: string;
  questionLabel: string;
  question: string;
  chart: Buffer;
  chartWidth: number;
  chartHeight: number;
  metrics: { label: string; value: string }[];
};

type StructuredReport = {
  intro: string;
  sections: ReportSection[];
};

const pageWidth = 595.28;
const pageHeight = 841.89;

export function getShadowLabel(shadowTotal: number): string {
  return shadowTotal >= 3.5
    ? "Alto nivel de represion. Conviene integrar vulnerabilidad antes del burnout."
    : "Relacion sana con los impulsos. La autenticidad aparece como un recurso disponible.";
}

function addPage(context: PdfContext) {
  context.page = context.doc.addPage([pageWidth, pageHeight]);
  context.currentY = context.marginTop;
}

function splitText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    currentLine = candidate;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawWrappedTextAt(
  context: PdfContext,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    size?: number;
    font?: any;
    color?: unknown;
    lineGap?: number;
  }
): number {
  const size = options.size ?? 10.5;
  const font = options.font ?? context.regularFont;
  const lineGap = options.lineGap ?? 4;
  let y = options.y;

  for (const line of splitText(text, font, size, options.width)) {
    context.page.drawText(line, {
      x: options.x,
      y,
      size,
      font,
      color: options.color ?? context.bodyColor
    });
    y -= size + lineGap;
  }

  return y;
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s:.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function lineHas(line: string, needle: string): boolean {
  return normalizeText(line).includes(normalizeText(needle));
}

function extractBlock(reportText: string, start: string, endMarkers: string[]): string {
  const lines = reportText.replace(/\r/g, "").split("\n");
  const startIndex = lines.findIndex((line) => lineHas(line, start));

  if (startIndex < 0) {
    return "";
  }

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (endMarkers.some((marker) => lineHas(lines[index], marker))) {
      endIndex = index;
      break;
    }
  }

  return lines
    .slice(startIndex + 1, endIndex)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function cleanSectionBody(text: string, labels: string[]): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !labels.some((label) => lineHas(line, label)))
    .filter((line) => !lineHas(line, "pregunta metacognitiva"))
    .filter((line) => !lineHas(line, "pregunta guia"));

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function extractQuestion(text: string, fallback: string): string {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const questionLine = lines.find((line) => lineHas(line, "pregunta metacognitiva") || lineHas(line, "pregunta guia"));

  if (!questionLine) {
    return fallback;
  }

  return questionLine.replace(/^.*?:\s*/, "").trim() || fallback;
}

function firstUseful(agentValue: string, fallback: string, maxLength = 860): string {
  const value = agentValue.replace(/\s+/g, " ").trim();
  const selected = value.length >= 40 ? value : fallback;

  return selected.length > maxLength ? `${selected.slice(0, maxLength).trim()}...` : selected;
}

function buildLocalReport(input: ReportInput): StructuredReport {
  const interpretation = buildResultInterpretation(input);
  const ranking = mapScoresForDisplay(input.hook.ranking);
  const topThree = ranking.slice(0, 3).map((item) => `${item.displayName} (${item.score.toFixed(1)})`).join(", ");

  return {
    intro:
      `${input.demo.nombre}, esta lectura integra tu mapa de arquetipos, estructura interna, respuesta bajo estres y etapa evolutiva actual. ` +
      "No busca encerrarte en una etiqueta: funciona como un espejo para reconocer fuerzas dominantes, tensiones ocultas y acciones concretas.",
    sections: [
      {
        number: "1",
        title: "Tu Mapa Visual: La Fortaleza de la Triada",
        subtitle: "Apertura y Espejo",
        body:
          `${interpretation.quickSummary} La triada principal (${topThree}) sugiere que tu energia vital se organiza alrededor de ${interpretation.dominant.displayName}: ` +
          `${interpretation.dominant.motivation} Tu fortaleza aparece cuando ${interpretation.dominant.strength.toLowerCase()}`,
        questionLabel: "Pregunta metacognitiva",
        question: "Que parte de esta triada estas usando como recurso y cual podria estar ocupando demasiado espacio en tus decisiones?",
        chart: createArchetypeBarChartPng(input.hook.ranking),
        chartWidth: 500,
        chartHeight: 255,
        metrics: ranking.slice(0, 3).map((item, index) => ({
          label: `Top ${index + 1}`,
          value: `${item.displayName} ${item.score.toFixed(1)}`
        }))
      },
      {
        number: "2",
        title: "Tu Sombra Oculta",
        subtitle: "Profundidad y Autosabotaje",
        body:
          `Persona marca ${input.hook.estructuras.Persona.toFixed(1)}/5, Sombra base ${input.hook.estructuras.Sombra_Base.toFixed(1)}/5 y Sombra total ${input.premium.Sombra_Total.toFixed(1)}/5. ` +
          `${interpretation.shadow.summary} Bajo estres, el autosabotaje puede aparecer como exceso de control, retirada emocional, juicio interno o dificultad para pedir apoyo antes del limite.`,
        questionLabel: "Pregunta metacognitiva",
        question: "Que emocion o necesidad estas intentando mantener fuera de escena para conservar una imagen de fortaleza?",
        chart: createStructureRadarChartPng({
          persona: input.hook.estructuras.Persona,
          shadowBase: input.hook.estructuras.Sombra_Base,
          shadowTotal: input.premium.Sombra_Total
        }),
        chartWidth: 360,
        chartHeight: 265,
        metrics: [
          { label: "Persona", value: `${input.hook.estructuras.Persona.toFixed(1)} / 5` },
          { label: "Sombra base", value: `${input.hook.estructuras.Sombra_Base.toFixed(1)} / 5` },
          { label: "Sombra total", value: `${input.premium.Sombra_Total.toFixed(1)} / 5` }
        ]
      },
      {
        number: "3",
        title: "El Sistema Operativo: Matriz Keirsey",
        subtitle: input.premium.Keirsey,
        body:
          `${input.premium.Keirsey}. ${interpretation.keirsey?.summary ?? ""} Esta matriz describe como tiendes a ordenar informacion y decidir cuando aumenta la presion. ` +
          `${interpretation.keirsey?.nextStep ?? ""}`,
        questionLabel: "Pregunta metacognitiva",
        question: "Bajo estres, que criterio usas primero: eficiencia, seguridad, armonia o coherencia interna?",
        chart: createKeirseyMatrixChartPng(input.premium.Keirsey),
        chartWidth: 500,
        chartHeight: 200,
        metrics: [
          { label: "Perfil", value: input.premium.Keirsey },
          { label: "Decision", value: "Bajo estres" },
          { label: "Clave", value: "Criterio consciente" }
        ]
      },
      {
        number: "4",
        title: "El Horizonte Evolutivo: El Viaje del Heroe",
        subtitle: input.premium.Campbell,
        body:
          `${input.premium.Campbell}. ${interpretation.campbell?.summary ?? ""} Esta etapa senala el tipo de umbral que estas atravesando: no solo que debes resolver, sino que version de ti necesita madurar para sostener el siguiente tramo.`,
        questionLabel: "Pregunta metacognitiva",
        question: "Cual es la prueba real de esta etapa: actuar, soltar, pedir ayuda, sostener un limite o confiar en tu criterio?",
        chart: createJourneyStageChartPng(input.premium.Campbell),
        chartWidth: 500,
        chartHeight: 150,
        metrics: [
          { label: "Etapa", value: input.premium.Campbell },
          { label: "Movimiento", value: "Umbral vital" },
          { label: "Foco", value: "Integracion" }
        ]
      },
      {
        number: "5",
        title: "Siguientes Pasos: Plan de Accion Tactico",
        subtitle: "Accion concreta",
        body: interpretation.actionPlan.map((item, index) => `${index + 1}. ${item}`).join(" "),
        questionLabel: "Pregunta guia",
        question: "Que accion pequena puedes ejecutar en las proximas 24 horas para que este informe deje de ser informacion y se vuelva movimiento?",
        chart: createActionPlanChartPng(interpretation.actionPlan.length),
        chartWidth: 500,
        chartHeight: 205,
        metrics: interpretation.actionPlan.slice(0, 3).map((item, index) => ({
          label: `Paso ${index + 1}`,
          value: item.length > 24 ? `${item.slice(0, 24)}...` : item
        }))
      }
    ]
  };
}

function mergeAgentReport(input: ReportInput, reportText: string): StructuredReport {
  const local = buildLocalReport(input);
  const introBlock = extractBlock(reportText, "Resumen Introduccion", ["1. Tu Mapa Visual"]);
  const sectionStarts = [
    "1. Tu Mapa Visual",
    "2. Tu Sombra Oculta",
    "3. El Sistema Operativo",
    "4. El Horizonte Evolutivo",
    "5. Siguientes Pasos"
  ];

  return {
    intro: firstUseful(cleanSectionBody(introBlock, ["Resumen Introduccion"]), local.intro, 720),
    sections: local.sections.map((section, index) => {
      const block = extractBlock(reportText, sectionStarts[index], sectionStarts.slice(index + 1));
      const body = cleanSectionBody(block, [section.title, section.subtitle]);
      const question = extractQuestion(block, section.question);

      return {
        ...section,
        body: firstUseful(body, section.body),
        question
      };
    })
  };
}

function drawSectionMarker(context: PdfContext, section: ReportSection) {
  context.page.drawCircle({
    x: context.marginX + 18,
    y: context.currentY - 14,
    size: 18,
    color: context.accentColor
  });
  context.page.drawText(section.number, {
    x: context.marginX + 12,
    y: context.currentY - 20,
    size: 14,
    font: context.boldFont,
    color: rgb(1, 1, 1)
  });
  context.page.drawText(section.title, {
    x: context.marginX + 48,
    y: context.currentY - 4,
    size: 16,
    font: context.boldFont,
    color: context.titleColor
  });
  context.page.drawText(section.subtitle, {
    x: context.marginX + 48,
    y: context.currentY - 22,
    size: 10,
    font: context.boldFont,
    color: context.mutedColor
  });
  context.currentY -= 54;
}

function drawMetricCards(context: PdfContext, metrics: { label: string; value: string }[]) {
  const visibleMetrics = metrics.slice(0, 3);
  const gap = 8;
  const cardWidth = (pageWidth - context.marginX * 2 - gap * 2) / 3;
  const y = context.currentY - 45;

  visibleMetrics.forEach((metric, index) => {
    const x = context.marginX + index * (cardWidth + gap);
    context.page.drawRectangle({
      x,
      y,
      width: cardWidth,
      height: 42,
      color: rgb(0.97, 0.98, 1),
      borderColor: rgb(0.87, 0.88, 0.93),
      borderWidth: 1
    });
    context.page.drawText(metric.label, {
      x: x + 9,
      y: y + 25,
      size: 7.5,
      font: context.boldFont,
      color: context.mutedColor
    });
    drawWrappedTextAt(context, metric.value, {
      x: x + 9,
      y: y + 11,
      width: cardWidth - 18,
      size: 8,
      font: context.boldFont,
      color: context.bodyColor,
      lineGap: 2
    });
  });

  context.currentY = y - 18;
}

function drawQuestionBox(context: PdfContext, section: ReportSection) {
  const boxHeight = 70;
  const y = context.marginBottom + 26;

  context.page.drawRectangle({
    x: context.marginX,
    y,
    width: pageWidth - context.marginX * 2,
    height: boxHeight,
    color: rgb(0.93, 0.96, 1),
    borderColor: rgb(0.76, 0.84, 0.96),
    borderWidth: 1
  });
  context.page.drawText(section.questionLabel, {
    x: context.marginX + 14,
    y: y + boxHeight - 22,
    size: 9,
    font: context.boldFont,
    color: context.titleColor
  });
  drawWrappedTextAt(context, section.question, {
    x: context.marginX + 14,
    y: y + boxHeight - 40,
    width: pageWidth - context.marginX * 2 - 28,
    size: 10,
    color: context.bodyColor,
    lineGap: 3
  });
}

async function drawSectionPage(context: PdfContext, section: ReportSection) {
  addPage(context);
  context.page.drawRectangle({
    x: 0,
    y: pageHeight - 112,
    width: pageWidth,
    height: 112,
    color: rgb(0.94, 0.98, 1)
  });
  drawSectionMarker(context, section);

  const chartX = context.marginX + (pageWidth - context.marginX * 2 - section.chartWidth) / 2;
  const chartImage = await context.doc.embedPng(section.chart);
  context.page.drawImage(chartImage, {
    x: chartX,
    y: context.currentY - section.chartHeight,
    width: section.chartWidth,
    height: section.chartHeight
  });
  context.currentY -= section.chartHeight + 18;
  drawMetricCards(context, section.metrics);

  context.page.drawRectangle({
    x: context.marginX,
    y: context.marginBottom + 116,
    width: pageWidth - context.marginX * 2,
    height: Math.max(160, context.currentY - context.marginBottom - 126),
    color: rgb(1, 1, 1),
    borderColor: rgb(0.88, 0.89, 0.94),
    borderWidth: 1
  });
  drawWrappedTextAt(context, section.body, {
    x: context.marginX + 16,
    y: context.currentY - 8,
    width: pageWidth - context.marginX * 2 - 32,
    size: 10.4,
    color: context.bodyColor,
    lineGap: 4
  });
  drawQuestionBox(context, section);
}

function drawFooter(doc: any, regularFont: any) {
  doc.getPages().forEach((page: any, index: number) => {
    page.drawText("MiRealYo - Lectura interpretativa y educativa. No sustituye evaluacion clinica profesional.", {
      x: 42,
      y: 28,
      size: 7.8,
      font: regularFont,
      color: rgb(0.42, 0.46, 0.54)
    });
    page.drawText(`${index + 1}`, {
      x: 535,
      y: 28,
      size: 7.8,
      font: regularFont,
      color: rgb(0.42, 0.46, 0.54)
    });
  });
}

function drawCover(context: PdfContext, input: ReportInput, report: StructuredReport, source: "webhook" | "fallback") {
  context.page.drawRectangle({
    x: 0,
    y: pageHeight - 260,
    width: pageWidth,
    height: 260,
    color: rgb(0.92, 0.97, 1)
  });
  context.page.drawCircle({
    x: pageWidth - 88,
    y: pageHeight - 96,
    size: 34,
    color: rgb(0.29, 0.77, 0.79)
  });
  context.page.drawCircle({
    x: pageWidth - 128,
    y: pageHeight - 132,
    size: 24,
    color: rgb(0.46, 0.35, 0.77)
  });
  context.page.drawText("INFORME AMPLIADO", {
    x: context.marginX,
    y: pageHeight - 96,
    size: 24,
    font: context.boldFont,
    color: context.titleColor
  });
  context.page.drawText("DE PERSONALIDAD", {
    x: context.marginX,
    y: pageHeight - 124,
    size: 24,
    font: context.boldFont,
    color: context.titleColor
  });
  context.page.drawText(`Preparado para ${input.demo.nombre}`, {
    x: context.marginX,
    y: pageHeight - 158,
    size: 11,
    font: context.boldFont,
    color: context.mutedColor
  });
  context.page.drawText(source === "webhook" ? "Fuente narrativa: agente IA" : "Fuente narrativa: lectura local", {
    x: context.marginX,
    y: pageHeight - 176,
    size: 9,
    font: context.regularFont,
    color: context.mutedColor
  });

  context.currentY = pageHeight - 310;
  context.page.drawText("Resumen Introduccion", {
    x: context.marginX,
    y: context.currentY,
    size: 15,
    font: context.boldFont,
    color: context.titleColor
  });
  context.currentY -= 24;
  drawWrappedTextAt(context, report.intro, {
    x: context.marginX,
    y: context.currentY,
    width: pageWidth - context.marginX * 2,
    size: 11,
    color: context.bodyColor,
    lineGap: 5
  });

  context.currentY -= 108;
  drawMetricCards(context, [
    { label: "Arquetipo", value: formatArchetypeName(input.hook.ranking[0].name) },
    { label: "Keirsey", value: input.premium.Keirsey },
    { label: "Campbell", value: input.premium.Campbell }
  ]);
}

export async function buildExecutiveReportPdf(
  input: ReportInput,
  options: {
    reportText?: string;
    reportSource?: "webhook" | "fallback";
  } = {}
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const reportText = options.reportText?.trim() || buildFallbackReportText(input);
  const report = mergeAgentReport(input, reportText);
  const context: PdfContext = {
    doc,
    page: doc.addPage([pageWidth, pageHeight]),
    regularFont,
    boldFont,
    marginX: 42,
    marginTop: 790,
    marginBottom: 58,
    currentY: 790,
    bodyColor: rgb(0.14, 0.18, 0.28),
    titleColor: rgb(0.13, 0.19, 0.36),
    mutedColor: rgb(0.38, 0.42, 0.52),
    accentColor: rgb(0.18, 0.48, 1)
  };

  drawCover(context, input, report, options.reportSource ?? "fallback");

  for (const section of report.sections) {
    await drawSectionPage(context, section);
  }

  drawFooter(doc, regularFont);
  const bytes = await doc.save({
    useObjectStreams: false
  });

  return Buffer.from(bytes);
}
