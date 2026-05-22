import { createRequire } from "node:module";

import { buildFallbackReportText } from "./assessment.ai-report.service.js";
import {
  buildResultInterpretation,
  formatArchetypeName,
  mapScoresForDisplay
} from "./assessment.interpretation.js";
import {
  createArchetypeBarChartPng,
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
};

export function getShadowLabel(shadowTotal: number): string {
  return shadowTotal >= 3.5
    ? "Alto nivel de represion. Conviene integrar vulnerabilidad antes del burnout."
    : "Relacion sana con los impulsos. La autenticidad aparece como un recurso disponible.";
}

function addPage(context: PdfContext) {
  context.page = context.doc.addPage([595.28, 841.89]);
  context.currentY = context.marginTop;
}

function ensureSpace(context: PdfContext, requiredHeight: number) {
  if (context.currentY - requiredHeight < context.marginBottom) {
    addPage(context);
  }
}

function drawTextLine(
  context: PdfContext,
  text: string,
  options: {
    size?: number;
    font?: any;
    color?: unknown;
    x?: number;
  } = {}
) {
  const size = options.size ?? 10.5;

  ensureSpace(context, size + 8);
  context.page.drawText(text, {
    x: options.x ?? context.marginX,
    y: context.currentY,
    size,
    font: options.font ?? context.regularFont,
    color: options.color ?? context.bodyColor
  });
  context.currentY -= size + 6;
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

function drawParagraph(
  context: PdfContext,
  text: string,
  options: {
    size?: number;
    font?: any;
    color?: unknown;
    indent?: number;
    gapAfter?: number;
  } = {}
) {
  const size = options.size ?? 10.5;
  const font = options.font ?? context.regularFont;
  const indent = options.indent ?? 0;
  const maxWidth = 595.28 - context.marginX * 2 - indent;
  const lines = splitText(text, font, size, maxWidth);

  for (const line of lines) {
    drawTextLine(context, line, {
      size,
      font,
      color: options.color,
      x: context.marginX + indent
    });
  }

  context.currentY -= options.gapAfter ?? 4;
}

function normalizeReportBlocks(reportText: string): string[] {
  return reportText
    .replace(/\r/g, "")
    .split(/\n{2,}|\n(?=(?:#{1,3}\s|[-*]\s|\d+\.\s))/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function stripMarkdownHeading(block: string): string {
  return block.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").trim();
}

function drawReportText(context: PdfContext, reportText: string) {
  for (const block of normalizeReportBlocks(reportText)) {
    const cleaned = stripMarkdownHeading(block);
    const isHeading = /^#{1,6}\s/.test(block) || /^[A-Z][^.!?]{1,54}$/.test(cleaned);
    const isBullet = /^[-*]\s+/.test(cleaned) || /^\d+\.\s+/.test(cleaned);

    if (isHeading) {
      context.currentY -= 4;
      drawParagraph(context, cleaned, {
        size: 13,
        font: context.boldFont,
        color: context.titleColor,
        gapAfter: 2
      });
      continue;
    }

    drawParagraph(context, cleaned.replace(/^[-*]\s+/, "- "), {
      size: 10.5,
      indent: isBullet ? 10 : 0,
      gapAfter: isBullet ? 1 : 6
    });
  }
}

function drawHeader(context: PdfContext, title: string, subtitle: string) {
  drawParagraph(context, title, {
    size: 21,
    font: context.boldFont,
    color: context.titleColor,
    gapAfter: 0
  });
  drawParagraph(context, subtitle, {
    size: 10,
    color: context.mutedColor,
    gapAfter: 10
  });
}

function drawMetricRow(context: PdfContext, metrics: { label: string; value: string }[]) {
  const cardWidth = (595.28 - context.marginX * 2 - 16) / 3;
  const y = context.currentY - 54;

  ensureSpace(context, 64);

  metrics.forEach((metric, index) => {
    const x = context.marginX + index * (cardWidth + 8);
    context.page.drawRectangle({
      x,
      y,
      width: cardWidth,
      height: 46,
      color: rgb(0.97, 0.98, 1),
      borderColor: rgb(0.86, 0.87, 0.92),
      borderWidth: 1
    });
    context.page.drawText(metric.label, {
      x: x + 10,
      y: y + 28,
      size: 7.8,
      font: context.boldFont,
      color: context.mutedColor
    });
    context.page.drawText(metric.value, {
      x: x + 10,
      y: y + 11,
      size: 11,
      font: context.boldFont,
      color: context.bodyColor
    });
  });

  context.currentY = y - 14;
}

async function drawChartImage(context: PdfContext, png: Buffer, width: number, height: number) {
  ensureSpace(context, height + 10);
  const image = await context.doc.embedPng(png);
  context.page.drawImage(image, {
    x: context.marginX,
    y: context.currentY - height,
    width,
    height
  });
  context.currentY -= height + 12;
}

function drawRankingLegend(context: PdfContext, scores: ArchetypeScore[]) {
  const displayScores = mapScoresForDisplay(scores).slice(0, 6);
  const left = displayScores.slice(0, 3);
  const right = displayScores.slice(3, 6);

  left.forEach((item, index) => {
    drawTextLine(context, `${index + 1}. ${item.displayName}: ${item.score.toFixed(1)} puntos`, {
      size: 9.5
    });
  });

  const startY = context.currentY + (left.length * 15);
  right.forEach((item, index) => {
    context.page.drawText(`${index + 4}. ${item.displayName}: ${item.score.toFixed(1)} puntos`, {
      x: context.marginX + 250,
      y: startY - index * 15,
      size: 9.5,
      font: context.regularFont,
      color: context.bodyColor
    });
  });
}

function drawFooter(doc: any, regularFont: any) {
  doc.getPages().forEach((page: any, index: number) => {
    page.drawText("MiRealYo - Lectura interpretativa y educativa. No sustituye evaluacion clinica profesional.", {
      x: 48,
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
  const interpretation = buildResultInterpretation(input);
  const reportText = options.reportText?.trim() || buildFallbackReportText(input);
  const ranking = input.hook.ranking;
  const context: PdfContext = {
    doc,
    page: doc.addPage([595.28, 841.89]),
    regularFont,
    boldFont,
    marginX: 48,
    marginTop: 792,
    marginBottom: 58,
    currentY: 792,
    bodyColor: rgb(0.14, 0.18, 0.28),
    titleColor: rgb(0.13, 0.19, 0.36),
    mutedColor: rgb(0.38, 0.42, 0.52)
  };

  drawHeader(
    context,
    "Informe premium MiRealYo",
    `Resultado interpretativo para ${input.demo.nombre} - fuente: ${options.reportSource === "webhook" ? "agente IA" : "lectura local"}`
  );
  drawParagraph(context, interpretation.quickSummary, {
    size: 10.8,
    gapAfter: 6
  });
  drawMetricRow(context, [
    { label: "Arquetipo", value: interpretation.dominant.displayName },
    { label: "Triada", value: ranking.slice(0, 3).map((item) => formatArchetypeName(item.name)).join(" / ") },
    { label: "Objetivo", value: input.demo.objetivo_label.slice(0, 24) }
  ]);

  drawParagraph(context, "Grafica de arquetipos", {
    size: 14,
    font: boldFont,
    color: context.titleColor,
    gapAfter: 2
  });
  await drawChartImage(context, createArchetypeBarChartPng(ranking), 499, 260);
  drawRankingLegend(context, ranking);

  addPage(context);
  drawHeader(context, "Mapa interno", "Persona, sombra base y sombra total en escala de 1 a 5.");
  await drawChartImage(
    context,
    createStructureRadarChartPng({
      persona: input.hook.estructuras.Persona,
      shadowBase: input.hook.estructuras.Sombra_Base,
      shadowTotal: input.premium.Sombra_Total
    }),
    360,
    265
  );
  drawMetricRow(context, [
    { label: "Persona", value: `${input.hook.estructuras.Persona.toFixed(1)} / 5` },
    { label: "Sombra base", value: `${input.hook.estructuras.Sombra_Base.toFixed(1)} / 5` },
    { label: "Sombra total", value: `${input.premium.Sombra_Total.toFixed(1)} / 5` }
  ]);
  drawParagraph(context, interpretation.shadow.summary, {
    size: 10.8,
    gapAfter: 8
  });

  drawParagraph(context, "Informe interpretativo", {
    size: 15,
    font: boldFont,
    color: context.titleColor,
    gapAfter: 4
  });
  drawReportText(context, reportText);

  drawFooter(doc, regularFont);
  const bytes = await doc.save({
    useObjectStreams: false
  });

  return Buffer.from(bytes);
}
