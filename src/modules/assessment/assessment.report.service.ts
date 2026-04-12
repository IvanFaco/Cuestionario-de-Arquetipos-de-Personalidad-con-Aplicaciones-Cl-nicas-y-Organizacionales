import { createRequire } from "node:module";

import type { ArchetypeScore, DemoProfile, HookOutcome, PremiumOutcome } from "./assessment.types.js";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib") as any;

export function getShadowLabel(shadowTotal: number): string {
  return shadowTotal >= 3.5
    ? "Alto nivel de represion. Conviene integrar vulnerabilidad antes del burnout."
    : "Relacion sana con los impulsos. La autenticidad aparece como un recurso disponible.";
}

function drawTextBlock(
  page: any,
  lines: string[],
  {
    x,
    y,
    size,
    color
  }: {
    x: number;
    y: number;
    size: number;
    color: unknown;
  }
): number {
  let currentY = y;

  lines.forEach((line) => {
    page.drawText(line, {
      x,
      y: currentY,
      size,
      color
    });
    currentY -= size + 6;
  });

  return currentY;
}

function splitParagraph(text: string, maxLength = 88): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length > maxLength) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = candidate;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function getBaseProfileLine(demo: DemoProfile): string {
  const segments = [demo.genero, demo.rango_edad_label, demo.energia_base_label];

  if (demo.orientacion_espiritual_label && demo.orientacion_espiritual !== "prefer_not_to_say") {
    segments.push(demo.orientacion_espiritual_label);
  }

  return `Perfil base: ${segments.join(" | ")}`;
}

export async function buildExecutiveReportPdf(input: {
  demo: DemoProfile;
  hook: HookOutcome;
  premium: PremiumOutcome;
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const ranking = input.hook.ranking;
  const triad = ranking.slice(0, 3).map((item) => item.name).join(", ");
  const dominant = ranking[0].name;
  const shadowLabel = getShadowLabel(input.premium.Sombra_Total);
  const pageOne = doc.addPage([595.28, 841.89]);
  const pageTwo = doc.addPage([595.28, 841.89]);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const titleColor = rgb(0.06, 0.3, 0.46);
  const bodyColor = rgb(0.14, 0.2, 0.28);
  const marginX = 48;
  let currentY = 792;

  pageOne.setFont(boldFont);
  pageOne.drawText("Reporte Clinico Ejecutivo", {
    x: marginX,
    y: currentY,
    size: 20,
    color: titleColor
  });
  currentY -= 34;

  pageOne.setFont(regularFont);
  currentY = drawTextBlock(pageOne, splitParagraph(
    getBaseProfileLine(input.demo)
  ), { x: marginX, y: currentY, size: 11, color: bodyColor });
  currentY = drawTextBlock(pageOne, splitParagraph(
    `Lectura contextual: ${input.demo.energia_somatica_label}`
  ), { x: marginX, y: currentY - 6, size: 11, color: bodyColor });
  currentY = drawTextBlock(pageOne, splitParagraph(
    `Estructura dominante: ${dominant} | Triada principal: ${triad}`
  ), { x: marginX, y: currentY - 6, size: 11, color: bodyColor });

  pageOne.setFont(boldFont);
  currentY -= 10;
  currentY = drawTextBlock(pageOne, ["1. Lectura ejecutiva"], {
    x: marginX,
    y: currentY,
    size: 14,
    color: titleColor
  });
  pageOne.setFont(regularFont);
  currentY = drawTextBlock(pageOne, splitParagraph(
    `La psique se organiza principalmente desde el arquetipo ${dominant}. La triada dominante (${triad}) sugiere un estilo de adaptacion consistente entre estructura, defensa y direccion vital.`
  ), { x: marginX, y: currentY - 4, size: 11, color: bodyColor });

  pageOne.setFont(boldFont);
  currentY -= 4;
  currentY = drawTextBlock(pageOne, ["2. Ranking de arquetipos"], {
    x: marginX,
    y: currentY,
    size: 14,
    color: titleColor
  });
  pageOne.setFont(regularFont);
  ranking.forEach((item: ArchetypeScore, index: number) => {
    currentY = drawTextBlock(
      pageOne,
      [`${index + 1}. ${item.name}: ${item.score.toFixed(1)} puntos`],
      { x: marginX, y: currentY - 2, size: 11, color: bodyColor }
    );
  });

  pageOne.setFont(boldFont);
  currentY -= 4;
  currentY = drawTextBlock(pageOne, ["3. Estructuras clinicas"], {
    x: marginX,
    y: currentY,
    size: 14,
    color: titleColor
  });
  pageOne.setFont(regularFont);
  currentY = drawTextBlock(pageOne, splitParagraph(
    `Persona: ${input.hook.estructuras.Persona.toFixed(1)} / 5 | Sombra base: ${input.hook.estructuras.Sombra_Base.toFixed(1)} / 5 | Sombra total: ${input.premium.Sombra_Total.toFixed(1)} / 5`
  ), { x: marginX, y: currentY - 2, size: 11, color: bodyColor });
  currentY = drawTextBlock(pageOne, splitParagraph(`Sombra: ${shadowLabel}`), {
    x: marginX,
    y: currentY - 2,
    size: 11,
    color: bodyColor
  });
  drawTextBlock(
    pageOne,
    splitParagraph(`Keirsey: ${input.premium.Keirsey}. Campbell: ${input.premium.Campbell}.`),
    { x: marginX, y: currentY - 2, size: 11, color: bodyColor }
  );

  let secondPageY = 792;
  pageTwo.setFont(boldFont);
  secondPageY = drawTextBlock(pageTwo, ["4. Plan de accion breve"], {
    x: marginX,
    y: secondPageY,
    size: 14,
    color: titleColor
  });
  pageTwo.setFont(regularFont);
  [
    `Fortalecer el arquetipo dominante (${dominant}) sin rigidizar la identidad.`,
    "Bajar la distancia entre imagen publica y experiencia emocional real.",
    `Usar el temperamento ${input.premium.Keirsey} como criterio para decidir bajo estres.`,
    `Trabajar la etapa Campbell actual: ${input.premium.Campbell}.`
  ].forEach((item) => {
    secondPageY = drawTextBlock(pageTwo, splitParagraph(`- ${item}`), {
      x: marginX,
      y: secondPageY - 2,
      size: 11,
      color: bodyColor
    });
  });

  pageTwo.drawText(
    "Documento interpretativo y educativo. No sustituye evaluacion clinica profesional.",
    {
      x: marginX,
      y: secondPageY - 18,
      size: 9,
      color: rgb(0.36, 0.42, 0.47),
      font: regularFont
    }
  );

  const bytes = await doc.save({
    useObjectStreams: false
  });

  return Buffer.from(bytes);
}
