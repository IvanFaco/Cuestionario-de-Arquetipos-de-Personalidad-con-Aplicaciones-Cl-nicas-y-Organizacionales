import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { buildFallbackReportText } from "./assessment.ai-report.service.js";
import {
  buildResultInterpretation,
  formatArchetypeName,
  mapScoresForDisplay
} from "./assessment.interpretation.js";
import {
  REPORT_ACTION_STEP_COUNT,
  REPORT_BRAND,
  REPORT_INTRO_RULE,
  REPORT_INTRO_TITLE,
  REPORT_RENDER_RULES,
  REPORT_SECTIONS,
  REPORT_SOURCE_LABEL,
  REPORT_TITLE,
  calculateDominantArchetypes,
  calculateRepressedArchetypes,
  enforceActionStepCount,
  isIntroNarrativeValid,
  isNarrativeBodyValid,
  normalizeHeroJourney,
  normalizeKeirsey,
  normalizeShadow,
  sanitizeNarrativeText
} from "./assessment.report-contract.js";
import {
  createActionPlanChartPng,
  createArchetypeBarChartPng,
  createJourneyStageChartPng,
  createKeirseyMatrixChartPng,
  createStructureRadarChartPng
} from "./assessment.report-charts.js";
import type { DemoProfile, HookOutcome, PremiumOutcome } from "./assessment.types.js";

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
  logoImage: any;
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
  brand: {
    lavender: unknown;
    surface: unknown;
    surfaceStrong: unknown;
    border: unknown;
    blue: unknown;
    violet: unknown;
    teal: unknown;
    coral: unknown;
    white: unknown;
  };
};

type ReportSection = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  body: string;
  questionLabel: string;
  question: string;
  actionSteps?: string[];
  chart: Buffer;
  chartWidth: number;
  chartHeight: number;
  metrics: { label: string; value: string }[];
};

type StructuredReport = {
  intro: string;
  sections: ReportSection[];
};

const pageWidth = REPORT_RENDER_RULES.page.width;
const pageHeight = REPORT_RENDER_RULES.page.height;

function colorFromHex(hex: string) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}

function buildBrandColors() {
  return {
    lavender: colorFromHex(REPORT_BRAND.colors.lavender),
    surface: colorFromHex(REPORT_BRAND.colors.surface),
    surfaceStrong: colorFromHex(REPORT_BRAND.colors.surfaceStrong),
    border: colorFromHex(REPORT_BRAND.colors.border),
    blue: colorFromHex(REPORT_BRAND.colors.blue),
    violet: colorFromHex(REPORT_BRAND.colors.violet),
    teal: colorFromHex(REPORT_BRAND.colors.teal),
    coral: colorFromHex(REPORT_BRAND.colors.coral),
    white: rgb(1, 1, 1)
  };
}

export function getShadowLabel(shadowTotal: number): string {
  return shadowTotal >= 3.5
    ? "Alto nivel de represion. Conviene integrar vulnerabilidad antes del burnout."
    : "Relacion sana con los impulsos. La autenticidad aparece como un recurso disponible.";
}

function addPage(context: PdfContext) {
  context.page = context.doc.addPage([pageWidth, pageHeight]);
  context.currentY = context.marginTop;
}

function drawBrandMark(context: PdfContext, options: {
  x: number;
  y: number;
  size?: number;
  showName?: boolean;
  nameColor?: unknown;
}) {
  const size = options.size ?? REPORT_RENDER_RULES.brand.logoSize;

  context.page.drawImage(context.logoImage, {
    x: options.x,
    y: options.y,
    width: size,
    height: size
  });

  if (options.showName) {
    context.page.drawText(REPORT_BRAND.name, {
      x: options.x + size + 8,
      y: options.y + size / 2 - 4,
      size: 10,
      font: context.boldFont,
      color: options.nameColor ?? context.mutedColor
    });
  }
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

function getSectionMarkers(index: number): string[] {
  const section = findSectionRule(index);

  return [
    section.startMarker,
    `${section.number}. ${section.title}`,
    section.title,
    ...section.startAliases
  ];
}

function getEndMarkersAfter(index: number): string[] {
  return REPORT_SECTIONS
    .slice(index + 1)
    .flatMap((_section, sectionOffset) => getSectionMarkers(index + 1 + sectionOffset));
}

function extractBlock(reportText: string, startMarkers: string[], endMarkers: string[]): string {
  const lines = reportText.replace(/\r/g, "").split("\n");
  const startIndex = lines.findIndex((line) => startMarkers.some((marker) => lineHas(line, marker)));

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

function isStructuralLabelLine(line: string, label: string): boolean {
  const normalizedLine = normalizeText(line).replace(/^\d+\s*/, "").trim();
  const normalizedLabel = normalizeText(label);

  if (!normalizedLabel) {
    return false;
  }

  return normalizedLine === normalizedLabel ||
    (normalizedLine.startsWith(normalizedLabel) &&
      normalizedLine.split(" ").length <= normalizedLabel.split(" ").length + 3);
}

function cleanSectionBody(text: string, labels: string[]): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !labels.some((label) => isStructuralLabelLine(line, label)))
    .filter((line) => !lineHas(line, "pregunta metacognitiva"))
    .filter((line) => !lineHas(line, "pregunta guia"));

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function cleanQuestionText(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^\s*[-:]\s*/, "")
    .trim();
}

function extractQuestion(text: string, fallback: string): string {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const questionLine = lines.find((line) => lineHas(line, "pregunta metacognitiva") || lineHas(line, "pregunta guia"));

  if (!questionLine) {
    return fallback;
  }

  return cleanQuestionText(questionLine.replace(/^.*?:\s*/, "")) || fallback;
}

function firstUseful(agentValue: string, fallback: string, maxLength = 860): string {
  const value = sanitizeNarrativeText(agentValue);
  const selected = value.length >= 40 ? value : fallback;

  return selected.length > maxLength ? `${selected.slice(0, maxLength).trim()}...` : selected;
}

function findSectionRule(index: number) {
  const rule = REPORT_SECTIONS[index];

  if (!rule) {
    throw new Error(`Regla de informe no configurada para la seccion ${index + 1}.`);
  }

  return rule;
}

function formatScoreList(items: { displayName: string; score: number }[], limit = 3): string {
  return items
    .slice(0, limit)
    .map((item) => `${item.displayName} ${item.score.toFixed(1)}`)
    .join(" / ");
}

function abbreviate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function extractActionSteps(text: string): string[] {
  const normalized = text.replace(/\r/g, "\n");
  const matches = [...normalized.matchAll(/(?:^|\n|\s)(?:\d{1,2}[.)]\s+)(.*?)(?=(?:\n|\s)\d{1,2}[.)]\s+|$)/gs)]
    .map((match) => sanitizeNarrativeText(match[1]))
    .filter(Boolean);

  if (matches.length) {
    return matches;
  }

  return normalized
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .map(sanitizeNarrativeText)
    .filter(Boolean);
}

function pickIntro(agentValue: string, fallback: string): string {
  const cleaned = sanitizeNarrativeText(agentValue);

  if (isIntroNarrativeValid(cleaned)) {
    return firstUseful(cleaned, fallback, REPORT_INTRO_RULE.maxChars);
  }

  return fallback;
}

function pickSectionBody(index: number, agentValue: string, fallback: string): string {
  const rule = findSectionRule(index);
  const cleaned = sanitizeNarrativeText(agentValue);

  if (isNarrativeBodyValid(rule, cleaned)) {
    return firstUseful(cleaned, fallback, rule.maxChars);
  }

  return fallback;
}

function buildLocalReport(input: ReportInput): StructuredReport {
  const interpretation = buildResultInterpretation(input);
  const ranking = mapScoresForDisplay(input.hook.ranking);
  const dominantArchetypes = mapScoresForDisplay(calculateDominantArchetypes(input.hook.ranking));
  const repressedArchetypes = mapScoresForDisplay(calculateRepressedArchetypes(input.hook.ranking));
  const normalizedShadow = normalizeShadow({
    persona: input.hook.estructuras.Persona,
    shadowBase: input.hook.estructuras.Sombra_Base,
    shadowTotal: input.premium.Sombra_Total
  });
  const normalizedKeirsey = normalizeKeirsey(input.premium.Keirsey);
  const normalizedJourney = normalizeHeroJourney(input.premium.Campbell);
  const actionSteps = enforceActionStepCount(interpretation.actionPlan, interpretation.actionPlan);
  const topThree = ranking.slice(0, 3).map((item) => `${item.displayName} (${item.score.toFixed(1)})`).join(", ");
  const [mapRule, shadowRule, keirseyRule, heroRule, actionRule] = REPORT_SECTIONS;

  return {
    intro:
      `${input.demo.nombre}, esta lectura integra tu mapa de arquetipos, estructura interna, respuesta bajo estres y etapa evolutiva actual. ` +
      "No busca encerrarte en una etiqueta: funciona como un espejo para reconocer fuerzas dominantes, tensiones ocultas y acciones concretas.",
    sections: [
      {
        id: mapRule.id,
        number: mapRule.number,
        title: mapRule.title,
        subtitle: mapRule.subtitle,
        body:
          `${interpretation.quickSummary} La triada principal (${topThree}) sugiere que tu energia vital se organiza alrededor de ${interpretation.dominant.displayName}: ` +
          `${interpretation.dominant.motivation} Tu fortaleza aparece cuando ${interpretation.dominant.strength.toLowerCase()}`,
        questionLabel: mapRule.questionLabel,
        question: "Que parte de esta triada estas usando como recurso y cual podria estar ocupando demasiado espacio en tus decisiones?",
        chart: createArchetypeBarChartPng(input.hook.ranking),
        chartWidth: REPORT_RENDER_RULES.chartSizes.archetypes.width,
        chartHeight: REPORT_RENDER_RULES.chartSizes.archetypes.height,
        metrics: [
          { label: "Dominantes", value: formatScoreList(dominantArchetypes) },
          { label: "Reprimidos", value: formatScoreList(repressedArchetypes) },
          { label: "Rango total", value: `${ranking[0].score.toFixed(1)} a ${ranking[ranking.length - 1].score.toFixed(1)}` }
        ]
      },
      {
        id: shadowRule.id,
        number: shadowRule.number,
        title: shadowRule.title,
        subtitle: shadowRule.subtitle,
        body:
          `Persona marca ${input.hook.estructuras.Persona.toFixed(1)}/5, Sombra base ${input.hook.estructuras.Sombra_Base.toFixed(1)}/5 y Sombra total ${input.premium.Sombra_Total.toFixed(1)}/5. ` +
          `${interpretation.shadow.summary} Bajo estres, el autosabotaje puede aparecer como exceso de control, retirada emocional, juicio interno o dificultad para pedir apoyo antes del limite.`,
        questionLabel: shadowRule.questionLabel,
        question: "Que emocion o necesidad estas intentando mantener fuera de escena para conservar una imagen de fortaleza?",
        chart: createStructureRadarChartPng({
          persona: normalizedShadow.persona,
          shadowBase: normalizedShadow.shadowBase,
          shadowTotal: normalizedShadow.shadowTotal
        }),
        chartWidth: REPORT_RENDER_RULES.chartSizes.shadow.width,
        chartHeight: REPORT_RENDER_RULES.chartSizes.shadow.height,
        metrics: [
          { label: "Persona", value: `${normalizedShadow.persona.toFixed(1)} / 5` },
          { label: "Sombra total", value: `${normalizedShadow.shadowTotal.toFixed(1)} / 5 (${normalizedShadow.load})` },
          { label: "Integracion", value: `${normalizedShadow.integrationIndex.toFixed(1)} / 5` }
        ]
      },
      {
        id: keirseyRule.id,
        number: keirseyRule.number,
        title: keirseyRule.title,
        subtitle: input.premium.Keirsey,
        body:
          `${input.premium.Keirsey}. ${interpretation.keirsey?.summary ?? ""} Esta matriz describe como tiendes a ordenar informacion y decidir cuando aumenta la presion. ` +
          `${interpretation.keirsey?.nextStep ?? ""}`,
        questionLabel: keirseyRule.questionLabel,
        question: "Bajo estres, que criterio usas primero: eficiencia, seguridad, armonia o coherencia interna?",
        chart: createKeirseyMatrixChartPng(input.premium.Keirsey),
        chartWidth: REPORT_RENDER_RULES.chartSizes.keirsey.width,
        chartHeight: REPORT_RENDER_RULES.chartSizes.keirsey.height,
        metrics: [
          { label: "Perfil", value: normalizedKeirsey.normalized },
          { label: "Codigo", value: normalizedKeirsey.code },
          { label: "Bajo estres", value: abbreviate(normalizedKeirsey.stressResponse, 42) }
        ]
      },
      {
        id: heroRule.id,
        number: heroRule.number,
        title: heroRule.title,
        subtitle: input.premium.Campbell,
        body:
          `${input.premium.Campbell}. ${interpretation.campbell?.summary ?? ""} Esta etapa senala el tipo de umbral que estas atravesando: no solo que debes resolver, sino que version de ti necesita madurar para sostener el siguiente tramo.`,
        questionLabel: heroRule.questionLabel,
        question: "Cual es la prueba real de esta etapa: actuar, soltar, pedir ayuda, sostener un limite o confiar en tu criterio?",
        chart: createJourneyStageChartPng(input.premium.Campbell),
        chartWidth: REPORT_RENDER_RULES.chartSizes.heroJourney.width,
        chartHeight: REPORT_RENDER_RULES.chartSizes.heroJourney.height,
        metrics: [
          { label: "Etapa", value: input.premium.Campbell },
          { label: "Posicion", value: `${normalizedJourney.position} de ${normalizedJourney.total}` },
          { label: "Progreso", value: `${Math.round(normalizedJourney.progress * 100)}% del arco` }
        ]
      },
      {
        id: actionRule.id,
        number: actionRule.number,
        title: actionRule.title,
        subtitle: actionRule.subtitle,
        body: actionSteps.map((item, index) => `${index + 1}. ${item}`).join(" "),
        actionSteps,
        questionLabel: actionRule.questionLabel,
        question: "Que accion pequena puedes ejecutar en las proximas 24 horas para que este informe deje de ser informacion y se vuelva movimiento?",
        chart: createActionPlanChartPng(REPORT_ACTION_STEP_COUNT),
        chartWidth: REPORT_RENDER_RULES.chartSizes.actionPlan.width,
        chartHeight: REPORT_RENDER_RULES.chartSizes.actionPlan.height,
        metrics: actionSteps.map((item, index) => ({
          label: `Paso ${index + 1}`,
          value: item.length > 24 ? `${item.slice(0, 24)}...` : item
        }))
      }
    ]
  };
}

function mergeAgentReport(input: ReportInput, reportText: string): StructuredReport {
  const local = buildLocalReport(input);
  const introBlock = extractBlock(reportText, [REPORT_INTRO_TITLE, "Introduccion", "Resumen"], getSectionMarkers(0));

  return {
    intro: pickIntro(cleanSectionBody(introBlock, [REPORT_INTRO_TITLE]), local.intro),
    sections: local.sections.map((section, index) => {
      const block = extractBlock(reportText, getSectionMarkers(index), getEndMarkersAfter(index));
      const body = cleanSectionBody(block, [section.title, section.subtitle]);
      const question = extractQuestion(block, section.question);

      if (section.id === "pasos") {
        const actionSteps = enforceActionStepCount(extractActionSteps(block), section.actionSteps ?? []);

        return {
          ...section,
          body: actionSteps.map((item, stepIndex) => `${stepIndex + 1}. ${item}`).join(" "),
          actionSteps,
          metrics: actionSteps.map((item, stepIndex) => ({
            label: `Paso ${stepIndex + 1}`,
            value: abbreviate(item, 27)
          })),
          question
        };
      }

      return {
        ...section,
        body: pickSectionBody(index, body, section.body),
        question
      };
    })
  };
}

function drawSectionMarker(context: PdfContext, section: ReportSection) {
  context.page.drawRectangle({
    x: context.marginX,
    y: context.currentY - 34,
    width: 38,
    height: 38,
    color: context.brand.violet
  });
  context.page.drawText(section.number, {
    x: context.marginX + 14,
    y: context.currentY - 22,
    size: 14,
    font: context.boldFont,
    color: context.brand.white
  });
  context.page.drawText(section.title, {
    x: context.marginX + 52,
    y: context.currentY - 4,
    size: 16,
    font: context.boldFont,
    color: context.titleColor
  });
  context.page.drawText(section.subtitle, {
    x: context.marginX + 52,
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
  const cardHeight = 56;
  const y = context.currentY - cardHeight;

  visibleMetrics.forEach((metric, index) => {
    const x = context.marginX + index * (cardWidth + gap);
    context.page.drawRectangle({
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      color: context.brand.white,
      borderColor: context.brand.border,
      borderWidth: 1
    });
    context.page.drawRectangle({
      x,
      y: y + cardHeight - 4,
      width: cardWidth,
      height: 4,
      color: [context.brand.blue, context.brand.violet, context.brand.teal][index] ?? context.brand.coral
    });
    context.page.drawText(metric.label, {
      x: x + 9,
      y: y + cardHeight - 18,
      size: 7.5,
      font: context.boldFont,
      color: context.mutedColor
    });
    drawWrappedTextAt(context, metric.value, {
      x: x + 9,
      y: y + cardHeight - 34,
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
  const boxHeight = REPORT_RENDER_RULES.questionBox.height;
  const y = context.marginBottom + 26;

  context.page.drawRectangle({
    x: context.marginX,
    y,
    width: pageWidth - context.marginX * 2,
    height: boxHeight,
    color: context.brand.surfaceStrong,
    borderColor: context.brand.border,
    borderWidth: 1
  });
  context.page.drawRectangle({
    x: context.marginX,
    y,
    width: 5,
    height: boxHeight,
    color: context.brand.teal
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
    y: pageHeight - 118,
    width: pageWidth,
    height: 118,
    color: context.brand.surface
  });
  context.page.drawRectangle({
    x: 0,
    y: pageHeight - 118,
    width: pageWidth,
    height: 6,
    color: context.brand.lavender
  });
  drawBrandMark(context, {
    x: pageWidth - context.marginX - REPORT_RENDER_RULES.brand.headerLogoSize,
    y: pageHeight - 50,
    size: REPORT_RENDER_RULES.brand.headerLogoSize
  });
  drawSectionMarker(context, section);

  const chartX = context.marginX + (pageWidth - context.marginX * 2 - section.chartWidth) / 2;
  const chartImage = await context.doc.embedPng(section.chart);
  context.page.drawRectangle({
    x: context.marginX,
    y: context.currentY - section.chartHeight - 12,
    width: pageWidth - context.marginX * 2,
    height: section.chartHeight + 24,
    color: context.brand.white,
    borderColor: context.brand.border,
    borderWidth: 1
  });
  context.page.drawText("Grafica generada con datos del test MiRealYo", {
    x: context.marginX + 12,
    y: context.currentY - 10,
    size: 7.8,
    font: context.boldFont,
    color: context.mutedColor
  });
  context.page.drawImage(chartImage, {
    x: chartX,
    y: context.currentY - section.chartHeight - 16,
    width: section.chartWidth,
    height: section.chartHeight
  });
  context.currentY -= section.chartHeight + 42;
  drawMetricCards(context, section.metrics);

  context.page.drawRectangle({
    x: context.marginX,
    y: context.marginBottom + 116,
    width: pageWidth - context.marginX * 2,
    height: Math.max(REPORT_RENDER_RULES.body.minBoxHeight, context.currentY - context.marginBottom - 126),
    color: context.brand.white,
    borderColor: context.brand.border,
    borderWidth: 1
  });
  drawWrappedTextAt(context, section.body, {
    x: context.marginX + 16,
    y: context.currentY - 8,
    width: pageWidth - context.marginX * 2 - 32,
    size: REPORT_RENDER_RULES.body.fontSize,
    color: context.bodyColor,
    lineGap: REPORT_RENDER_RULES.body.lineGap
  });
  drawQuestionBox(context, section);
}

function drawFooter(doc: any, regularFont: any) {
  doc.getPages().forEach((page: any, index: number) => {
    page.drawLine({
      start: { x: 42, y: 44 },
      end: { x: pageWidth - 42, y: 44 },
      thickness: 0.6,
      color: colorFromHex(REPORT_BRAND.colors.border)
    });
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

function drawCover(context: PdfContext, input: ReportInput, report: StructuredReport) {
  context.page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: context.brand.surface
  });
  context.page.drawRectangle({
    x: 0,
    y: pageHeight - 250,
    width: pageWidth,
    height: 250,
    color: context.brand.surfaceStrong
  });
  context.page.drawRectangle({
    x: 0,
    y: pageHeight - 250,
    width: pageWidth,
    height: 8,
    color: context.brand.lavender
  });
  drawBrandMark(context, {
    x: context.marginX,
    y: pageHeight - 78,
    size: REPORT_RENDER_RULES.brand.logoSize,
    showName: true
  });
  context.page.drawText(REPORT_TITLE, {
    x: context.marginX,
    y: pageHeight - 134,
    size: 23,
    font: context.boldFont,
    color: context.titleColor
  });
  context.page.drawText(`Preparado para ${input.demo.nombre}`, {
    x: context.marginX,
    y: pageHeight - 164,
    size: 11,
    font: context.boldFont,
    color: context.mutedColor
  });
  context.page.drawText(REPORT_SOURCE_LABEL, {
    x: context.marginX,
    y: pageHeight - 182,
    size: 9,
    font: context.regularFont,
    color: context.mutedColor
  });
  context.page.drawRectangle({
    x: context.marginX,
    y: pageHeight - 220,
    width: pageWidth - context.marginX * 2,
    height: 1,
    color: context.brand.border
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
  doc.setTitle(REPORT_TITLE);
  doc.setSubject("Informe premium MiRealYo");
  doc.setCreator("MiRealYo");
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const logoImage = await doc.embedPng(fs.readFileSync(path.join(process.cwd(), REPORT_BRAND.logoPath)));
  const reportText = options.reportText?.trim() || buildFallbackReportText(input);
  const report = mergeAgentReport(input, reportText);
  const brandColors = buildBrandColors();
  const context: PdfContext = {
    doc,
    page: doc.addPage([pageWidth, pageHeight]),
    logoImage,
    regularFont,
    boldFont,
    marginX: REPORT_RENDER_RULES.margins.x,
    marginTop: REPORT_RENDER_RULES.margins.top,
    marginBottom: REPORT_RENDER_RULES.margins.bottom,
    currentY: REPORT_RENDER_RULES.margins.top,
    bodyColor: colorFromHex(REPORT_BRAND.colors.ink),
    titleColor: colorFromHex(REPORT_BRAND.colors.ink),
    mutedColor: colorFromHex(REPORT_BRAND.colors.secondary),
    accentColor: colorFromHex(REPORT_BRAND.colors.violet),
    brand: brandColors
  };

  drawCover(context, input, report);

  for (const section of report.sections) {
    await drawSectionPage(context, section);
  }

  drawFooter(doc, regularFont);
  const bytes = await doc.save({
    useObjectStreams: false
  });

  return Buffer.from(bytes);
}
