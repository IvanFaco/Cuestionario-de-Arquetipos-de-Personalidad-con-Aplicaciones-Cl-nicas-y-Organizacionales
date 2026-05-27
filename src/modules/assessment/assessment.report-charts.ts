import { deflateSync } from "node:zlib";

import type { ArchetypeScore } from "./assessment.types.js";

type Color = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

type Point = {
  x: number;
  y: number;
};

const brand = {
  background: { r: 248, g: 246, b: 252 },
  surface: { r: 255, g: 255, b: 255 },
  border: { r: 224, g: 220, b: 235 },
  muted: { r: 210, g: 203, b: 224 },
  blue: { r: 46, g: 122, b: 255 },
  violet: { r: 118, g: 88, b: 196 },
  teal: { r: 77, g: 196, b: 201 },
  coral: { r: 243, g: 142, b: 84 },
  success: { r: 72, g: 180, b: 120 }
} satisfies Record<string, Color>;

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
});

class Bitmap {
  readonly pixels: Buffer;

  constructor(readonly width: number, readonly height: number, background: Color) {
    this.pixels = Buffer.alloc(width * height * 4);
    this.fillRect(0, 0, width, height, background);
  }

  fillRect(x: number, y: number, width: number, height: number, color: Color) {
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const endX = Math.min(this.width, Math.ceil(x + width));
    const endY = Math.min(this.height, Math.ceil(y + height));

    for (let row = startY; row < endY; row += 1) {
      for (let col = startX; col < endX; col += 1) {
        this.setPixel(col, row, color);
      }
    }
  }

  drawLine(start: Point, end: Point, color: Color, thickness = 1) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      this.fillCircle(start.x + dx * t, start.y + dy * t, thickness / 2, color);
    }
  }

  fillCircle(cx: number, cy: number, radius: number, color: Color) {
    const minX = Math.floor(cx - radius);
    const maxX = Math.ceil(cx + radius);
    const minY = Math.floor(cy - radius);
    const maxY = Math.ceil(cy + radius);
    const radiusSquared = radius * radius;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;

        if (dx * dx + dy * dy <= radiusSquared) {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  fillPolygon(points: Point[], color: Color) {
    if (points.length < 3) {
      return;
    }

    const minY = Math.floor(Math.min(...points.map((point) => point.y)));
    const maxY = Math.ceil(Math.max(...points.map((point) => point.y)));

    for (let y = minY; y <= maxY; y += 1) {
      const intersections: number[] = [];

      for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        const next = points[(index + 1) % points.length];
        const crosses = (current.y <= y && next.y > y) || (next.y <= y && current.y > y);

        if (crosses) {
          const x = current.x + ((y - current.y) * (next.x - current.x)) / (next.y - current.y);
          intersections.push(x);
        }
      }

      intersections.sort((left, right) => left - right);

      for (let index = 0; index < intersections.length; index += 2) {
        const startX = intersections[index];
        const endX = intersections[index + 1];

        if (endX !== undefined) {
          this.fillRect(startX, y, endX - startX, 1, color);
        }
      }
    }
  }

  private setPixel(x: number, y: number, color: Color) {
    const col = Math.floor(x);
    const row = Math.floor(y);

    if (col < 0 || row < 0 || col >= this.width || row >= this.height) {
      return;
    }

    const index = (row * this.width + col) * 4;
    const alpha = (color.a ?? 255) / 255;
    const inverse = 1 - alpha;

    this.pixels[index] = Math.round(color.r * alpha + this.pixels[index] * inverse);
    this.pixels[index + 1] = Math.round(color.g * alpha + this.pixels[index + 1] * inverse);
    this.pixels[index + 2] = Math.round(color.b * alpha + this.pixels[index + 2] * inverse);
    this.pixels[index + 3] = 255;
  }
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  const payload = Buffer.concat([typeBuffer, data]);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(payload), 0);

  return Buffer.concat([length, payload, crc]);
}

function encodePng(bitmap: Bitmap): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(bitmap.width, 0);
  header.writeUInt32BE(bitmap.height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const rowLength = bitmap.width * 4;
  const raw = Buffer.alloc((rowLength + 1) * bitmap.height);

  for (let y = 0; y < bitmap.height; y += 1) {
    const rawRow = y * (rowLength + 1);
    raw[rawRow] = 0;
    bitmap.pixels.copy(raw, rawRow + 1, y * rowLength, (y + 1) * rowLength);
  }

  return Buffer.concat([
    pngSignature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function drawRoundedBar(bitmap: Bitmap, x: number, y: number, width: number, height: number, color: Color) {
  const radius = height / 2;

  bitmap.fillRect(x + radius, y, Math.max(0, width - radius * 2), height, color);
  bitmap.fillCircle(x + radius, y + radius, radius, color);
  bitmap.fillCircle(x + width - radius, y + radius, radius, color);
}

export function createArchetypeBarChartPng(scores: ArchetypeScore[]): Buffer {
  const width = 1000;
  const height = 520;
  const bitmap = new Bitmap(width, height, brand.background);
  const chartX = 120;
  const chartY = 58;
  const chartWidth = 790;
  const rowHeight = 28;
  const rowGap = 11;
  const maxScore = 7.5;
  const colors: Color[] = [
    brand.blue,
    brand.violet,
    brand.teal,
    brand.coral
  ];

  for (let grid = 1; grid <= 5; grid += 1) {
    const x = chartX + (chartWidth * grid) / 5;
    bitmap.drawLine({ x, y: 34 }, { x, y: height - 44 }, brand.border, 2);
  }

  scores.slice(0, 12).forEach((item, index) => {
    const y = chartY + index * (rowHeight + rowGap);
    const normalizedWidth = Math.max(12, Math.min(chartWidth, (item.score / maxScore) * chartWidth));
    const color = colors[index % colors.length];

    drawRoundedBar(bitmap, chartX, y, chartWidth, rowHeight, { ...brand.muted, a: 150 });
    drawRoundedBar(bitmap, chartX, y, normalizedWidth, rowHeight, color);
    bitmap.fillCircle(chartX - 45, y + rowHeight / 2, 13, color);
    bitmap.fillCircle(chartX - 45, y + rowHeight / 2, 5, { r: 255, g: 255, b: 255 });
  });

  return encodePng(bitmap);
}

export function createStructureRadarChartPng(values: {
  persona: number;
  shadowBase: number;
  shadowTotal: number;
}): Buffer {
  const width = 760;
  const height = 560;
  const bitmap = new Bitmap(width, height, brand.background);
  const center = { x: width / 2, y: 275 };
  const radius = 205;
  const axes = [
    { value: values.persona, angle: -90 },
    { value: values.shadowBase, angle: 30 },
    { value: values.shadowTotal, angle: 150 }
  ];

  const pointAt = (angle: number, scale: number): Point => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center.x + Math.cos(radians) * radius * scale,
      y: center.y + Math.sin(radians) * radius * scale
    };
  };

  for (let ring = 1; ring <= 5; ring += 1) {
    const scale = ring / 5;
    const ringPoints = axes.map((axis) => pointAt(axis.angle, scale));

    ringPoints.forEach((point, index) => {
      bitmap.drawLine(point, ringPoints[(index + 1) % ringPoints.length], brand.border, 2);
    });
  }

  axes.forEach((axis) => {
    bitmap.drawLine(center, pointAt(axis.angle, 1), brand.muted, 2);
  });

  const valuePoints = axes.map((axis) => pointAt(axis.angle, Math.max(0, Math.min(5, axis.value)) / 5));
  bitmap.fillPolygon(valuePoints, { ...brand.violet, a: 70 });

  valuePoints.forEach((point, index) => {
    const next = valuePoints[(index + 1) % valuePoints.length];
    bitmap.drawLine(point, next, brand.violet, 6);
    bitmap.fillCircle(point.x, point.y, 10, brand.teal);
    bitmap.fillCircle(point.x, point.y, 4, { r: 255, g: 255, b: 255 });
  });

  return encodePng(bitmap);
}

export function createKeirseyMatrixChartPng(activeLabel: string): Buffer {
  const width = 900;
  const height = 360;
  const bitmap = new Bitmap(width, height, brand.background);
  const columns = [
    { label: "Racional / Estratega (NT)", color: brand.blue },
    { label: "Guardian / Logistico (SJ)", color: brand.teal },
    { label: "Idealista / Diplomatico (NF)", color: brand.violet }
  ];
  const startX = 95;
  const columnWidth = 200;
  const gap = 55;
  const baseY = 265;

  bitmap.drawLine({ x: 60, y: baseY }, { x: width - 60, y: baseY }, brand.border, 3);

  columns.forEach((column, index) => {
    const active = activeLabel === column.label;
    const x = startX + index * (columnWidth + gap);
    const heightScale = active ? 1 : 0.58;
    const columnHeight = 190 * heightScale;
    const y = baseY - columnHeight;

    drawRoundedBar(bitmap, x, y, columnWidth, columnHeight, {
      ...column.color,
      a: active ? 235 : 95
    });
    bitmap.fillCircle(x + columnWidth / 2, y - 28, active ? 24 : 17, {
      ...column.color,
      a: active ? 255 : 145
    });
    bitmap.fillCircle(x + columnWidth / 2, y - 28, active ? 9 : 6, { r: 255, g: 255, b: 255 });
  });

  return encodePng(bitmap);
}

export function createJourneyStageChartPng(activeStage: string): Buffer {
  const width = 1000;
  const height = 300;
  const bitmap = new Bitmap(width, height, brand.background);
  const stages = [
    "La Llamada a la Aventura",
    "El Cruce del Umbral",
    "La Prueba Suprema",
    "El Retorno con el Elixir",
    "Maestro de Dos Mundos"
  ];
  const activeIndex = Math.max(0, stages.findIndex((stage) => stage === activeStage));
  const y = 145;
  const startX = 115;
  const gap = 190;

  bitmap.drawLine({ x: startX, y }, { x: startX + gap * (stages.length - 1), y }, brand.border, 8);

  stages.forEach((_stage, index) => {
    const x = startX + index * gap;
    const complete = index <= activeIndex;
    const active = index === activeIndex;
    const color = active
      ? { r: 243, g: 142, b: 84 }
      : complete
        ? brand.teal
        : brand.muted;

    if (index > 0 && index <= activeIndex) {
      bitmap.drawLine({ x: startX + (index - 1) * gap, y }, { x, y }, brand.teal, 8);
    }

    bitmap.fillCircle(x, y, active ? 31 : 24, color);
    bitmap.fillCircle(x, y, active ? 13 : 9, { r: 255, g: 255, b: 255 });
    bitmap.fillCircle(x, y - 68, active ? 9 : 5, color);
  });

  return encodePng(bitmap);
}

export function createActionPlanChartPng(stepCount = 4): Buffer {
  const width = 900;
  const height = 360;
  const bitmap = new Bitmap(width, height, brand.background);
  const startX = 115;
  const baseY = 285;
  const stepWidth = 145;
  const stepHeight = 42;
  const gap = 35;
  const colors: Color[] = [
    brand.blue,
    brand.teal,
    brand.violet,
    brand.coral
  ];

  for (let index = 0; index < stepCount; index += 1) {
    const x = startX + index * (stepWidth + gap);
    const y = baseY - index * 45;
    const color = colors[index % colors.length];

    drawRoundedBar(bitmap, x, y, stepWidth, stepHeight, { ...color, a: 230 });
    bitmap.fillCircle(x + stepWidth / 2, y - 34, 20, color);
    bitmap.fillCircle(x + stepWidth / 2, y - 34, 7, { r: 255, g: 255, b: 255 });

    if (index < stepCount - 1) {
      bitmap.drawLine(
        { x: x + stepWidth, y: y + stepHeight / 2 },
        { x: x + stepWidth + gap, y: y - 45 + stepHeight / 2 },
        brand.muted,
        5
      );
    }
  }

  return encodePng(bitmap);
}
