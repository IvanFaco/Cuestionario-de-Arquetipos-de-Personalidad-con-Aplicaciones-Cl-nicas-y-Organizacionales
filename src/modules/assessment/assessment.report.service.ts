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
  archetypeScores?: { displayName: string; score: number }[];
  shadowMetrics?: {
    persona: number;
    shadowBase: number;
    shadowTotal: number;
    integrationIndex: number;
    load: string;
  };
  keirseyProfile?: {
    label: string;
    code: string;
    normalized: string;
    stressResponse: string;
  };
  heroJourney?: {
    stage: string;
    position: number;
    total: number;
    progress: number;
  };
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

function drawFittedWrappedTextAt(
  context: PdfContext,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    maxHeight: number;
    maxSize: number;
    minSize: number;
    font?: any;
    color?: unknown;
    lineGap?: number;
  }
) {
  const font = options.font ?? context.regularFont;
  let selectedSize = options.maxSize;
  let selectedLineGap = options.lineGap ?? 2;
  let selectedLines = splitText(text, font, selectedSize, options.width);

  for (let size = options.maxSize; size >= options.minSize; size -= 0.2) {
    const lineGap = Math.max(1.2, options.lineGap ?? size * 0.28);
    const lines = splitText(text, font, size, options.width);
    const totalHeight = lines.length * size + Math.max(0, lines.length - 1) * lineGap;

    if (totalHeight <= options.maxHeight) {
      selectedSize = size;
      selectedLineGap = lineGap;
      selectedLines = lines;
      break;
    }

    selectedSize = size;
    selectedLineGap = lineGap;
    selectedLines = lines;
  }

  let y = options.y;
  for (const line of selectedLines) {
    context.page.drawText(line, {
      x: options.x,
      y,
      size: selectedSize,
      font,
      color: options.color ?? context.bodyColor
    });
    y -= selectedSize + selectedLineGap;
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
        archetypeScores: ranking.map((item) => ({
          displayName: item.displayName,
          score: item.score
        })),
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
        shadowMetrics: {
          persona: normalizedShadow.persona,
          shadowBase: normalizedShadow.shadowBase,
          shadowTotal: normalizedShadow.shadowTotal,
          integrationIndex: normalizedShadow.integrationIndex,
          load: normalizedShadow.load
        },
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
        keirseyProfile: normalizedKeirsey,
        chart: createKeirseyMatrixChartPng(input.premium.Keirsey),
        chartWidth: REPORT_RENDER_RULES.chartSizes.keirsey.width,
        chartHeight: REPORT_RENDER_RULES.chartSizes.keirsey.height,
        metrics: [
          { label: "Perfil", value: normalizedKeirsey.normalized },
          { label: "Codigo", value: normalizedKeirsey.code },
          { label: "Bajo estres", value: normalizedKeirsey.stressResponse }
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
        heroJourney: normalizedJourney,
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
          value: item
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
            value: item
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
  const valueSize = 7.4;
  const valueLineGap = 2.2;
  const maxValueLines = Math.max(
    1,
    ...visibleMetrics.map((metric) =>
      splitText(metric.value, context.boldFont, valueSize, cardWidth - 18).length
    )
  );
  const cardHeight = Math.max(56, 31 + maxValueLines * (valueSize + valueLineGap));
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
      size: valueSize,
      font: context.boldFont,
      color: context.bodyColor,
      lineGap: valueLineGap
    });
  });

  context.currentY = y - 18;
}

function drawRoundedRect(
  context: PdfContext,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    color: unknown;
  }
) {
  const radius = Math.min(options.radius ?? options.height / 2, options.height / 2, options.width / 2);
  const centerY = options.y + options.height / 2;

  context.page.drawRectangle({
    x: options.x + radius,
    y: options.y,
    width: Math.max(0, options.width - radius * 2),
    height: options.height,
    color: options.color
  });
  context.page.drawRectangle({
    x: options.x,
    y: options.y + radius,
    width: options.width,
    height: Math.max(0, options.height - radius * 2),
    color: options.color
  });
  context.page.drawEllipse({
    x: options.x + radius,
    y: centerY,
    xScale: radius,
    yScale: radius,
    color: options.color
  });
  context.page.drawEllipse({
    x: options.x + options.width - radius,
    y: centerY,
    xScale: radius,
    yScale: radius,
    color: options.color
  });
}

function drawRightAlignedText(
  context: PdfContext,
  text: string,
  options: {
    x: number;
    y: number;
    size: number;
    font?: any;
    color?: unknown;
  }
) {
  const font = options.font ?? context.regularFont;
  const textWidth = font.widthOfTextAtSize(text, options.size);

  context.page.drawText(text, {
    x: options.x - textWidth,
    y: options.y,
    size: options.size,
    font,
    color: options.color ?? context.bodyColor
  });
}

function drawCenteredText(
  context: PdfContext,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    size: number;
    font?: any;
    color?: unknown;
  }
) {
  const font = options.font ?? context.regularFont;
  const textWidth = font.widthOfTextAtSize(text, options.size);

  context.page.drawText(text, {
    x: options.x + (options.width - textWidth) / 2,
    y: options.y,
    size: options.size,
    font,
    color: options.color ?? context.bodyColor
  });
}

function clampScore(value: number, max = 5) {
  return Math.max(0, Math.min(max, value));
}

function drawChartShell(
  context: PdfContext,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    meta?: string;
  }
) {
  context.page.drawRectangle({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    color: context.brand.surface
  });
  context.page.drawText(options.title, {
    x: options.x + 14,
    y: options.y + options.height - 17,
    size: 8.4,
    font: context.boldFont,
    color: context.titleColor
  });

  if (options.meta) {
    drawRightAlignedText(context, options.meta, {
      x: options.x + options.width - 14,
      y: options.y + options.height - 17,
      size: 7.4,
      font: context.boldFont,
      color: context.mutedColor
    });
  }
}

function drawScoreBar(
  context: PdfContext,
  options: {
    label: string;
    value: number;
    max?: number;
    x: number;
    y: number;
    width: number;
    color: unknown;
  }
) {
  const max = options.max ?? 5;
  const barHeight = 7;
  const barY = options.y - 16;
  const normalizedWidth = Math.max(4, (clampScore(options.value, max) / max) * options.width);

  context.page.drawText(options.label, {
    x: options.x,
    y: options.y,
    size: 7.6,
    font: context.boldFont,
    color: context.titleColor
  });
  drawRightAlignedText(context, `${options.value.toFixed(1)} / ${max}`, {
    x: options.x + options.width,
    y: options.y,
    size: 7.2,
    font: context.boldFont,
    color: context.mutedColor
  });
  drawRoundedRect(context, {
    x: options.x,
    y: barY,
    width: options.width,
    height: barHeight,
    color: context.brand.surfaceStrong
  });
  drawRoundedRect(context, {
    x: options.x,
    y: barY,
    width: normalizedWidth,
    height: barHeight,
    color: options.color
  });
}

function drawArchetypeVectorChart(
  context: PdfContext,
  section: ReportSection,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
) {
  const scores = section.archetypeScores?.slice(0, 12) ?? [];

  if (!scores.length) {
    return;
  }

  const maxScore = Math.max(7.5, ...scores.map((item) => item.score));
  const chartPaddingX = 14;
  const headerHeight = 30;
  const footerHeight = 20;
  const labelWidth = 122;
  const valueWidth = 32;
  const plotX = options.x + chartPaddingX + labelWidth;
  const plotWidth = options.width - chartPaddingX * 2 - labelWidth - valueWidth - 10;
  const plotTop = options.y + options.height - headerHeight;
  const plotBottom = options.y + footerHeight;
  const rowSlot = (plotTop - plotBottom) / scores.length;
  const barHeight = Math.min(9, rowSlot * 0.44);
  const valueX = plotX + plotWidth + 24;
  const barColors = [
    context.brand.blue,
    context.brand.violet,
    context.brand.teal,
    context.brand.coral
  ];

  drawChartShell(context, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    title: "Ranking completo de arquetipos",
    meta: "Puntaje"
  });

  [0, 2.5, 5, 7.5].forEach((tick) => {
    const tickX = plotX + (plotWidth * tick) / maxScore;

    context.page.drawLine({
      start: { x: tickX, y: plotBottom + 1 },
      end: { x: tickX, y: plotTop - 2 },
      thickness: tick === 0 ? 0.9 : 0.55,
      color: context.brand.border
    });
    drawRightAlignedText(context, tick.toFixed(tick % 1 === 0 ? 0 : 1), {
      x: tickX + 8,
      y: options.y + 7,
      size: 6.8,
      color: context.mutedColor
    });
  });

  scores.forEach((item, index) => {
    const centerY = plotTop - rowSlot * index - rowSlot / 2;
    const barY = centerY - barHeight / 2;
    const normalizedWidth = Math.max(7, Math.min(plotWidth, (item.score / maxScore) * plotWidth));
    const color =
      index < 4
        ? barColors[index]
        : [context.brand.blue, context.brand.violet, context.brand.teal, context.brand.coral][index % 4];
    const rank = `${String(index + 1).padStart(2, "0")}`;
    const label = `${rank}  ${item.displayName}`;
    const font = index < 3 ? context.boldFont : context.regularFont;

    if (index > 0) {
      context.page.drawLine({
        start: { x: options.x + chartPaddingX, y: centerY + rowSlot / 2 },
        end: { x: options.x + options.width - chartPaddingX, y: centerY + rowSlot / 2 },
        thickness: 0.35,
        color: context.brand.border
      });
    }

    context.page.drawText(label, {
      x: options.x + chartPaddingX,
      y: centerY - 2.7,
      size: 7.5,
      font,
      color: context.titleColor
    });
    drawRoundedRect(context, {
      x: plotX,
      y: barY,
      width: plotWidth,
      height: barHeight,
      color: context.brand.surfaceStrong
    });
    drawRoundedRect(context, {
      x: plotX,
      y: barY,
      width: normalizedWidth,
      height: barHeight,
      color
    });
    drawRightAlignedText(context, item.score.toFixed(1), {
      x: valueX,
      y: centerY - 2.7,
      size: 7.4,
      font: context.boldFont,
      color: context.titleColor
    });
  });
}

function drawShadowVectorChart(
  context: PdfContext,
  section: ReportSection,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
) {
  const values = section.shadowMetrics;

  if (!values) {
    return;
  }

  drawChartShell(context, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    title: "Estructura interna",
    meta: `Carga ${values.load}`
  });

  const center = { x: options.x + 108, y: options.y + 124 };
  const radius = 68;
  const axes = [
    { label: "Persona", value: values.persona, angle: -90 },
    { label: "Sombra base", value: values.shadowBase, angle: 30 },
    { label: "Sombra total", value: values.shadowTotal, angle: 150 }
  ];
  const pointAt = (angle: number, scale: number) => {
    const radians = (angle * Math.PI) / 180;

    return {
      x: center.x + Math.cos(radians) * radius * scale,
      y: center.y + Math.sin(radians) * radius * scale
    };
  };

  for (let ring = 1; ring <= 5; ring += 1) {
    const scale = ring / 5;
    const points = axes.map((axis) => pointAt(axis.angle, scale));

    points.forEach((point, index) => {
      context.page.drawLine({
        start: point,
        end: points[(index + 1) % points.length],
        thickness: 0.45,
        color: context.brand.border
      });
    });
  }

  axes.forEach((axis) => {
    context.page.drawLine({
      start: center,
      end: pointAt(axis.angle, 1),
      thickness: 0.45,
      color: context.brand.border
    });
  });

  const valuePoints = axes.map((axis) => pointAt(axis.angle, clampScore(axis.value) / 5));
  const valuePath = valuePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  context.page.drawSvgPath(`${valuePath} Z`, {
    color: context.brand.violet,
    opacity: 0.16
  });
  valuePoints.forEach((point, index) => {
    context.page.drawLine({
      start: point,
      end: valuePoints[(index + 1) % valuePoints.length],
      thickness: 2.2,
      color: context.brand.violet
    });
    context.page.drawEllipse({
      x: point.x,
      y: point.y,
      xScale: 4.6,
      yScale: 4.6,
      color: context.brand.teal
    });
    context.page.drawEllipse({
      x: point.x,
      y: point.y,
      xScale: 2.1,
      yScale: 2.1,
      color: context.brand.white
    });
  });

  drawCenteredText(context, "Persona", {
    x: center.x - 38,
    y: center.y + radius + 14,
    width: 76,
    size: 7.2,
    font: context.boldFont,
    color: context.mutedColor
  });
  context.page.drawText("Sombra total", {
    x: center.x - radius - 18,
    y: center.y - radius - 20,
    size: 7.0,
    font: context.boldFont,
    color: context.mutedColor
  });
  context.page.drawText("Sombra base", {
    x: center.x + radius - 52,
    y: center.y - radius - 20,
    size: 7.0,
    font: context.boldFont,
    color: context.mutedColor
  });

  const barsX = options.x + 205;
  const barsWidth = options.width - 224;
  drawScoreBar(context, {
    label: "Persona",
    value: values.persona,
    x: barsX,
    y: options.y + 193,
    width: barsWidth,
    color: context.brand.blue
  });
  drawScoreBar(context, {
    label: "Sombra base",
    value: values.shadowBase,
    x: barsX,
    y: options.y + 143,
    width: barsWidth,
    color: context.brand.teal
  });
  drawScoreBar(context, {
    label: "Sombra total",
    value: values.shadowTotal,
    x: barsX,
    y: options.y + 93,
    width: barsWidth,
    color: context.brand.violet
  });

  context.page.drawRectangle({
    x: barsX,
    y: options.y + 24,
    width: barsWidth,
    height: 38,
    color: context.brand.white,
    borderColor: context.brand.border,
    borderWidth: 0.7
  });
  context.page.drawText("Integracion", {
    x: barsX + 9,
    y: options.y + 47,
    size: 7.2,
    font: context.boldFont,
    color: context.mutedColor
  });
  context.page.drawText(`${values.integrationIndex.toFixed(1)} / 5`, {
    x: barsX + 9,
    y: options.y + 31,
    size: 11,
    font: context.boldFont,
    color: context.titleColor
  });
}

function drawKeirseyVectorChart(
  context: PdfContext,
  section: ReportSection,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
) {
  const activeLabel = section.keirseyProfile?.label ?? section.subtitle;
  const profiles = [
    {
      label: "Racional / Estratega (NT)",
      code: "NT",
      title: "Racional",
      detail: "Logica y estrategia",
      color: context.brand.blue
    },
    {
      label: "Guardian / Logistico (SJ)",
      code: "SJ",
      title: "Guardian",
      detail: "Orden y continuidad",
      color: context.brand.teal
    },
    {
      label: "Idealista / Diplomatico (NF)",
      code: "NF",
      title: "Idealista",
      detail: "Sentido y vinculo",
      color: context.brand.violet
    }
  ];
  const active = profiles.find((profile) => profile.label === activeLabel) ?? profiles[0];

  drawChartShell(context, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    title: "Matriz de respuesta bajo presion",
    meta: `Activo ${active.code}`
  });

  const gap = 10;
  const cardWidth = (options.width - 28 - gap * 2) / 3;
  const cardHeight = 116;
  const cardY = options.y + 42;
  const profileBadgeY = cardY + cardHeight - 25;
  const profileCodeY = cardY + cardHeight - 28;
  const profileTitleY = cardY + 58;
  const profileDetailY = cardY + 39;

  profiles.forEach((profile, index) => {
    const isActive = profile.label === active.label;
    const x = options.x + 14 + index * (cardWidth + gap);

    context.page.drawRectangle({
      x,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      color: context.brand.white,
      borderColor: isActive ? profile.color : context.brand.border,
      borderWidth: isActive ? 1.4 : 0.7
    });
    context.page.drawRectangle({
      x,
      y: cardY + cardHeight - 6,
      width: cardWidth,
      height: 6,
      color: profile.color
    });
    context.page.drawEllipse({
      x: x + 26,
      y: profileBadgeY,
      xScale: isActive ? 14 : 11,
      yScale: isActive ? 14 : 11,
      color: profile.color
    });
    drawCenteredText(context, profile.code, {
      x: x + 14,
      y: profileCodeY,
      width: 24,
      size: 7.8,
      font: context.boldFont,
      color: context.brand.white
    });
    context.page.drawText(profile.title, {
      x: x + 14,
      y: profileTitleY,
      size: isActive ? 12 : 10.5,
      font: context.boldFont,
      color: context.titleColor
    });
    context.page.drawText(profile.detail, {
      x: x + 14,
      y: profileDetailY,
      size: 7.2,
      font: context.regularFont,
      color: context.mutedColor
    });

    if (isActive) {
      drawRoundedRect(context, {
        x: x + 14,
        y: cardY + 17,
        width: 58,
        height: 18,
        color: profile.color
      });
      drawCenteredText(context, "ACTIVO", {
        x: x + 14,
        y: cardY + 22,
        width: 58,
        size: 7.5,
        font: context.boldFont,
        color: context.brand.white
      });
    } else {
      context.page.drawText("Referencia", {
        x: x + 14,
        y: cardY + 22,
        size: 7.3,
        font: context.boldFont,
        color: context.mutedColor
      });
    }
  });
}

function drawHeroJourneyVectorChart(
  context: PdfContext,
  section: ReportSection,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
) {
  const journey = section.heroJourney;

  if (!journey) {
    return;
  }

  const stages = [
    "Llamada",
    "Umbral",
    "Prueba",
    "Retorno",
    "Maestro"
  ];
  const activeIndex = Math.max(0, journey.position - 1);

  drawChartShell(context, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    title: "Linea evolutiva",
    meta: `Etapa ${journey.position} / ${journey.total}`
  });

  const lineY = options.y + 78;
  const startX = options.x + 54;
  const endX = options.x + options.width - 54;
  const gap = (endX - startX) / (stages.length - 1);
  const activeX = startX + gap * activeIndex;

  context.page.drawLine({
    start: { x: startX, y: lineY },
    end: { x: endX, y: lineY },
    thickness: 4,
    color: context.brand.border
  });
  context.page.drawLine({
    start: { x: startX, y: lineY },
    end: { x: activeX, y: lineY },
    thickness: 4,
    color: context.brand.teal
  });

  stages.forEach((stage, index) => {
    const x = startX + gap * index;
    const isActive = index === activeIndex;
    const isComplete = index <= activeIndex;
    const color = isActive ? context.brand.coral : isComplete ? context.brand.teal : context.brand.border;

    context.page.drawEllipse({
      x,
      y: lineY,
      xScale: isActive ? 17 : 13,
      yScale: isActive ? 17 : 13,
      color
    });
    context.page.drawEllipse({
      x,
      y: lineY,
      xScale: isActive ? 7 : 5,
      yScale: isActive ? 7 : 5,
      color: context.brand.white
    });
    drawCenteredText(context, String(index + 1), {
      x: x - 11,
      y: lineY - 3.4,
      width: 22,
      size: 7.4,
      font: context.boldFont,
      color: isActive ? context.titleColor : context.mutedColor
    });
    drawCenteredText(context, stage, {
      x: x - 40,
      y: options.y + 33,
      width: 80,
      size: 6.8,
      font: isActive ? context.boldFont : context.regularFont,
      color: isActive ? context.titleColor : context.mutedColor
    });
  });

  context.page.drawText(journey.stage, {
    x: options.x + 14,
    y: options.y + 12,
    size: 8.2,
    font: context.boldFont,
    color: context.titleColor
  });
  drawRightAlignedText(context, `${Math.round(journey.progress * 100)}% del arco`, {
    x: options.x + options.width - 14,
    y: options.y + 12,
    size: 7.4,
    font: context.boldFont,
    color: context.mutedColor
  });
}

function drawActionPlanVectorChart(
  context: PdfContext,
  section: ReportSection,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
) {
  const steps = (section.actionSteps ?? []).slice(0, REPORT_ACTION_STEP_COUNT);

  if (!steps.length) {
    return;
  }

  drawChartShell(context, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    title: "Plan tactico semanal",
    meta: `${steps.length} acciones`
  });

  const colors = [context.brand.blue, context.brand.teal, context.brand.violet];
  const gap = 10;
  const cardWidth = (options.width - 28 - gap * 2) / 3;
  const cardHeight = 132;
  const cardY = options.y + 38;
  const connectorY = cardY + cardHeight / 2;

  steps.forEach((step, index) => {
    const x = options.x + 14 + index * (cardWidth + gap);
    const color = colors[index] ?? context.brand.coral;

    if (index > 0) {
      context.page.drawLine({
        start: { x: x - gap, y: connectorY },
        end: { x, y: connectorY },
        thickness: 2.2,
        color: context.brand.border
      });
    }

    context.page.drawRectangle({
      x,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      color: context.brand.white,
      borderColor: context.brand.border,
      borderWidth: 0.7
    });
    context.page.drawRectangle({
      x,
      y: cardY + cardHeight - 6,
      width: cardWidth,
      height: 6,
      color
    });
    context.page.drawEllipse({
      x: x + 21,
      y: cardY + cardHeight - 30,
      xScale: 13,
      yScale: 13,
      color
    });
    drawCenteredText(context, String(index + 1), {
      x: x + 10,
      y: cardY + cardHeight - 33,
      width: 22,
      size: 8,
      font: context.boldFont,
      color: context.brand.white
    });
    context.page.drawText(`Paso ${index + 1}`, {
      x: x + 41,
      y: cardY + cardHeight - 33,
      size: 8.3,
      font: context.boldFont,
      color: context.titleColor
    });
    drawFittedWrappedTextAt(context, step, {
      x: x + 12,
      y: cardY + cardHeight - 60,
      width: cardWidth - 24,
      maxHeight: cardHeight - 74,
      maxSize: 6.8,
      minSize: 5.2,
      font: context.regularFont,
      color: context.bodyColor,
      lineGap: 1.7
    });
  });
}

async function drawVectorOrPngChart(
  context: PdfContext,
  section: ReportSection,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
) {
  if (section.id === "mapa") {
    drawArchetypeVectorChart(context, section, options);
    return;
  }

  if (section.id === "sombra") {
    drawShadowVectorChart(context, section, options);
    return;
  }

  if (section.id === "keirsey") {
    drawKeirseyVectorChart(context, section, options);
    return;
  }

  if (section.id === "heroe") {
    drawHeroJourneyVectorChart(context, section, options);
    return;
  }

  if (section.id === "pasos") {
    drawActionPlanVectorChart(context, section, options);
    return;
  }

  const chartImage = await context.doc.embedPng(section.chart);

  context.page.drawImage(chartImage, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height
  });
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
  const chartY = context.currentY - section.chartHeight - 16;
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
  await drawVectorOrPngChart(context, section, {
    x: chartX,
    y: chartY,
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
